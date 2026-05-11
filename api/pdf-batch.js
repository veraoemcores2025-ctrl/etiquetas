import { buildBatches, enforceLabelLimit, extractZplLabels, zplToPdf } from "../lib/zpl.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const { zpl, density = "8dpmm", size = "4x6" } = req.body || {};
    const batchSize = Math.max(1, Math.min(100, Number(req.body?.batchSize) || 10));
    const batchIndex = Math.max(1, Number(req.body?.batchIndex) || 1);
    const { labels, setup } = extractZplLabels(zpl || "");
    enforceLabelLimit(labels);
    const batch = buildBatches(labels, setup, batchSize)[batchIndex - 1];

    if (!batch) {
      res.status(404).json({ error: "Lote nao encontrado." });
      return;
    }

    const pdf = await zplToPdf(batch.zpl, density, size);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="etiquetas_lote_${batch.index}_${batch.start}-${batch.end}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}
