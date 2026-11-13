import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { currentMonth, monthRange, shiftMonth } from "@/lib/format";

const { transactions, goals, budgets, messages } = schema;

export type TxType = "despesa" | "receita";
export type TxSource = "telegram" | "web" | "chat";

export interface NewTransaction {
  type: TxType;
  amount: number;
  category: string;
  description?: string;
  occurredOn: string;
  source: TxSource;
}

export interface BudgetAlert {
  category: string;
  limit: number;
  spent: number;
  percent: number;
}

/* ------------------------------------------------------------------ */
/* Transações                                                          */
/* ------------------------------------------------------------------ */

/** Registra um lançamento e devolve um alerta de orçamento, se houver. */
export async function addTransaction(input: NewTransaction) {
  const db = getDb();
  const [row] = await db
    .insert(transactions)
    .values({ ...input, amount: Math.abs(input.amount), description: input.description ?? "" })
    .returning();

  let budgetAlert: BudgetAlert | null = null;
  if (row.type === "despesa") {
    budgetAlert = await checkBudget(row.category, row.occurredOn.slice(0, 7));
  }
  return { transaction: row, budgetAlert };
}

export async function updateTransaction(
  id: number,
  patch: Partial<Pick<NewTransaction, "type" | "amount" | "category" | "description" | "occurredOn">>,
) {
  const [row] = await getDb()
    .update(transactions)
    .set(patch)
    .where(eq(transactions.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTransaction(id: number) {
  const [row] = await getDb().delete(transactions).where(eq(transactions.id, id)).returning();
  return row ?? null;
}

export async function lastTransaction() {
  const [row] = await getDb().select().from(transactions).orderBy(desc(transactions.id)).limit(1);
  return row ?? null;
}

export interface TxFilter {
  start?: string;
  end?: string;
  category?: string;
  type?: TxType;
  search?: string;
  limit?: number;
}

export async function listTransactions(filter: TxFilter = {}) {
  const conds = [];
  if (filter.start) conds.push(gte(transactions.occurredOn, filter.start));
  if (filter.end) conds.push(lte(transactions.occurredOn, filter.end));
  if (filter.category) conds.push(eq(transactions.category, filter.category));
  if (filter.type) conds.push(eq(transactions.type, filter.type));
  if (filter.search) conds.push(sql`${transactions.description} ILIKE ${"%" + filter.search + "%"}`);

  return getDb()
    .select()
    .from(transactions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(filter.limit ?? 200);
}

/* ------------------------------------------------------------------ */
/* Resumos                                                             */
/* ------------------------------------------------------------------ */

export async function summary(start: string, end: string) {
  const db = getDb();
  const rows = await db
    .select({
      type: transactions.type,
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(and(gte(transactions.occurredOn, start), lte(transactions.occurredOn, end)))
    .groupBy(transactions.type, transactions.category);

  let income = 0;
  let expense = 0;
  let count = 0;
  const byCategory: { category: string; total: number; count: number }[] = [];
  for (const r of rows) {
    const total = Number(r.total);
    count += r.count;
    if (r.type === "receita") income += total;
    else {
      expense += total;
      byCategory.push({ category: r.category, total, count: r.count });
    }
  }
  byCategory.sort((a, b) => b.total - a.total);
  return { start, end, income, expense, balance: income - expense, count, byCategory };
}

export async function monthSummary(month = currentMonth()) {
  const { start, end } = monthRange(month);
  return summary(start, end);
}

/** Receitas x despesas dos últimos N meses (para o gráfico de barras). */
export async function monthlyTrend(months = 6, until = currentMonth()) {
  const first = shiftMonth(until, -(months - 1));
  const { start } = monthRange(first);
  const { end } = monthRange(until);
  const rows = await getDb()
    .select({
      month: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
      type: transactions.type,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.occurredOn, start), lte(transactions.occurredOn, end)))
    .groupBy(sql`1`, transactions.type);

  const result = Array.from({ length: months }, (_, i) => ({
    month: shiftMonth(first, i),
    income: 0,
    expense: 0,
  }));
  for (const r of rows) {
    const item = result.find((x) => x.month === r.month);
    if (!item) continue;
    if (r.type === "receita") item.income = Number(r.total);
    else item.expense = Number(r.total);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Orçamentos                                                          */
/* ------------------------------------------------------------------ */

export async function setBudget(category: string, monthlyLimit: number) {
  const [row] = await getDb()
    .insert(budgets)
    .values({ category, monthlyLimit })
    .onConflictDoUpdate({ target: budgets.category, set: { monthlyLimit } })
    .returning();
  return row;
}

export async function deleteBudget(category: string) {
  await getDb().delete(budgets).where(eq(budgets.category, category));
}

export async function budgetStatus(month = currentMonth()) {
  const [list, sum] = await Promise.all([
    getDb().select().from(budgets).orderBy(asc(budgets.category)),
    monthSummary(month),
  ]);
  return list.map((b) => {
    const spent = sum.byCategory.find((c) => c.category === b.category)?.total ?? 0;
    return {
      category: b.category,
      limit: b.monthlyLimit,
      spent,
      percent: b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0,
    };
  });
}

async function checkBudget(category: string, month: string): Promise<BudgetAlert | null> {
  const [b] = await getDb().select().from(budgets).where(eq(budgets.category, category));
  if (!b) return null;
  const { start, end } = monthRange(month);
  const [r] = await getDb()
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "despesa"),
        eq(transactions.category, category),
        gte(transactions.occurredOn, start),
        lte(transactions.occurredOn, end),
      ),
    );
  const spent = Number(r.total);
  const percent = Math.round((spent / b.monthlyLimit) * 100);
  return percent >= 80 ? { category, limit: b.monthlyLimit, spent, percent } : null;
}

/* ------------------------------------------------------------------ */
/* Metas                                                               */
/* ------------------------------------------------------------------ */

export async function listGoals() {
  return getDb().select().from(goals).orderBy(asc(goals.id));
}

export async function createGoal(input: { name: string; targetAmount: number; deadline?: string | null }) {
  const [row] = await getDb()
    .insert(goals)
    .values({ name: input.name, targetAmount: input.targetAmount, deadline: input.deadline ?? null })
    .returning();
  return row;
}

export async function contributeToGoal(id: number, amount: number) {
  const [row] = await getDb()
    .update(goals)
    .set({ savedAmount: sql`${goals.savedAmount} + ${amount}` })
    .where(eq(goals.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGoal(id: number) {
  await getDb().delete(goals).where(eq(goals.id, id));
}

/* ------------------------------------------------------------------ */
/* Histórico de mensagens                                              */
/* ------------------------------------------------------------------ */

export async function saveMessage(role: "user" | "assistant", content: string, channel: "telegram" | "web") {
  await getDb().insert(messages).values({ role, content, channel });
}

export async function recentMessages(limit = 30) {
  const rows = await getDb().select().from(messages).orderBy(desc(messages.id)).limit(limit);
  return rows.reverse();
}
