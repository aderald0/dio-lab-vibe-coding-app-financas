"use client";

import { useTransition } from "react";
import { deleteTransactionAction, updateCategoryAction } from "@/app/actions";
import { IconTelegram, IconTrash } from "@/components/icons";
import { categoryColor, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { formatBRL, formatDate } from "@/lib/format";

export interface TxView {
  id: number;
  type: "despesa" | "receita";
  amount: number;
  category: string;
  description: string;
  occurredOn: string;
  source: "telegram" | "web" | "chat";
}

const SOURCE_LABEL = { telegram: "Telegram", web: "App", chat: "Chat" } as const;

function Row({ tx, editable }: { tx: TxView; editable: boolean }) {
  const [pending, start] = useTransition();
  const color = categoryColor(tx.category);
  const options = tx.type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <li className="tx" style={{ opacity: pending ? 0.45 : 1 }}>
      <span
        className="tx-avatar"
        style={{ background: `color-mix(in hsl, ${color} 16%, white)`, color }}
        aria-hidden
      >
        {tx.category.charAt(0)}
      </span>
      <div className="tx-main">
        <div className="tx-desc">{tx.description || tx.category}</div>
        <div className="tx-meta">
          {editable ? (
            <select
              aria-label="Categoria"
              className="cat-select"
              value={tx.category}
              onChange={(e) => start(() => updateCategoryAction(tx.id, e.target.value))}
            >
              {options.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 700 }}>{tx.category}</span>
          )}
          <span>·</span>
          <span>{formatDate(tx.occurredOn)}</span>
          <span className="source">
            {tx.source === "telegram" && <IconTelegram width={11} height={11} />}
            {SOURCE_LABEL[tx.source]}
          </span>
        </div>
      </div>
      <div className="tx-end">
        <span className={`money ${tx.type === "receita" ? "pos" : ""}`} style={{ fontWeight: 750 }}>
          {tx.type === "receita" ? "+" : "−"} {formatBRL(tx.amount)}
        </span>
        {editable && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Apagar ${tx.description}`}
            onClick={() => {
              if (confirm("Apagar este lançamento?")) start(() => deleteTransactionAction(tx.id));
            }}
          >
            <IconTrash />
          </button>
        )}
      </div>
    </li>
  );
}

export function TransactionList({ items, editable = false }: { items: TxView[]; editable?: boolean }) {
  if (!items.length) {
    return (
      <div className="empty">
        <strong>Nada por aqui ainda</strong>
        Envie “gastei 42 no ifood” pelo Telegram ou pelo chat.
      </div>
    );
  }
  return (
    <ul className="tx-list">
      {items.map((tx) => (
        <Row key={tx.id} tx={tx} editable={editable} />
      ))}
    </ul>
  );
}
