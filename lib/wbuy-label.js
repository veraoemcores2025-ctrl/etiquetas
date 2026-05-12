import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { findWbuyOrder } from "./wbuy.js";

const mm = 72 / 25.4;
const pageWidth = 100 * mm;
const pageHeight = 150 * mm;

function clean(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function onlyDigits(value) {
  return clean(value).replace(/\D/g, "");
}

function upper(value) {
  return clean(value).toUpperCase();
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
}

function initialLetters(value, fallback = "LOJA") {
  const words = upper(value).split(/\s+/).filter(word => word.length > 2);
  return (words.slice(0, 2).map(word => word[0]).join("") || fallback).slice(0, 4);
}

function wrapText(text, maxChars) {
  const words = clean(text).split(/\s+/).filter(Boolean);
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

function drawWrapped(page, text, x, y, options) {
  const lines = wrapText(text, options.maxChars || 32).slice(0, options.maxLines || 4);
  let cursor = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: cursor,
      size: options.size,
      font: options.font,
      color: options.color || rgb(0, 0, 0)
    });
    cursor -= options.lineHeight || options.size + 3;
  }

  return cursor;
}

function orderFromResponse(response) {
  const data = response?.data?.data || response?.data || response;
  return Array.isArray(data) ? data[0] : data;
}

async function pngFromQr(text) {
  return QRCode.toBuffer(text, {
    type: "png",
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M"
  });
}

async function logoFromUrl(pdf, url) {
  if (!url) return null;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    const bytes = await response.arrayBuffer();

    if (contentType.includes("png")) return pdf.embedPng(bytes);
    if (contentType.includes("jpg") || contentType.includes("jpeg")) return pdf.embedJpg(bytes);

    try {
      return await pdf.embedPng(bytes);
    } catch {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }

  return null;
}

async function pngFromBarcode(text) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
    paddingwidth: 4,
    paddingheight: 2
  });
}

export async function createWbuyLabelPdf(orderResponse) {
  const order = orderFromResponse(orderResponse);

  if (!order) {
    const error = new Error("Pedido wBuy sem dados para gerar etiqueta.");
    error.statusCode = 404;
    throw error;
  }

  const customer = order.cliente || {};
  const shipping = order.frete || {};
  const store = order.loja || order.owner || {};
  const products = Array.isArray(order.produtos) ? order.produtos : [];
  const orderId = clean(order.id || order.identificacao || "pedido");
  const publicCode = clean(order.identificacao || orderId);
  const tracking = clean(shipping.rastreio);
  const barcodeText = tracking || publicCode || orderId;
  const recipientName = upper(customer.responsavel_endereco || customer.nome);
  const recipientLine1 = upper(`${customer.endereco || ""}, ${customer.endnum || ""}${customer.complemento ? ` - ${customer.complemento}` : ""}`);
  const recipientLine2 = upper(`${customer.bairro || ""} - ${customer.cidade || ""} / ${customer.uf || ""}`);
  const recipientCep = onlyDigits(customer.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2");
  const phone = clean(customer.telefone2 || customer.telefone1);
  const senderName = upper(store.nome || "Verao em cores");
  const senderCity = upper(`${store.cidade || "Petropolis"} / ${store.uf || "RJ"}`);
  const senderCep = onlyDigits(store.cep_origem).replace(/^(\d{5})(\d{3})$/, "$1-$2");
  const carrier = upper(shipping.nome || shipping.tipo_envio_nome || "Transportadora");
  const service = upper(shipping.tipo_envio_nome || "");
  const routePrimary = `${upper(customer.uf || "BR")}-${recipientCep.slice(0, 2) || "00"}`;
  const cityWords = upper(customer.cidade || "").split(/\s+/).filter(Boolean);
  const routeSecondary = cityWords.length
    ? `${cityWords[0].slice(0, 3)}-${recipientCep.slice(-2) || "00"}`
    : `CEP-${recipientCep.slice(0, 3) || "000"}`;
  const storeLogoUrl = clean(store.logo || store.logotipo || store.logo_url || store.imagem);
  const qrPayload = JSON.stringify({
    pedido: orderId,
    codigo: publicCode,
    rastreio: tracking,
    cliente: customer.nome,
    cep: customer.cep
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await pdf.embedPng(await pngFromQr(qrPayload));
  const barcodeImage = await pdf.embedPng(await pngFromBarcode(barcodeText));
  const storeLogo = await logoFromUrl(pdf, storeLogoUrl);

  const black = rgb(0.02, 0.02, 0.02);
  const gray = rgb(0.35, 0.35, 0.35);
  const border = rgb(0.1, 0.1, 0.1);
  const x = 9;
  const right = pageWidth - 9;

  page.drawLine({ start: { x, y: pageHeight - 12 }, end: { x: right, y: pageHeight - 12 }, thickness: 1.2, dashArray: [4, 3] });
  page.drawRectangle({ x, y: pageHeight - 30, width: 76, height: 13, color: black });
  page.drawText("DESTINATARIO", { x: x + 4, y: pageHeight - 27, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText(carrier.slice(0, 22), { x: pageWidth - 72, y: pageHeight - 25, size: 7, font, color: gray });

  let y = pageHeight - 42;
  y = drawWrapped(page, recipientName, x, y, { font: bold, size: 11, lineHeight: 12, maxChars: 28, maxLines: 2 });
  y = drawWrapped(page, recipientLine1, x, y - 2, { font, size: 7.2, lineHeight: 9, maxChars: 44, maxLines: 2 });
  page.drawText(`Bairro: ${upper(customer.bairro)}`.slice(0, 42), { x, y: y - 2, size: 7.2, font, color: black });
  page.drawText(`CEP: ${recipientCep}`, { x, y: y - 12, size: 8.4, font: bold, color: black });
  page.drawText(`Pedido: ${publicCode}`.slice(0, 36), { x, y: y - 22, size: 7.2, font, color: black });

  const smallQr = 45;
  page.drawImage(qrImage, { x: pageWidth - smallQr - 12, y: pageHeight - 82, width: smallQr, height: smallQr });
  page.drawLine({ start: { x, y: pageHeight - 88 }, end: { x: right, y: pageHeight - 88 }, thickness: 1 });

  const bigQr = 72;
  page.drawImage(qrImage, { x: 24, y: pageHeight - 170, width: bigQr, height: bigQr });
  page.drawText(upper(customer.cidade || "").slice(0, 20), { x: 28, y: pageHeight - 181, size: 8, font: bold, color: black });

  const routeX = 112;
  page.drawRectangle({ x: routeX, y: pageHeight - 136, width: pageWidth - routeX - 13, height: 29, color: black });
  page.drawText(routePrimary.slice(0, 8), { x: routeX + 24, y: pageHeight - 127, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: routeX, y: pageHeight - 171, width: pageWidth - routeX - 13, height: 29, color: black });
  page.drawText(routeSecondary.slice(0, 9), { x: routeX + 18, y: pageHeight - 162, size: 19, font: bold, color: rgb(1, 1, 1) });

  page.drawLine({ start: { x, y: pageHeight - 199 }, end: { x: right, y: pageHeight - 199 }, thickness: 1 });

  const barcodeWidth = pageWidth - 34;
  const barcodeHeight = 45;
  page.drawImage(barcodeImage, { x: 17, y: pageHeight - 245, width: barcodeWidth, height: barcodeHeight });

  page.drawRectangle({ x, y: pageHeight - 260, width: 58, height: 10, color: black });
  page.drawText("REMETENTE", { x: x + 3, y: pageHeight - 257, size: 7, font: bold, color: rgb(1, 1, 1) });

  if (storeLogo) {
    const logoHeight = 24;
    const logoWidth = Math.min(55, logoHeight * (storeLogo.width / storeLogo.height));
    page.drawImage(storeLogo, { x, y: pageHeight - 291, width: logoWidth, height: logoHeight });
  } else {
    page.drawCircle({ x: 26, y: pageHeight - 278, size: 13, borderColor: black, borderWidth: 1 });
    page.drawText(initialLetters(senderName), { x: 16, y: pageHeight - 282, size: 12, font: bold, color: black });
  }

  page.drawText(senderName.slice(0, 34), { x: 69, y: pageHeight - 271, size: 8, font: bold, color: black });
  page.drawText(`${senderCity}  CEP: ${senderCep}`.slice(0, 48), { x: 69, y: pageHeight - 282, size: 7, font, color: black });
  page.drawText(`${service || "ENVIO"}  |  TOTAL ${money(order.valor_total?.total)}`.slice(0, 46), { x: 69, y: pageHeight - 293, size: 7, font, color: black });

  page.drawLine({ start: { x, y: pageHeight - 303 }, end: { x: right, y: pageHeight - 303 }, thickness: 1 });

  page.drawRectangle({ x, y: pageHeight - 317, width: 38, height: 10, color: black });
  page.drawText("ITENS", { x: x + 4, y: pageHeight - 314, size: 7, font: bold, color: rgb(1, 1, 1) });
  y = pageHeight - 328;
  const productLines = products.slice(0, 3).map(item => {
    const parts = [`${item.qtd || 1}x`, item.produto, item.cor, item.variacaoValor].filter(Boolean);
    return parts.join(" - ");
  });
  for (const line of productLines) {
    page.drawText(line.slice(0, 70), { x: x + 2, y, size: 6.6, font, color: black });
    y -= 9;
  }
  if (products.length > 3) {
    page.drawText(`+ ${products.length - 3} itens`, { x: x + 2, y, size: 7, font: bold, color: black });
  }

  const footerQr = 42;
  page.drawImage(qrImage, { x: x, y: 19, width: footerQr, height: footerQr });
  page.drawRectangle({ x: 58, y: 55, width: 76, height: 9, color: black });
  page.drawText("DADOS DO PEDIDO", { x: 62, y: 58, size: 6, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`CODIGO: ${barcodeText}`.slice(0, 45), { x: 58, y: 45, size: 6.5, font: bold, color: black });
  page.drawText(`Pedido: #${orderId}  Data: ${clean(order.data).slice(0, 10)}`, { x: 58, y: 35, size: 6, font, color: black });
  if (phone) page.drawText(`Tel: ${phone}`.slice(0, 32), { x: 58, y: 26, size: 6, font, color: black });
  page.drawRectangle({ x: pageWidth - 42, y: 33, width: 30, height: 28, borderColor: border, borderWidth: 1 });
  page.drawText(upper(customer.uf || "BR"), { x: pageWidth - 34, y: 49, size: 10, font: bold, color: black });
  page.drawText(routePrimary.slice(0, 5), { x: pageWidth - 37, y: 39, size: 7, font: bold, color: black });
  page.drawLine({ start: { x, y: 15 }, end: { x: right, y: 15 }, thickness: 1 });

  return Buffer.from(await pdf.save());
}

export async function createWbuyLabelPdfByOrderId(orderId) {
  const result = await findWbuyOrder(orderId);
  return {
    pdf: await createWbuyLabelPdf(result.data),
    result
  };
}
