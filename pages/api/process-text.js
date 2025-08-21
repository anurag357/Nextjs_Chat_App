import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from "@langchain/openai";

const qdrantClient = new QdrantClient({
  host: process.env.QDRANT_HOST || 'localhost',
  port: process.env.QDRANT_PORT || 6333,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    
    // Generate embeddings and store in Qdrant
    const collectionName = `text_${Date.now()}`;
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: 1536, distance: 'Cosine' },
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embeddings.embedQuery(chunk);
      
      await qdrantClient.upsert(collectionName, {
        points: [
          {
            id: i + 1,
            vector: embedding,
            payload: {
              text: chunk,
              document: 'Pasted Text',
              chunk: i + 1,
            },
          },
        ],
      });
    }

    res.status(200).json({ 
      success: true, 
      collectionName,
      chunks: chunks.length 
    });
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at a sentence end
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end);
      const nextNewline = text.indexOf('\n', end);
      
      if (nextPeriod !== -1 && nextPeriod < end + 100) {
        end = nextPeriod + 1;
      } else if (nextNewline !== -1 && nextNewline < end + 50) {
        end = nextNewline + 1;
      }
    }
    
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    if (start < 0) start = 0;
  }
  
  return chunks;
}