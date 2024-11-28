// The file that will primarily be responsible for loading the data into the DataStax DB
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

// When loading the Webpages, which contain a lot of content in this case about Formula One, when we ask LLMs questions, they work best when we feed them just enough for them to give an accurate answer so we will split up large bodies of texts into a smaller chunks that are easily searchable and digestible
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import OpenAI from "openai";

import "dotenv/config"

/* 

Similarity metrics are used to compute the similarity of two vectors. When you create a collection in Astra DB, you can choose one of three metric types, Dot Product or Cosine or Euclidean. 

    - Cosine is used to determine how similar two vectors are, and will be the default when creating a collection in Astra DB. It does not require vector to be normalized. 
    - The Dot Product algorithm is about 50% faster than cosine, but it will require to be normalized. 
    - when you want to find out how close two vectors are, the Eucledian distance is one of the most intuitive and commonly used metrics. If two vectors have a small Euclidean distance between them, they are closed in the vector space if they have a large and distance they are far apart. 

*/

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const { ASTRA_DB_NAMESPACE, 
        ASTRA_DB_COLLECTION, 
        ASTRA_DB_API_ENDPOINT, 
        ASTRA_DB_APPLICATION_TOKEN, 
        OPENAI_API_KEY 
    } = process.env;

const openAi = new OpenAI({ apiKey: OPENAI_API_KEY });

// Sites to scrape F1 data
const f1Data = [
    "https://en.wikipedia.org/wiki/Formula_One",
    'https://www.skysports.com/f1/news/12433/13256628/max-verstappen-comparing-red-bull-drivers-run-to-four-world-titles-to-lewis-hamilton-michael-schumacher-and-more',
    'https://www.formula1.com/en/latest/all',
    'https://www.forbes.com/sites/brettknight/2023/11/29/formula-1s-highest-paid-drivers/',
    'https://www.autosport.com/f1/news/history-of-female-f1-drivers-including-grand-prix-starters-and-test-drivers/10584871/',
    'https://en.wikipedia.org/wiki/2023 Formula_One_World Championship',
    'https://en.wikipedia.org/wiki/2022 Formula_One_World_Championship',
    'https://en.wikipedia.org/wiki/List_of_Formula One World Drivers%27 Champions', 
    'https://en.wikipedia.org/wiki/2024 Formula One World Championship',
    'https://www.formula1.com/en/results.html/2024/races.html',
    'https://www.formula1.com/en/racing/2024.html'
];

// Scrape all the data, chunk it, vectorize it and send it over to the Datastax DB

// To connect to the DB
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

// Split the data into chunks
const splitter = new RecursiveCharacterTextSplitter({
    // Total number of characters in each chunk
    chunkSize: 512,
    // The overlapping characters between chunks. This helps us preserve the cross chunk context. We basically want to improve our chances of the right information being retrieved, and don't want the fact that we split everything up to have an impact on our results, in case the key was cut off a certain sentence or similar so that's
    chunkOverlap: 100
});

// Create a collection on the database from here instead of doing it manually on the console or UI.
const createCollection = async ( similarityMetric: SimilarityMetric = "dot_product" ) => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, { vector: {
        // This is important as the dimension size should match. The embedding size for text-embedding-3-small Open AI is 1536, and the embedding size in DataStax for open AI is 1536, which matches here. || Explanation in the ↓
        dimension: 1536,
        metric: similarityMetric
    } })

    console.log("Response:\t", res);
    
}
//Use Puppeteer essentially in order to scrape the page, its a JS library that allows you to scrape and interact with browser windows. We are gonna be using it today to scrape our websites langchain offers different options, including cheerio, which is jQuery like syntax to read things from pages, but since Puppeteer runs a real web browser it let's JS run in case that is important for the content on the page
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url,{
        // launchOptions is added so that we can launch the browser in headless mode 
        launchOptions:{
            headless: true
        },
        // gotoOptions is added here to wait for the content to load. 
        gotoOptions:{
            waitUntil: "domcontentloaded"
        },
        // evaluate() is to evaluate the JS code on the page. This is useful for extracting data from the page or for interacting with page elements.
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML)
            await browser.close()
            return result
        }
    });
    // Only interested in a text content so that we can feed it to our AI to create relevant responses, so use the regular expression to strip out the HTML tags from the page content
    return ( await loader.scrape())?.replace(/<[^>]*>?/gm,'')
}

// Create a function that allow to grab the URLs collected above, chunk them up and create a Vector Embeddings out of them so they can be put in the in the vector database
const loadSampleData = async () => {
    // Look for the collection that had been created earlier
    const collection = await db.collection(ASTRA_DB_COLLECTION)

    for await( const url of f1Data ){
        // Scrape each individual URL 
        const content = await scrapePage(url);
        // Create chunks from the scraped data
        const chunks = await splitter.splitText(content);
        // Create Vector Embeddings out of each chunks, by iterating through the collection of chunks
        for await(const chunk of chunks ){
            const embedding = await openAi.embeddings.create({
                model: "text-embedding-3-small",
                // The input data that needs to be processed and converted into a vector embedding
                input: chunk,
                // Define the encoding format for the generated embedding, "float" indicates the use of floating-point numbers in the output embedding vector
                encoding_format: "float"
            });

            /* Example Embedding response
                {
                    "object": "list",
                    "data": [
                        {
                        "object": "embedding",
                        "index": 0,
                        "embedding": [
                            -0.006929283495992422,
                            -0.005336422007530928,
                            ... (omitted for spacing)
                            -4.547132266452536e-05,
                            -0.024047505110502243
                        ],
                        }
                    ],
                    "model": "text-embedding-3-small",
                    "usage": {
                        "prompt_tokens": 5,
                        "total_tokens": 5
                    }
                }
            */
            // Fetch the embedding(an array of numbers) from the response, refer ↑
            const vector = embedding.data[0].embedding

            const res = await collection.insertOne({
                $vector: vector,
                text: chunk
            });

            console.log(`The response: ${res}`);
            
        }
    }
}

createCollection().then(() => loadSampleData())



/*

The dimension size of the embedding model must match the one used by OpenAI or any other embedding provider because it ensures the embeddings generated by the model can be correctly stored and compared in your vector database. Here's why:

1. Consistency in Embedding Representation
 - Embedding models like those provided by OpenAI (e.g., text-embedding-ada-002) produce fixed-size vector embeddings of a specific dimension (e.g., 1536 for OpenAI's text-embedding-ada-002).
 - If your vector database expects a different dimension size, the embeddings generated by the model will not match the expected input shape, leading to errors during storage or queries.

2. Correct Distance Calculations
 - Similarity search techniques (like dot product, cosine similarity, or Euclidean distance) rely on vectors being of the same dimension for meaningful comparisons.
 - If the dimensions differ, these similarity metrics cannot operate as intended, and the results of similarity searches will be invalid.

3. Avoiding Data Loss
 - When creating a collection with a specified dimension size, the database assumes all vectors stored will conform to that size.
 - If the dimensions don't align, truncation or padding might occur, leading to loss of information or introducing noise, which degrades search accuracy.

4. Embedding Model-Specific Design
 - The embedding dimension is an integral part of the embedding model's design and training. It captures the semantic structure of the data within this dimensional space.
 - Changing the dimension would disrupt the semantic fidelity and make the embeddings incompatible with the vector database designed to use them.

-------------------

The 1536 in createCollection()[ln: 63] matches the embedding dimension of OpenAI's text-embedding-ada-002 model. By ensuring this, you:

Avoid runtime errors.
 - Ensure the vector similarity metrics yield accurate results.
 - Maintain compatibility with the OpenAI embeddings you are generating.
If you were using an embedding model with a different dimension size (e.g., 1024), you'd need to update the dimension in your vector database to match that model.








*/