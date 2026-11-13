# PRD — Fin: Agente Financeiro Pessoal (Telegram + App Web)

## 1. Contexto
**Fin** é um aplicativo de organização de finanças pessoais guiado por conversa em linguagem natural, inspirado na experiência do Pierre Finance. No dia a dia, o usuário manda seus gastos pelo **Telegram** (texto, áudio ou foto do comprovante); quando quer enxergar o todo, abre a **aplicação web** com gráficos, filtros, metas, orçamentos e um chat integrado com o mesmo agente.

## 2. Problema
A maioria das pessoas abandona o controle financeiro porque os apps tradicionais:
- exigem preencher vários campos a cada compra;
- separam o momento do gasto (rua/celular) do momento de análise;
- mostram números sem dizer o que fazer com eles.

## 3. Objetivo do Produto
Permitir registrar qualquer gasto em **menos de 10 segundos** pelo Telegram e oferecer uma visão clara e acionável na web, mantendo os dois canais sincronizados no mesmo banco de dados.

## 4. Público-Alvo e Persona
Pessoas que querem controlar gastos sem planilhas nem formulários. No MVP, o app é configurado para **uso pessoal (single-user)**.

> **Persona:** Ana, 24 anos, recebe R\$ 2.500/mês, sente que "o dinheiro some" em pequenos gastos (delivery, transporte por app) e quer juntar R\$ 3.000 para uma viagem.

## 5. Arquitetura
- **Frontend + Backend:** Next.js (App Router) hospedado na **Vercel**.
- **Banco de dados:** **Neon** (Postgres serverless) com Drizzle ORM.
- **IA:** **Gemini** (`@ai-sdk/google` + Vercel AI SDK) com chamada de ferramentas (*tool calling*).
- **Canal rápido:** Bot no **Telegram** via webhook (`/api/telegram`).
- **Núcleo único:** Tanto o webhook do Telegram quanto o chat web (`/api/chat`) chamam a mesma função `runAgent`, lêem e gravam nas mesmas tabelas e compartilham o mesmo histórico de conversa.

## 6. Funcionalidades do MVP
1. **Registro via Telegram e chat web (texto, áudio e foto)**
   - Frases como *"gastei 42 no ifood"*, *"almoço 30 e uber 18"*, *"recebi 2500 de salário"*.
   - Áudio de voz e foto de comprovante/nota fiscal interpretados pelo Gemini.
   - Botão **↩️ Desfazer** na resposta do Telegram e suporte a correções em linguagem natural (*"na verdade foi Lazer"*, *"apaga o último"*).
2. **Classificação automática**
   - Categorias de despesa: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Compras, Assinaturas, Outros.
   - Categorias de receita: Salário, Freelance, Investimentos, Outras receitas.
3. **Mini-agentes com personalidade**
   - 🛡️ **Guardião:** avisa automaticamente quando uma categoria atinge 80% ou 100% do orçamento mensal.
   - 🎯 **Coach de metas:** acompanha metas e calcula quanto guardar por mês até o prazo.
   - 😤 **Pão-duro (opcional):** faz um comentário curto e bem-humorado em gastos supérfluos.
4. **Aplicação web detalhada**
   - **Visão geral (`/`):** saldo, receitas, gastos, variação contra o mês anterior, gráfico de rosca por categoria, evolução dos últimos 6 meses, alertas do Guardião, metas e últimos lançamentos.
   - **Lançamentos (`/transacoes`):** busca, filtro por mês/categoria/tipo, inclusão manual, troca de categoria com 1 clique e exclusão.
   - **Metas e orçamentos (`/metas`):** criação de metas, aportes, cálculo de poupança mensal sugerida e limites mensais por categoria.
   - **Chat (`/chat`):** conversa completa com o Fin e histórico unificado (mostra inclusive o que foi enviado pelo Telegram).

## 7. Fora do Escopo do MVP
- Integração bancária automática / Open Finance.
- Cartão de crédito com fechamento de fatura e parcelamento automático.
- Multiusuário com cadastro público.
- Recomendação de produtos de investimento.

## 8. Segurança e Privacidade (Requisitos Não Funcionais)
- Login por senha (`APP_PASSWORD`) com cookie `httpOnly` assinado via HMAC (`AUTH_SECRET`).
- Webhook do Telegram protegido por `X-Telegram-Bot-Api-Secret-Token` e restrito ao `TELEGRAM_ALLOWED_CHAT_ID` do dono.
- Chaves mantidas exclusivamente em variáveis de ambiente na Vercel.

## 9. Métricas de Validação
- Tempo médio para registrar um gasto no Telegram < 10 s.
- Pelo menos 80% dos lançamentos classificados na categoria certa sem precisar corrigir.
- Registro ativo em pelo menos 5 dias por semana após 2 semanas de uso.
