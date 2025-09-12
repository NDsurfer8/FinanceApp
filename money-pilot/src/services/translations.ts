// translations.ts
export interface FinancialTranslations {
  dashboard: string;
  budget: string;
  goals: string;
  assetsDebts: string;
  balanceSheet: string;
  settings: string;
  income: string;
  expenses: string;
  savings: string;
  debt: string;
  assets: string;
  liabilities: string;
  netWorth: string;
  discretionaryIncome: string;
  availableAmount: string;
  remainingBalance: string;
  netIncome: string;
  savingsPercentage: string;
  debtPayoffPercentage: string;
  totalExpenses: string;
  totalIncome: string;
  monthlyContribution: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  progress: string;
  paymentsLeft: string;
  transaction: string;
  recurringTransaction: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  smartInsights: string;
  discretionarySavingsRate: string;
  activeBudgeting: string;
  diversifiedIncome: string;
  excellentDiscretionarySavings: string;
  overBudget: string;
  highDebtRatio: string;
  activeMonth: string;
  emergencyFundComplete: string;
  emergencyFundProgress: string;
  buildEmergencyFund: string;
  addTransaction: string;
  addGoal: string;
  addAsset: string;
  addDebt: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  noTransactions: string;
  noGoals: string;
  noAssets: string;
  noDebts: string;
  loading: string;
  error: string;
  success: string;
  // Financial Risk Screen translations
  financialRiskProfile: string;
  financialRiskOverview: string;
  emergencyFund: string;
  fullyFunded: string;
  halfwayThere: string;
  gettingStarted: string;
  monthTarget: string;
  target: string;
  remaining: string;
  months: string;
  financialRatios: string;
  keyNumbers: string;
  liquidityRatio: string;
  billsCushion: string;
  monthlyLivingExpensesCoverage: string;
  monthsCovered: string;
  debtAssetRatio: string;
  debtVsWhatYouOwn: string;
  debtSafetyRatio: string;
  debtVsIncome: string;
  currentAssetsCurrentLiabilities: string;
  currentAssetsTotalMonthlyExpenses: string;
  totalLiabilitiesTotalAssets: string;
  totalMonthlyDebtPaymentsTotalIncome: string;
  // Ratio status words
  tight: string;
  ok: string;
  healthy: string;
  strong: string;
  poor: string;
  fair: string;
  good: string;
  excellent: string;
}

export const friendlyTranslations: FinancialTranslations = {
  dashboard: "Dashboard",
  budget: "Budget",
  goals: "Goals",
  assetsDebts: "Own & Owe",
  balanceSheet: "Net Worth Summary",
  settings: "Settings",

  // Common
  income: "Money In",
  expenses: "Money Out",
  savings: "Money Saved",
  debt: "Money Owed",
  assets: "Things You Own",
  liabilities: "Money You Owe",
  netWorth: "Net Worth",
  discretionaryIncome: "Available to spend",
  availableAmount: "Available",
  remainingBalance: "Left this month",

  // Budget
  netIncome: "Take-home pay",
  savingsPercentage: "Save %",
  debtPayoffPercentage: "Pay Debt %",
  totalExpenses: "Total Out",
  totalIncome: "Total In",
  monthlyContribution: "Monthly Amount",
  targetAmount: "Target",
  currentAmount: "Current",

  // Goals
  targetDate: "Target Date",
  progress: "Progress",
  paymentsLeft: "Payments Left",

  // Transactions
  transaction: "Transaction",
  recurringTransaction: "Repeats every month",
  category: "Category",
  description: "Note",
  amount: "Amount",
  date: "Date",

  // Insights
  smartInsights: "Smart Tips",
  discretionarySavingsRate: "Available Savings %",
  activeBudgeting: "Active Month",
  diversifiedIncome: "Income from more than one place",
  excellentDiscretionarySavings: "Great Savings",
  overBudget: "Over Budget",
  highDebtRatio: "Debt is high compared to income",
  activeMonth: "Active Month",
  emergencyFundComplete: "Rainy-Day Fund Ready",
  emergencyFundProgress: "Rainy-day fund progress",
  buildEmergencyFund: "Start your rainy-day fund",

  // Actions
  addTransaction: "Add Transaction",
  addGoal: "Add Goal",
  addAsset: "Add Thing You Own",
  addDebt: "Add Money You Owe",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",

  // Messages
  noTransactions: "No transactions yet",
  noGoals: "No goals yet",
  noAssets: "No items yet",
  noDebts: "No debts yet",
  loading: "Loading…",
  error: "Something went wrong",
  success: "Saved",
  // Financial Risk Screen translations
  financialRiskProfile: "Financial Risk Profile",
  financialRiskOverview: "Your financial risk overview",
  emergencyFund: "Emergency Fund",
  fullyFunded: "Fully Funded!",
  halfwayThere: "Halfway There",
  gettingStarted: "Getting Started",
  monthTarget: "of 6-month target",
  target: "Target",
  remaining: "Remaining",
  months: "Months",
  financialRatios: "Financial Ratios",
  keyNumbers: "Key Numbers",
  liquidityRatio: "Liquidity Ratio",
  billsCushion: "Bills Cushion",
  monthlyLivingExpensesCoverage: "Monthly Living Expenses Coverage",
  monthsCovered: "Months Covered",
  debtAssetRatio: "Debt-Asset Ratio",
  debtVsWhatYouOwn: "Debt vs What You Own",
  debtSafetyRatio: "Debt Safety Ratio",
  debtVsIncome: "Debt vs Income",
  currentAssetsCurrentLiabilities: "Current assets ÷ Current liabilities",
  currentAssetsTotalMonthlyExpenses: "Current assets ÷ Total monthly expenses",
  totalLiabilitiesTotalAssets: "Total liabilities ÷ Total assets",
  totalMonthlyDebtPaymentsTotalIncome:
    "Total monthly debt payments ÷ Total income",
  // Ratio status words
  tight: "Tight",
  ok: "OK",
  healthy: "Healthy",
  strong: "Strong",
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

export const standardTranslations: FinancialTranslations = {
  // Navigation
  dashboard: "Dashboard",
  budget: "Budget",
  goals: "Goals",
  assetsDebts: "Assets & Debts",
  balanceSheet: "Balance Sheet",
  settings: "Settings",

  // Common
  income: "Income",
  expenses: "Expenses",
  savings: "Savings",
  debt: "Debt",
  assets: "Assets",
  liabilities: "Liabilities",
  netWorth: "Net Worth",
  discretionaryIncome: "Discretionary Income",
  availableAmount: "Available",
  remainingBalance: "Remaining Balance",

  // Budget
  netIncome: "Net Income",
  savingsPercentage: "Savings %",
  debtPayoffPercentage: "Debt Payoff %",
  totalExpenses: "Total Expenses",
  totalIncome: "Total Income",
  monthlyContribution: "Monthly Contribution",
  targetAmount: "Target Amount",
  currentAmount: "Current Amount",

  // Goals
  targetDate: "Target Date",
  progress: "Progress",
  paymentsLeft: "Payments Left",

  // Transactions
  transaction: "Transaction",
  recurringTransaction: "Recurring Transaction",
  category: "Category",
  description: "Description",
  amount: "Amount",
  date: "Date",

  // Insights
  smartInsights: "Smart Insights",
  discretionarySavingsRate: "Discretionary Savings Rate",
  activeBudgeting: "Active Budgeting",
  diversifiedIncome: "Diversified Income",
  excellentDiscretionarySavings: "Excellent Discretionary Savings",
  overBudget: "Over Budget",
  highDebtRatio: "High Debt Ratio",
  activeMonth: "Active Month",
  emergencyFundComplete: "Emergency Fund Complete",
  emergencyFundProgress: "Emergency Fund Progress",
  buildEmergencyFund: "Build Emergency Fund",

  // Actions
  addTransaction: "Add Transaction",
  addGoal: "Add Goal",
  addAsset: "Add Asset",
  addDebt: "Add Debt",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",

  // Messages
  noTransactions: "No Transactions",
  noGoals: "No Goals",
  noAssets: "No Assets",
  noDebts: "No Debts",
  loading: "Loading...",
  error: "Error",
  success: "Success!",
  // Financial Risk Screen translations
  financialRiskProfile: "Financial Risk Profile",
  financialRiskOverview: "Your financial risk overview",
  emergencyFund: "Emergency Fund",
  fullyFunded: "Fully Funded!",
  halfwayThere: "Halfway There",
  gettingStarted: "Getting Started",
  monthTarget: "of 6-month target",
  target: "Target",
  remaining: "Remaining",
  months: "Months",
  financialRatios: "Financial Ratios",
  keyNumbers: "Key Numbers",
  liquidityRatio: "Liquidity Ratio",
  billsCushion: "Bills Cushion",
  monthlyLivingExpensesCoverage: "Monthly Living Expenses Coverage",
  monthsCovered: "Months Covered",
  debtAssetRatio: "Debt-Asset Ratio",
  debtVsWhatYouOwn: "Debt vs What You Own",
  debtSafetyRatio: "Debt Safety Ratio",
  debtVsIncome: "Debt vs Income",
  currentAssetsCurrentLiabilities: "Current assets ÷ Current liabilities",
  currentAssetsTotalMonthlyExpenses: "Current assets ÷ Total monthly expenses",
  totalLiabilitiesTotalAssets: "Total liabilities ÷ Total assets",
  totalMonthlyDebtPaymentsTotalIncome:
    "Total monthly debt payments ÷ Total income",
  // Ratio status words
  tight: "Tight",
  ok: "OK",
  healthy: "Healthy",
  strong: "Strong",
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

// Definitions for tooltips and coaching
export const definitions: Record<keyof FinancialTranslations, string> = {
  dashboard: "Your main money overview screen.",
  budget: "Your plan for spending and saving money.",
  goals: "Things you're saving money for.",
  assetsDebts: "What you own and what you owe.",
  balanceSheet: "A summary of what you own minus what you owe.",
  settings: "App preferences and account settings.",
  income: "Money you receive from work, benefits, or other sources.",
  expenses: "Money you spend on bills, purchases, and other costs.",
  savings: "Money you set aside for future use.",
  debt: "Money you owe and must pay back.",
  assets: "Things you own that have value.",
  liabilities: "Money you owe to others.",
  netWorth: "Your total wealth (assets minus debts).",
  discretionaryIncome: "Money left after bills and essentials.",
  availableAmount: "Money you can spend right now.",
  remainingBalance: "Money left for the rest of this month.",
  netIncome: "Your pay after taxes and deductions (take-home pay).",
  savingsPercentage: "What percent of your income you save.",
  debtPayoffPercentage: "What percent of your income goes to debt.",
  totalExpenses: "All your spending added together.",
  totalIncome: "All your income added together.",
  monthlyContribution: "How much you save or pay toward a goal each month.",
  targetAmount: "The amount you want to reach.",
  currentAmount: "How much you have saved so far.",
  targetDate: "When you want to reach your goal.",
  progress: "How close you are to your goal.",
  paymentsLeft: "How many payments remain.",
  transaction: "A single money movement (income or expense).",
  recurringTransaction: "A transaction that happens regularly.",
  category: "What type of transaction this is.",
  description: "Additional notes about the transaction.",
  amount: "How much money was involved.",
  date: "When the transaction happened.",
  smartInsights: "Helpful tips based on your financial data.",
  discretionarySavingsRate: "How much of your extra money you save.",
  activeBudgeting: "You're actively tracking your spending this month.",
  diversifiedIncome: "You have money coming from multiple sources.",
  excellentDiscretionarySavings:
    "You're saving a great amount of your extra money.",
  overBudget: "You've spent more than planned.",
  highDebtRatio: "Your debt is high compared to your income.",
  activeMonth: "You're actively tracking your finances this month.",
  emergencyFundComplete: "You have enough saved for emergencies.",
  emergencyFundProgress: "How much you've saved toward your emergency fund.",
  buildEmergencyFund: "Start saving money for unexpected expenses.",
  addTransaction: "Record a new income or expense.",
  addGoal: "Create a new savings goal.",
  addAsset: "Add something you own.",
  addDebt: "Add money you owe.",
  save: "Keep your changes.",
  cancel: "Discard your changes.",
  delete: "Remove this item permanently.",
  edit: "Change this item.",
  noTransactions: "You haven't recorded any transactions yet.",
  noGoals: "You haven't set any goals yet.",
  noAssets: "You haven't added any assets yet.",
  noDebts: "You haven't added any debts yet.",
  loading: "Please wait while we load your data.",
  error: "Something went wrong. Please try again.",
  success: "Your changes have been saved successfully.",
  // Financial Risk Screen definitions
  financialRiskProfile:
    "A comprehensive view of your financial health and risk factors.",
  financialRiskOverview: "Summary of your financial risk assessment.",
  emergencyFund: "Money set aside for unexpected expenses.",
  fullyFunded: "Your emergency fund is complete and ready.",
  halfwayThere: "Your emergency fund is 50% complete.",
  gettingStarted: "Your emergency fund is in the early stages.",
  monthTarget: "Target based on 6 months of expenses.",
  target: "The goal amount you want to reach.",
  remaining: "Amount left to reach your target.",
  months: "Number of months your savings will last.",
  financialRatios: "Key metrics that measure your financial health.",
  keyNumbers: "Important financial metrics at a glance.",
  liquidityRatio: "How easily you can pay short-term debts.",
  billsCushion: "Cash ready vs. bills due soon.",
  monthlyLivingExpensesCoverage:
    "How long your assets can cover monthly expenses.",
  monthsCovered: "How many months you can cover.",
  debtAssetRatio: "Percentage of your assets that are financed by debt.",
  debtVsWhatYouOwn: "How much you owe compared to what you own.",
  debtSafetyRatio: "Percentage of income used for debt payments.",
  debtVsIncome: "How much of monthly income goes to debt.",
  currentAssetsCurrentLiabilities:
    "Formula: Current assets divided by current liabilities.",
  currentAssetsTotalMonthlyExpenses:
    "Formula: Current assets divided by total monthly expenses.",
  totalLiabilitiesTotalAssets:
    "Formula: Total liabilities divided by total assets.",
  totalMonthlyDebtPaymentsTotalIncome:
    "Formula: Total monthly debt payments divided by total income.",
  // Ratio status words
  tight: "Limited financial flexibility.",
  ok: "Adequate financial position.",
  healthy: "Good financial health.",
  strong: "Excellent financial position.",
  poor: "Needs immediate attention.",
  fair: "Room for improvement.",
  good: "Solid financial standing.",
  excellent: "Outstanding financial health.",
};

export const getTranslations = (): FinancialTranslations => {
  return standardTranslations;
};

export const translate = (term: keyof FinancialTranslations): string => {
  const translations = getTranslations();
  const result = translations[term] || term;
  return result;
};
