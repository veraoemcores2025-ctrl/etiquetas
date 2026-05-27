const state = {
  zpl: "",
  labels: [],
  zplFiles: [],
  batches: [],
  total: 0,
  limit: 200,
  labelRefs: [],
  shopeeOrders: [],
  separationSource: "",
  printHistory: {},
  productCodes: (() => {
    try {
      return JSON.parse(localStorage.getItem("productCodeCatalog") || "[]");
    } catch {
      return [];
    }
  })(),
  combo: {
    label: null,
    doc: null,
    pdfBuffer: null,
    refs: []
  },
  expedition: (() => {
    try {
      return JSON.parse(localStorage.getItem("expeditionStatus") || "{}");
    } catch {
      return {};
    }
  })()
};

const fileInput = document.querySelector("#fileInput");
const fileName = document.querySelector("#fileName");
const addMoreZplBtn = document.querySelector("#addMoreZplBtn");
const clearZplFilesBtn = document.querySelector("#clearZplFilesBtn");
const batchSize = document.querySelector("#batchSize");
const labelSize = document.querySelector("#labelSize");
const density = document.querySelector("#density");
const printerName = document.querySelector("#printerName");
const analyzeBtn = document.querySelector("#analyzeBtn");
const downloadFullPdfBtn = document.querySelector("#downloadFullPdfBtn");
const downloadAllBtn = document.querySelector("#downloadAllBtn");
const connectQzBtn = document.querySelector("#connectQzBtn");
const printQzBtn = document.querySelector("#printQzBtn");
const printPdfQzBtn = document.querySelector("#printPdfQzBtn");
const qzStatus = document.querySelector("#qzStatus");
const wbuyStatus = document.querySelector("#wbuyStatus");
const wbuyOrderId = document.querySelector("#wbuyOrderId");
const testWbuyBtn = document.querySelector("#testWbuyBtn");
const fetchWbuyOrderBtn = document.querySelector("#fetchWbuyOrderBtn");
const downloadWbuyLabelBtn = document.querySelector("#downloadWbuyLabelBtn");
const printWbuyLabelBtn = document.querySelector("#printWbuyLabelBtn");
const wbuyResultPanel = document.querySelector("#wbuyResultPanel");
const wbuyResultText = document.querySelector("#wbuyResultText");
const shopeeSheetInput = document.querySelector("#shopeeSheetInput");
const shopeeSheetName = document.querySelector("#shopeeSheetName");
const shopeeOrderCount = document.querySelector("#shopeeOrderCount");
const shopeeItemCount = document.querySelector("#shopeeItemCount");
const shopeeMatchedCount = document.querySelector("#shopeeMatchedCount");
const shopeeRows = document.querySelector("#shopeeRows");
const downloadSeparationPdfBtn = document.querySelector("#downloadSeparationPdfBtn");
const printSeparationBtn = document.querySelector("#printSeparationBtn");
const scanInput = document.querySelector("#scanInput");
const scanAction = document.querySelector("#scanAction");
const scanAutoSubmit = document.querySelector("#scanAutoSubmit");
const scanSubmitBtn = document.querySelector("#scanSubmitBtn");
const scanFocusBtn = document.querySelector("#scanFocusBtn");
const scanResult = document.querySelector("#scanResult");
const scanPendingCount = document.querySelector("#scanPendingCount");
const scanSeparatedCount = document.querySelector("#scanSeparatedCount");
const scanLabeledCount = document.querySelector("#scanLabeledCount");
const scanShippedCount = document.querySelector("#scanShippedCount");
const productBarcodeInput = document.querySelector("#productBarcodeInput");
const productNameInput = document.querySelector("#productNameInput");
const productVariationInput = document.querySelector("#productVariationInput");
const productLocationInput = document.querySelector("#productLocationInput");
const saveProductCodeBtn = document.querySelector("#saveProductCodeBtn");
const productCodeBulkInput = document.querySelector("#productCodeBulkInput");
const importProductCodesBtn = document.querySelector("#importProductCodesBtn");
const productLookupResult = document.querySelector("#productLookupResult");
const productCodeList = document.querySelector("#productCodeList");
const mobileScanVideo = document.querySelector("#mobileScanVideo");
const startCameraScanBtn = document.querySelector("#startCameraScanBtn");
const stopCameraScanBtn = document.querySelector("#stopCameraScanBtn");
const mobileScanAction = document.querySelector("#mobileScanAction");
const mobileScanResult = document.querySelector("#mobileScanResult");
const labelPreviewPanel = document.querySelector("#labelPreviewPanel");
const labelPreviewFrame = document.querySelector("#labelPreviewFrame");
let currentWbuyOrderId = "";
let currentPreviewUrl = "";
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
const compactPrintArea = document.querySelector("#compactPrintArea");
const dashboardOrders = document.querySelector("#dashboardOrders");
const dashboardLabels = document.querySelector("#dashboardLabels");
const dashboardReady = document.querySelector("#dashboardReady");
const dashboardQz = document.querySelector("#dashboardQz");
const dashboardHistory = document.querySelector("#dashboardHistory");
const boardPendingCount = document.querySelector("#boardPendingCount");
const boardSeparatedCount = document.querySelector("#boardSeparatedCount");
const boardLabeledCount = document.querySelector("#boardLabeledCount");
const boardShippedCount = document.querySelector("#boardShippedCount");
const themeToggle = document.querySelector("#themeToggle");
const printHistoryPanel = document.querySelector("#printHistoryPanel");
const historyTitle = document.querySelector("#historyTitle");
const historyText = document.querySelector("#historyText");
const historyList = document.querySelector("#historyList");
const removeCurrentDuplicatesBtn = document.querySelector("#removeCurrentDuplicatesBtn");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const comboLabelInput = document.querySelector("#comboLabelInput");
const comboDocInput = document.querySelector("#comboDocInput");
const comboLabelName = document.querySelector("#comboLabelName");
const comboDocName = document.querySelector("#comboDocName");
const comboOrientation = document.querySelector("#comboOrientation");
const comboLayout = document.querySelector("#comboLayout");
const comboPreviewText = document.querySelector("#comboPreviewText");
const combinePdfBtn = document.querySelector("#combinePdfBtn");
const printComboPdfBtn = document.querySelector("#printComboPdfBtn");
const viewPanels = document.querySelectorAll(".view-panel");
const viewLinks = document.querySelectorAll("[data-view-target]");

const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
let scanTimer = null;
let cameraStream = null;
let barcodeDetector = null;
let cameraScanLoop = 0;
let zxingMobileReader = null;
let zxingMobileControls = null;
let lastCameraScanAt = 0;
let lastCameraCode = "";
let lastCameraCodeAt = 0;
const PRINT_HISTORY_KEY = "printHistoryV1";
const PRINT_HISTORY_TTL = 7 * 24 * 60 * 60 * 1000;

function getZxingBrowser() {
  return window.ZXingBrowser || globalThis.ZXingBrowser || null;
}

function applyTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = safeTheme;
  if (themeToggle) {
    themeToggle.textContent = safeTheme === "dark" ? "Modo claro" : "Modo dark";
    themeToggle.setAttribute("aria-pressed", String(safeTheme === "dark"));
  }
  try {
    localStorage.setItem("uiTheme", safeTheme);
  } catch {
    // localStorage can be blocked in private windows.
  }
}

function loadPrintHistory() {
  try {
    state.printHistory = JSON.parse(localStorage.getItem(PRINT_HISTORY_KEY) || "{}");
  } catch {
    state.printHistory = {};
  }
  prunePrintHistory();
}

function savePrintHistory() {
  localStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(state.printHistory));
}

function prunePrintHistory() {
  const cutoff = Date.now() - PRINT_HISTORY_TTL;
  let changed = false;
  Object.entries(state.printHistory || {}).forEach(([key, item]) => {
    if (!item?.printedAt || new Date(item.printedAt).getTime() < cutoff) {
      delete state.printHistory[key];
      changed = true;
    }
  });
  if (changed) savePrintHistory();
}

function simpleHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

function labelHistoryKey(ref) {
  const value = ref?.orderId || ref?.tracking || ref?.recipient || ref?.fingerprint || "";
  return normalizeCode(value);
}

function labelHistoryLabel(ref) {
  return ref?.orderId || ref?.tracking || ref?.recipient || `Etiqueta ${ref?.labelNumber || ""}`.trim();
}

function refsForBatch(batchIndex) {
  const batch = state.batches.find(item => item.index === batchIndex);
  if (!batch) return [];
  return state.labelRefs.slice(batch.start - 1, batch.end);
}

function getDuplicateRefs(refs = state.labelRefs) {
  prunePrintHistory();
  return refs.filter(ref => {
    const key = labelHistoryKey(ref);
    return key && state.printHistory[key];
  });
}

function getDuplicateKeys(refs = state.labelRefs) {
  return new Set(getDuplicateRefs(refs).map(labelHistoryKey).filter(Boolean));
}

function registerPrintedRefs(refs, source) {
  const printedAt = new Date().toISOString();
  refs.forEach(ref => {
    const key = labelHistoryKey(ref);
    if (!key) return;
    state.printHistory[key] = {
      label: labelHistoryLabel(ref),
      source,
      printedAt
    };
  });
  savePrintHistory();
  updateHistoryPanel();
  updateDashboard();
}

function describeDuplicateRefs(refs) {
  return refs.slice(0, 8).map(ref => {
    const item = state.printHistory[labelHistoryKey(ref)];
    const date = item?.printedAt ? new Date(item.printedAt).toLocaleString("pt-BR") : "";
    return `${labelHistoryLabel(ref)}${date ? ` (${date})` : ""}`;
  }).join(", ");
}

function canPrintRefs(refs, actionName) {
  const duplicates = getDuplicateRefs(refs);
  if (!duplicates.length) return true;
  showStatus(
    `Atenção: ${duplicates.length} etiqueta(s) já foram impressas nos últimos 7 dias: ${describeDuplicateRefs(duplicates)}. Para ${actionName}, clique em Excluir repetidas ou limpe o histórico.`
  );
  return false;
}

function updateHistoryPanel() {
  prunePrintHistory();
  const entries = Object.values(state.printHistory || {})
    .sort((a, b) => new Date(b.printedAt) - new Date(a.printedAt));
  const currentDuplicates = getDuplicateRefs();

  dashboardHistory.textContent = entries.length;
  historyTitle.textContent = currentDuplicates.length
    ? `${currentDuplicates.length} etiqueta(s) deste arquivo já foram impressas`
    : entries.length
      ? `${entries.length} etiqueta(s) no histórico`
      : "Histórico de impressão vazio";
  historyText.textContent = currentDuplicates.length
    ? "A plataforma bloqueia PDF/impressão repetida para estas etiquetas. O histórico expira automaticamente em 7 dias."
    : "Quando você gerar PDF ou imprimir pela plataforma, as etiquetas ficam marcadas por 7 dias.";
  if (removeCurrentDuplicatesBtn) {
    removeCurrentDuplicatesBtn.hidden = !currentDuplicates.length || !state.labels.length;
  }
  historyList.hidden = !entries.length;
  historyList.innerHTML = entries.slice(0, 12).map(item => `
    <span>
      <strong>${escapeHtml(item.label || "Etiqueta")}</strong>
      <small>${escapeHtml(item.source || "impressão")} - ${escapeHtml(new Date(item.printedAt).toLocaleString("pt-BR"))}</small>
    </span>
  `).join("");
}

function clearPrintHistory() {
  state.printHistory = {};
  savePrintHistory();
  updateHistoryPanel();
  renderBatches();
  showStatus("Histórico de impressão limpo. Agora você pode gerar ou imprimir novamente.");
}

function wbuyHistoryRef() {
  return {
    orderId: currentWbuyOrderId,
    tracking: "",
    recipient: `wBuy ${currentWbuyOrderId}`,
    fingerprint: simpleHash(`wbuy:${currentWbuyOrderId}`),
    labelNumber: 1
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showStatus(message) {
  statusText.textContent = message;
  if (!statusDialog.open) statusDialog.showModal();
}

function activateView(view) {
  const requestedView = view || "dashboard";
  const nextView = document.querySelector(`.view-panel[data-view="${CSS.escape(requestedView)}"]`)
    ? requestedView
    : "dashboard";
  viewPanels.forEach(panel => {
    panel.classList.toggle("is-active", panel.dataset.view === nextView);
  });
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.viewTarget === nextView);
  });
  if (nextView !== "mobile-scan" && cameraStream) {
    stopCameraScanner();
  }
}

function updateDashboard() {
  const orders = state.shopeeOrders || [];
  const qzReady = Boolean(window.qz && qz.websocket.isActive());
  const counts = orders.reduce((acc, order) => {
    const status = getExpeditionEntry(order.orderId).status || "pendente";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  dashboardOrders.textContent = orders.length;
  dashboardLabels.textContent = state.total || 0;
  dashboardReady.textContent = orders.filter(order => order.items?.length && !order.fromZplOnly).length;
  dashboardQz.textContent = qzReady ? "QZ" : "PDF";
  boardPendingCount.textContent = counts.pendente || 0;
  boardSeparatedCount.textContent = counts.separado || 0;
  boardLabeledCount.textContent = counts.etiquetado || 0;
  boardShippedCount.textContent = counts.despachado || 0;
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

function pdfText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function drawPdfText(page, text, options) {
  page.drawText(pdfText(text), options);
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
    let error = "A operacao falhou.";
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

function payload(extra = {}) {
  return {
    zpl: state.zpl,
    batchSize: Number(batchSize.value) || 10,
    density: density.value,
    size: labelSize.value,
    ...extra
  };
}

function formatPdfFile(file) {
  if (!file) return "";
  return `${file.name} (${formatKb(file.size)})`;
}

function updateComboState() {
  const hasLabel = Boolean(state.combo.label?.bytes || state.combo.label?.zpl);
  const hasBothFiles = Boolean(hasLabel && state.combo.doc?.bytes);
  combinePdfBtn.disabled = !hasBothFiles;
  printComboPdfBtn.disabled = !state.combo.pdfBuffer;
  comboPreviewText.textContent = hasBothFiles
    ? "Pronto para gerar: se a etiqueta for ZPL, ela sera convertida antes de juntar com a DANFE/DDC."
    : "Escolha a etiqueta ZPL/PDF e a DANFE/DDC em PDF para liberar a montagem.";
}

function fitEmbeddedPage(embeddedPage, box) {
  const scale = Math.min(box.width / embeddedPage.width, box.height / embeddedPage.height);
  const width = embeddedPage.width * scale;
  const height = embeddedPage.height * scale;
  return {
    x: box.x + ((box.width - width) / 2),
    y: box.y + ((box.height - height) / 2),
    width,
    height
  };
}

function comboHistoryRef() {
  const labelName = state.combo.label?.name || "etiqueta";
  const docName = state.combo.doc?.name || "danfe-ddc";
  const labelSignature = state.combo.label?.zpl
    ? simpleHash(state.combo.label.zpl)
    : `${state.combo.label?.size || 0}`;
  return {
    recipient: `Combinado ${labelName}`,
    fingerprint: simpleHash(`combo:${labelName}:${labelSignature}:${docName}:${state.combo.doc?.size || 0}`),
    labelNumber: 1
  };
}

async function readComboLabelFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isZpl = name.endsWith(".zpl") || name.endsWith(".txt") || file.type === "text/plain";

  if (!isPdf && !isZpl) {
    showStatus("Escolha uma etiqueta em PDF, ZPL ou TXT.");
    input.value = "";
    return;
  }

  state.combo.label = {
    name: file.name,
    size: file.size,
    type: isPdf ? "pdf" : "zpl",
    bytes: isPdf ? await file.arrayBuffer() : null,
    zpl: isZpl ? await file.text() : ""
  };
  state.combo.pdfBuffer = null;
  state.combo.refs = [];
  comboLabelName.textContent = formatPdfFile(file);
  updateComboState();
}

async function readComboDocFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    showStatus("Escolha a DANFE/DDC em PDF.");
    input.value = "";
    return;
  }

  state.combo.doc = {
    name: file.name,
    size: file.size,
    bytes: await file.arrayBuffer()
  };
  state.combo.pdfBuffer = null;
  state.combo.refs = [];
  comboDocName.textContent = formatPdfFile(file);
  updateComboState();
}

async function getComboLabelPdfBytes() {
  if (state.combo.label?.bytes) return state.combo.label.bytes;
  if (!state.combo.label?.zpl) throw new Error("Suba uma etiqueta em ZPL/TXT ou PDF.");

  const response = await postJson("/api/pdf-all", {
    zpl: state.combo.label.zpl,
    density: density.value || "8dpmm",
    size: labelSize.value || "4x6"
  }, 180000);
  return response.arrayBuffer();
}

async function combineLabelAndDocPdf() {
  if ((!state.combo.label?.bytes && !state.combo.label?.zpl) || !state.combo.doc?.bytes) {
    showStatus("Suba a etiqueta ZPL/PDF e a DANFE/DDC PDF primeiro.");
    return;
  }
  if (!window.PDFLib) {
    showStatus("Motor de PDF nao carregou. Recarregue a pagina e tente novamente.");
    return;
  }

  const ref = comboHistoryRef();
  if (!canPrintRefs([ref], "gerar a etiqueta combinada")) return;

  try {
    showStatus(state.combo.label.type === "zpl"
      ? "Convertendo ZPL da Shopee e montando com a DANFE/DDC..."
      : "Montando etiqueta + DANFE/DDC em 10x15...");
    const { PDFDocument, rgb } = PDFLib;
    const mm = 72 / 25.4;
    const landscape = comboOrientation.value === "landscape";
    const pageWidth = (landscape ? 150 : 100) * mm;
    const pageHeight = (landscape ? 100 : 150) * mm;
    const margin = 4 * mm;
    const gap = 3 * mm;
    const output = await PDFDocument.create();
    const labelPdfBytes = await getComboLabelPdfBytes();
    const labelPdf = await PDFDocument.load(labelPdfBytes);
    const docPdf = await PDFDocument.load(state.combo.doc.bytes);
    const labelPages = labelPdf.getPages();
    const docPages = docPdf.getPages();
    const totalPages = Math.max(labelPages.length, docPages.length);
    const sideBySide = comboLayout.value === "side";

    for (let index = 0; index < totalPages; index += 1) {
      const page = output.addPage([pageWidth, pageHeight]);
      page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });

      const labelPage = labelPages[Math.min(index, labelPages.length - 1)];
      const docPage = docPages[Math.min(index, docPages.length - 1)];
      const embeddedLabel = await output.embedPage(labelPage);
      const embeddedDoc = await output.embedPage(docPage);

      const labelBox = sideBySide
        ? { x: margin, y: margin, width: (pageWidth - (margin * 2) - gap) / 2, height: pageHeight - (margin * 2) }
        : { x: margin, y: (pageHeight + gap) / 2, width: pageWidth - (margin * 2), height: (pageHeight - (margin * 2) - gap) / 2 };
      const docBox = sideBySide
        ? { x: labelBox.x + labelBox.width + gap, y: margin, width: labelBox.width, height: labelBox.height }
        : { x: margin, y: margin, width: labelBox.width, height: labelBox.height };

      page.drawPage(embeddedLabel, fitEmbeddedPage(embeddedLabel, labelBox));
      page.drawPage(embeddedDoc, fitEmbeddedPage(embeddedDoc, docBox));
    }

    const bytes = await output.save();
    state.combo.pdfBuffer = bytes;
    state.combo.refs = [ref];
    const filename = "etiqueta_danfe_ddc_10x15.pdf";
    const url = downloadBlob(new Blob([bytes], { type: "application/pdf" }), filename, true);
    showPdfResult(url, filename, totalPages);
    showLabelPreview(url);
    updateComboState();
    showStatus("PDF combinado pronto. Se o download nao iniciou, clique em Baixar novamente.");
  } catch (error) {
    showStatus(error.message || "Nao consegui montar a etiqueta + DANFE/DDC.");
  }
}

async function printComboPdf() {
  if (!state.combo.pdfBuffer) {
    showStatus("Gere o PDF combinado antes de imprimir.");
    return;
  }
  if (!canPrintRefs(state.combo.refs, "imprimir a etiqueta combinada")) return;

  try {
    showStatus("Enviando etiqueta + DANFE/DDC para a impressora...");
    await printPdfBufferWithQz(state.combo.pdfBuffer, "Etiqueta + DANFE/DDC enviada para a impressora.");
    registerPrintedRefs(state.combo.refs, "QZ etiqueta + DANFE/DDC");
    showStatus("Etiqueta + DANFE/DDC enviada pelo QZ Tray.");
  } catch (error) {
    showStatus(error.message || "Nao consegui imprimir a etiqueta combinada.");
  }
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatKb(bytes) {
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

function updateZplFileSummary() {
  const totalBytes = state.zplFiles.reduce((sum, file) => sum + file.size, 0);
  clearZplFilesBtn.disabled = !state.zplFiles.length;

  if (!state.zplFiles.length) {
    fileName.textContent = "Nenhum arquivo selecionado";
    return;
  }

  if (state.zplFiles.length === 1) {
    const file = state.zplFiles[0];
    fileName.textContent = `${file.name} (${formatKb(file.size)})`;
    return;
  }

  const names = state.zplFiles.slice(0, 3).map(file => file.name).join(" + ");
  const extra = state.zplFiles.length > 3 ? ` + ${state.zplFiles.length - 3} arquivo(s)` : "";
  fileName.textContent = `${state.zplFiles.length} arquivos combinados (${formatKb(totalBytes)}): ${names}${extra}`;
}

function resetZplOutputs() {
  state.batches = [];
  state.labelRefs = [];
  state.labels = [];
  summary.hidden = true;
  resultPanel.hidden = true;
  labelPreviewPanel.hidden = true;
  updateHistoryPanel();
  renderBatches();
}

async function addZplFiles(files) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) return;

  const known = new Set(state.zplFiles.map(file => file.key));
  const entries = [];

  for (const file of selectedFiles) {
    const key = fileKey(file);
    if (known.has(key)) continue;
    known.add(key);
    entries.push({
      key,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      text: await file.text()
    });
  }

  if (!entries.length) {
    showStatus("Esse arquivo ja esta na lista.");
    fileInput.value = "";
    return;
  }

  state.zplFiles.push(...entries);
  state.zpl = state.zplFiles.map(file => file.text).join("\n");
  updateZplFileSummary();
  resetZplOutputs();
  analyze();
  printQzBtn.disabled = !window.qz || !qz.websocket.isActive();
  printPdfQzBtn.disabled = !window.qz || !qz.websocket.isActive();
  fileInput.value = "";
}

function clearZplFiles() {
  state.zplFiles = [];
  state.zpl = "";
  if (state.separationSource === "zpl") {
    state.shopeeOrders = [];
    state.separationSource = "";
    shopeeSheetName.textContent = "Nenhuma planilha selecionada";
    renderShopeeSeparation();
  }
  fileInput.value = "";
  updateZplFileSummary();
  resetZplOutputs();
  downloadFullPdfBtn.disabled = true;
  downloadAllBtn.disabled = true;
  printQzBtn.disabled = true;
  printPdfQzBtn.disabled = true;
  updateDashboard();
}

function extractLabelRefs(label) {
  const orderIds = [...label.matchAll(/\b\d{6}[A-Z0-9]{6,}\b/g)].map(match => match[0]);
  const trackingIds = [
    ...label.matchAll(/\bBR[A-Z0-9]{10,18}\b/g),
    ...label.matchAll(/\b[A-Z]{2}\d{8,20}[A-Z0-9]{0,4}\b/g)
  ].map(match => match[0]);
  const zplTexts = [...label.matchAll(/\^FD([\s\S]*?)\^FS/g)]
    .map(match => match[1].replace(/\^FH\\?/g, "").replace(/_/g, " ").trim())
    .filter(text => text && !/^(DESTINATARIO|REMETENTE|PEDIDO|CEP|BAIRRO)$/i.test(text));
  const recipient = zplTexts.find(text =>
    /^[A-Za-zÀ-ÿ' ]{6,}$/.test(text) &&
    !/\d/.test(text) &&
    !/\b(RUA|AVENIDA|CEP|BAIRRO|SHOPEE|JADLOG|ENVIO)\b/i.test(text)
  );
  return {
    orderId: orderIds[0] || "",
    tracking: trackingIds[0] || "",
    recipient: recipient || "",
    texts: zplTexts
  };
}

function createOrdersFromZplRefs(labelRefs) {
  const orders = [];
  const seen = new Set();

  labelRefs.forEach((ref, index) => {
    const hasReadableData = Boolean(ref.orderId || ref.tracking || ref.recipient);
    if (!hasReadableData) return;

    const code = ref.orderId || ref.tracking || ref.recipient;
    const key = normalizeCode(code);
    if (seen.has(key)) return;
    seen.add(key);

    const city = (ref.texts || []).find(text =>
      /^[A-Za-zÀ-ÿ ]{3,}(\/[A-Z]{2})?$/.test(text) &&
      !/\b(DESTINATARIO|REMETENTE|SHOPEE|JADLOG|PEDIDO|CEP|BAIRRO)\b/i.test(text)
    ) || "";

    orders.push({
      orderId: code,
      tracking: ref.tracking || "",
      username: "",
      recipient: ref.recipient || `Etiqueta ${index + 1}`,
      labelRecipient: ref.recipient || "",
      address: "",
      shipping: "Criado pelo ZPL",
      city,
      uf: "",
      cep: "",
      fromZplOnly: true,
      zplLabelNumber: index + 1,
      items: [{
        product: "Etiqueta de envio importada por ZPL",
        variation: "Sem planilha Shopee",
        qty: 1
      }]
    });
  });

  return orders;
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCell(row, headers, names) {
  let fallback = "";
  for (const name of names) {
    for (let index = 0; index < headers.length; index += 1) {
      if (normalizeHeader(headers[index]) !== normalizeHeader(name)) continue;
      const value = String(row[index] ?? "").trim();
      if (value) return value;
      fallback = value;
    }
  }
  return fallback;
}

function parseShopeeRows(rows) {
  if (!rows.length) return [];

  const headers = rows[0].map(value => String(value || "").trim());
  const orders = new Map();

  for (const row of rows.slice(1)) {
    const orderId = getCell(row, headers, ["ID do pedido"]);
    if (!orderId) continue;

    const tracking = getCell(row, headers, ["Número de rastreamento", "Numero de rastreamento"]);
    const product = getCell(row, headers, ["Nome do Produto"]);
    const variation = getCell(row, headers, ["Nome da variação", "Nome da variacao"]);
    const sku = getCell(row, headers, [
      "Numero de referencia SKU",
      "NÃºmero de referÃªncia SKU",
      "Nº de referencia do SKU principal",
      "NÂº de referÃªncia do SKU principal"
    ]);
    const qty = Number(getCell(row, headers, ["Quantidade"])) || 1;

    if (!orders.has(orderId)) {
      orders.set(orderId, {
        orderId,
        tracking,
        username: getCell(row, headers, ["Nome de usuário (comprador)", "Nome de usuario (comprador)"]),
        recipient: getCell(row, headers, ["Nome do destinatário", "Nome do destinatario"]),
        address: getCell(row, headers, ["Endereço de entrega", "Endereco de entrega"]),
        shipping: getCell(row, headers, ["Opção de envio", "Opcao de envio", "Método de envio", "Metodo de envio"]),
        city: getCell(row, headers, ["Cidade"]),
        uf: getCell(row, headers, ["UF"]),
        cep: getCell(row, headers, ["CEP"]),
        items: []
      });
    }

    orders.get(orderId).items.push({ product, variation, sku, qty });
  }

  return [...orders.values()];
}

function isProtectedName(value) {
  const text = String(value || "").trim();
  return !text || text.includes("*") || /^N\*+/i.test(text);
}

function shortAddress(value) {
  return String(value || "")
    .split(",")
    .slice(0, 3)
    .map(part => part.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeCode(value) {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function getExpeditionEntry(orderId) {
  return state.expedition[orderId] || { status: "pendente", scans: [] };
}

function statusLabel(status) {
  return {
    pendente: "A separar",
    separado: "Separado",
    etiquetado: "Etiquetado",
    despachado: "Despachado"
  }[status] || "A separar";
}

function saveExpedition() {
  localStorage.setItem("expeditionStatus", JSON.stringify(state.expedition));
}

function setOrderStatus(orderId, status, scannedCode = "") {
  const entry = getExpeditionEntry(orderId);
  state.expedition[orderId] = {
    ...entry,
    status,
    lastScan: new Date().toISOString(),
    scans: [...(entry.scans || []), scannedCode].filter(Boolean).slice(-8)
  };
  saveExpedition();
}

function getOrderSearchText(order) {
  return normalizeCode([
    order.orderId,
    order.tracking,
    order.username,
    order.recipient,
    order.labelRecipient,
    order.address,
    ...order.items.flatMap(item => [item.product, item.variation, item.sku])
  ].filter(Boolean).join(" "));
}

function saveProductCodes() {
  localStorage.setItem("productCodeCatalog", JSON.stringify(state.productCodes.slice(0, 1000)));
}

function getProductSearchText(product) {
  return normalizeCode([product.name, product.variation, product.location].filter(Boolean).join(" "));
}

function findProductByScan(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  return (state.productCodes || []).find(product => normalizeCode(product.code) === code) || null;
}

function orderHasProduct(order, product) {
  const productText = getProductSearchText(product);
  const productCode = normalizeCode(product.code);
  const name = normalizeCode(product.name);
  const variation = normalizeCode(product.variation);
  if (!name && !variation && !productCode) return false;

  return (order.items || []).some(item => {
    if (productCode && normalizeCode(item.sku) === productCode) return true;
    const itemText = normalizeCode([item.product, item.variation, item.sku].filter(Boolean).join(" "));
    const nameMatches = name ? itemText.includes(name) || productText.includes(normalizeCode(item.product)) : true;
    const variationMatches = variation ? itemText.includes(variation) || variation.split(/[-|/]/).map(part => part.trim()).filter(Boolean).some(part => itemText.includes(normalizeCode(part))) : true;
    return nameMatches && variationMatches;
  });
}

function findOrdersByProduct(product) {
  return (state.shopeeOrders || []).filter(order => orderHasProduct(order, product));
}

function renderProductCodeList() {
  if (!productCodeList) return;
  const products = state.productCodes || [];
  if (!products.length) {
    productCodeList.innerHTML = '<div class="empty-product-codes">Nenhum codigo cadastrado ainda.</div>';
    return;
  }

  productCodeList.innerHTML = products.map(product => `
    <div class="product-code-row">
      <strong>${escapeHtml(product.code)}</strong>
      <span>${escapeHtml(product.name || "-")}</span>
      <em>${escapeHtml([product.variation, product.location].filter(Boolean).join(" | ") || "Sem variacao/local")}</em>
      <button type="button" data-remove-product-code="${encodeURIComponent(product.code)}">Remover</button>
    </div>
  `).join("");
}

function setProductLookupResult(product, orders) {
  if (!productLookupResult) return;
  const orderList = orders.slice(0, 8).map(order => `#${order.orderId}`).join(", ");
  productLookupResult.className = "product-lookup-result found";
  productLookupResult.innerHTML = `
    <strong>${escapeHtml(product.name || product.code)}</strong>
    <span>${escapeHtml([product.variation, product.location].filter(Boolean).join(" | ") || "Produto localizado")}</span>
    <small>${orders.length ? `${orders.length} pedido(s): ${orderList}${orders.length > 8 ? "..." : ""}` : "Nenhum pedido da planilha contem esse item."}</small>
  `;
}

function upsertProductCode(product) {
  const code = normalizeCode(product.code);
  if (!code || !product.name) return false;
  const next = {
    code,
    name: String(product.name || "").trim(),
    variation: String(product.variation || "").trim(),
    location: String(product.location || "").trim()
  };
  const index = state.productCodes.findIndex(item => normalizeCode(item.code) === code);
  if (index >= 0) state.productCodes[index] = next;
  else state.productCodes.unshift(next);
  saveProductCodes();
  renderProductCodeList();
  return true;
}

function handleSaveProductCode() {
  const saved = upsertProductCode({
    code: productBarcodeInput.value,
    name: productNameInput.value,
    variation: productVariationInput.value,
    location: productLocationInput.value
  });
  if (!saved) {
    productLookupResult.className = "product-lookup-result error";
    productLookupResult.textContent = "Preencha pelo menos codigo de barras e produto.";
    return;
  }
  productBarcodeInput.value = "";
  productNameInput.value = "";
  productVariationInput.value = "";
  productLocationInput.value = "";
  productLookupResult.className = "product-lookup-result found";
  productLookupResult.textContent = "Produto salvo. Agora pode bipar esse codigo no leitor.";
  productBarcodeInput.focus();
}

function handleImportProductCodes() {
  const lines = String(productCodeBulkInput.value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  let imported = 0;
  for (const line of lines) {
    const [code, name, variation = "", location = ""] = line.split(/[;\t]/).map(part => part.trim());
    if (upsertProductCode({ code, name, variation, location })) imported += 1;
  }
  productCodeBulkInput.value = "";
  productLookupResult.className = imported ? "product-lookup-result found" : "product-lookup-result error";
  productLookupResult.textContent = imported ? `${imported} produto(s) importado(s).` : "Nao encontrei linhas validas para importar.";
}

function findOrderByScan(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  return (state.shopeeOrders || []).find(order => {
    const keys = [order.orderId, order.tracking, order.username, order.recipient, order.labelRecipient]
      .filter(Boolean)
      .map(normalizeCode);
    return keys.includes(code) || keys.some(key => key.includes(code) || code.includes(key)) || getOrderSearchText(order).includes(code);
  }) || null;
}

function updateScanCounters() {
  const orders = state.shopeeOrders || [];
  const counts = orders.reduce((acc, order) => {
    const status = getExpeditionEntry(order.orderId).status || "pendente";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  scanPendingCount.textContent = counts.pendente || 0;
  scanSeparatedCount.textContent = counts.separado || 0;
  scanLabeledCount.textContent = counts.etiquetado || 0;
  scanShippedCount.textContent = counts.despachado || 0;
}

function focusOrderCard(orderId) {
  const card = document.querySelector(`[data-order-id="${CSS.escape(orderId)}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("scan-highlight");
  window.setTimeout(() => card.classList.remove("scan-highlight"), 1600);
}

function playScanTone(found) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = found ? 880 : 220;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    window.setTimeout(() => context.close(), 220);
  } catch {
    // Somente um retorno sonoro de conveniencia; se o navegador bloquear, a bipagem continua.
  }
}

function renderScanOutcome(target, found, title, detail) {
  target.className = found ? "scan-result scan-success" : "scan-result scan-error";
  target.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
}

function processScannedCode(rawCode, action, target = scanResult, focusManualInput = true) {
  const code = String(rawCode || "").trim();
  if (!code) {
    target.className = "scan-result";
    target.textContent = "Bipe ou digite um codigo primeiro.";
    if (focusManualInput) scanInput.focus();
    return false;
  }

  const order = findOrderByScan(code);
  if (!order) {
    const product = findProductByScan(code);
    if (product) {
      const orders = findOrdersByProduct(product);
      if (orders[0]) focusOrderCard(orders[0].orderId);
      setProductLookupResult(product, orders);
      renderScanOutcome(
        target,
        true,
        `Produto localizado: ${product.name}`,
        `${product.variation || "Sem variacao"}${product.location ? ` - ${product.location}` : ""} - ${orders.length} pedido(s) com esse item`
      );
      playScanTone(true);
      if (focusManualInput) scanInput.select();
      return true;
    }

    renderScanOutcome(
      target,
      false,
      "Nao encontrei esse codigo.",
      "Confira se a planilha da Shopee ja foi subida ou cadastre esse codigo como produto."
    );
    playScanTone(false);
    if (focusManualInput) scanInput.select();
    return false;
  }

  if (action !== "localizar") {
    setOrderStatus(order.orderId, action, code);
  }

  renderShopeeSeparation();
  focusOrderCard(order.orderId);
  renderScanOutcome(
    target,
    true,
    `${statusLabel(getExpeditionEntry(order.orderId).status)}: pedido ${order.orderId}`,
    `${order.tracking || "Sem rastreio"} - ${order.username || order.recipient || "cliente"}`
  );
  playScanTone(true);
  return true;
}

function handleScan() {
  const code = scanInput.value.trim();
  const found = processScannedCode(code, scanAction.value, scanResult, true);
  if (!found) return;
  scanInput.value = "";
  scanInput.focus();
}

function scheduleAutoScan() {
  if (!scanAutoSubmit.checked) return;
  window.clearTimeout(scanTimer);
  const code = scanInput.value.trim();
  if (code.length < 6) return;
  scanTimer = window.setTimeout(handleScan, 220);
}

function setMobileScanStatus(message, type = "") {
  mobileScanResult.className = `scan-result${type ? ` ${type}` : ""}`;
  mobileScanResult.textContent = message;
}

function canUseCameraScanner() {
  return Boolean(window.navigator?.mediaDevices?.getUserMedia && (window.BarcodeDetector || getZxingBrowser()));
}

async function ensureBarcodeDetector() {
  if (barcodeDetector) return barcodeDetector;
  try {
    const formats = [
      "qr_code",
      "code_128",
      "code_39",
      "code_93",
      "ean_13",
      "ean_8",
      "itf",
      "upc_a",
      "upc_e",
      "pdf417",
      "data_matrix"
    ];
    barcodeDetector = new BarcodeDetector({ formats });
  } catch {
    barcodeDetector = new BarcodeDetector();
  }
  return barcodeDetector;
}

async function scanCameraFrame() {
  if (!cameraStream || !barcodeDetector || !mobileScanVideo) return;
  const now = Date.now();

  if (now - lastCameraScanAt > 280 && mobileScanVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    lastCameraScanAt = now;
    try {
      const codes = await barcodeDetector.detect(mobileScanVideo);
      const rawValue = codes?.[0]?.rawValue?.trim();

      if (rawValue && (rawValue !== lastCameraCode || now - lastCameraCodeAt > 1500)) {
        lastCameraCode = rawValue;
        lastCameraCodeAt = now;
        scanInput.value = rawValue;
        scanAction.value = mobileScanAction.value;
        processScannedCode(rawValue, mobileScanAction.value, mobileScanResult, false);
      }
    } catch (error) {
      setMobileScanStatus(error.message || "Nao consegui ler a camera neste quadro.", "scan-error");
    }
  }

  cameraScanLoop = requestAnimationFrame(scanCameraFrame);
}

async function startCameraScanner() {
  if (!canUseCameraScanner()) {
    setMobileScanStatus("Este navegador nao liberou camera para leitura. Abra pelo Safari/Chrome atualizado e permita o acesso a camera.", "scan-error");
    return;
  }

  try {
    const zxing = getZxingBrowser();
    if (!window.BarcodeDetector && zxing) {
      zxingMobileReader = zxingMobileReader || new zxing.BrowserMultiFormatReader();
      zxingMobileControls = await zxingMobileReader.decodeFromVideoDevice(undefined, mobileScanVideo, (result) => {
        const rawValue = result?.getText?.() || result?.text || "";
        const now = Date.now();
        if (!rawValue || (rawValue === lastCameraCode && now - lastCameraCodeAt < 1500)) return;
        lastCameraCode = rawValue;
        lastCameraCodeAt = now;
        scanInput.value = rawValue;
        scanAction.value = mobileScanAction.value;
        processScannedCode(rawValue, mobileScanAction.value, mobileScanResult, false);
      });
      startCameraScanBtn.disabled = true;
      stopCameraScanBtn.disabled = false;
      setMobileScanStatus("Camera ativa no modo iPhone/Safari. Aponte para o codigo da etiqueta.", "scan-success");
      return;
    }

    barcodeDetector = await ensureBarcodeDetector();
    cameraStream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    mobileScanVideo.srcObject = cameraStream;
    await mobileScanVideo.play();
    startCameraScanBtn.disabled = true;
    stopCameraScanBtn.disabled = false;
    setMobileScanStatus("Camera ativa. Aponte para o QR Code ou codigo de barras.", "scan-success");
    cameraScanLoop = requestAnimationFrame(scanCameraFrame);
  } catch (error) {
    stopCameraScanner();
    setMobileScanStatus(error.message || "Permita o uso da camera para bipar pelo celular.", "scan-error");
  }
}

function stopCameraScanner() {
  if (cameraScanLoop) cancelAnimationFrame(cameraScanLoop);
  cameraScanLoop = 0;
  if (zxingMobileControls) {
    zxingMobileControls.stop();
    zxingMobileControls = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  cameraStream = null;
  if (mobileScanVideo) mobileScanVideo.srcObject = null;
  startCameraScanBtn.disabled = false;
  stopCameraScanBtn.disabled = true;
  setMobileScanStatus("Camera parada.");
}

function buildCompactSeparationHtml() {
  const { rows } = buildShopeeSeparationRows();
  const printedAt = new Date().toLocaleString("pt-BR");
  const cards = rows.map(({ order, labelNumber, matched }, index) => {
    const protectedName = isProtectedName(order.recipient);
    const displayName = order.labelRecipient || (protectedName ? order.username : order.recipient) || order.username || "-";
    const addressLine = shortAddress(order.address) || [order.city, order.uf].filter(Boolean).join(" / ");
    const status = statusLabel(getExpeditionEntry(order.orderId).status || "pendente");
    const items = order.items.map(item => {
      const variation = splitVariation(item.variation);
      return `
        <div class="item">
          <strong>${escapeHtml(item.qty)}x</strong>
          <span>${escapeHtml(item.product || "-")}</span>
          <em>${escapeHtml([variation.color, variation.size ? `Tam. ${variation.size}` : ""].filter(Boolean).join(" | "))}</em>
        </div>`;
    }).join("");

    return `
      <article class="order">
        <header>
          <b>#${index + 1}</b>
          <strong>${escapeHtml(order.orderId)}</strong>
          <span>${escapeHtml(status)}</span>
        </header>
        <div class="meta">
          <span>Etiqueta: <b>${escapeHtml(labelNumber || "-")}</b> ${matched ? "cruzada" : "planilha"}</span>
          <span>Rastreio: <b>${escapeHtml(order.tracking || "-")}</b></span>
        </div>
        <div class="customer">
          <b>${escapeHtml(displayName)}</b>
          <span>${protectedName && !order.labelRecipient ? "Nome protegido pela Shopee | " : ""}Usuario: ${escapeHtml(order.username || "-")}</span>
          <small>${escapeHtml(addressLine)}</small>
        </div>
        <div class="items">${items}</div>
        <footer>
          <label>Separado</label><label>Etiquetado</label><label>Despachado</label>
        </footer>
      </article>`;
  }).join("");

  return `
  <section class="head">
    <div>
      <h1>Mapa compacto de separacao</h1>
      <p>Verao em cores | ${rows.length} pedidos | ${printedAt}</p>
    </div>
    <p>Use para separar varios pedidos por folha.</p>
  </section>
  <main class="grid">${cards}</main>`;
}

function printCompactSeparation() {
  const { rows } = buildShopeeSeparationRows();
  if (!rows.length) {
    showStatus("Suba a planilha da Shopee primeiro.");
    return;
  }

  compactPrintArea.innerHTML = buildCompactSeparationHtml();
  document.body.classList.add("printing-compact");
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove("printing-compact");
  }, 600);
}

function buildShopeeSeparationRows() {
  const orders = state.shopeeOrders || [];
  const labelRefs = state.labelRefs || [];
  const byOrder = new Map(orders.map(order => [order.orderId, order]));
  const byTracking = new Map(orders.filter(order => order.tracking).map(order => [order.tracking, order]));
  const used = new Set();
  const matchedRows = [];

  labelRefs.forEach((ref, index) => {
    const order = byOrder.get(ref.orderId) || byTracking.get(ref.tracking);
    if (!order) return;
    if (isProtectedName(order.recipient) && ref.recipient) {
      order.labelRecipient = ref.recipient;
    }
    used.add(order.orderId);
    matchedRows.push({ order, labelNumber: index + 1, matched: true });
  });

  const rows = [
    ...matchedRows,
    ...orders.filter(order => !used.has(order.orderId)).map(order => ({
      order,
      labelNumber: order.zplLabelNumber || "",
      matched: Boolean(order.fromZplOnly)
    }))
  ];

  return { orders, matchedRows, rows };
}

function splitVariation(value) {
  const parts = String(value || "").split(",").map(part => part.trim()).filter(Boolean);
  return {
    color: parts[0] || value || "-",
    size: parts[1] || ""
  };
}

function renderShopeeSeparation() {
  const { orders, matchedRows, rows } = buildShopeeSeparationRows();

  shopeeOrderCount.textContent = orders.length;
  shopeeItemCount.textContent = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
  shopeeMatchedCount.textContent = matchedRows.length;
  downloadSeparationPdfBtn.disabled = !orders.length;
  printSeparationBtn.disabled = !orders.length;
  updateScanCounters();
  updateDashboard();

  if (!rows.length) {
    const zplWithoutReadableData = state.zpl && state.labelRefs.length && state.separationSource !== "sheet";
    shopeeRows.innerHTML = zplWithoutReadableData
      ? `<div class="empty-separation">
          <strong>ZPL sem nome/rastreio em texto.</strong><br>
          Esse arquivo parece ter vindo como imagem. Para o mapa mostrar cliente e itens, suba a planilha da Shopee junto com as etiquetas.
        </div>`
      : '<div class="empty-separation">Suba a planilha da Shopee ou um ZPL com texto legivel para montar o mapa de separacao.</div>';
    return;
  }

  shopeeRows.innerHTML = rows.map(({ order, labelNumber, matched }) => {
    const protectedName = isProtectedName(order.recipient);
    const displayName = order.labelRecipient || (protectedName ? order.username : order.recipient) || order.username;
    const addressLine = shortAddress(order.address) || [order.city, order.uf].filter(Boolean).join(" / ");
    const expedition = getExpeditionEntry(order.orderId);
    const status = expedition.status || "pendente";
    const stepNumber = { pendente: 1, separado: 2, etiquetado: 3, despachado: 4 }[status] || 1;
    return `
    <article class="separation-card status-${escapeHtml(status)}" data-order-id="${escapeHtml(order.orderId)}">
      <div class="separation-card-top">
        <div class="label-badge ${matched ? "matched" : ""}">
          <span>Etiqueta</span>
          <strong>${labelNumber || "-"}</strong>
        </div>
        <div class="order-main">
          <span class="table-note">Pedido Shopee</span>
          <strong>${escapeHtml(order.orderId)}</strong>
          <span class="table-note">${matched ? "Cruzado com etiqueta" : "Somente pela planilha"}</span>
        </div>
        <div class="customer-main">
          <span class="table-note">Cliente / destinatario</span>
          <strong>${escapeHtml(displayName)}</strong>
          <span class="privacy-note">${protectedName && !order.labelRecipient ? "Nome protegido pela Shopee" : "Nome para conferencia"}</span>
          <span class="table-note">Usuario: ${escapeHtml(order.username || "-")}</span>
          <span class="address-note">${escapeHtml(addressLine)}</span>
        </div>
        <div class="shipping-main">
          <span class="table-note">Rastreio</span>
          <strong>${escapeHtml(order.tracking || "-")}</strong>
          <span class="table-note">${escapeHtml([order.shipping, order.city || order.uf].filter(Boolean).join(" • "))}</span>
        </div>
        <div class="expedition-main">
          <span class="table-note">Status</span>
          <strong class="status-chip">${escapeHtml(statusLabel(status))}</strong>
          <div class="step-track" aria-label="Etapa ${stepNumber} de 4">
            <span class="${stepNumber >= 1 ? "done" : ""}"></span>
            <span class="${stepNumber >= 2 ? "done" : ""}"></span>
            <span class="${stepNumber >= 3 ? "done" : ""}"></span>
            <span class="${stepNumber >= 4 ? "done" : ""}"></span>
          </div>
          <div class="status-actions">
            <button type="button" data-expedition="separado" data-order-id="${escapeHtml(order.orderId)}">Separar</button>
            <button type="button" data-expedition="etiquetado" data-order-id="${escapeHtml(order.orderId)}">Etiqueta pronta</button>
            <button class="ship-action" type="button" data-expedition="despachado" data-order-id="${escapeHtml(order.orderId)}">Despachar</button>
          </div>
        </div>
      </div>
      <div class="pick-items">
        ${order.items.map(item => {
          const variation = splitVariation(item.variation);
          return `
            <div class="pick-item">
              <div class="qty-pill">${escapeHtml(item.qty)}x</div>
              <div class="pick-product">
                <strong>${escapeHtml(item.product)}</strong>
                <div>
                  <span>${escapeHtml(variation.color)}</span>
                  ${variation.size ? `<span>Tam. ${escapeHtml(variation.size)}</span>` : ""}
                  ${item.sku ? `<span>SKU ${escapeHtml(item.sku)}</span>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
  }).join("");
}

function wrapPdfText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function downloadSeparationPdf() {
  try {
  const { rows } = buildShopeeSeparationRows();
  if (!rows.length) {
    showStatus("Suba a planilha da Shopee primeiro.");
    return;
  }
  if (!window.PDFLib) {
    showStatus("Gerador de PDF nao carregou. Recarregue a pagina.");
    return;
  }

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89];
  const margin = 34;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawHeader = () => {
    drawPdfText(page, "Mapa de separacao Shopee", { x: margin, y, size: 18, font: bold, color: rgb(0.05, 0.12, 0.16) });
    drawPdfText(page, `Pedidos: ${state.shopeeOrders.length}   Gerado pela plataforma Verao em cores`, { x: margin, y: y - 18, size: 9, font, color: rgb(0.35, 0.42, 0.48) });
    y -= 40;
  };

  const newPageIfNeeded = (needed) => {
    if (y - needed > margin) return;
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
    drawHeader();
  };

  drawHeader();

  rows.forEach(({ order, labelNumber }, index) => {
    const protectedName = isProtectedName(order.recipient);
    const displayName = order.labelRecipient || (protectedName ? order.username : order.recipient) || order.username;
    const addressLine = shortAddress(order.address) || [order.city, order.uf].filter(Boolean).join(" / ");
    const expeditionStatus = statusLabel(getExpeditionEntry(order.orderId).status || "pendente");
    const itemHeight = order.items.reduce((sum, item) => sum + 30 + (wrapPdfText(pdfText(item.product), 48).length - 1) * 10, 0);
    newPageIfNeeded(78 + itemHeight);

    page.drawRectangle({ x: margin, y: y - 24, width: pageSize[0] - margin * 2, height: 24, color: rgb(0.93, 0.97, 0.98) });
    drawPdfText(page, `#${index + 1}`, { x: margin + 8, y: y - 16, size: 10, font: bold });
    drawPdfText(page, `Etiqueta: ${labelNumber || "-"}`, { x: margin + 44, y: y - 16, size: 10, font: bold });
    drawPdfText(page, `Pedido: ${order.orderId}`, { x: margin + 136, y: y - 16, size: 10, font: bold });
    drawPdfText(page, `Rastreio: ${order.tracking || "-"}`.slice(0, 32), { x: margin + 306, y: y - 16, size: 9, font });
    drawPdfText(page, expeditionStatus.slice(0, 18), { x: margin + 460, y: y - 16, size: 9, font: bold });
    y -= 38;

    drawPdfText(page, `Cliente: ${displayName}`.slice(0, 80), { x: margin, y, size: 10, font: bold });
    y -= 14;
    drawPdfText(page, `${protectedName && !order.labelRecipient ? "Nome protegido pela Shopee   " : ""}Usuario: ${order.username || "-"}   Envio: ${order.shipping || "-"}`.slice(0, 96), { x: margin, y, size: 8.5, font, color: rgb(0.35, 0.42, 0.48) });
    y -= 12;
    drawPdfText(page, `Endereco: ${addressLine}`.slice(0, 96), { x: margin, y, size: 8.5, font, color: rgb(0.35, 0.42, 0.48) });
    y -= 18;

    order.items.forEach(item => {
      const variation = splitVariation(item.variation);
      const productLines = wrapPdfText(pdfText(item.product), 58).slice(0, 3);
      newPageIfNeeded(34 + productLines.length * 10);
      drawPdfText(page, `${item.qty}x`, { x: margin, y, size: 13, font: bold, color: rgb(0.05, 0.45, 0.5) });
      drawPdfText(page, productLines[0] || "-", { x: margin + 36, y, size: 10, font: bold });
      y -= 12;
      productLines.slice(1).forEach(line => {
        drawPdfText(page, line, { x: margin + 36, y, size: 9, font });
        y -= 10;
      });
      drawPdfText(page, `Cor: ${variation.color}   ${variation.size ? `Tamanho: ${variation.size}` : ""}   ${item.sku ? `SKU: ${item.sku}` : ""}`.slice(0, 96), { x: margin + 36, y, size: 9, font, color: rgb(0.05, 0.35, 0.4) });
      y -= 18;
    });

    y -= 10;
  });

  const bytes = await pdf.save();
  const url = downloadBlob(new Blob([bytes], { type: "application/pdf" }), "mapa_separacao_shopee.pdf", true);
  showPdfResult(url, "mapa_separacao_shopee.pdf", rows.length);
  resultText.textContent = `${rows.length} pedidos no mapa de separacao.`;
  showStatus("PDF de separacao pronto. Se o download nao iniciou, clique em Baixar novamente.");
  } catch (error) {
    showStatus(error.message || "Nao consegui gerar o PDF de separacao.");
  }
}

function showPdfResult(url, filename, total, localPath) {
  resultLink.href = url;
  resultLink.download = filename;
  resultText.textContent = localPath
    ? `${total || state.total || ""} etiquetas salvas em: ${localPath}`.trim()
    : `${total || state.total || ""} etiquetas em PDF 100 x 150 mm.`.trim();
  resultPanel.hidden = false;
}

function showLabelPreview(url) {
  if (currentPreviewUrl && currentPreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentPreviewUrl);
  }
  currentPreviewUrl = url;
  labelPreviewFrame.src = url;
  labelPreviewPanel.hidden = false;
}

async function previewZplFirstBatch() {
  if (!state.zpl || !state.batches.length) return;

  try {
    const response = await postJson(
      isLocalhost ? "/api/pdf" : "/api/pdf-batch",
      payload({ batchIndex: state.batches[0].index })
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    showLabelPreview(url);
  } catch (error) {
    console.warn("Nao foi possivel gerar preview ZPL.", error);
  }
}

function setupEnvironment() {
  if (!isLocalhost) {
    downloadFullPdfBtn.textContent = "Baixar PDF completo 4x6";
    openDownloadsBtn.hidden = true;
  } else {
    openDownloadsBtn.hidden = false;
  }
}

function setupQzSecurity() {
  if (!window.qz) return;

  qz.security.setCertificatePromise((resolve) => {
    resolve("");
  });

  qz.security.setSignaturePromise(() => {
    return (resolve) => resolve("");
  });
}

function setQzStatus(message) {
  qzStatus.textContent = message;
}

async function connectQz() {
  if (!window.qz) {
    showStatus("Biblioteca QZ Tray nao carregou. Recarregue a pagina.");
    return;
  }

  try {
    setupQzSecurity();

    if (!qz.websocket.isActive()) {
      setQzStatus("Conectando ao QZ Tray...");
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }

    const printer = printerName.value || "LABEL";
    await qz.printers.find(printer);
    setQzStatus(`QZ conectado. Impressora encontrada: ${printer}`);
    printQzBtn.disabled = !state.zpl;
    printPdfQzBtn.disabled = !state.zpl;
    updateDashboard();
  } catch (error) {
    printQzBtn.disabled = true;
    printPdfQzBtn.disabled = true;
    setQzStatus("QZ nao conectado. Instale/abra o QZ Tray e aceite a permissao.");
    updateDashboard();
    showStatus(error.message || "Nao consegui conectar ao QZ Tray.");
  }
}

async function printWithQz() {
  if (!state.zpl) {
    showStatus("Escolha um arquivo ZPL/TXT primeiro.");
    return;
  }
  if (!canPrintRefs(state.labelRefs, "imprimir direto")) return;

  try {
    await connectQz();
    const printer = printerName.value || "LABEL";
    const config = qz.configs.create(printer, {
      encoding: "UTF-8",
      copies: 1
    });

    setQzStatus(`Enviando ZPL para ${printer}...`);
    await qz.print(config, [{
      type: "raw",
      format: "plain",
      data: state.zpl
    }]);

    setQzStatus(`ZPL enviado para ${printer}.`);
    registerPrintedRefs(state.labelRefs, "QZ ZPL direto");
    showStatus("Arquivo enviado para a impressora pelo QZ Tray.");
  } catch (error) {
    setQzStatus("Falha ao imprimir pelo QZ Tray. Use o PDF 4x6 como fallback.");
    showStatus(error.message || "Nao consegui imprimir pelo QZ Tray.");
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function printPdfBufferWithQz(pdfBuffer, successMessage) {
  await connectQz();
  const printer = printerName.value || "LABEL";
  const pdfBase64 = arrayBufferToBase64(pdfBuffer);
  const config = qz.configs.create(printer, {
    copies: 1,
    units: "mm",
    size: { width: 100, height: 150 },
    margins: 0
  });

  await qz.print(config, [{
    type: "pixel",
    format: "pdf",
    flavor: "base64",
    data: pdfBase64
  }]);

  setQzStatus(successMessage || `PDF enviado para ${printer}.`);
}

async function printPdfWithQz() {
  if (!state.zpl) {
    showStatus("Escolha um arquivo ZPL/TXT primeiro.");
    return;
  }
  if (!canPrintRefs(state.labelRefs, "imprimir PDF via QZ")) return;

  try {
    await connectQz();
    const printer = printerName.value || "LABEL";
    setQzStatus("Gerando PDF 4x6 para enviar ao QZ...");

    const endpoint = isLocalhost ? "/api/pdf-all" : "/api/pdf-all";
    const response = await postJson(endpoint, payload(), 180000);
    const pdfBuffer = await response.arrayBuffer();
    setQzStatus(`Enviando PDF para ${printer}...`);
    await printPdfBufferWithQz(pdfBuffer, `PDF enviado para ${printer}.`);
    registerPrintedRefs(state.labelRefs, "QZ PDF");
    showStatus("PDF enviado para a impressora pelo QZ Tray.");
  } catch (error) {
    setQzStatus("Falha ao imprimir PDF pelo QZ. Use Baixar PDF completo 4x6.");
    showStatus(error.message || "Nao consegui imprimir o PDF pelo QZ Tray.");
  }
}

function analyzeZplLocally(zpl, requestedBatchSize) {
  const maxLabels = 200;
  const batch = Math.max(1, Math.min(100, requestedBatchSize));
  const raw = [...zpl.matchAll(/\^XA[\s\S]*?\^XZ/g)].map(match => match[0]);
  const graphicJobs = zpl.match(/~DGR[\s\S]*?(?=\r?\n~DGR|$)/g) || [];
  const labels = graphicJobs.length ? graphicJobs : raw.filter(block => !/\^ID/.test(block));

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
    rawBlocks: raw.length,
    limit: maxLabels,
    labels,
    labelRefs: labels.map((label, index) => ({
      ...extractLabelRefs(label),
      fingerprint: simpleHash(label),
      labelNumber: index + 1
    })),
    batches
  };
}

function renderBatches() {
  const hasFile = Boolean(state.zpl);

  if (!state.batches.length) {
    batchRows.innerHTML = '<tr class="empty-row"><td colspan="4">Escolha o arquivo para gerar os lotes.</td></tr>';
    downloadAllBtn.disabled = true;
    downloadFullPdfBtn.disabled = !hasFile;
    printQzBtn.disabled = true;
    printPdfQzBtn.disabled = true;
    return;
  }

  downloadAllBtn.disabled = false;
  downloadFullPdfBtn.disabled = false;
  printQzBtn.disabled = !window.qz || !qz.websocket.isActive();
  printPdfQzBtn.disabled = !window.qz || !qz.websocket.isActive();
  batchRows.innerHTML = state.batches.map(batch => {
    const duplicateCount = getDuplicateRefs(refsForBatch(batch.index)).length;
    const duplicateBadge = duplicateCount
      ? `<span class="history-badge">Já impressas: ${duplicateCount}</span>`
      : '<span class="history-ok">Sem repetidas</span>';
    const duplicateAction = duplicateCount
      ? `<button class="danger" data-action="remove-duplicates" data-index="${batch.index}" type="button">Excluir repetidas</button>`
      : "";
    return `
    <tr>
      <td><strong>${batch.index}</strong></td>
      <td>${batch.start} a ${batch.end} (${batch.count})<br>${duplicateBadge}</td>
      <td>${Math.ceil(batch.bytes / 1024)} KB</td>
      <td>
        <div class="row-actions">
          <button class="secondary" data-action="zpl" data-index="${batch.index}" type="button">Baixar ZPL</button>
          <button data-action="pdf" data-index="${batch.index}" type="button">Baixar PDF</button>
          ${duplicateAction}
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

function applyAnalyzedZplData(data) {
  state.labels = data.labels || [];
  state.batches = data.batches;
  state.total = data.total;
  state.limit = data.limit;
  state.labelRefs = data.labelRefs;
  totalLabels.textContent = data.total;
  totalBatches.textContent = data.batches.length;
  rawBlocks.textContent = data.rawBlocks || data.total;
  recommendation.textContent = `${data.total}/${data.limit} etiquetas`;
  summary.hidden = false;
}

function rebuildAfterRemovingLabels(removedCount) {
  if (!state.labels.length) {
    state.zpl = "";
    state.zplFiles = [];
    updateZplFileSummary();
    resetZplOutputs();
    showStatus(`${removedCount} etiqueta(s) repetida(s) excluida(s). Nao sobrou etiqueta nova neste arquivo.`);
    return;
  }

  state.zpl = state.labels.join("\n");
  state.zplFiles = [{
    key: `filtrado-${Date.now()}-${state.labels.length}`,
    name: "zpl_sem_repetidas.zpl",
    size: new Blob([state.zpl]).size,
    lastModified: Date.now(),
    text: state.zpl
  }];
  updateZplFileSummary();
  const data = analyzeZplLocally(state.zpl, Number(batchSize.value) || 10);
  applyAnalyzedZplData(data);
  if (state.separationSource !== "sheet") {
    state.shopeeOrders = createOrdersFromZplRefs(data.labelRefs);
    state.separationSource = state.shopeeOrders.length ? "zpl" : "";
  }
  renderBatches();
  renderShopeeSeparation();
  updateHistoryPanel();
  updateDashboard();
  previewZplFirstBatch();
  showStatus(`${removedCount} etiqueta(s) repetida(s) excluida(s). Agora ficaram ${state.total} etiqueta(s) novas para baixar/imprimir.`);
}

function removeDuplicateLabels(batchIndex = null) {
  const refs = batchIndex ? refsForBatch(batchIndex) : state.labelRefs;
  const duplicateKeys = getDuplicateKeys(refs);
  if (!duplicateKeys.size) {
    showStatus("Nao encontrei etiquetas repetidas para excluir neste lote.");
    return;
  }

  const keptLabels = [];
  const keptRefs = [];
  let removedCount = 0;

  state.labelRefs.forEach((ref, index) => {
    const key = labelHistoryKey(ref);
    if (duplicateKeys.has(key)) {
      removedCount += 1;
      return;
    }
    keptLabels.push(state.labels[index]);
    keptRefs.push(ref);
  });

  state.labels = keptLabels.filter(Boolean);
  state.labelRefs = keptRefs;
  rebuildAfterRemovingLabels(removedCount);
}

async function analyze() {
  if (!state.zpl) {
    showStatus("Escolha um arquivo ZPL/TXT primeiro.");
    return;
  }

  try {
    const data = analyzeZplLocally(state.zpl, Number(batchSize.value) || 10);
    applyAnalyzedZplData(data);
    if (state.separationSource !== "sheet") {
      state.shopeeOrders = createOrdersFromZplRefs(data.labelRefs);
      state.separationSource = state.shopeeOrders.length ? "zpl" : "";
      shopeeSheetName.textContent = state.shopeeOrders.length
        ? `Mapa criado pelo ZPL (${state.shopeeOrders.length} etiquetas)`
        : data.labelRefs.length
          ? "ZPL sem dados legiveis para separacao"
          : "Nenhuma planilha selecionada";
    }
    renderBatches();
    renderShopeeSeparation();
    updateHistoryPanel();
    updateDashboard();
    await previewZplFirstBatch();
  } catch (error) {
    showStatus(error.message);
  }
}

async function downloadBatch(index, type) {
  const batchRefs = refsForBatch(index);
  if (type === "pdf" && !canPrintRefs(batchRefs, "baixar o PDF deste lote")) return;
  const endpoint = type === "pdf" ? (isLocalhost ? "/api/pdf" : "/api/pdf-batch") : "/api/batch";
  showStatus(type === "pdf" ? "Gerando PDF do lote..." : "Gerando arquivo ZPL do lote...");
  try {
    const response = await postJson(endpoint, payload({ batchIndex: index }));
    const blob = await response.blob();
    const batch = state.batches.find(item => item.index === index);
    const ext = type === "pdf" ? "pdf" : "zpl";
    const url = downloadBlob(blob, `etiquetas_lote_${index}_${batch.start}-${batch.end}.${ext}`, type === "pdf");
    if (type === "pdf") showLabelPreview(url);
    if (type === "pdf") registerPrintedRefs(batchRefs, `PDF lote ${index}`);
    closeStatus();
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
  if (!canPrintRefs(state.labelRefs, "baixar o PDF completo")) return;

  showStatus(isLocalhost ? "Gerando PDF e salvando na pasta Downloads..." : "Gerando PDF para download...");
  try {
    if (isLocalhost) {
      const response = await postJson("/api/pdf-all-save", payload());
      const data = await response.json();
      showPdfResult(data.url, data.filename, data.total, data.localPath);
      showLabelPreview(data.url);
      registerPrintedRefs(state.labelRefs, "PDF completo");
      showStatus(`PDF salvo em Downloads: ${data.filename}`);
      return;
    }

    const response = await postJson("/api/pdf-all", payload());
    const blob = await response.blob();
    const filename = "etiquetas_completo_4x6.pdf";
    const url = downloadBlob(blob, filename, true);
    showPdfResult(url, filename, state.total);
    showLabelPreview(url);
    registerPrintedRefs(state.labelRefs, "PDF completo");
    showStatus("PDF pronto. Se o download nao iniciou, clique em Baixar novamente na faixa verde.");
  } catch (error) {
    const message = error.name === "AbortError" ? "A geracao demorou demais. Tente baixar por lotes menores." : error.message;
    showStatus(`${message} Se isso acontecer, use os botoes Baixar PDF por lote.`);
  }
}

async function openDownloads() {
  try {
    await postJson("/api/open-downloads", {});
  } catch (error) {
    showStatus(error.message);
  }
}

function setWbuyStatus(message) {
  wbuyStatus.textContent = message;
}

async function testWbuyApi() {
  setWbuyStatus("Testando credenciais wBuy...");

  try {
    const response = await fetch("/api/wbuy-store");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha ao testar API wBuy.");
    }

    setWbuyStatus("API wBuy conectada com sucesso.");
    wbuyResultPanel.hidden = false;
    wbuyResultText.textContent = "Conexao OK. Agora busque um pedido.";
  } catch (error) {
    setWbuyStatus(error.message);
    showStatus(error.message);
  }
}

async function fetchWbuyOrder() {
  const id = wbuyOrderId.value.trim();

  if (!id) {
    showStatus("Informe o numero do pedido wBuy.");
    return;
  }

  setWbuyStatus(`Buscando pedido ${id} na wBuy...`);

  try {
    const response = await fetch(`/api/wbuy-order?id=${encodeURIComponent(id)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Pedido nao encontrado.");
    }

    setWbuyStatus(`Pedido encontrado pela rota ${data.path}.`);
    currentWbuyOrderId = id;
    downloadWbuyLabelBtn.disabled = false;
    printWbuyLabelBtn.disabled = !window.qz || !qz.websocket.isActive();
    wbuyResultPanel.hidden = false;
    wbuyResultText.textContent = JSON.stringify(data.data, null, 2).slice(0, 1200);
    await previewWbuyLabel();
  } catch (error) {
    setWbuyStatus(error.message);
    showStatus(error.message);
  }
}

async function downloadWbuyLabel() {
  if (!currentWbuyOrderId) {
    showStatus("Busque um pedido wBuy primeiro.");
    return;
  }
  const wbuyRef = wbuyHistoryRef();
  if (!canPrintRefs([wbuyRef], "baixar a etiqueta wBuy")) return;

  try {
    showStatus("Gerando etiqueta wBuy 100 x 150 mm...");
    const response = await fetch(`/api/wbuy-label?id=${encodeURIComponent(currentWbuyOrderId)}`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao gerar etiqueta wBuy.");
    }

    const blob = await response.blob();
    const filename = `etiqueta_wbuy_${currentWbuyOrderId}_4x6.pdf`;
    const url = downloadBlob(blob, filename, true);
    showPdfResult(url, filename, 1);
    showLabelPreview(url);
    registerPrintedRefs([wbuyRef], "PDF wBuy");
    showStatus("Etiqueta wBuy pronta. Se o download nao iniciou, clique em Baixar novamente.");
  } catch (error) {
    showStatus(error.message);
  }
}

async function previewWbuyLabel() {
  if (!currentWbuyOrderId) return;

  try {
    const response = await fetch(`/api/wbuy-label?id=${encodeURIComponent(currentWbuyOrderId)}`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao gerar preview da etiqueta.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    showLabelPreview(url);
  } catch (error) {
    showStatus(error.message);
  }
}

async function printWbuyLabel() {
  if (!currentWbuyOrderId) {
    showStatus("Busque um pedido wBuy primeiro.");
    return;
  }
  const wbuyRef = wbuyHistoryRef();
  if (!canPrintRefs([wbuyRef], "imprimir a etiqueta wBuy")) return;

  try {
    showStatus("Gerando e enviando etiqueta wBuy para a impressora...");
    const response = await fetch(`/api/wbuy-label?id=${encodeURIComponent(currentWbuyOrderId)}`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao gerar etiqueta wBuy.");
    }

    await printPdfBufferWithQz(await response.arrayBuffer(), "Etiqueta wBuy enviada para a impressora.");
    registerPrintedRefs([wbuyRef], "QZ wBuy");
    showStatus("Etiqueta wBuy enviada para a impressora pelo QZ Tray.");
  } catch (error) {
    showStatus(error.message || "Nao consegui imprimir a etiqueta wBuy.");
  }
}

fileInput.addEventListener("change", async () => {
  await addZplFiles(fileInput.files);
});

comboLabelInput.addEventListener("change", async () => {
  await readComboLabelFile(comboLabelInput);
});

comboDocInput.addEventListener("change", async () => {
  await readComboDocFile(comboDocInput);
});

shopeeSheetInput.addEventListener("change", async () => {
  const file = shopeeSheetInput.files?.[0];
  if (!file) return;

  if (!window.XLSX) {
    showStatus("Leitor de planilha nao carregou. Recarregue a pagina e tente novamente.");
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const orders = parseShopeeRows(rows);

    state.shopeeOrders = orders;
    state.separationSource = "sheet";
    shopeeSheetName.textContent = `${file.name} (${orders.length} pedidos)`;
    renderShopeeSeparation();
  } catch (error) {
    showStatus(error.message || "Nao consegui ler a planilha da Shopee.");
  }
});

setupEnvironment();
loadPrintHistory();
updateZplFileSummary();
updateDashboard();
updateHistoryPanel();
renderProductCodeList();
applyTheme(document.documentElement.dataset.theme || "light");
activateView((window.location.hash || "#dashboard").replace("#", ""));
analyzeBtn.addEventListener("click", analyze);
addMoreZplBtn.addEventListener("click", () => fileInput.click());
clearZplFilesBtn.addEventListener("click", clearZplFiles);
downloadFullPdfBtn.addEventListener("click", downloadFullPdf);
downloadAllBtn.addEventListener("click", downloadAllZpl);
connectQzBtn.addEventListener("click", connectQz);
printQzBtn.addEventListener("click", printWithQz);
printPdfQzBtn.addEventListener("click", printPdfWithQz);
closeDialog.addEventListener("click", closeStatus);
openDownloadsBtn.addEventListener("click", openDownloads);
testWbuyBtn.addEventListener("click", testWbuyApi);
fetchWbuyOrderBtn.addEventListener("click", fetchWbuyOrder);
downloadWbuyLabelBtn.addEventListener("click", downloadWbuyLabel);
printWbuyLabelBtn.addEventListener("click", printWbuyLabel);
downloadSeparationPdfBtn.addEventListener("click", downloadSeparationPdf);
printSeparationBtn.addEventListener("click", printCompactSeparation);
removeCurrentDuplicatesBtn.addEventListener("click", () => removeDuplicateLabels());
clearHistoryBtn.addEventListener("click", clearPrintHistory);
combinePdfBtn.addEventListener("click", combineLabelAndDocPdf);
printComboPdfBtn.addEventListener("click", printComboPdf);
saveProductCodeBtn.addEventListener("click", handleSaveProductCode);
importProductCodesBtn.addEventListener("click", handleImportProductCodes);
productBarcodeInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  productNameInput.focus();
});
productCodeList.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-product-code]");
  if (!button) return;
  const code = normalizeCode(decodeURIComponent(button.dataset.removeProductCode || ""));
  state.productCodes = state.productCodes.filter(product => normalizeCode(product.code) !== code);
  saveProductCodes();
  renderProductCodeList();
});
startCameraScanBtn.addEventListener("click", startCameraScanner);
stopCameraScanBtn.addEventListener("click", stopCameraScanner);
mobileScanAction.addEventListener("change", () => {
  scanAction.value = mobileScanAction.value;
});
themeToggle?.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
viewLinks.forEach(link => {
  link.addEventListener("click", event => {
    const view = link.dataset.viewTarget;
    if (!view) return;
    event.preventDefault();
    activateView(view);
    history.replaceState(null, "", `#${view}`);
  });
});
window.addEventListener("hashchange", () => {
  activateView((window.location.hash || "#dashboard").replace("#", ""));
});
scanSubmitBtn.addEventListener("click", handleScan);
scanFocusBtn.addEventListener("click", () => {
  scanInput.focus();
  scanInput.select();
  scanResult.className = "scan-result";
  scanResult.textContent = "Leitor ativo. Pode bipar o proximo pedido.";
});
scanInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  window.clearTimeout(scanTimer);
  handleScan();
});
scanInput.addEventListener("input", scheduleAutoScan);
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
  if (action === "remove-duplicates") removeDuplicateLabels(index);
});

shopeeRows.addEventListener("click", event => {
  const button = event.target.closest("button[data-expedition]");
  if (!button) return;

  setOrderStatus(button.dataset.orderId, button.dataset.expedition, "manual");
  renderShopeeSeparation();
  focusOrderCard(button.dataset.orderId);
});
