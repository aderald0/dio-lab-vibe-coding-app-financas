import type { Metadata } from "next";
import {
  contributeGoalAction,
  createGoalAction,
  deleteBudgetAction,
  deleteGoalAction,
  setBudgetAction,
} from "@/app/actions";
import { IconTrash } from "@/components/icons";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { budgetStatus, listGoals } from "@/lib/finance";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Metas e orçamentos" };

function monthsRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const [y1, m1] = todayISO().split("-").map(Number);
  const [y2, m2] = deadline.split("-").map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1));
}

export default async function MetasPage() {
  const [goals, budgets] = await Promise.all([listGoals(), budgetStatus()]);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Planejamento</span>
          <h1 className="page-title">Metas e orçamentos</h1>
          <p className="muted">
            O Coach acompanha suas metas e o Guardião avisa no Telegram quando um orçamento chega a 80%.
          </p>
        </div>
      </header>

      <div className="grid grid-2-even" style={{ alignItems: "start" }}>
        {/* ------------------------ Metas ------------------------ */}
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Metas financeiras</h2>
            <span className="eyebrow">🎯 Coach</span>
          </div>

          <form
            action={createGoalAction}
            className="form-row"
            style={{ gridTemplateColumns: "1fr 120px 140px auto", marginBottom: 20 }}
          >
            <div className="field">
              <label htmlFor="g-name">Meta</label>
              <input id="g-name" name="name" className="input" placeholder="Ex.: Viagem, Reserva…" required />
            </div>
            <div className="field">
              <label htmlFor="g-target">Valor (R$)</label>
              <input id="g-target" name="targetAmount" className="input" placeholder="3000" inputMode="decimal" required />
            </div>
            <div className="field">
              <label htmlFor="g-dead">Prazo</label>
              <input id="g-dead" name="deadline" type="date" className="input" />
            </div>
            <button id="g-submit" className="btn btn-primary">
              Criar
            </button>
          </form>

          {goals.length === 0 ? (
            <div className="empty">
              <strong>Nenhuma meta ainda</strong>
              Crie acima ou diga no chat: “quero juntar 3000 para viajar até dezembro”.
            </div>
          ) : (
            <div className="grid" style={{ gap: 16 }}>
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
                const remaining = Math.max(0, g.targetAmount - g.savedAmount);
                const months = monthsRemaining(g.deadline);
                return (
                  <div
                    key={g.id}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: "var(--surface-2)",
                      boxShadow: "inset 0 0 0 1px var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div>
                        <strong style={{ fontSize: "1rem" }}>{g.name}</strong>
                        {g.deadline && (
                          <span className="muted" style={{ fontSize: "0.78rem", marginLeft: 8 }}>
                            até {formatDate(g.deadline)}
                          </span>
                        )}
                      </div>
                      <form action={deleteGoalAction.bind(null, g.id)}>
                        <button className="icon-btn" aria-label={`Apagar meta ${g.name}`}>
                          <IconTrash />
                        </button>
                      </form>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", margin: "8px 0 6px" }}>
                      <span className="money">
                        <strong>{formatBRL(g.savedAmount)}</strong> de {formatBRL(g.targetAmount)}
                      </span>
                      <strong>{pct}%</strong>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {remaining === 0
                          ? "🎉 Meta concluída!"
                          : months
                            ? `Sugestão: ${formatBRL(remaining / months)}/mês`
                            : `Faltam ${formatBRL(remaining)}`}
                      </span>
                      <form action={contributeGoalAction} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="id" value={g.id} />
                        <input
                          name="amount"
                          aria-label={`Guardar na meta ${g.name}`}
                          className="input"
                          placeholder="+ R$"
                          inputMode="decimal"
                          style={{ width: 96, height: 32, fontSize: "0.82rem" }}
                          required
                        />
                        <button className="btn btn-ghost btn-sm">Guardar</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------------------- Orçamentos --------------------- */}
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Orçamentos mensais</h2>
            <span className="eyebrow">🛡️ Guardião</span>
          </div>

          <form
            action={setBudgetAction}
            className="form-row"
            style={{ gridTemplateColumns: "1fr 140px auto", marginBottom: 20 }}
          >
            <div className="field">
              <label htmlFor="b-cat">Categoria</label>
              <select id="b-cat" name="category" className="select">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="b-limit">Limite mensal (R$)</label>
              <input id="b-limit" name="limit" className="input" placeholder="600" inputMode="decimal" required />
            </div>
            <button id="b-submit" className="btn btn-primary">
              Definir
            </button>
          </form>

          {budgets.length === 0 ? (
            <div className="empty">
              <strong>Nenhum orçamento definido</strong>
              Escolha uma categoria acima para definir um teto mensal.
            </div>
          ) : (
            <div className="grid" style={{ gap: 14 }}>
              {budgets.map((b) => (
                <div
                  key={b.category}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "var(--surface-2)",
                    boxShadow: "inset 0 0 0 1px var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong>{b.category}</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="muted money" style={{ fontSize: "0.84rem" }}>
                        {formatBRL(b.spent)} / {formatBRL(b.limit)} ({b.percent}%)
                      </span>
                      <form action={deleteBudgetAction.bind(null, b.category)}>
                        <button className="icon-btn" aria-label={`Remover orçamento de ${b.category}`}>
                          <IconTrash />
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className={`bar ${b.percent >= 100 ? "over" : b.percent >= 80 ? "warn" : ""}`}>
                    <span style={{ width: `${Math.min(100, b.percent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
