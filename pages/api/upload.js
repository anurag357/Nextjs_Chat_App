import { IncomingForm } from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from "@langchain/openai";

// Configure Qdrant client
const qdrantClient = new QdrantClient({
  host: process.env.QDRANT_HOST || 'localhost',
  port: process.env.QDRANT_PORT || 6333,
});

// Configure OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    form.uploadDir = './uploads';
    form.keepExtensions = true;

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(500).json({ message: 'Error parsing form data' });
      }

      const processedFiles = [];
      const fileArray = Array.isArray(files.files) ? files.files : [files.files];

      for (const file of fileArray) {
        try {
          let text = '';
          const fileExtension = file.originalFilename.split('.').pop().toLowerCase();

          // Extract text based on file type
          if (fileExtension === 'pdf') {
            const dataBuffer = fs.readFileSync(file.filepath);
            const data = await pdf(dataBuffer);
            text = data.text;
          } else if (['txt', 'md'].includes(fileExtension)) {
            text = fs.readFileSync(file.filepath, 'utf8');
          } else if (['docx', 'doc'].includes(fileExtension)) {
            // For DOCX files, you would need to use a library like mammoth
            // This is a placeholder implementation
            text = 'DOCX content extraction would be implemented here';
          } else {
            console.log(`Unsupported file type: ${fileExtension}`);
            continue;
          }

          // Split text into chunks
          const chunks = splitTextIntoChunks(text);
          
          // Generate embeddings and store in Qdrant
          const collectionName = `documents_${Date.now()}`;
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
                    document: file.originalFilename,
                    chunk: i + 1,
                  },
                },
              ],
            });
          }

          processedFiles.push({
            id: collectionName,
            name: file.originalFilename,
            type: fileExtension,
            size: Math.round(file.size / 1024) + ' KB'
          });

          // Clean up uploaded file
          fs.unlinkSync(file.filepath);

        } catch (error) {
          console.error(`Error processing file ${file.originalFilename}:`, error);
        }
      }

      res.status(200).json({ processedFiles });
    });
  } catch (error) {
    console.error('Error in upload API:', error);
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