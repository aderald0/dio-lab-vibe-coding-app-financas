"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryColor } from "@/lib/categories";
import { formatBRL, formatMonthLabel } from "@/lib/format";

const tooltipStyle = {
  background: "white",
  border: "none",
  borderRadius: 12,
  boxShadow: "0 8px 24px -8px hsl(30 25% 20% / .25)",
  fontSize: 13,
  padding: "8px 12px",
};

export function CategoryDonut({ data, total }: { data: { category: string; total: number }[]; total: number }) {
  if (!data.length) {
    return (
      <div className="empty">
        <strong>Nenhum gasto neste mês</strong>
        Mande sua primeira despesa pelo Telegram ou pelo chat.
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 190px) 1fr", gap: 20, alignItems: "center" }}>
      <div style={{ position: "relative", height: 190 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              cornerRadius={4}
            >
              {data.map((d) => (
                <Cell key={d.category} fill={categoryColor(d.category)} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
          <div>
            <div className="eyebrow">Total</div>
            <div className="display money" style={{ fontSize: "1.2rem" }}>{formatBRL(total)}</div>
          </div>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {data.slice(0, 7).map((d) => (
          <li key={d.category} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem" }}>
            <span className="dot" style={{ background: categoryColor(d.category) }} />
            <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.category}</span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>{Math.round((d.total / total) * 100)}%</span>
            <span className="money" style={{ fontWeight: 700, minWidth: 84, textAlign: "right" }}>{formatBRL(d.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: formatMonthLabel(d.month, "short") }));
  return (
    <div style={{ height: 230 }}>
      <ResponsiveContainer>
        <BarChart data={rows} barGap={4} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(222 8% 52%)" }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={56}
            tick={{ fontSize: 11, fill: "hsl(222 8% 60%)" }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(40 25% 94%)", radius: 8 }}
            contentStyle={tooltipStyle}
            formatter={(v, name) => [formatBRL(Number(v)), name === "income" ? "Receitas" : "Gastos"]}
          />
          <Bar dataKey="income" fill="hsl(152 50% 42%)" radius={[6, 6, 2, 2]} maxBarSize={22} />
          <Bar dataKey="expense" fill="hsl(6 70% 62%)" radius={[6, 6, 2, 2]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
