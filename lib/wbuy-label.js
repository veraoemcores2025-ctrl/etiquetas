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

  const black = rgb(0.02, 0.02, 0.02);
  const gray = rgb(0.35, 0.35, 0.35);
  const light = rgb(0.92, 0.92, 0.92);
  const x = 12;
  let y = pageHeight - 18;

  page.drawRectangle({ x: 0, y: pageHeight - 34, width: pageWidth, height: 34, color: black });
  page.drawText(carrier, { x: 12, y: pageHeight - 22, size: 13, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`PEDIDO #${orderId}`, { x: pageWidth - 95, y: pageHeight - 22, size: 10, font: bold, color: rgb(1, 1, 1) });

  y = pageHeight - 52;
  page.drawText("DESTINATARIO", { x, y, size: 10, font: bold, color: gray });
  y -= 18;
  page.drawText(recipientName, { x, y, size: 16, font: bold, color: black });
  y -= 18;
  y = drawWrapped(page, recipientLine1, x, y, { font: bold, size: 11, lineHeight: 14, maxChars: 34, maxLines: 3 });
  y = drawWrapped(page, recipientLine2, x, y - 2, { font: bold, size: 11, lineHeight: 14, maxChars: 34, maxLines: 2 });
  page.drawText(`CEP: ${recipientCep}`, { x, y: y - 2, size: 13, font: bold, color: black });
  if (phone) page.drawText(`TEL: ${phone}`, { x: 115, y: y - 2, size: 9, font, color: black });

  const qrSize = 58;
  page.drawImage(qrImage, { x: pageWidth - qrSize - 10, y: pageHeight - 125, width: qrSize, height: qrSize });

  y -= 22;
  page.drawLine({ start: { x: 10, y }, end: { x: pageWidth - 10, y }, thickness: 1 });
  y -= 16;
  page.drawText("REMETENTE", { x, y, size: 9, font: bold, color: gray });
  y -= 13;
  page.drawText(senderName, { x, y, size: 10, font: bold, color: black });
  y -= 12;
  page.drawText(`${senderCity}   CEP: ${senderCep}`, { x, y, size: 9, font, color: black });

  y -= 17;
  page.drawRectangle({ x: 10, y: y - 36, width: pageWidth - 20, height: 48, borderColor: light, borderWidth: 1 });
  page.drawText("ITENS", { x, y, size: 9, font: bold, color: gray });
  y -= 13;
  const productLines = products.slice(0, 4).map(item => {
    const parts = [`${item.qtd || 1}x`, item.produto, item.cor, item.variacaoValor].filter(Boolean);
    return parts.join(" - ");
  });
  for (const line of productLines) {
    page.drawText(line.slice(0, 58), { x: x + 2, y, size: 8, font, color: black });
    y -= 10;
  }
  if (products.length > 4) {
    page.drawText(`+ ${products.length - 4} itens`, { x: x + 2, y, size: 8, font: bold, color: black });
  }

  const barcodeWidth = pageWidth - 38;
  const barcodeHeight = 54;
  page.drawImage(barcodeImage, { x: 19, y: 35, width: barcodeWidth, height: barcodeHeight });
  page.drawText(`CODIGO: ${barcodeText}`, { x: 16, y: 22, size: 9, font: bold, color: black });
  page.drawText(`${service || "ENVIO"}  |  TOTAL ${money(order.valor_total?.total)}  |  ${clean(order.data).slice(0, 10)}`, {
    x: 16,
    y: 10,
    size: 7,
    font,
    color: gray
  });

  return Buffer.from(await pdf.save());
}

export async function createWbuyLabelPdfByOrderId(orderId) {
  const result = await findWbuyOrder(orderId);
  return {
    pdf: await createWbuyLabelPdf(result.data),
    result
  };
}
