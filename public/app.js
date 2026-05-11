const state = {
  zpl: "",
  fileName: "",
  batches: [],
  total: 0,
  limit: 200
};

const fileInput = document.querySelector("#fileInput");
const fileName = document.querySelector("#fileName");
const batchSize = document.querySelector("#batchSize");
const labelSize = document.querySelector("#labelSize");
const density = document.querySelector("#density");
const printerName = document.querySelector("#printerName");
const analyzeBtn = document.querySelector("#analyzeBtn");
const downloadFullPdfBtn = document.querySelector("#downloadFullPdfBtn");
const printAllBtn = document.querySelector("#printAllBtn");
const downloadAllBtn = document.querySelector("#downloadAllBtn");
const summary = document.querySelector("#summary");
const totalLabels = document.querySelector("#totalLabels");
const totalBatches = document.querySelector("#totalBatches");
const rawBlocks = document.querySelector("#rawBlocks");
const recommendation = document.querySelector("#recommendation");
const batchRows = document.querySelector("#batchRows");
const statusDialog = document.querySelector("#statusDialog");
const statusText = document.querySelector("#statusText");
const closeDialog = document.querySelector("#closeDialog");
const resultPanel = document.querySelector("#resultPanel");
const resultText = document.querySelector("#resultText");
const resultLink = document.querySelector("#resultLink");
const openDownloadsBtn = document.querySelector("#openDownloadsBtn");
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function showStatus(message) {
  statusText.textContent = message;
  if (!statusDialog.open) statusDialog.showModal();
}

function closeStatus() {
  statusDialog.close();
}

function downloadBlob(blob, filename, keepUrl = false) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (!keepUrl) {
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return url;
}

async function postJson(url, payload, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal
  });
  window.clearTimeout(timeout);

  if (!response.ok) {
    let error = "A operação falhou.";
    try {
      const data = await response.json();
      error = data.error || error;
    } catch {
      error = await response.text();
    }
    throw new Error(error);
  }

  return response;
}

function showPdfResult(url, filename, total, localPath) {
  resultLink.href = url;
  resultLink.download = filename;
  resultText.textContent = localPath
    ? `${total || state.total || ""} etiquetas salvas em: ${localPath}`.trim()
    : `${total || state.total || ""} etiquetas em PDF 100 x 150 mm.`.trim();
  resultPanel.hidden = false;
}

function payload(extra = {}) {
  return {
    zpl: state.zpl,
    batchSize: Number(batchSize.value) || 10,
    density: density.value,
    size: labelSize.value,
    printer: printerName.value || "LABEL",
    ...extra
  };
}

function setupEnvironment() {
  if (!isLocalhost) {
    downloadFullPdfBtn.textContent = "Baixar PDF completo 4x6";
    printAllBtn.hidden = true;
    printerName.closest("label").hidden = true;
    openDownloadsBtn.hidden = true;
  }
}

function renderBatches() {
  const hasFile = Boolean(state.zpl);

  if (!state.batches.length) {
    batchRows.innerHTML = '<tr class="empty-row"><td colspan="4">Escolha o arquivo para gerar os lotes.</td></tr>';
    downloadAllBtn.disabled = true;
    downloadFullPdfBtn.disabled = !hasFile;
    printAllBtn.disabled = !hasFile;
    return;
  }

  downloadAllBtn.disabled = false;
  downloadFullPdfBtn.disabled = false;
  printAllBtn.disabled = false;
  batchRows.innerHTML = state.batches.map(batch => `
    <tr>
      <td><strong>${batch.index}</strong></td>
      <td>${batch.start} a ${batch.end} (${batch.count})</td>
      <td>${Math.ceil(batch.bytes / 1024)} KB</td>
      <td>
        <div class="row-actions">
          <button class="secondary" data-action="zpl" data-index="${batch.index}" type="button">Baixar ZPL</button>
          <button data-action="pdf" data-index="${batch.index}" type="button">Baixar PDF</button>
          <button class="warning" data-action="print" data-index="${batch.index}" type="button">Imprimir direto</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function analyze() {
  if (!state.zpl) {
    showStatus("Escolha um arquivo ZPL/TXT primeiro.");
    return;
  }

  try {
    const data = analyzeZplLocally(state.zpl, Number(batchSize.value) || 10);
    state.batches = data.batches;
    state.total = data.total;
    state.limit = data.limit || 200;
    totalLabels.textContent = data.total;
    totalBatches.textContent = data.batches.length;
    rawBlocks.textContent = data.rawBlocks || data.total;
    recommendation.textContent = `${data.total}/${state.limit} etiquetas`;
    summary.hidden = false;
    renderBatches();
  } catch (error) {
    showStatus(error.message);
  }
}

function analyzeZplLocally(zpl, requestedBatchSize) {
  const maxLabels = 200;
  const batch = Math.max(1, Math.min(100, requestedBatchSize));
  const rawBlocks = [...zpl.matchAll(/\^XA[\s\S]*?\^XZ/g)].map(match => match[0]);
  const graphicJobs = zpl.match(/~DGR[\s\S]*?(?=\r?\n~DGR|$)/g) || [];
  const labels = graphicJobs.length ? graphicJobs : rawBlocks.filter(block => !/\^ID/.test(block));

  if (!labels.length) {
    throw new Error("Nao encontrei etiquetas ZPL. O arquivo precisa ter blocos ^XA ... ^XZ.");
  }

  if (labels.length > maxLabels) {
    throw new Error(`Este arquivo tem ${labels.length} etiquetas. No inicio, a plataforma aceita ate ${maxLabels} por arquivo.`);
  }

  const batches = [];
  for (let index = 0; index < labels.length; index += batch) {
    const chunk = labels.slice(index, index + batch);
    batches.push({
      index: batches.length + 1,
      start: index + 1,
      end: index + chunk.length,
      count: chunk.length,
      bytes: new Blob([chunk.join("\n")]).size
    });
  }

  return {
    total: labels.length,
    rawBlocks: rawBlocks.length,
    limit: maxLabels,
    batchSize: batch,
    batches
  };
}

async function downloadBatch(index, type) {
  const endpoint = type === "pdf" ? (isLocalhost ? "/api/pdf" : "/api/pdf-batch") : "/api/batch";
  showStatus(type === "pdf" ? "Gerando PDF do lote..." : "Gerando arquivo ZPL do lote...");
  try {
    const response = await postJson(endpoint, payload({ batchIndex: index }));
    const blob = await response.blob();
    const batch = state.batches.find(item => item.index === index);
    const ext = type === "pdf" ? "pdf" : "zpl";
    downloadBlob(blob, `etiquetas_lote_${index}_${batch.start}-${batch.end}.${ext}`);
    closeStatus();
  } catch (error) {
    showStatus(error.message);
  }
}

async function printBatch(index) {
  const batch = state.batches.find(item => item.index === index);
  const ok = window.confirm(
    `Isso vai enviar o lote ${index} (${batch.count} etiqueta(s)) direto para a impressora ${printerName.value || "LABEL"}.\n\n` +
    "Teste primeiro com lote pequeno. Se sair código impresso no papel, pare e use PDF."
  );

  if (!ok) return;

  showStatus("Enviando ZPL direto para a impressora...");
  try {
    const response = await postJson("/api/print", payload({ batchIndex: index }));
    const data = await response.json();
    showStatus(data.message || "Enviado para a impressora.");
  } catch (error) {
    showStatus(error.message);
  }
}

async function downloadAllZpl() {
  for (const batch of state.batches) {
    await downloadBatch(batch.index, "zpl");
  }
}

async function downloadFullPdf() {
  if (!state.zpl) return;

  showStatus(isLocalhost ? "Gerando PDF e salvando na pasta Downloads..." : "Gerando PDF para download...");
  try {
    if (isLocalhost) {
      const response = await postJson("/api/pdf-all-save", payload());
      const data = await response.json();
      showPdfResult(data.url, data.filename, data.total, data.localPath);
      showStatus(`PDF salvo em Downloads: ${data.filename}`);
      return;
    }

    const response = await postJson("/api/pdf-all", payload());
    const blob = await response.blob();
    const filename = "etiquetas_completo_4x6.pdf";
    const url = downloadBlob(blob, filename, true);
    showPdfResult(url, filename, state.total);
    showStatus("PDF pronto. Se o download nao iniciou, clique em Baixar novamente na faixa verde.");
  } catch (error) {
    const message = error.name === "AbortError" ? "A geração demorou demais. Tente baixar por lotes menores." : error.message;
    showStatus(`${message} Se isso acontecer, use os botões Baixar PDF por lote.`);
  }
}

async function openDownloads() {
  try {
    await postJson("/api/open-downloads", {});
  } catch (error) {
    showStatus(error.message);
  }
}

async function printAll() {
  if (!state.zpl) return;

  const ok = window.confirm(
    `Isso vai enviar o arquivo ZPL inteiro para a impressora ${printerName.value || "LABEL"}.\n\n` +
    "Use somente se sua impressora aceitar ZPL. Se sair código/texto no papel, cancele as próximas impressões e use Baixar PDF completo 4x6."
  );

  if (!ok) return;

  showStatus("Enviando todas as etiquetas para a impressora...");
  try {
    const response = await postJson("/api/print-all", payload(), 20000);
    const data = await response.json();
    showStatus(data.message || "Enviado para a impressora.");
  } catch (error) {
    const message = error.name === "AbortError"
      ? "A impressão direta não respondeu. Use Baixar PDF completo 4x6 e imprima pelo leitor de PDF."
      : error.message;
    showStatus(message);
  }
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  state.fileName = file.name;
  state.zpl = await file.text();
  fileName.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  state.batches = [];
  summary.hidden = true;
  resultPanel.hidden = true;
  renderBatches();
  analyze();
});

setupEnvironment();
analyzeBtn.addEventListener("click", analyze);
downloadFullPdfBtn.addEventListener("click", downloadFullPdf);
printAllBtn.addEventListener("click", printAll);
downloadAllBtn.addEventListener("click", downloadAllZpl);
closeDialog.addEventListener("click", closeStatus);
openDownloadsBtn.addEventListener("click", openDownloads);
batchSize.addEventListener("change", () => {
  if (state.zpl) analyze();
});

batchRows.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;

  if (action === "zpl") downloadBatch(index, "zpl");
  if (action === "pdf") downloadBatch(index, "pdf");
  if (action === "print") printBatch(index);
});
