import { MonthPoint, CategoryPoint, Asset, Debt } from "../types/finance";

// ======= Mock Data =======
export const months: MonthPoint[] = [
  { month: "Jan", income: 6100, expenses: 3800, netWorth: 1800 },
  { month: "Feb", income: 6250, expenses: 3950, netWorth: 4100 },
  { month: "Mar", income: 6725, expenses: 4020, netWorth: 6800 },
  { month: "Apr", income: 6580, expenses: 4100, netWorth: 9280 },
  { month: "May", income: 6900, expenses: 4200, netWorth: 11980 },
  { month: "Jun", income: 7025, expenses: 4380, netWorth: 14625 },
];

export const spendCategories: CategoryPoint[] = [
  { name: "Housing", value: 1600, color: "#8884d8" },
  { name: "Food", value: 720, color: "#82ca9d" },
  { name: "Transport", value: 420, color: "#ffc658" },
  { name: "Health", value: 260, color: "#8dd1e1" },
  { name: "Fun", value: 300, color: "#a4de6c" },
  { name: "Other", value: 580, color: "#d0ed57" },
];

export const debts: Debt[] = [
  { name: "Mortgage", balance: 29300, rate: 2.75, payment: 1280 },
  { name: "Auto", balance: 5200, rate: 4.2, payment: 240 },
  { name: "Card", balance: 900, rate: 19.9, payment: 75 },
];

export const assets: Asset[] = [
  { name: "Checking", balance: 2400 },
  { name: "Savings", balance: 7600 },
  { name: "Brokerage", balance: 9800 },
  { name: "Crypto", balance: 4200 },
  { name: "Gear", balance: 2900 },
];

// ======= Derived Numbers =======
export const totalIncome = months[months.length - 1].income;
export const totalExpenses = months[months.length - 1].expenses;
export const netCashFlow = totalIncome - totalExpenses;
export const netWorth = months[months.length - 1].netWorth;
export const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
export const totalAssets = assets.reduce((a, d) => a + d.balance, 0);
export const debtToAsset =
  totalAssets === 0 ? 0 : (totalDebt / totalAssets) * 100;
export const mortgageDSR = 100 * (debts[0].payment / totalIncome); // Mortgage Debt Service Ratio
export const debtSafety = 100 - Math.min(100, debtToAsset);

// Chart configuration
export const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(33, 37, 41, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(33, 37, 41, ${opacity})`,
  propsForDots: { r: "3" },
  propsForBackgroundLines: { strokeDasharray: "3 3" },
};
