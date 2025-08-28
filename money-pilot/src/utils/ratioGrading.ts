export type Mode = "friendly" | "pro";
export type RatioKey =
  | "liquidity"
  | "monthsCovered"
  | "debtToAsset"
  | "debtToIncome";

export const ratioLabels: Record<Mode, Record<RatioKey, string>> = {
  friendly: {
    liquidity: "Bills Cushion",
    monthsCovered: "Months Covered",
    debtToAsset: "Debt vs What You Own",
    debtToIncome: "Debt vs Income",
  },
  pro: {
    liquidity: "Liquidity Ratio",
    monthsCovered: "Monthly Living Expenses Coverage",
    debtToAsset: "Debt-Asset Ratio",
    debtToIncome: "Debt Safety Ratio",
  },
};

export const statusWords: Record<Mode, [string, string, string, string]> = {
  friendly: ["Tight", "OK", "Healthy", "Strong"],
  pro: ["Poor", "Fair", "Good", "Excellent"],
};

// Suggested thresholds (tune as you like)
export const thresholds = {
  liquidity: [0.5, 1.0, 2.0], // x
  monthsCovered: [1, 3, 6], // months
  debtToAsset: [1.0, 0.5, 0.2], // ratio (lower is better—handled below)
  debtToIncome: [0.43, 0.3, 0.15], // ratio (lower is better)
};

// Helper to grade and color
export function gradeRatio(
  kind: RatioKey,
  value: number,
  mode: Mode = "friendly"
) {
  const words = statusWords[mode];
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#059669"]; // red, amber, green, dark green

  const getIndexHigherBetter = (v: number, [a, b, c]: number[]) =>
    v < a ? 0 : v < b ? 1 : v < c ? 2 : 3;

  const getIndexLowerBetter = (v: number, [a, b, c]: number[]) =>
    v >= a ? 0 : v >= b ? 1 : v >= c ? 2 : 3;

  let idx = 0;
  switch (kind) {
    case "liquidity":
      idx = getIndexHigherBetter(value, thresholds.liquidity);
      break;
    case "monthsCovered":
      idx = getIndexHigherBetter(value, thresholds.monthsCovered);
      break;
    case "debtToAsset":
      idx = getIndexLowerBetter(value, thresholds.debtToAsset);
      break;
    case "debtToIncome":
      idx = getIndexLowerBetter(value, thresholds.debtToIncome);
      break;
  }
  return { status: words[idx], color: colors[idx] };
}

// Formatting helpers
export const fmt = {
  ratio: (x: number) => `${x.toFixed(2)}x`,
  months: (m: number) => (m >= 12 ? "12+ mo" : `${m.toFixed(1)} mo`),
  pct: (p: number) => `${(p * 100).toFixed(1)}%`,
};
