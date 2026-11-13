import Link from "next/link";
import { CategoryDonut, TrendBars } from "@/components/charts";
import {
  IconArrowDown,
  IconArrowUp,
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconSparkle,
} from "@/components/icons";
import { SetupButton } from "@/components/setup-button";
import { TransactionList } from "@/components/transaction-list";
import { budgetStatus, listGoals, listTransactions, monthlyTrend, monthSummary } from "@/lib/finance";
import { currentMonth, formatBRL, formatMonthLabel, monthRange, shiftMonth } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const nowMonth = currentMonth();
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : nowMonth;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const { start, end } = monthRange(month);

  let data;
  try {
    const [sum, prevSum, trend, recent, budgets, goals] = await Promise.all([
      monthSummary(month),
      monthSummary(prev),
      monthlyTrend(6, month),
      listTransactions({ start, end, limit: 8 }),
      budgetStatus(month),
      listGoals(),
    ]);
    data = { sum, prevSum, trend, recent, budgets, goals };
  } catch {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center", padding: 32 }}>
        <h1 className="page-title" style={{ fontSize: "1.6rem", marginBottom: 8 }}>
          Primeiro acesso
        </h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Clique abaixo para criar as tabelas no seu banco Neon e ativar o webhook do seu bot no Telegram usando as
          variáveis configuradas na Vercel.
        </p>
        <SetupButton label="Criar tabelas no Neon e ativar Telegram" />
      </div>
    );
  }

  const { sum, prevSum, trend, recent, budgets, goals } = data;

  const diffPct =
    prevSum.expense > 0 ? Math.round(((sum.expense - prevSum.expense) / prevSum.expense) * 100) : null;
  const alerts = budgets.filter((b) => b.percent >= 80);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1 className="page-title">{formatMonthLabel(month)}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link
            href={`/?mes=${prev}`}
            id="month-prev"
            className="btn btn-ghost btn-sm"
            aria-label="Mês anterior"
          >
            <IconChevronLeft width={16} height={16} />
          </Link>
          {month !== nowMonth && (
            <Link href="/" id="month-now" className="btn btn-ghost btn-sm">
              Hoje
            </Link>
          )}
          <Link
            href={`/?mes=${next}`}
            id="month-next"
            className="btn btn-ghost btn-sm"
            aria-label="Próximo mês"
          >
            <IconChevronRight width={16} height={16} />
          </Link>
          <Link href="/chat" id="open-chat" className="btn btn-primary btn-sm">
            <IconChat width={15} height={15} />
            Conversar com o Fin
          </Link>
        </div>
      </header>

      {/* Alertas do agente Guardião */}
      {alerts.map((a) => (
        <div key={a.category} className={`alert ${a.percent >= 100 ? "danger" : ""}`}>
          <IconSparkle width={18} height={18} style={{ flex: "none", marginTop: 2 }} />
          <div>
            <strong>Guardião · {a.category}:</strong> você já usou{" "}
            <strong>{a.percent}%</strong> do orçamento ({formatBRL(a.spent)} de {formatBRL(a.limit)}).
          </div>
        </div>
      ))}

      {/* Cartões principais */}
      <section className="grid grid-stats" aria-label="Resumo do mês">
        <div className="card hero-stat">
          <span className="eyebrow">Saldo do mês</span>
          <div className="stat-value">{formatBRL(sum.balance)}</div>
          <div className="stat-sub">
            {sum.count} {sum.count === 1 ? "lançamento" : "lançamentos"} em {formatMonthLabel(month)}
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <span className="eyebrow">Receitas</span>
            <span className="stat-icon in">
              <IconArrowUp width={16} height={16} />
            </span>
          </div>
          <div className="stat-value money pos" style={{ fontSize: "1.85rem" }}>
            {formatBRL(sum.income)}
          </div>
          <div className="stat-sub">
            {sum.income > 0
              ? `Taxa de economia: ${Math.max(0, Math.round((sum.balance / sum.income) * 100))}%`
              : "Nenhuma receita registrada"}
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <span className="eyebrow">Gastos</span>
            <span className="stat-icon out">
              <IconArrowDown width={16} height={16} />
            </span>
          </div>
          <div className="stat-value money" style={{ fontSize: "1.85rem" }}>
            {formatBRL(sum.expense)}
          </div>
          <div className="stat-sub">
            {diffPct === null
              ? "Sem base no mês anterior"
              : diffPct === 0
                ? "Igual ao mês passado"
                : `${diffPct > 0 ? "+" : ""}${diffPct}% vs. mês passado`}
          </div>
        </div>
      </section>

      {/* Gráficos */}
      <section className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Para onde foi o dinheiro</h2>
            <span className="eyebrow">{sum.byCategory.length} categorias</span>
          </div>
          <CategoryDonut data={sum.byCategory} total={sum.expense} />
        </div>

        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Últimos 6 meses</h2>
            <span className="eyebrow">Receitas × gastos</span>
          </div>
          <TrendBars data={trend} />
        </div>
      </section>

      {/* Últimos lançamentos + Metas/Orçamentos */}
      <section className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Últimos lançamentos</h2>
            <Link href="/transacoes" className="btn btn-ghost btn-sm">
              Ver todos
            </Link>
          </div>
          <TransactionList items={recent} />
        </div>

        <div className="grid" style={{ alignContent: "start" }}>
          <div className="card">
            <div className="card-head">
              <h2 className="card-title">Orçamentos do mês</h2>
              <Link href="/metas" className="btn btn-ghost btn-sm">
                Ajustar
              </Link>
            </div>
            {budgets.length === 0 ? (
              <div className="empty">
                <strong>Nenhum orçamento definido</strong>
                Defina limites por categoria para o Guardião avisar você.
              </div>
            ) : (
              <div className="grid" style={{ gap: 14 }}>
                {budgets.slice(0, 4).map((b) => (
                  <div key={b.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", marginBottom: 6 }}>
                      <strong>{b.category}</strong>
                      <span className="muted money">
                        {formatBRL(b.spent)} / {formatBRL(b.limit)} ({b.percent}%)
                      </span>
                    </div>
                    <div className={`bar ${b.percent >= 100 ? "over" : b.percent >= 80 ? "warn" : ""}`}>
                      <span style={{ width: `${Math.min(100, b.percent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2 className="card-title">Metas</h2>
              <Link href="/metas" className="btn btn-ghost btn-sm">
                Gerenciar
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="empty">
                <strong>Nenhuma meta criada</strong>
                Peça no chat: “quero juntar 3000 para viajar até dezembro”.
              </div>
            ) : (
              <div className="grid" style={{ gap: 14 }}>
                {goals.slice(0, 3).map((g) => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", marginBottom: 6 }}>
                        <strong>{g.name}</strong>
                        <span className="muted money">
                          {formatBRL(g.savedAmount)} / {formatBRL(g.targetAmount)} ({pct}%)
                        </span>
                      </div>
                      <div className="bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
