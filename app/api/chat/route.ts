// Send on the data from the DB to the app, Use OpenAI to make the data more readable

import { DataAPIClient } from "@datastax/astra-db-ts";
import { OpenAIStream, StreamingTextResponse } from "@vercel/ai-utils";
import OpenAI from "openai";

const { ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    OPENAI_API_KEY 
} = process.env;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Create a new DataStax Astra client to connect to the database
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE});

export async function POST(req: Request){
    try {
        const { messages } = await req.json();
        // Pass in the text input
        const latests = messages[messages.length - 1]?.content;

        let docContext;

        // Turn it into a vector embedding
        const embedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: latests,
            encoding_format: "float"
        });

        // Once the embedding is available, save it in the collection that currently being used
        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION!);
            // Find something similar to the input text's vector embedding, in the database
            const cursor = await collection.find(null, {
                // To find the x most closer things to the input text's vector embedding
                sort:{
                    // Embedding object is an object that has data and array of data has the first item and get the embedding from it, which was the array of lots of lots of numbers 
                    // Limit this answer by 10, so we're gonna get 10 items
                    $vector: embedding.data[0].embedding,
                },
                limit: 10
                
            });

            const documents = await cursor.toArray();

            // Get the text from the documents
            const docMap = documents?.map((doc) => doc.text)

            docContext = JSON.stringify(docMap);

        } catch (error) {
            console.log(`Error querrying DB:\t ${error}`);
            // If there is an error, set the docContext to an empty string
            docContext = ""
        }

        // The template of what that will be sent to OpenAI
        // const template = {
        //     role: "system",
        //     content: `You are an AI assistant who knows everything about Formula One. 

        //     Format responses using markdown where applicable and don't return images.
        //     ------------------
        //     START CONTEXT 

        //     END CONTEXT
        //     ------------------
        //     Question: ${latests}
        //     ------------------
        //     `
        // };
        const template = {
            role: "system",
            content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
            If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            ------------------
            START CONTEXT 
            ${docContext}
            END CONTEXT
            ------------------
            Question: ${latests}
            ------------------
            `
        };

        const res = await openai.chat.completions.create({
            model: "gpt-4",
            stream: true,
            messages: [template, ...messages]
        });

        const stream = OpenAIStream(res);

        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        });
    } catch (error) {
        console.log(`Error in POST request:\t ${error}`);
        return new Response("Error", {status: 500});
    }
}