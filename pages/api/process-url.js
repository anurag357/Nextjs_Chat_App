import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from "@langchain/openai";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY, // optional if local
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Load content from URL
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    const content = docs[0].pageContent;
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(content);
    
    // Generate embeddings and store in Qdrant
    const collectionName = `url_${Date.now()}`;
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
              document: url,
              chunk: i + 1,
            },
          },
        ],
      });
    }

    res.status(200).json({ 
      success: true, 
      collectionName,
      content,
      chunks: chunks.length 
    });
  } catch (error) {
    console.error('Error processing URL:', error);
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