import { searchVectors } from "../../lib/milvus";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { text, topK = 5 } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    // 1. 生成 embedding（同样使用免费代理）
    const embedResp = await fetch("https://api.openai-proxy.xyz/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text
      })
    }).then(r => r.json());

    const vector = embedResp.data[0].embedding;

    // 2. 搜索向量
    const searchResult = await searchVectors("proposals", vector, topK);

    return res.json({
      status: "ok",
      vector_length: vector.length,
      result: searchResult
    });

  } catch (e) {
    console.error("[searchSimilar ERROR]", e);
    return res.status(500).json({ error: e.message });
  }
}