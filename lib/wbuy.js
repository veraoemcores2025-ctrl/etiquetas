const baseUrl = "https://sistema.sistemawbuy.com.br/api/v1";

export function getWbuyAuth() {
  const user = process.env.WBUY_API_USER;
  const password = process.env.WBUY_API_PASSWORD;
  const userAgent = process.env.WBUY_USER_AGENT || "Etiquetas ZPL (suporte@veraoemcores.com.br)";

  if (!user || !password) {
    const error = new Error("Configure WBUY_API_USER e WBUY_API_PASSWORD nas variaveis de ambiente da Vercel.");
    error.statusCode = 500;
    throw error;
  }

  return {
    authorization: `Bearer ${Buffer.from(`${user}:${password}`).toString("base64")}`,
    userAgent
  };
}

export async function wbuyRequest(path, options = {}) {
  const auth = getWbuyAuth();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: auth.authorization,
      "User-Agent": auth.userAgent,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Erro wBuy HTTP ${response.status}`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export async function findWbuyOrder(orderId) {
  const cleanId = String(orderId || "").replace(/^#/, "").trim();

  if (!cleanId) {
    const error = new Error("Informe o numero do pedido.");
    error.statusCode = 400;
    throw error;
  }

  const candidates = [
    `/order/${encodeURIComponent(cleanId)}`,
    `/order/${encodeURIComponent(cleanId)}/`,
    `/order?id=${encodeURIComponent(cleanId)}`,
    `/order?pedido=${encodeURIComponent(cleanId)}`,
    `/order?number=${encodeURIComponent(cleanId)}`
  ];

  let lastError = null;

  for (const path of candidates) {
    try {
      const data = await wbuyRequest(path);
      return { path, data };
    } catch (error) {
      lastError = error;
      if (![400, 404, 405].includes(error.statusCode)) throw error;
    }
  }

  throw lastError || new Error("Pedido nao encontrado na API wBuy.");
}
