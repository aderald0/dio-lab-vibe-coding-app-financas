/** Cliente mínimo da Bot API do Telegram (sem dependências). */

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  return t;
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };

export function sendMessage(chatId: number | string, text: string, buttons?: InlineButton[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export function sendChatAction(chatId: number | string, action: "typing" = "typing") {
  return tg("sendChatAction", { chat_id: chatId, action }).catch(() => undefined);
}

export function answerCallback(id: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, text });
}

export function editMessageText(chatId: number | string, messageId: number, text: string) {
  return tg("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" });
}

/** Baixa um arquivo enviado ao bot (áudio/foto) e devolve os bytes. */
export async function downloadFile(fileId: string): Promise<{ data: Uint8Array; path: string }> {
  const file = await tg<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`${API}/file/bot${token()}/${file.file_path}`);
  if (!res.ok) throw new Error("Falha ao baixar arquivo do Telegram.");
  return { data: new Uint8Array(await res.arrayBuffer()), path: file.file_path };
}

/** Escapa texto para o modo HTML do Telegram. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converte o markdown simples do agente (**negrito**) para HTML do Telegram. */
export function mdToTelegramHtml(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|\s)\*(?!\s)(.+?)\*(?=\s|$)/g, "$1<i>$2</i>")
    .replace(/^#+\s*(.+)$/gm, "<b>$1</b>");
}
