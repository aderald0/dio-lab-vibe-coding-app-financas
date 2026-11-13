/**
 * Script único de configuração:
 * 1) Cria as tabelas no Neon (se ainda não existirem).
 * 2) Registra o webhook e os comandos do bot no Telegram (se APP_URL e TELEGRAM_BOT_TOKEN estiverem definidos).
 *
 * Rode com: npm run setup
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

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

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Defina DATABASE_URL no .env antes de rodar npm run setup.");

  const sql = neon(dbUrl);
  for (const stmt of DDL) await sql.query(stmt);
  console.log("✓ Tabelas criadas/verificadas no Neon.");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (token && appUrl && secret) {
    const webhookUrl = `${appUrl}/api/telegram`;
    const r1 = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
    }).then((r) => r.json());
    console.log("✓ Webhook do Telegram:", webhookUrl, r1);

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
    console.log("✓ Comandos do bot registrados.");
  } else {
    console.log("ℹ Pulei o registro do webhook (defina TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET e APP_URL).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
