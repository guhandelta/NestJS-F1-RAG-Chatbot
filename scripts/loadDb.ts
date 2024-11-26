// The file that will primarily be responsible for loading the data into the DataStax DB
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

// When loading teh Webpages, which contain a lot of content in this case about Formula One, when we ask LLMs questions, they work best when we feed them just enough for them to give an accurate answer so we will split up large bodies of texts into a smaller chunks that are easily searchable and digestible
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

const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

// Split the data into chunks
const splitter = new RecursiveCharacterTextSplitter({
    // Total number of characters in each chunk
    chunkSize: 512,
    // The overlapping characters between chunks. This helps us preserve the cross chunk context
    chunkOverlap: 100
});


const createCollection = async ( similarityMetric: SimilarityMetric = "dot_product" ) => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, { vector: {
        // This is important as the dimension size should match. The embedding size for text-embedding-3-small Open AI is 1536, and the embedding size in DataStax for open AI is 1536, which matches here.
        dimension: 1536,
        metric: similarityMetric
    } })

    console.log("Response:\t", res);
    
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
        }
    }
}