import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  buildBatches,
  createCompletePdf,
  enforceLabelLimit,
  extractZplLabels,
  maxLabelsPerFile,
  zplToPdf
} from "./lib/zpl.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const port = process.env.PORT || 3210;
const generatedDir = join(__dirname, "generated");
const downloadsDir = join(process.env.USERPROFILE || __dirname, "Downloads");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function readBody(req, limitBytes = 25 * 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      throw new Error("Arquivo muito grande. O limite desta ferramenta local e 25 MB.");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function printRawWindows(printerName, zpl) {
  const script = `
$printerName = ${JSON.stringify(printerName)}
$zpl = [Console]::In.ReadToEnd()
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
"@
$bytes = [System.Text.Encoding]::ASCII.GetBytes($zpl)
$ptr = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($bytes.Length)
[Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
$handle = [IntPtr]::Zero
$ok = [RawPrinterHelper]::OpenPrinter($printerName, [ref]$handle, [IntPtr]::Zero)
if (-not $ok) { throw "Nao consegui abrir a impressora $printerName" }
$doc = New-Object RawPrinterHelper+DOCINFOA
$doc.pDocName = "Lote ZPL"
$doc.pDataType = "RAW"
[RawPrinterHelper]::StartDocPrinter($handle, 1, $doc) | Out-Null
[RawPrinterHelper]::StartPagePrinter($handle) | Out-Null
$written = 0
[RawPrinterHelper]::WritePrinter($handle, $ptr, $bytes.Length, [ref]$written) | Out-Null
[RawPrinterHelper]::EndPagePrinter($handle) | Out-Null
[RawPrinterHelper]::EndDocPrinter($handle) | Out-Null
[RawPrinterHelper]::ClosePrinter($handle) | Out-Null
[Runtime.InteropServices.Marshal]::FreeCoTaskMem($ptr)
"OK: enviados $written bytes para $printerName"
`;

  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("A impressao direta demorou demais. Use o PDF completo e imprima pelo leitor de PDF."));
    }, 15000);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", data => {
      stdout += data.toString();
    });
    child.stderr.on("data", data => {
      stderr += data.toString();
    });
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `PowerShell saiu com codigo ${code}`));
    });
    child.stdin.end(zpl);
  });
}

function openFolderWindows(folderPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Start-Process -FilePath explorer.exe -ArgumentList ${JSON.stringify(folderPath)}`
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", data => {
      stderr += data.toString();
    });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || "Nao consegui abrir a pasta Downloads."));
    });
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
      const file = await readFile(join(__dirname, "public", "index.html"));
      send(res, 200, file, { "Content-Type": mimeTypes[".html"] });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      const assetPath = join(__dirname, "public", url.pathname.replace("/assets/", ""));
      const file = await readFile(assetPath);
      send(res, 200, file, { "Content-Type": mimeTypes[extname(assetPath)] || "application/octet-stream" });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/downloads/")) {
      const safeName = url.pathname.replace("/downloads/", "").replace(/[^a-zA-Z0-9_.-]/g, "");
      const file = await readFile(join(generatedDir, safeName));
      send(res, 200, file, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/parse") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const batchSize = Math.max(1, Math.min(100, Number(payload.batchSize) || 10));
      const { labels, setup, rawBlocks } = extractZplLabels(payload.zpl || "");

      if (!labels.length) {
        send(res, 400, JSON.stringify({ error: "Nao encontrei etiquetas ZPL. O arquivo precisa ter blocos ^XA ... ^XZ." }), {
          "Content-Type": mimeTypes[".json"]
        });
        return;
      }
      enforceLabelLimit(labels);

      const batches = buildBatches(labels, setup, batchSize).map(batch => ({
        ...batch,
        zpl: undefined,
        bytes: Buffer.byteLength(batch.zpl, "utf8")
      }));

      send(res, 200, JSON.stringify({
        total: labels.length,
        rawBlocks,
        limit: maxLabelsPerFile,
        setupBytes: Buffer.byteLength(setup, "utf8"),
        batchSize,
        batches
      }), { "Content-Type": mimeTypes[".json"] });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/batch") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const batchSize = Math.max(1, Math.min(100, Number(payload.batchSize) || 10));
      const batchIndex = Math.max(1, Number(payload.batchIndex) || 1);
      const { labels, setup } = extractZplLabels(payload.zpl || "");
      enforceLabelLimit(labels);
      const batch = buildBatches(labels, setup, batchSize)[batchIndex - 1];

      if (!batch) {
        send(res, 404, JSON.stringify({ error: "Lote nao encontrado." }), { "Content-Type": mimeTypes[".json"] });
        return;
      }

      send(res, 200, batch.zpl, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="etiquetas_lote_${batch.index}_${batch.start}-${batch.end}.zpl"`
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pdf") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const batchSize = Math.max(1, Math.min(100, Number(payload.batchSize) || 10));
      const batchIndex = Math.max(1, Number(payload.batchIndex) || 1);
      const density = payload.density || "8dpmm";
      const size = payload.size || "4x6";
      const { labels, setup } = extractZplLabels(payload.zpl || "");
      enforceLabelLimit(labels);
      const batch = buildBatches(labels, setup, batchSize)[batchIndex - 1];

      if (!batch) {
        send(res, 404, JSON.stringify({ error: "Lote nao encontrado." }), { "Content-Type": mimeTypes[".json"] });
        return;
      }

      const pdf = await zplToPdf(batch.zpl, density, size);
      send(res, 200, pdf, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas_lote_${batch.index}_${batch.start}-${batch.end}.pdf"`
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pdf-all") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const density = payload.density || "8dpmm";
      const size = payload.size || "4x6";
      const { labels, setup } = extractZplLabels(payload.zpl || "");

      if (!labels.length) {
        send(res, 400, JSON.stringify({ error: "Nao encontrei etiquetas ZPL. O arquivo precisa ter blocos ^XA ... ^XZ." }), {
          "Content-Type": mimeTypes[".json"]
        });
        return;
      }
      enforceLabelLimit(labels);

      const { pdf } = await createCompletePdf({ zpl: payload.zpl || "", density, size });
      send(res, 200, pdf, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas_completo_4x6.pdf"`
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pdf-all-save") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const density = payload.density || "8dpmm";
      const size = payload.size || "4x6";
      const { labels, setup } = extractZplLabels(payload.zpl || "");

      if (!labels.length) {
        send(res, 400, JSON.stringify({ error: "Nao encontrei etiquetas ZPL. O arquivo precisa ter blocos ^XA ... ^XZ." }), {
          "Content-Type": mimeTypes[".json"]
        });
        return;
      }
      enforceLabelLimit(labels);

      const { pdf } = await createCompletePdf({ zpl: payload.zpl || "", density, size });
      await mkdir(generatedDir, { recursive: true });

      const filename = `etiquetas_completo_4x6_${randomUUID().slice(0, 8)}.pdf`;
      const localPath = join(downloadsDir, filename);
      await mkdir(downloadsDir, { recursive: true });
      await writeFile(join(generatedDir, filename), pdf);
      await writeFile(localPath, pdf);

      send(res, 200, JSON.stringify({
        filename,
        url: `/downloads/${filename}`,
        localPath,
        total: labels.length,
        bytes: pdf.length
      }), { "Content-Type": mimeTypes[".json"] });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/open-downloads") {
      await openFolderWindows(downloadsDir);
      send(res, 200, JSON.stringify({ message: "Pasta Downloads aberta." }), { "Content-Type": mimeTypes[".json"] });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/print") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const batchSize = Math.max(1, Math.min(100, Number(payload.batchSize) || 1));
      const batchIndex = Math.max(1, Number(payload.batchIndex) || 1);
      const printer = payload.printer || "LABEL";
      const { labels, setup } = extractZplLabels(payload.zpl || "");
      enforceLabelLimit(labels);
      const batch = buildBatches(labels, setup, batchSize)[batchIndex - 1];

      if (!batch) {
        send(res, 404, JSON.stringify({ error: "Lote nao encontrado." }), { "Content-Type": mimeTypes[".json"] });
        return;
      }

      const message = await printRawWindows(printer, batch.zpl);
      send(res, 200, JSON.stringify({ message }), { "Content-Type": mimeTypes[".json"] });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/print-all") {
      const body = await readBody(req);
      const payload = JSON.parse(body.toString("utf8"));
      const printer = payload.printer || "LABEL";
      const { labels, setup } = extractZplLabels(payload.zpl || "");
      enforceLabelLimit(labels);

      if (!labels.length) {
        send(res, 400, JSON.stringify({ error: "Nao encontrei etiquetas ZPL para imprimir." }), { "Content-Type": mimeTypes[".json"] });
        return;
      }

      const batches = buildBatches(labels, setup, 10);
      let sent = 0;

      for (const batch of batches) {
        await printRawWindows(printer, batch.zpl);
        sent += batch.count;
      }

      send(res, 200, JSON.stringify({ message: `OK: ${sent} etiquetas enviadas para ${printer}` }), { "Content-Type": mimeTypes[".json"] });
      return;
    }

    send(res, 404, "Nao encontrado", { "Content-Type": "text/plain; charset=utf-8" });
  } catch (error) {
    send(res, error.statusCode || 500, JSON.stringify({ error: error.message }), { "Content-Type": mimeTypes[".json"] });
  }
});

server.listen(port, () => {
  console.log(`ZPL Label Batcher em http://localhost:${port}`);
});
