import { createCollectionIfNotExists, insertVectors } from "../../lib/milvus";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Missing title or content" });
  }

  try {
    // 1. 创建集合（如果不存在）
    await createCollectionIfNotExists("proposals", 1536);

    // 2. 调用 OpenAI 免费代理生成 embedding
    const embedResp = await fetch("https://api.openai-proxy.xyz/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: `${title}\n${content}`
      })
    }).then(r => r.json());

    const vector = embedResp.data[0].embedding;

    // 3. 插入向量数据库
    const record = {
      id: `p_${Date.now()}`,
      title,
      content,
      vector
    };

    const result = await insertVectors("proposals", [record]);

    return res.json({
      status: "ok",
      inserted: true,
      record,
      zilliz: result
    });

  } catch (e) {
    console.error("[insertProposal ERROR]", e);
    return res.status(500).json({ error: e.message });
  }
}