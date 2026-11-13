# 💸 App de Organização de Finanças Pessoais com Vibe Coding — Entrega do Desafio DIO

Este repositório documenta a entrega do desafio **Vibe Coding: App de Organização de Finanças Pessoais** da DIO. A partir do conceito proposto no desafio, evoluímos o projeto para **Fin**, um agente financeiro pessoal conversacional inspirado no Pierre Finance, integrando **Telegram** (para registro rápido no dia a dia) e **Aplicação Web** (para visualização detalhada e chat com o agente).

---

## 📋 1. Prompt Final (PRD — Product Requirements Document)

O documento completo também está disponível em [PRD.md](./PRD.md). Abaixo está o prompt/PRD estruturado utilizado para guiar a IA:

```txt
# Contexto
Quero criar um aplicativo de Organização de Finanças Pessoais ("Fin") que funcione por meio de conversas em linguagem natural, como se o usuário estivesse falando com um amigo que entende de dinheiro.
No dia a dia, o usuário envia seus gastos pelo Telegram (texto, áudio ou foto do comprovante); quando quer ver detalhes, abre a aplicação web com gráficos, filtros, metas, orçamentos e um chat integrado com o mesmo agente.

# Problema
Muitas pessoas desistem de controlar os gastos porque os apps atuais:
- exigem muita digitação e preenchimento de campos a cada compra;
- usam termos técnicos que confundem iniciantes;
- não dão orientações personalizadas sobre como economizar.

# Objetivo do Produto
Ajudar o usuário a entender para onde vai o dinheiro e a criar o hábito de registrar gastos em menos de 10 segundos por registro.

# Público-Alvo e Persona
Iniciantes em finanças pessoais, de 18 a 35 anos, que usam muito o celular e já abandonaram planilhas tradicionais.
Persona: Ana, 24 anos, assistente administrativa. Recebe R$ 2.500/mês, sente que "o dinheiro some" em pequenos gastos (delivery, transporte por app) e quer juntar R$ 3.000 para uma viagem.

# Funcionalidades-Chave (MVP)
1. Registro de gastos e receitas via chat (Telegram e Web)
   - Frases como "gastei 42 no iFood", "almoço 30 e uber 18" ou "recebi 2500 de salário".
   - Suporte a áudio de voz e foto de comprovante/nota fiscal.
   - Botão "Desfazer" na confirmação e correção em linguagem natural ("na verdade foi Lazer").
2. Classificação automática
   - Categorias de despesa: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Compras, Assinaturas, Outros.
   - Categorias de receita: Salário, Freelance, Investimentos, Outras receitas.
3. Metas financeiras
   - Criação e acompanhamento pelo chat ou pela web ("quero juntar 3000 para viajar até dezembro"), exibindo progresso (%) e quanto guardar por mês.
4. Agente Financeiro e Mini-Agentes com personalidade
   - 🛡️ Guardião: avisa automaticamente quando uma categoria atinge 80% ou 100% do orçamento mensal.
   - 🎯 Coach de metas: calcula quanto poupar por mês até o prazo de cada meta.
   - 😤 Pão-duro (opcional): faz um comentário curto e bem-humorado em gastos supérfluos.
5. Relatórios e Aplicação Web detalhada
   - Visão Geral (Dashboard): saldo do mês, receitas, gastos, variação vs. mês anterior, gráfico de rosca por categoria e evolução dos últimos 6 meses.
   - Lançamentos: lista completa com busca, filtros, edição de categoria em 1 clique e exclusão.
   - Metas e Orçamentos: barras de progresso e limites por categoria.
   - Chat Integrado: conversa completa com o Fin e histórico unificado (Telegram + Web).

# Personalidade do Agente Financeiro
- Tom amigável, encorajador e sem julgamentos.
- Linguagem simples, sem jargões técnicos.
- Respostas curtas e objetivas, confirmando valor, categoria e descrição.
- Nunca recomenda investimentos específicos; foca em organização e economia.

# Fora do Escopo do MVP
- Integração bancária automática / Open Finance.
- Cartão de crédito com fechamento de fatura.
- Multiusuário aberto ao público.

# Métricas de Validação
- Tempo médio para registrar um gasto < 10 segundos.
- Pelo menos 80% dos registros classificados corretamente sem correção.
- Uso ativo em pelo menos 5 dias da semana.
```

---

## 🖥️ 2. Resumo do que o App "Fin" Faz

O **Fin** une dois canais conectados ao mesmo núcleo de IA (Gemini com *tool calling*) e ao mesmo banco de dados Postgres (Neon):

1. **Canal Rápido no Telegram (`@NowfinanceBot`):**
   - O usuário manda mensagens rápidas na rua (*"gastei 42 no ifood"*), áudios ou fotos de comprovantes.
   - O agente extrai valor, categoria, descrição e data, grava no banco, verifica se o orçamento da categoria passou de 80% e responde em segundos com um botão **↩️ Desfazer**.
   - Comandos rápidos: `/resumo`, `/desfazer` e `/ajuda`.

2. **Aplicação Web Completa (Next.js na Vercel):**
   - **Visão Geral (`/`)**: saldo do mês em destaque, total de receitas e gastos, comparativo percentual com o mês anterior, gráfico de rosca por categoria, gráfico de barras dos últimos 6 meses, alertas do **Guardião** e resumo das metas.
   - **Lançamentos (`/transacoes`)**: todos os registros vindos do Telegram ou da web, com busca, filtro por mês/categoria/tipo, inclusão manual e troca de categoria em 1 clique.
   - **Metas e Orçamentos (`/metas`)**: criação de metas com cálculo automático de poupança mensal sugerida (**Coach**) e definição de limites mensais por categoria (**Guardião**).
   - **Conversar com o Fin (`/chat`)**: chat web conectado ao mesmo agente e ao mesmo histórico do Telegram.

---

## 💬 3. Exemplo de Interação com o Agente

> **Usuária (no Telegram):** `gastei 42 no ifood e 18 de uber`  
> **Fin:**  
> ✅ R\$ 42,00 · Alimentação · iFood  
> ✅ R\$ 18,00 · Transporte · Uber  
> 🛡️ *Guardião:* você já usou **84%** do seu orçamento de Alimentação deste mês (R\$ 420,00 de R\$ 500,00).  
> `[↩️ Desfazer]` `[📊 Ver no app]`

> **Usuária (no Chat do App Web):** `quero juntar 3000 para viajar até dezembro, quanto preciso guardar por mês?`  
> **Fin:**  
> Criei sua meta **Viagem** de **R\$ 3.000,00**! 🎯  
> Guardando **R\$ 375,00 por mês** até dezembro você bate a meta no prazo. Quer que eu ajuste seu orçamento de Lazer ou Delivery para abrir esse espaço no mês?

---

## 🧠 4. Reflexão sobre o Processo de Vibe Coding

### O que funcionou bem?
- **Começar pelo PRD antes de qualquer tela ou código:** estruturar persona, escopo do MVP, categorias fixas e personalidade dos mini-agentes (*Guardião*, *Coach* e *Pão-duro*) fez com que a IA gerasse fluxos e ferramentas coerentes desde a primeira iteração.
- **Separar captura rápida de análise detalhada:** usar o Telegram para o registro do dia a dia (onde a fricção precisa ser zero) e uma aplicação web para gráficos, filtros e planejamento resolveu a maior dor apontada no problema inicial.
- **Núcleo único com chamada de ferramentas (*tool calling*):** em vez de depender apenas de respostas de texto, dar ferramentas reais ao agente (`registrar_lancamentos`, `resumo_periodo`, `definir_orcamento`, `criar_meta`) garantiu que ele nunca inventasse números.

### O que não funcionou como o esperado?
- **Prompt inicial muito aberto:** na primeira versão do PRD faltavam exemplos concretos de frases, limites do que estava *fora do escopo* e regras claras de categorização, o que deixava margem para respostas genéricas.
- **Mudança de versão de modelos da API:** ao conectar a chave da API do Gemini, o modelo `gemini-2.5-flash` já havia sido substituído para novas contas pelo `gemini-3.8-flash`, exigindo parametrizar o modelo por variável de ambiente (`GEMINI_MODEL`).

### O que aprendi sobre conversar com IAs?
- **Contexto e restrições valem mais do que prompts longos:** dizer claramente o que *não* entra no MVP e dar 3 ou 4 exemplos reais (*"gastei 35 no iFood"*, *"na verdade foi Lazer"*) direciona muito melhor o resultado.
- **Iterar em etapas curtas:** primeiro validar o PRD e os conceitos, depois explorar a arquitetura (WhatsApp vs. Telegram vs. Web) e só então construir e publicar na nuvem tornou o processo previsível e didático.
