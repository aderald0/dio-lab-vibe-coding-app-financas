export const EXPENSE_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Assinaturas",
  "Outros",
] as const;

export const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Outras receitas"] as const;

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const;

export type Category = (typeof ALL_CATEGORIES)[number];

/** Cores (HSL) usadas nos gráficos e etiquetas de cada categoria. */
export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: "hsl(18 85% 58%)",
  Transporte: "hsl(205 75% 52%)",
  Moradia: "hsl(160 50% 40%)",
  Lazer: "hsl(330 70% 60%)",
  Saúde: "hsl(0 70% 58%)",
  Educação: "hsl(45 90% 50%)",
  Compras: "hsl(280 45% 58%)",
  Assinaturas: "hsl(190 60% 42%)",
  Outros: "hsl(220 10% 55%)",
  Salário: "hsl(152 55% 40%)",
  Freelance: "hsl(140 45% 48%)",
  Investimentos: "hsl(170 50% 38%)",
  "Outras receitas": "hsl(120 25% 50%)",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "hsl(220 10% 55%)";
}
