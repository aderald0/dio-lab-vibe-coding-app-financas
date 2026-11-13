import {
  date,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Lançamentos financeiros (despesas e receitas). */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["despesa", "receita"] }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  source: text("source", { enum: ["telegram", "web", "chat"] })
    .notNull()
    .default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Metas de economia (ex.: "Viagem", R$ 3.000 até dezembro). */
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  savedAmount: numeric("saved_amount", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  deadline: date("deadline", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Orçamento mensal por categoria (usado pelo agente "Guardião"). */
export const budgets = pgTable("budgets", {
  category: text("category").primaryKey(),
  monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

/** Histórico unificado de conversa (Telegram + chat do app). */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  channel: text("channel", { enum: ["telegram", "web"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Message = typeof messages.$inferSelect;
