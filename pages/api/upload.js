import { IncomingForm } from "formidable";
import pdf from "pdf-parse";
import mammoth from "mammoth"; // for DOCX text extraction
import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";
import formidable from "formidable";
import fs from "fs";


export const config = {
  api: {
    bodyParser: false,
  },
};
// --- Setup Qdrant Client ---
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY, // optional if local
});

// --- Setup OpenAI Embeddings ---
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});
// --- Helper: Parse Formidable as Promise ---
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// --- Helper: Split text into chunks ---
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break nicely
    if (end < text.length) {
      const nextPeriod = text.indexOf(".", end);
      const nextNewline = text.indexOf("\n", end);

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

// --- API Route Handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { files } = await parseForm(req);

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const processedFiles = [];

    for (const file of fileArray) {
      try {
        let text = "";
        const fileExtension = file.originalFilename.split(".").pop().toLowerCase();

        // --- Extract text depending on file type ---
        if (fileExtension === "pdf") {
          const dataBuffer = await fs.promises.readFile(file.filepath);
          const data = await pdf(dataBuffer);
          text = data.text;
        } else if (["txt", "md"].includes(fileExtension)) {
          text = await fs.promises.readFile(file.filepath, "utf8");
        } else if (["docx"].includes(fileExtension)) {
          const result = await mammoth.extractRawText({ path: file.filepath });
          text = result.value;
        } else {
          console.log(`Unsupported file type: ${fileExtension}`);
          continue;
        }

        // --- Split into chunks ---
        const chunks = splitTextIntoChunks(text);

        // --- Create Qdrant collection ---
        const collectionName = `documents_${Date.now()}`;
        await qdrantClient.createCollection(collectionName, {
          vectors: { size: 1536, distance: "Cosine" },
        });

        // --- Embed & Upload ---
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
          size: Math.round(file.size / 1024) + " KB",
        });
      } catch (error) {
        console.error(`Error processing file ${file.originalFilename}:`, error);
      }
    }

    return res.status(200).json({ processedFiles });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
