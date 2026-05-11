import { wbuyRequest } from "../lib/wbuy.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const data = await wbuyRequest("/store/");
    res.status(200).json({ ok: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, details: error.details });
  }
}
