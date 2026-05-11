import { PDFDocument } from "pdf-lib";

export const maxLabelsPerFile = 200;

export function extractZplLabels(zpl) {
  if (Array.isArray(zpl)) zpl = zpl.join("\n");
  zpl = String(zpl || "");

  const allBlocks = [...zpl.matchAll(/\^XA[\s\S]*?\^XZ/g)].map(match => match[0]);
  const graphicJobs = zpl.match(/~DGR[\s\S]*?(?=\r?\n~DGR|$)/g) || [];

  if (graphicJobs.length) {
    return { labels: graphicJobs, setup: "", rawBlocks: allBlocks.length };
  }

  return {
    labels: allBlocks.filter(block => !/\^ID/.test(block)),
    setup: "",
    rawBlocks: allBlocks.length
  };
}

export function buildBatches(labels, setup, batchSize) {
  const batches = [];

  for (let index = 0; index < labels.length; index += batchSize) {
    const chunk = labels.slice(index, index + batchSize);
    batches.push({
      index: batches.length + 1,
      start: index + 1,
      end: index + chunk.length,
      count: chunk.length,
      zpl: `${setup}${chunk.join("\n")}`
    });
  }

  return batches;
}

export function enforceLabelLimit(labels) {
  if (labels.length > maxLabelsPerFile) {
    const error = new Error(`Este arquivo tem ${labels.length} etiquetas. No inicio, a plataforma aceita ate ${maxLabelsPerFile} por arquivo.`);
    error.statusCode = 400;
    throw error;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function zplToPdf(zpl, density, size, attempt = 1) {
  const response = await fetch(`https://api.labelary.com/v1/printers/${density}/labels/${size}/`, {
    method: "POST",
    headers: { Accept: "application/pdf", "Content-Type": "application/x-www-form-urlencoded" },
    body: zpl
  });

  if (!response.ok) {
    const text = await response.text();
    const shouldRetry = response.status === 429 || /rate limit/i.test(text);

    if (shouldRetry && attempt < 4) {
      await wait(1200 * attempt);
      return zplToPdf(zpl, density, size, attempt + 1);
    }

    throw new Error(text || "A conversao para PDF falhou.");
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function mergePdfs(pdfBuffers) {
  const merged = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const source = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }

  return Buffer.from(await merged.save());
}

export async function createCompletePdf({ zpl, density = "8dpmm", size = "4x6", batchSize = 10 }) {
  const { labels, setup, rawBlocks } = extractZplLabels(zpl);

  if (!labels.length) {
    const error = new Error("Nao encontrei etiquetas ZPL. O arquivo precisa ter blocos ^XA ... ^XZ.");
    error.statusCode = 400;
    throw error;
  }

  enforceLabelLimit(labels);

  const batches = buildBatches(labels, setup, batchSize);
  const pdfParts = [];

  for (const batch of batches) {
    pdfParts.push(await zplToPdf(batch.zpl, density, size));
    await wait(350);
  }

  return {
    pdf: await mergePdfs(pdfParts),
    total: labels.length,
    rawBlocks
  };
}
