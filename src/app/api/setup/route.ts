import { neon } from "@neondatabase/serverless";
import { hasSession } from "@/lib/session";

const DDL = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id serial PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('despesa', 'receita')),
    amount numeric(12, 2) NOT NULL,
    category text NOT NULL,
    description text NOT NULL DEFAULT '',
    occurred_on date NOT NULL,
    source text NOT NULL DEFAULT 'web',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions (occurred_on DESC, id DESC)`,
  `CREATE TABLE IF NOT EXISTS goals (
    id serial PRIMARY KEY,
    name text NOT NULL,
    target_amount numeric(12, 2) NOT NULL,
    saved_amount numeric(12, 2) NOT NULL DEFAULT 0,
    deadline date,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    category text PRIMARY KEY,
    monthly_limit numeric(12, 2) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id serial PRIMARY KEY,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('telegram', 'web')),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
];

/**
 * Rota protegida por login: cria as tabelas no Neon e registra o webhook do Telegram
 * usando as variáveis de ambiente já salvas na Vercel (sem expor nada no repositório público).
 */
export async function POST(req: Request) {
  if (!(await hasSession())) return Response.json({ error: "unauthorized" }, { status: 401 });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return Response.json({ error: "DATABASE_URL não configurada na Vercel." }, { status: 400 });

  const sql = neon(dbUrl);
  for (const stmt of DDL) await sql.query(stmt);

  let telegram: unknown = "TELEGRAM_BOT_TOKEN ou TELEGRAM_WEBHOOK_SECRET ausente";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const origin = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");

  if (token && secret) {
    const webhookUrl = `${origin}/api/telegram`;
    telegram = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
    }).then((r) => r.json());

    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "resumo", description: "Resumo de gastos e saldo do mês" },
          { command: "desfazer", description: "Apaga o último lançamento" },
          { command: "ajuda", description: "Como usar o Fin" },
        ],
      }),
    });
  }

  return Response.json({ ok: true, tables: "created", telegram });
}
