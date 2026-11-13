# 💸 Fin — Agente Financeiro Pessoal (Telegram + App Web)

Aplicativo de organização de finanças pessoais construído como evolução do desafio de **Vibe Coding** da DIO. Em vez de parar em um protótipo estático, o projeto implementa um **agente financeiro real** inspirado no Pierre Finance:

- **No dia a dia (Telegram):** você manda `"gastei 42 no ifood"`, `"almoço 30 e uber 18"`, um **áudio** ou a **foto de um comprovante**, e o agente registra tudo sozinho.
- **Para ver tudo (App Web):** dashboard com gráficos, lista completa de lançamentos com filtros e edição em 1 clique, metas, orçamentos por categoria e um **chat integrado** que compartilha o mesmo cérebro e o mesmo histórico do Telegram.

👉 O documento de requisitos completo está em [PRD.md](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/PRD.md).

---

## 🧭 Arquitetura

```
 📱 Telegram (texto, áudio, foto)        💻 App Web (Next.js na Vercel)
          │                                       │
          ▼                                       ▼
   /api/telegram                            /api/chat + Server Actions
          │                                       │
          └──────────────►  src/lib/agent.ts  ◄───┘
                            (Gemini + tools)
                                   │
                                   ▼
                        src/lib/finance.ts (Drizzle)
                                   │
                                   ▼
                          🗄️ Neon (Postgres)
```

### Principais arquivos
- [src/db/schema.ts](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/db/schema.ts) — tabelas `transactions`, `goals`, `budgets` e `messages` no Neon.
- [src/lib/finance.ts](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/lib/finance.ts) — camada única de dados (resumos, tendência de 6 meses, alertas de orçamento, metas).
- [src/lib/agent.ts](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/lib/agent.ts) — núcleo do agente **Fin** (Gemini via Vercel AI SDK) com ferramentas para registrar, listar, corrigir, apagar, consultar resumos, definir orçamentos e gerenciar metas, além dos mini-agentes **Guardião** 🛡️, **Coach** 🎯 e **Pão-duro** 😤.
- [src/app/api/telegram/route.ts](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/app/api/telegram/route.ts) — webhook do Telegram (texto, voz, foto, `/resumo`, `/desfazer` e botão inline **↩️ Desfazer**).
- [src/app/(app)/page.tsx](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/app/(app)/page.tsx) — visão geral com saldo, gráficos e alertas.
- [src/app/(app)/transacoes/page.tsx](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/app/(app)/transacoes/page.tsx) — lançamentos com busca, filtros, adição manual e edição de categoria.
- [src/app/(app)/metas/page.tsx](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/app/(app)/metas/page.tsx) — metas financeiras e orçamentos mensais.
- [src/app/(app)/chat/page.tsx](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/src/app/(app)/chat/page.tsx) — chat web com histórico unificado (Telegram + app).

---

## 🚀 Como colocar no ar (Vercel + Neon + Telegram)

### 1. Variáveis de ambiente
Copie [.env.example](file:///home/antigravity/aderald0/dio-lab-vibe-coding-app-financas/.env.example) para `.env` (local) e configure as mesmas variáveis no painel da **Vercel**:

| Variável | Onde conseguir |
|---|---|
| `DATABASE_URL` | Connection string do seu banco **Neon** |
| `APP_PASSWORD` | Senha que você vai usar para entrar no app web |
| `AUTH_SECRET` | Qualquer string aleatória longa (ex.: `openssl rand -hex 32`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chave gratuita no **Google AI Studio** |
| `TELEGRAM_BOT_TOKEN` | Token gerado pelo **@BotFather** (`/newbot`) |
| `TELEGRAM_BOT_USERNAME` | User do bot sem `@` (ex.: `meu_fin_bot`) |
| `TELEGRAM_WEBHOOK_SECRET` | Segredo aleatório (letras, números, `_` ou `-`) |
| `TELEGRAM_ALLOWED_CHAT_ID` | Seu `chat_id` (veja dica abaixo) |
| `APP_URL` | URL do seu app na Vercel (ex.: `https://seu-app.vercel.app`) |

### 2. Criar as tabelas e ativar o webhook do Telegram
Com o `.env` preenchido e o app já publicado na Vercel, rode uma única vez:

```bash
npm install
npm run setup
```

Esse comando cria as 4 tabelas no Neon e registra o webhook do Telegram apontando para `APP_URL/api/telegram`.

> 💡 **Como descobrir seu `TELEGRAM_ALLOWED_CHAT_ID`:** deixe essa variável vazia no primeiro deploy e mande um `"oi"` para o bot no Telegram. Ele vai responder com o seu `chat_id`. Aí é só colar esse número na Vercel e fazer redeploy — a partir daí o bot ignora qualquer outra pessoa.

### 3. Rodar localmente
```bash
npm run dev
```
Abra `http://localhost:3000` e entre com a senha definida em `APP_PASSWORD`.
