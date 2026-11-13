import type { Metadata } from "next";
import { createTransactionAction } from "@/app/actions";
import { TransactionList } from "@/components/transaction-list";
import { ALL_CATEGORIES } from "@/lib/categories";
import { listTransactions, type TxType } from "@/lib/finance";
import { currentMonth, formatBRL, monthRange, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Lançamentos" };

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; categoria?: string; tipo?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : "";
  const range = month ? monthRange(month) : undefined;
  const type: TxType | undefined = sp.tipo === "despesa" || sp.tipo === "receita" ? sp.tipo : undefined;

  const items = await listTransactions({
    start: range?.start,
    end: range?.end,
    category: sp.categoria || undefined,
    type,
    search: sp.q || undefined,
    limit: 300,
  });

  const totalOut = items.filter((i) => i.type === "despesa").reduce((s, i) => s + i.amount, 0);
  const totalIn = items.filter((i) => i.type === "receita").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Histórico completo</span>
          <h1 className="page-title">Lançamentos</h1>
          <p className="muted">
            Tudo o que você mandou pelo Telegram ou pelo chat aparece aqui. Clique na categoria para corrigir.
          </p>
        </div>
      </header>

      {/* Novo lançamento manual */}
      <section className="card" aria-label="Novo lançamento">
        <div className="card-head">
          <h2 className="card-title">Adicionar manualmente</h2>
          <span className="eyebrow">Ou mande pelo Telegram</span>
        </div>
        <form
          action={createTransactionAction}
          className="form-row"
          style={{ gridTemplateColumns: "auto 130px 170px 1fr 150px auto" }}
        >
          <div className="segmented" role="radiogroup" aria-label="Tipo">
            <input id="t-desp" type="radio" name="type" value="despesa" defaultChecked />
            <label htmlFor="t-desp">Gasto</label>
            <input id="t-rec" type="radio" name="type" value="receita" />
            <label htmlFor="t-rec">Receita</label>
          </div>
          <div className="field">
            <label htmlFor="tx-amount">Valor (R$)</label>
            <input id="tx-amount" name="amount" className="input" placeholder="42,00" inputMode="decimal" required />
          </div>
          <div className="field">
            <label htmlFor="tx-cat">Categoria</label>
            <select id="tx-cat" name="category" className="select" defaultValue="Alimentação">
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-desc">Descrição</label>
            <input id="tx-desc" name="description" className="input" placeholder="Ex.: iFood, supermercado…" />
          </div>
          <div className="field">
            <label htmlFor="tx-date">Data</label>
            <input id="tx-date" name="occurredOn" type="date" className="input" defaultValue={todayISO()} />
          </div>
          <button id="tx-submit" className="btn btn-primary">
            Salvar
          </button>
        </form>
      </section>

      {/* Filtros + lista */}
      <section className="card">
        <form
          method="get"
          className="form-row"
          style={{ gridTemplateColumns: "1fr 170px 140px 150px auto", marginBottom: 18 }}
        >
          <div className="field">
            <label htmlFor="f-q">Buscar</label>
            <input id="f-q" name="q" className="input" placeholder="Descrição…" defaultValue={sp.q ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="f-cat">Categoria</label>
            <select id="f-cat" name="categoria" className="select" defaultValue={sp.categoria ?? ""}>
              <option value="">Todas</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-tipo">Tipo</label>
            <select id="f-tipo" name="tipo" className="select" defaultValue={sp.tipo ?? ""}>
              <option value="">Todos</option>
              <option value="despesa">Gastos</option>
              <option value="receita">Receitas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-mes">Mês</label>
            <input id="f-mes" name="mes" type="month" className="input" defaultValue={month || currentMonth()} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button id="f-submit" className="btn btn-ghost">
              Filtrar
            </button>
          </div>
        </form>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "10px 6px 14px",
            borderBottom: "1px solid var(--line)",
            fontSize: "0.85rem",
          }}
        >
          <span className="muted">{items.length} lançamentos</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span className="money pos">+ {formatBRL(totalIn)}</span>
            <span className="money neg">− {formatBRL(totalOut)}</span>
          </div>
        </div>

        <TransactionList items={items} editable />
      </section>
    </>
  );
}
