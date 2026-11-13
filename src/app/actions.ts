"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, expectedSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { ALL_CATEGORIES } from "@/lib/categories";
import * as fin from "@/lib/finance";
import { todayISO } from "@/lib/format";
import { requireSession } from "@/lib/session";

/* ----------------------------- Login ----------------------------- */

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) return "Senha incorreta.";
  const token = await expectedSessionToken();
  if (!token) return "APP_PASSWORD e AUTH_SECRET precisam estar configurados.";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/* -------------------------- Transações --------------------------- */

function parseAmount(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Valor inválido");
  return n;
}

function parseCategory(v: FormDataEntryValue | null): string {
  const c = String(v ?? "");
  if (!(ALL_CATEGORIES as readonly string[]).includes(c)) throw new Error("Categoria inválida");
  return c;
}

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function createTransactionAction(formData: FormData) {
  await requireSession();
  await fin.addTransaction({
    type: formData.get("type") === "receita" ? "receita" : "despesa",
    amount: parseAmount(formData.get("amount")),
    category: parseCategory(formData.get("category")),
    description: String(formData.get("description") ?? "").slice(0, 200),
    occurredOn: String(formData.get("occurredOn") || todayISO()),
    source: "web",
  });
  refreshAll();
}

export async function updateCategoryAction(id: number, category: string) {
  await requireSession();
  await fin.updateTransaction(id, { category: parseCategory(category) });
  refreshAll();
}

export async function deleteTransactionAction(id: number) {
  await requireSession();
  await fin.deleteTransaction(id);
  refreshAll();
}

/* ----------------------- Metas e orçamentos ---------------------- */

export async function createGoalAction(formData: FormData) {
  await requireSession();
  await fin.createGoal({
    name: String(formData.get("name") ?? "").slice(0, 80) || "Meta",
    targetAmount: parseAmount(formData.get("targetAmount")),
    deadline: String(formData.get("deadline") || "") || null,
  });
  refreshAll();
}

export async function contributeGoalAction(formData: FormData) {
  await requireSession();
  await fin.contributeToGoal(Number(formData.get("id")), parseAmount(formData.get("amount")));
  refreshAll();
}

export async function deleteGoalAction(id: number) {
  await requireSession();
  await fin.deleteGoal(id);
  refreshAll();
}

export async function setBudgetAction(formData: FormData) {
  await requireSession();
  await fin.setBudget(parseCategory(formData.get("category")), parseAmount(formData.get("limit")));
  refreshAll();
}

export async function deleteBudgetAction(category: string) {
  await requireSession();
  await fin.deleteBudget(category);
  refreshAll();
}
