const state = {
  zpl: "",
  batches: [],
  total: 0,
  limit: 200,
  labelRefs: [],
  shopeeOrders: []
};

const fileInput = document.querySelector("#fileInput");
const fileName = document.querySelector("#fileName");
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

const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

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

function extractLabelRefs(label) {
  const orderIds = [...label.matchAll(/\b\d{6}[A-Z0-9]{6,}\b/g)].map(match => match[0]);
  const trackingIds = [...label.matchAll(/\bBR[A-Z0-9]{10,18}\b/g)].map(match => match[0]);
  return {
    orderId: orderIds[0] || "",
    tracking: trackingIds[0] || ""
  };
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
    const qty = Number(getCell(row, headers, ["Quantidade"])) || 1;

    if (!orders.has(orderId)) {
      orders.set(orderId, {
        orderId,
        tracking,
        username: getCell(row, headers, ["Nome de usuário (comprador)", "Nome de usuario (comprador)"]),
        recipient: getCell(row, headers, ["Nome do destinatário", "Nome do destinatario"]),
        shipping: getCell(row, headers, ["Opção de envio", "Opcao de envio", "Método de envio", "Metodo de envio"]),
        city: getCell(row, headers, ["Cidade"]),
        uf: getCell(row, headers, ["UF"]),
        cep: getCell(row, headers, ["CEP"]),
        items: []
      });
    }

    orders.get(orderId).items.push({ product, variation, qty });
  }

  return [...orders.values()];
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
    used.add(order.orderId);
    matchedRows.push({ order, labelNumber: index + 1, matched: true });
  });

  const rows = [
    ...matchedRows,
    ...orders.filter(order => !used.has(order.orderId)).map(order => ({ order, labelNumber: "", matched: false }))
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

  if (!rows.length) {
    shopeeRows.innerHTML = '<div class="empty-separation">Suba a planilha da Shopee para montar o mapa de separação.</div>';
    return;
  }

  shopeeRows.innerHTML = rows.map(({ order, labelNumber, matched }) => `
    <article class="separation-card">
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
          <span class="table-note">Cliente / destinatário</span>
          <strong>${escapeHtml(order.recipient || order.username)}</strong>
          <span class="table-note">${escapeHtml(order.username || "")}</span>
        </div>
        <div class="shipping-main">
          <span class="table-note">Rastreio</span>
          <strong>${escapeHtml(order.tracking || "-")}</strong>
          <span class="table-note">${escapeHtml([order.shipping, order.city || order.uf].filter(Boolean).join(" • "))}</span>
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
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `).join("");
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
    page.drawText("Mapa de separacao Shopee", { x: margin, y, size: 18, font: bold, color: rgb(0.05, 0.12, 0.16) });
    page.drawText(`Pedidos: ${state.shopeeOrders.length}   Gerado pela plataforma Verão em cores`, { x: margin, y: y - 18, size: 9, font, color: rgb(0.35, 0.42, 0.48) });
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
    const itemHeight = order.items.reduce((sum, item) => sum + 30 + (wrapPdfText(item.product, 48).length - 1) * 10, 0);
    newPageIfNeeded(78 + itemHeight);

    page.drawRectangle({ x: margin, y: y - 24, width: pageSize[0] - margin * 2, height: 24, color: rgb(0.93, 0.97, 0.98) });
    page.drawText(`#${index + 1}`, { x: margin + 8, y: y - 16, size: 10, font: bold });
    page.drawText(`Etiqueta: ${labelNumber || "-"}`, { x: margin + 44, y: y - 16, size: 10, font: bold });
    page.drawText(`Pedido: ${order.orderId}`, { x: margin + 136, y: y - 16, size: 10, font: bold });
    page.drawText(`Rastreio: ${order.tracking || "-"}`.slice(0, 38), { x: margin + 306, y: y - 16, size: 9, font });
    y -= 38;

    page.drawText(`Cliente: ${order.recipient || order.username}`.slice(0, 80), { x: margin, y, size: 10, font: bold });
    y -= 14;
    page.drawText(`Usuario: ${order.username || "-"}   Envio: ${order.shipping || "-"}`.slice(0, 96), { x: margin, y, size: 8.5, font, color: rgb(0.35, 0.42, 0.48) });
    y -= 18;

    order.items.forEach(item => {
      const variation = splitVariation(item.variation);
      const productLines = wrapPdfText(item.product, 58).slice(0, 3);
      newPageIfNeeded(34 + productLines.length * 10);
      page.drawText(`${item.qty}x`, { x: margin, y, size: 13, font: bold, color: rgb(0.05, 0.45, 0.5) });
      page.drawText(productLines[0] || "-", { x: margin + 36, y, size: 10, font: bold });
      y -= 12;
      productLines.slice(1).forEach(line => {
        page.drawText(line, { x: margin + 36, y, size: 9, font });
        y -= 10;
      });
      page.drawText(`Cor: ${variation.color}   ${variation.size ? `Tamanho: ${variation.size}` : ""}`, { x: margin + 36, y, size: 9, font, color: rgb(0.05, 0.35, 0.4) });
      y -= 18;
    });

    y -= 10;
  });

  const bytes = await pdf.save();
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), "mapa_separacao_shopee.pdf");
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
  } catch (error) {
    printQzBtn.disabled = true;
    printPdfQzBtn.disabled = true;
    setQzStatus("QZ nao conectado. Instale/abra o QZ Tray e aceite a permissao.");
    showStatus(error.message || "Nao consegui conectar ao QZ Tray.");
  }
}

async function printWithQz() {
  if (!state.zpl) {
    showStatus("Escolha um arquivo ZPL/TXT primeiro.");
    return;
  }

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

  try {
    await connectQz();
    const printer = printerName.value || "LABEL";
    setQzStatus("Gerando PDF 4x6 para enviar ao QZ...");

    const endpoint = isLocalhost ? "/api/pdf-all" : "/api/pdf-all";
    const response = await postJson(endpoint, payload(), 180000);
    const pdfBuffer = await response.arrayBuffer();
    setQzStatus(`Enviando PDF para ${printer}...`);
    await printPdfBufferWithQz(pdfBuffer, `PDF enviado para ${printer}.`);
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
    labelRefs: labels.map(extractLabelRefs),
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
  batchRows.innerHTML = state.batches.map(batch => `
    <tr>
      <td><strong>${batch.index}</strong></td>
      <td>${batch.start} a ${batch.end} (${batch.count})</td>
      <td>${Math.ceil(batch.bytes / 1024)} KB</td>
      <td>
        <div class="row-actions">
          <button class="secondary" data-action="zpl" data-index="${batch.index}" type="button">Baixar ZPL</button>
          <button data-action="pdf" data-index="${batch.index}" type="button">Baixar PDF</button>
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
    state.limit = data.limit;
    state.labelRefs = data.labelRefs;
    totalLabels.textContent = data.total;
    totalBatches.textContent = data.batches.length;
    rawBlocks.textContent = data.rawBlocks || data.total;
    recommendation.textContent = `${data.total}/${data.limit} etiquetas`;
    summary.hidden = false;
    renderBatches();
    renderShopeeSeparation();
    await previewZplFirstBatch();
  } catch (error) {
    showStatus(error.message);
  }
}

async function downloadBatch(index, type) {
  const endpoint = type === "pdf" ? (isLocalhost ? "/api/pdf" : "/api/pdf-batch") : "/api/batch";
  showStatus(type === "pdf" ? "Gerando PDF do lote..." : "Gerando arquivo ZPL do lote...");
  try {
    const response = await postJson(endpoint, payload({ batchIndex: index }));
    const blob = await response.blob();
    const batch = state.batches.find(item => item.index === index);
    const ext = type === "pdf" ? "pdf" : "zpl";
    const url = downloadBlob(blob, `etiquetas_lote_${index}_${batch.start}-${batch.end}.${ext}`, type === "pdf");
    if (type === "pdf") showLabelPreview(url);
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

  showStatus(isLocalhost ? "Gerando PDF e salvando na pasta Downloads..." : "Gerando PDF para download...");
  try {
    if (isLocalhost) {
      const response = await postJson("/api/pdf-all-save", payload());
      const data = await response.json();
      showPdfResult(data.url, data.filename, data.total, data.localPath);
      showLabelPreview(data.url);
      showStatus(`PDF salvo em Downloads: ${data.filename}`);
      return;
    }

    const response = await postJson("/api/pdf-all", payload());
    const blob = await response.blob();
    const filename = "etiquetas_completo_4x6.pdf";
    const url = downloadBlob(blob, filename, true);
    showPdfResult(url, filename, state.total);
    showLabelPreview(url);
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

  try {
    showStatus("Gerando e enviando etiqueta wBuy para a impressora...");
    const response = await fetch(`/api/wbuy-label?id=${encodeURIComponent(currentWbuyOrderId)}`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao gerar etiqueta wBuy.");
    }

    await printPdfBufferWithQz(await response.arrayBuffer(), "Etiqueta wBuy enviada para a impressora.");
    showStatus("Etiqueta wBuy enviada para a impressora pelo QZ Tray.");
  } catch (error) {
    showStatus(error.message || "Nao consegui imprimir a etiqueta wBuy.");
  }
}

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []);
  if (!files.length) return;

  const parts = await Promise.all(files.map(file => file.text()));
  state.zpl = parts.join("\n");
  const totalKb = Math.ceil(files.reduce((sum, file) => sum + file.size, 0) / 1024);
  fileName.textContent = files.length === 1
    ? `${files[0].name} (${totalKb} KB)`
    : `${files.length} arquivos combinados (${totalKb} KB)`;
  state.batches = [];
  state.labelRefs = [];
  summary.hidden = true;
  resultPanel.hidden = true;
  labelPreviewPanel.hidden = true;
  renderBatches();
  analyze();
  printQzBtn.disabled = !window.qz || !qz.websocket.isActive();
  printPdfQzBtn.disabled = !window.qz || !qz.websocket.isActive();
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
    shopeeSheetName.textContent = `${file.name} (${orders.length} pedidos)`;
    renderShopeeSeparation();
  } catch (error) {
    showStatus(error.message || "Nao consegui ler a planilha da Shopee.");
  }
});

setupEnvironment();
analyzeBtn.addEventListener("click", analyze);
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
printSeparationBtn.addEventListener("click", () => window.print());
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
});
