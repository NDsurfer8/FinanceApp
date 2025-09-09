// src/types/finance.ts
export type MonthKey = `${number}-${
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12"}`;

export type Transaction = {
  id: string;
  type: "income" | "expense";
  category: string;
  note?: string;
  amount: number; // cents or dollars—pick one & stay consistent
  createdAt: number; // Date.now()
  month: MonthKey; // e.g., "YYYY-MM"
};

export type Asset = { name: string; balance: number };
export type Debt = {
  name: string;
  balance: number;
  rate: number;
  payment: number;
};

export type MonthSummary = {
  income: number;
  expenses: number;
  netWorth: number;
};

// Chart and UI related types
export type MonthPoint = {
  month: string;
  income: number;
  expenses: number;
  netWorth: number;
};

export type CategoryPoint = {
  name: string;
  value: number;
  color: string;
};

// For React Navigation bottom tabs
export type BottomTabParamList = {
  Dashboard: undefined;
  Budget: undefined;
  Goals: undefined;
  "Assets/Debts": undefined;
  Settings: undefined;
};
