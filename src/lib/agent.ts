import "server-only";
import { google } from "@ai-sdk/google";
import { generateText, isStepCount, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import * as fin from "@/lib/finance";
import { currentMonth, formatBRL, monthRange, todayISO } from "@/lib/format";

export type Channel = "telegram" | "web";

export interface AgentEvent {
  tool: string;
  /** IDs de lançamentos criados neste turno (usado para o botão "Desfazer"). */
  createdIds?: number[];
}

export interface AgentResult {
  text: string;
  events: AgentEvent[];
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const PAO_DURO = (process.env.AGENT_PAO_DURO ?? "on") !== "off";

function instructions(channel: Channel): string {
  const today = todayISO();
  return `
Você é o **Fin**, um Agente Financeiro pessoal que fala português do Brasil.
Hoje é ${today} (mês atual: ${currentMonth()}). Canal atual: ${channel === "telegram" ? "Telegram (mensagens curtas)" : "chat do app web"}.

## Seu papel
- Registrar despesas e receitas que o usuário descrever em linguagem natural.
- Responder perguntas sobre gastos, saldo, categorias, orçamentos e metas usando SEMPRE as ferramentas (nunca invente números).
- Dar dicas práticas de economia baseadas nos dados reais.

## Regras para registrar
- Use a ferramenta registrar_lancamentos. Uma mensagem pode ter vários lançamentos ("almoço 30, uber 18").
- Valores: "35", "35,90", "R$ 35", "cinquenta reais" -> número. "2 mil" = 2000.
- Datas relativas: "ontem", "sexta passada" -> converta para YYYY-MM-DD com base em hoje. Sem data = hoje.
- Categorias de despesa: ${EXPENSE_CATEGORIES.join(", ")}.
- Categorias de receita: ${INCOME_CATEGORIES.join(", ")}.
- Exemplos: iFood/restaurante/mercado -> Alimentação; Uber/99/gasolina/ônibus -> Transporte; aluguel/luz/água/internet/condomínio -> Moradia; Netflix/Spotify/academia -> Assinaturas; farmácia/consulta -> Saúde; cinema/bar/show -> Lazer; roupas/eletrônicos -> Compras.
- Se o valor estiver ausente ou muito ambíguo, pergunte antes de registrar. Se só a categoria for duvidosa, escolha a mais provável.
- "apaga o último", "desfaz" -> apagar_lancamento sem id. "na verdade foi Lazer" -> corrigir o último lançamento (use listar_lancamentos com limite 1 para achar o id, se necessário).

## Mini-agentes (comportamentos)
- 🛡️ Guardião: se a ferramenta devolver "alertaOrcamento", avise de forma clara quanto do orçamento da categoria já foi usado.
- 🎯 Coach de metas: ao falar de metas, diga quanto falta e quanto poupar por mês até o prazo.
${PAO_DURO ? "- 😤 Pão-duro: quando um gasto parecer exagerado ou supérfluo (ex.: delivery caro, várias compras por impulso), faça UM comentário curto e bem-humorado, sem julgar ou ofender." : ""}

## Estilo
- Tom amigável, encorajador e sem jargões. Respostas curtas e objetivas.
- Após registrar, confirme em uma linha: valor, categoria e descrição (ex.: "✅ R$ 42,00 · Alimentação · iFood").
- Formate valores como R$ 1.234,56. Use **negrito** com moderação e emojis com moderação.
- Nunca recomende investimentos específicos; foque em organização e economia.
`.trim();
}

const categoria = z.enum(ALL_CATEGORIES);
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data no formato YYYY-MM-DD");

function buildTools(channel: Channel, events: AgentEvent[]) {
  const source: fin.TxSource = channel === "telegram" ? "telegram" : "chat";

  return {
    registrar_lancamentos: tool({
      description: "Registra uma ou mais despesas/receitas.",
      inputSchema: z.object({
        lancamentos: z
          .array(
            z.object({
              tipo: z.enum(["despesa", "receita"]),
              valor: z.number().positive(),
              categoria,
              descricao: z.string().describe("Descrição curta, ex.: 'iFood', 'Uber para o trabalho'"),
              data: dataISO.optional(),
            }),
          )
          .min(1),
      }),
      execute: async ({ lancamentos }) => {
        const results = [];
        for (const l of lancamentos) {
          const { transaction, budgetAlert } = await fin.addTransaction({
            type: l.tipo,
            amount: l.valor,
            category: l.categoria,
            description: l.descricao,
            occurredOn: l.data ?? todayISO(),
            source,
          });
          results.push({
            id: transaction.id,
            tipo: transaction.type,
            valor: formatBRL(transaction.amount),
            categoria: transaction.category,
            descricao: transaction.description,
            data: transaction.occurredOn,
            alertaOrcamento: budgetAlert
              ? `${budgetAlert.percent}% do orçamento de ${budgetAlert.category} usado (${formatBRL(budgetAlert.spent)} de ${formatBRL(budgetAlert.limit)})`
              : undefined,
          });
        }
        events.push({ tool: "registrar_lancamentos", createdIds: results.map((r) => r.id) });
        return { registrados: results };
      },
    }),

    listar_lancamentos: tool({
      description: "Lista lançamentos com filtros opcionais (mais recentes primeiro).",
      inputSchema: z.object({
        inicio: dataISO.optional(),
        fim: dataISO.optional(),
        categoria: categoria.optional(),
        tipo: z.enum(["despesa", "receita"]).optional(),
        busca: z.string().optional().describe("Texto para buscar na descrição"),
        limite: z.number().int().min(1).max(50).optional(),
      }),
      execute: async (f) => {
        const rows = await fin.listTransactions({
          start: f.inicio,
          end: f.fim,
          category: f.categoria,
          type: f.tipo,
          search: f.busca,
          limit: f.limite ?? 15,
        });
        return rows.map((r) => ({
          id: r.id,
          tipo: r.type,
          valor: r.amount,
          categoria: r.category,
          descricao: r.description,
          data: r.occurredOn,
        }));
      },
    }),

    resumo_periodo: tool({
      description: "Totais de receitas, despesas, saldo e gastos por categoria em um período. Sem datas = mês atual.",
      inputSchema: z.object({ inicio: dataISO.optional(), fim: dataISO.optional() }),
      execute: async ({ inicio, fim }) => {
        const range = monthRange(currentMonth());
        return fin.summary(inicio ?? range.start, fim ?? range.end);
      },
    }),

    corrigir_lancamento: tool({
      description: "Corrige campos de um lançamento existente.",
      inputSchema: z.object({
        id: z.number().int(),
        tipo: z.enum(["despesa", "receita"]).optional(),
        valor: z.number().positive().optional(),
        categoria: categoria.optional(),
        descricao: z.string().optional(),
        data: dataISO.optional(),
      }),
      execute: async ({ id, tipo, valor, categoria: cat, descricao, data }) => {
        const row = await fin.updateTransaction(id, {
          ...(tipo && { type: tipo }),
          ...(valor && { amount: valor }),
          ...(cat && { category: cat }),
          ...(descricao !== undefined && { description: descricao }),
          ...(data && { occurredOn: data }),
        });
        return row ? { ok: true, lancamento: row } : { ok: false, erro: "Lançamento não encontrado" };
      },
    }),

    apagar_lancamento: tool({
      description: "Apaga um lançamento pelo id. Sem id, apaga o último registrado.",
      inputSchema: z.object({ id: z.number().int().optional() }),
      execute: async ({ id }) => {
        const target = id ?? (await fin.lastTransaction())?.id;
        if (!target) return { ok: false, erro: "Nenhum lançamento encontrado" };
        const row = await fin.deleteTransaction(target);
        return row ? { ok: true, apagado: row } : { ok: false, erro: "Lançamento não encontrado" };
      },
    }),

    status_orcamentos: tool({
      description: "Mostra o uso dos orçamentos mensais por categoria.",
      inputSchema: z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/).optional() }),
      execute: async ({ mes }) => fin.budgetStatus(mes),
    }),

    definir_orcamento: tool({
      description: "Define (ou atualiza) o limite mensal de gastos de uma categoria.",
      inputSchema: z.object({ categoria, limite: z.number().positive() }),
      execute: async ({ categoria: cat, limite }) => fin.setBudget(cat, limite),
    }),

    listar_metas: tool({
      description: "Lista metas financeiras com valor guardado e prazo.",
      inputSchema: z.object({}),
      execute: async () => fin.listGoals(),
    }),

    criar_meta: tool({
      description: "Cria uma meta de economia.",
      inputSchema: z.object({
        nome: z.string(),
        valor_alvo: z.number().positive(),
        prazo: dataISO.optional(),
      }),
      execute: async ({ nome, valor_alvo, prazo }) =>
        fin.createGoal({ name: nome, targetAmount: valor_alvo, deadline: prazo }),
    }),

    contribuir_meta: tool({
      description: "Adiciona um valor guardado a uma meta (use listar_metas para obter o id).",
      inputSchema: z.object({ meta_id: z.number().int(), valor: z.number().positive() }),
      execute: async ({ meta_id, valor }) => {
        const row = await fin.contributeToGoal(meta_id, valor);
        return row ?? { erro: "Meta não encontrada" };
      },
    }),
  };
}

export type UserContent = Extract<ModelMessage, { role: "user" }>["content"];

/**
 * Núcleo do agente: usado pelo Telegram e pelo chat do app.
 * Carrega o histórico recente unificado, executa as ferramentas e salva a conversa.
 */
export async function runAgent(opts: {
  channel: Channel;
  content: UserContent;
  /** Texto salvo no histórico (ex.: "🎙️ áudio" quando a entrada não é texto). */
  logText?: string;
}): Promise<AgentResult> {
  const history = await fin.recentMessages(20);
  const messages: ModelMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
    { role: "user", content: opts.content } as ModelMessage,
  ];

  const events: AgentEvent[] = [];
  const result = await generateText({
    model: google(MODEL),
    instructions: instructions(opts.channel),
    messages,
    tools: buildTools(opts.channel, events),
    stopWhen: isStepCount(6),
  });

  const text = result.text.trim() || "Feito! ✅";
  const userLog = opts.logText ?? (typeof opts.content === "string" ? opts.content : "[mensagem]");
  await fin.saveMessage("user", userLog, opts.channel);
  await fin.saveMessage("assistant", text, opts.channel);

  return { text, events };
}
