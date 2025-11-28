import { createCollectionIfNotExists, searchVectors, insertVectors } from "../../lib/milvus";

const EMBEDDING_API = "https://api.openai-proxy.xyz/v1/embeddings";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Missing title or content" });
  }

  try {
    const text = `${title}\n${content}`;

    // 1. 确保集合存在
    await createCollectionIfNotExists("proposals", 1536);

    // 2. embedding
    const embedResp = await fetch(EMBEDDING_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text
      })
    }).then(r => r.json());

    const vector = embedResp.data[0].embedding;

    // 3. 搜索相似记录
    const searchResult = await searchVectors("proposals", vector, 5);

    // 4. 插入当前提案
    await insertVectors("proposals", [
      {
        id: `p_${Date.now()}`,
        title,
        content,
        vector
      }
    ]);

    // 5. 自动分类（简单 keyword-based，可改 LLM）
    const lower = text.toLowerCase();
    let category = "general";
    if (lower.includes("token") || lower.includes("代币")) category = "tokenomics";
    if (lower.includes("治理") || lower.includes("dao")) category = "governance";

    // 6. 风险评估
    const risk = lower.includes("分叉") || lower.includes("紧急") ? "high" : "low";

    return res.json({
      status: "ok",
      category,
      risk,
      search: searchResult
    });

  } catch (e) {
    console.error("[analyze ERROR]", e);
    return res.status(500).json({ error: e.message });
  }
}