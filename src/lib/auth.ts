/**
 * Autenticação simples para uso pessoal (um único usuário).
 * O cookie de sessão guarda um HMAC derivado de APP_PASSWORD + AUTH_SECRET,
 * então trocar qualquer um dos dois invalida todas as sessões.
 * Usa apenas Web Crypto, funcionando tanto no proxy quanto nas rotas.
 */
export const SESSION_COOKIE = "fin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function expectedSessionToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  const password = process.env.APP_PASSWORD;
  if (!secret || !password) return null;
  return hmacHex(secret, `session:${password}`);
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedSessionToken();
  return !!expected && timingSafeEqual(token, expected);
}

export async function checkPassword(input: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) return false;
  // Compara os HMACs para não vazar informação por tempo de resposta.
  const [a, b] = await Promise.all([hmacHex(secret, input), hmacHex(secret, password)]);
  return timingSafeEqual(a, b);
}
