import { runAgent, type UserContent } from "@/lib/agent";
import { deleteTransaction, monthSummary } from "@/lib/finance";
import { currentMonth, formatBRL, formatMonthLabel } from "@/lib/format";
import {
  answerCallback,
  downloadFile,
  editMessageText,
  escapeHtml,
  mdToTelegramHtml,
  sendChatAction,
  sendMessage,
  type InlineButton,
} from "@/lib/telegram";

export const maxDuration = 60;

interface TgFile {
  file_id: string;
  mime_type?: string;
}
interface TgMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  voice?: TgFile;
  audio?: TgFile;
  photo?: (TgFile & { width: number })[];
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: { id: string; data?: string; message?: TgMessage };
}

const HELP = `👋 Oi! Eu sou o <b>Fin</b>, seu agente financeiro.

Me mande seus gastos do jeito que falaria com um amigo:
• <i>gastei 42 no ifood</i>
• <i>uber 18 e café 7</i>
• <i>recebi 2500 de salário</i>
• 🎙️ um áudio ou 📸 a foto de um comprovante

Comandos:
/resumo – resumo do mês
/desfazer – apaga o último lançamento
/ajuda – esta mensagem`;

function appButton(): InlineButton[] {
  const url = process.env.APP_URL;
  return url ? [{ text: "📊 Ver no app", url }] : [];
}

async function handleMessage(msg: TgMessage) {
  const chatId = msg.chat.id;
  const text = (msg.text ?? msg.caption ?? "").trim();

  if (text === "/start" || text === "/ajuda" || text === "/help") {
    return sendMessage(chatId, HELP);
  }

  if (text === "/resumo") {
    const s = await monthSummary();
    const top = s.byCategory
      .slice(0, 6)
      .map((c) => `• ${escapeHtml(c.category)}: <b>${formatBRL(c.total)}</b>`)
      .join("\n");
    return sendMessage(
      chatId,
      `📊 <b>${formatMonthLabel(currentMonth())}</b>\n\n` +
        `💸 Gastos: <b>${formatBRL(s.expense)}</b>\n` +
        `💰 Receitas: <b>${formatBRL(s.income)}</b>\n` +
        `🧮 Saldo: <b>${formatBRL(s.balance)}</b>\n\n` +
        (top || "Nenhum gasto registrado ainda."),
      [appButton()],
    );
  }

  if (text === "/desfazer") {
    const r = await runAgent({ channel: "telegram", content: "apaga o último lançamento" });
    return sendMessage(chatId, mdToTelegramHtml(r.text));
  }

  // Monta a entrada para o agente: texto, áudio ou foto.
  let content: UserContent = text;
  let logText = text;
  const audio = msg.voice ?? msg.audio;
  if (audio) {
    const { data } = await downloadFile(audio.file_id);
    content = [
      { type: "text", text: "Mensagem de voz do usuário. Entenda o que foi dito e execute o pedido." },
      { type: "file", mediaType: audio.mime_type ?? "audio/ogg", data },
    ];
    logText = "🎙️ [áudio]";
  } else if (msg.photo?.length) {
    const largest = msg.photo.reduce((a, b) => (b.width > a.width ? b : a));
    const { data } = await downloadFile(largest.file_id);
    content = [
      {
        type: "text",
        text:
          "Imagem enviada pelo usuário (provavelmente comprovante, nota fiscal ou recibo). " +
          "Extraia valor, estabelecimento e data e registre o lançamento." +
          (text ? ` Legenda: ${text}` : ""),
      },
      { type: "file", mediaType: "image/jpeg", data },
    ];
    logText = `📸 [foto]${text ? " " + text : ""}`;
  } else if (!text) {
    return sendMessage(chatId, "Ainda não sei lidar com esse tipo de mensagem 😅. Tente texto, áudio ou foto.");
  }

  await sendChatAction(chatId);
  const result = await runAgent({ channel: "telegram", content, logText });

  const created = result.events.flatMap((e) => e.createdIds ?? []);
  const buttons: InlineButton[][] = [];
  if (created.length) buttons.push([{ text: "↩️ Desfazer", callback_data: `undo:${created.join(",")}` }, ...appButton()]);

  return sendMessage(chatId, mdToTelegramHtml(result.text), buttons.length ? buttons : undefined);
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>) {
  const data = cb.data ?? "";
  if (data.startsWith("undo:") && cb.message) {
    const ids = data.slice(5).split(",").map(Number).filter(Boolean);
    let removed = 0;
    for (const id of ids) if (await deleteTransaction(id)) removed++;
    await answerCallback(cb.id, removed ? "Lançamento desfeito" : "Já tinha sido removido");
    const original = escapeHtml(cb.message.text ?? "");
    await editMessageText(cb.message.chat.id, cb.message.message_id, `<s>${original}</s>\n↩️ Desfeito`);
    return;
  }
  await answerCallback(cb.id);
}

export async function POST(req: Request) {
  // 1) Só aceita chamadas do Telegram (token secreto definido no setWebhook).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const update = (await req.json()) as TgUpdate;
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (!chatId) return Response.json({ ok: true });

  // 2) Só responde ao dono do bot.
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed) {
    await sendMessage(
      chatId,
      `🔧 Configuração: seu chat_id é <code>${chatId}</code>.\nDefina <b>TELEGRAM_ALLOWED_CHAT_ID</b> com esse valor na Vercel e faça um novo deploy.`,
    );
    return Response.json({ ok: true });
  }
  if (String(chatId) !== allowed) return Response.json({ ok: true });

  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
  } catch (err) {
    console.error("[telegram]", err);
    await sendMessage(chatId, "😵 Tive um problema para processar isso. Tente de novo em instantes.").catch(() => {});
  }
  // Sempre 200 para o Telegram não reenviar a mesma mensagem.
  return Response.json({ ok: true });
}
