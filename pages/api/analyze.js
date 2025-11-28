import { createCollectionIfNotExists, searchVectors, insertVectors } from "../../lib/milvus";

const EMBED = "https://api.openai-proxy.xyz/v1/embeddings";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  const { title, content } = req.body;

  if (!title || !content)
    return res.status(400).json({ error: "Missing title/content" });

  try {
    await createCollectionIfNotExists("proposals", 1536);

    // ---------- Embedding ----------
    const embed = await fetch(EMBED, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: `${title}\n${content}`
      })
    }).then(r => r.json());

    const vector = embed.data[0].embedding;

    // ---------- 自动分类 ----------
    const lower = `${title} ${content}`.toLowerCase();
    let category = "general";
    if (lower.includes("token") || lower.includes("代币")) category = "tokenomics";
    if (lower.includes("治理") || lower.includes("dao")) category = "governance";

    let risk = "low";
    if (lower.includes("漏洞") || lower.includes("分叉") || lower.includes("紧急"))
      risk = "high";

    const id = `p_${Date.now()}`;

    // ---------- 写入 Zilliz ----------
    await insertVectors("proposals", [
      {
        id,
        title,
        content,
        category,
        risk,
        status: "pending",
        votes: 0,
        vector
      }
    ]);

    // ---------- 搜索相似提案 ----------
    const search = await searchVectors("proposals", vector, 5);

    return res.json({
      status: "ok",
      id,
      category,
      risk,
      search
    });

  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}