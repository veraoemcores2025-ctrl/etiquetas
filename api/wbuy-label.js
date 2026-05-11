import { createWbuyLabelPdfByOrderId } from "../lib/wbuy-label.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const { pdf } = await createWbuyLabelPdfByOrderId(req.query.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="etiqueta_wbuy_${req.query.id || "pedido"}_4x6.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, details: error.details });
  }
}
