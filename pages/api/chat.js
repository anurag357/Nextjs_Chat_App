import { QdrantClient } from "@qdrant/js-client-rest";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  openAIApiKey: process.env.OPENAI_API_KEY,
});
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, documentIds } = req.body;

    // Embed the user’s question
    const questionEmbedding = await embeddings.embedQuery(question);

    let docs = [];
    for (const collectionName of documentIds) {
      try {
        const searchResult = await qdrantClient.search(collectionName, {
          vector: questionEmbedding,
          limit: 3,
          with_payload: true,
        });
        docs.push(...searchResult);
      } catch (err) {
        console.error(`Error searching in collection ${collectionName}:`, err);
      }
    }

    const context = docs.map(d => d.payload?.text || "").join("\n\n");

    const prompt = `
You are an assistant. Use the following context to answer the question:

Context:
${context}

Question: ${question}
Answer:
`;

    // ✅ Use invoke, not call
    const answer = await model.invoke(prompt);

    res.status(200).json({ answer: answer.content || answer.text || "" });
  } catch (error) {
    console.error("Error in chat API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
