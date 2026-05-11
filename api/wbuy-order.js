import { findWbuyOrder } from "../lib/wbuy.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const result = await findWbuyOrder(req.query.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, details: error.details });
  }
}
