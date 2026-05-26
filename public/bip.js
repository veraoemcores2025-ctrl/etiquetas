const camera = document.querySelector("#camera");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const actionSelect = document.querySelector("#scanAction");
const statusBox = document.querySelector("#status");
const manualCode = document.querySelector("#manualCode");
const manualBtn = document.querySelector("#manualBtn");
const historyCount = document.querySelector("#historyCount");
const historyList = document.querySelector("#historyList");
const clearBtn = document.querySelector("#clearBtn");
const copyBtn = document.querySelector("#copyBtn");

const STORAGE_KEY = "mobileBipHistoryV1";
let stream = null;
let detector = null;
let loopId = 0;
let lastCode = "";
let lastCodeAt = 0;
let lastFrameAt = 0;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 120)));
}

function setStatus(message, type = "") {
  statusBox.className = `status${type ? ` ${type}` : ""}`;
  statusBox.textContent = message;
}

function actionLabel(action) {
  return {
    separado: "Separado",
    etiquetado: "Etiquetado",
    despachado: "Despachado",
    localizar: "Localizado"
  }[action] || "Bip";
}

function renderHistory() {
  const items = loadHistory();
  historyCount.textContent = `${items.length} bip${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    historyList.innerHTML = "<p>Nenhum bip registrado ainda.</p>";
    return;
  }

  historyList.innerHTML = items.slice(0, 25).map(item => `
    <div class="history-item">
      <strong>${escapeHtml(item.code)}</strong>
      <span>${escapeHtml(actionLabel(item.action))} - ${escapeHtml(new Date(item.at).toLocaleString("pt-BR"))}</span>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function playTone(ok) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = ok ? 920 : 240;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    window.setTimeout(() => context.close(), 230);
  } catch {
    // Audio feedback is optional.
  }
}

function registerCode(rawCode) {
  const code = String(rawCode || "").trim();
  if (!code) {
    setStatus("Digite ou leia um codigo primeiro.", "bad");
    return;
  }

  const item = {
    code,
    action: actionSelect.value,
    at: new Date().toISOString()
  };
  const history = loadHistory();
  saveHistory([item, ...history]);
  renderHistory();
  setStatus(`${actionLabel(item.action)}: ${code}`, "ok");
  playTone(true);
}

function canScanWithCamera() {
  return Boolean(window.navigator?.mediaDevices?.getUserMedia && window.BarcodeDetector);
}

async function ensureDetector() {
  if (detector) return detector;
  try {
    detector = new BarcodeDetector({
      formats: ["qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8", "itf", "upc_a", "upc_e", "pdf417", "data_matrix"]
    });
  } catch {
    detector = new BarcodeDetector();
  }
  return detector;
}

async function scanFrame() {
  if (!stream || !detector || !camera) return;
  const now = Date.now();

  if (now - lastFrameAt > 280 && camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    lastFrameAt = now;
    try {
      const codes = await detector.detect(camera);
      const value = codes?.[0]?.rawValue?.trim();
      if (value && (value !== lastCode || now - lastCodeAt > 1600)) {
        lastCode = value;
        lastCodeAt = now;
        registerCode(value);
      }
    } catch (error) {
      setStatus(error.message || "Nao consegui ler este quadro da camera.", "bad");
    }
  }

  loopId = requestAnimationFrame(scanFrame);
}

async function startCamera() {
  if (!canScanWithCamera()) {
    setStatus("Use Chrome no Android ou atualize o navegador. Este aparelho nao liberou leitura por camera.", "bad");
    return;
  }

  try {
    detector = await ensureDetector();
    stream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    camera.srcObject = stream;
    await camera.play();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus("Camera ativa. Aponte para o codigo da etiqueta.", "ok");
    loopId = requestAnimationFrame(scanFrame);
  } catch (error) {
    stopCamera();
    setStatus(error.message || "Permita o uso da camera para bipar.", "bad");
  }
}

function stopCamera() {
  if (loopId) cancelAnimationFrame(loopId);
  loopId = 0;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  camera.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Camera parada.");
}

function copyHistory() {
  const text = loadHistory()
    .map(item => `${new Date(item.at).toLocaleString("pt-BR")};${actionLabel(item.action)};${item.code}`)
    .join("\n");
  if (!text) {
    setStatus("Nao tem bip para copiar.", "bad");
    return;
  }
  navigator.clipboard?.writeText(text);
  setStatus("Lista copiada para a area de transferencia.", "ok");
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
manualBtn.addEventListener("click", () => {
  registerCode(manualCode.value);
  manualCode.value = "";
  manualCode.focus();
});
manualCode.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  manualBtn.click();
});
clearBtn.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
  setStatus("Historico limpo.");
});
copyBtn.addEventListener("click", copyHistory);
window.addEventListener("pagehide", stopCamera);

renderHistory();
