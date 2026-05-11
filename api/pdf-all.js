import { createCompletePdf } from "../lib/zpl.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const { zpl, density = "8dpmm", size = "4x6" } = req.body || {};
    const { pdf } = await createCompletePdf({ zpl, density, size });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="etiquetas_completo_4x6.pdf"');
    res.status(200).send(pdf);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}
