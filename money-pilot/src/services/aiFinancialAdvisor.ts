import { callBackendAI } from "./backendAI";

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  savingsRate: number;
  debtPayoffRate: number;
  monthlySavingsAmount: number;
  monthlyDebtPayoffAmount: number;
  totalMonthlyGoalContributions: number;
  totalDebt: number;
  totalSavings: number;
  totalAssets: number;
  netWorth: number;
  goals: any[];
  recurringExpenses: any[];
  assets: any[];
  debts: any[];
  transactions: any[]; // Selected month transactions only
  allTransactions?: any[]; // All transactions for reference
  recurringTransactions?: any[]; // Full recurring transaction data
  budgetCategories?: any[]; // Budget categories with spending analysis
}

class AIFinancialAdvisorService {
  private static instance: AIFinancialAdvisorService;

  static getInstance(): AIFinancialAdvisorService {
    if (!AIFinancialAdvisorService.instance) {
      AIFinancialAdvisorService.instance = new AIFinancialAdvisorService();
    }
    return AIFinancialAdvisorService.instance;
  }

  // Check if user is requesting a financial plan
  isPlanRequest(userQuestion: string): boolean {
    const lowerQuestion = userQuestion.toLowerCase();
    const planKeywords = [
      "generate",
      "create",
      "make",
      "build",
      "develop",
      "plan",
      "financial plan",
      "budget plan",
      "savings plan",
      "debt plan",
      "investment plan",
      "retirement plan",
      "emergency fund plan",
      "money plan",
      "financial strategy",
      "budget strategy",
      "savings strategy",
      "debt strategy",
    ];

    return planKeywords.some((keyword) => lowerQuestion.includes(keyword));
  }

  // Generate AI response using backend AI
  async generateAIResponse(
    userQuestion: string,
    snapshot: FinancialSnapshot,
    userPreferences?: any,
    conversationHistory?: Array<{ role: string; content: string }>,
    selectedMonth?: Date
  ): Promise<string> {
    try {
      console.log("Using backend AI... sending snapshot to backend");
      console.log("User preferences:", userPreferences);

      // Prepare financial data for backend - optimized for token usage
      const financialData = {
        // Month context - what month we're analyzing
        analysisMonth: selectedMonth
          ? {
              month: selectedMonth.getMonth() + 1, // Convert 0-indexed to 1-indexed
              year: selectedMonth.getFullYear(),
              monthName: selectedMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
              isCurrentMonth:
                selectedMonth.getMonth() === new Date().getMonth() &&
                selectedMonth.getFullYear() === new Date().getFullYear(),
            }
          : {
              month: new Date().getMonth() + 1, // Convert 0-indexed to 1-indexed
              year: new Date().getFullYear(),
              monthName: new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
              isCurrentMonth: true,
            },

        // Core metrics (includes recurring transactions)
        monthlyIncome: snapshot.monthlyIncome,
        monthlyExpenses: snapshot.monthlyExpenses,
        netIncome: snapshot.netIncome,
        savingsRate: snapshot.savingsRate,
        debtPayoffRate: snapshot.debtPayoffRate,
        monthlySavingsAmount: snapshot.monthlySavingsAmount,
        monthlyDebtPayoffAmount: snapshot.monthlyDebtPayoffAmount,
        totalMonthlyGoalContributions: snapshot.totalMonthlyGoalContributions,
        totalDebt: snapshot.totalDebt,
        totalSavings: snapshot.totalSavings,
        netWorth: snapshot.netWorth,

        // Income breakdown for better analysis
        incomeBreakdown: {
          total: snapshot.monthlyIncome,
          recurring:
            snapshot.recurringTransactions
              ?.filter((rt) => rt.type === "income" && rt.isActive)
              .reduce((sum, rt) => {
                // Get current month's effective amount (base + month overrides)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthKey = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}`;
                const monthOverride = rt.monthOverrides?.[monthKey];
                const effectiveAmount = monthOverride?.amount || rt.amount;

                let monthlyAmount = effectiveAmount;
                if (rt.frequency === "weekly")
                  monthlyAmount = effectiveAmount * 4;
                else if (rt.frequency === "biweekly")
                  monthlyAmount = effectiveAmount * 2;
                else if (rt.frequency === "monthly")
                  monthlyAmount = effectiveAmount * 1;
                return sum + monthlyAmount;
              }, 0) || 0,
          nonRecurring:
            snapshot.monthlyIncome -
            (snapshot.recurringTransactions
              ?.filter((rt) => rt.type === "income" && rt.isActive)
              .reduce((sum, rt) => {
                // Get current month's effective amount (base + month overrides)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthKey = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}`;
                const monthOverride = rt.monthOverrides?.[monthKey];
                const effectiveAmount = monthOverride?.amount || rt.amount;

                let monthlyAmount = effectiveAmount;
                if (rt.frequency === "weekly")
                  monthlyAmount = effectiveAmount * 4;
                else if (rt.frequency === "biweekly")
                  monthlyAmount = effectiveAmount * 2;
                else if (rt.frequency === "monthly")
                  monthlyAmount = effectiveAmount * 1;
                return sum + monthlyAmount;
              }, 0) || 0),
        },

        // Expense breakdown for better analysis
        expenseBreakdown: {
          total: snapshot.monthlyExpenses,
          recurring:
            snapshot.recurringTransactions
              ?.filter((rt) => rt.type === "expense" && rt.isActive)
              .reduce((sum, rt) => {
                // Get current month's effective amount (base + month overrides)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthKey = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}`;
                const monthOverride = rt.monthOverrides?.[monthKey];
                const effectiveAmount = monthOverride?.amount || rt.amount;

                let monthlyAmount = effectiveAmount;
                if (rt.frequency === "weekly")
                  monthlyAmount = effectiveAmount * 4;
                else if (rt.frequency === "biweekly")
                  monthlyAmount = effectiveAmount * 2;
                else if (rt.frequency === "monthly")
                  monthlyAmount = effectiveAmount * 1;
                return sum + monthlyAmount;
              }, 0) || 0,
          nonRecurring:
            snapshot.monthlyExpenses -
            (snapshot.recurringTransactions
              ?.filter((rt) => rt.type === "expense" && rt.isActive)
              .reduce((sum, rt) => {
                // Get current month's effective amount (base + month overrides)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthKey = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}`;
                const monthOverride = rt.monthOverrides?.[monthKey];
                const effectiveAmount = monthOverride?.amount || rt.amount;

                let monthlyAmount = effectiveAmount;
                if (rt.frequency === "weekly")
                  monthlyAmount = effectiveAmount * 4;
                else if (rt.frequency === "biweekly")
                  monthlyAmount = effectiveAmount * 2;
                else if (rt.frequency === "monthly")
                  monthlyAmount = effectiveAmount * 1;
                return sum + monthlyAmount;
              }, 0) || 0),
        },

        // Limit to 10 most important items each
        assets:
          snapshot.assets
            ?.slice(0, 10)
            .map((a) => ({ name: a.name, balance: a.balance, type: a.type })) ||
          [],
        debts:
          snapshot.debts
            ?.slice(0, 10)
            .map((d) => ({ name: d.name, balance: d.balance, rate: d.rate })) ||
          [],
        goals:
          snapshot.goals?.slice(0, 10).map((g) => ({
            name: g.name,
            currentAmount: g.currentAmount,
            targetAmount: g.targetAmount,
            monthlyContribution: g.monthlyContribution,
          })) || [],

        // Regular transactions with categories for complete analysis
        transactions: (snapshot.transactions || []).slice(0, 20).map((t) => ({
          name: t.name,
          amount: t.amount,
          type: t.type,
          category: t.category || "Uncategorized",
          date: t.date,
          description: t.description || "",
        })),
        // Include recurring transactions for comprehensive analysis
        recurringTransactions: (snapshot.recurringTransactions || [])
          .slice(0, 15)
          .map((rt) => {
            // Get current month's effective values (base + month overrides)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthKey = `${currentYear}-${String(
              currentMonth + 1
            ).padStart(2, "0")}`;
            const monthOverride = rt.monthOverrides?.[monthKey];

            return {
              name: monthOverride?.name || rt.name,
              amount: monthOverride?.amount || rt.amount,
              type: rt.type,
              category: monthOverride?.category || rt.category,
              frequency: rt.frequency,
              isActive: rt.isActive,
              startDate: rt.startDate,
              endDate: rt.endDate,
              description: rt.description || "",
              // Add month override information
              hasMonthOverride: !!monthOverride,
              baseAmount: rt.amount,
              baseCategory: rt.category,
              baseName: rt.name,
              currentMonthKey: monthKey,
            };
          }),

        // Financial stability indicators
        financialStability: {
          incomeStability:
            (snapshot.recurringTransactions || []).filter(
              (rt) => rt.type === "income" && rt.isActive
            ).length > 0
              ? "stable"
              : "variable",
          expensePredictability:
            (snapshot.recurringTransactions || []).filter(
              (rt) => rt.type === "expense" && rt.isActive
            ).length > 0
              ? "predictable"
              : "variable",
          recurringIncomePercentage:
            snapshot.monthlyIncome > 0
              ? ((snapshot.recurringTransactions || [])
                  .filter((rt) => rt.type === "income" && rt.isActive)
                  .reduce((sum, rt) => {
                    // Get current month's effective amount (base + month overrides)
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const monthKey = `${currentYear}-${String(
                      currentMonth + 1
                    ).padStart(2, "0")}`;
                    const monthOverride = rt.monthOverrides?.[monthKey];
                    const effectiveAmount = monthOverride?.amount || rt.amount;

                    let monthlyAmount = effectiveAmount;
                    if (rt.frequency === "weekly")
                      monthlyAmount = effectiveAmount * 4;
                    else if (rt.frequency === "biweekly")
                      monthlyAmount = effectiveAmount * 2;
                    else if (rt.frequency === "monthly")
                      monthlyAmount = effectiveAmount * 1;
                    return sum + monthlyAmount;
                  }, 0) /
                  snapshot.monthlyIncome) *
                100
              : 0,
          recurringExpensePercentage:
            snapshot.monthlyExpenses > 0
              ? ((snapshot.recurringTransactions || [])
                  .filter((rt) => rt.type === "expense" && rt.isActive)
                  .reduce((sum, rt) => {
                    // Get current month's effective amount (base + month overrides)
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const monthKey = `${currentYear}-${String(
                      currentMonth + 1
                    ).padStart(2, "0")}`;
                    const monthOverride = rt.monthOverrides?.[monthKey];
                    const effectiveAmount = monthOverride?.amount || rt.amount;

                    let monthlyAmount = effectiveAmount;
                    if (rt.frequency === "weekly")
                      monthlyAmount = effectiveAmount * 4;
                    else if (rt.frequency === "biweekly")
                      monthlyAmount = effectiveAmount * 2;
                    else if (rt.frequency === "monthly")
                      monthlyAmount = effectiveAmount * 1;
                    return sum + monthlyAmount;
                  }, 0) /
                  snapshot.monthlyExpenses) *
                100
              : 0,
        },

        // Category analysis for better insights
        categoryAnalysis: {
          // Top spending categories
          topExpenseCategories: (snapshot.recurringTransactions || [])
            .filter((rt) => rt.type === "expense" && rt.isActive)
            .reduce((acc, rt) => {
              // Get current month's effective amount (base + month overrides)
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              const monthKey = `${currentYear}-${String(
                currentMonth + 1
              ).padStart(2, "0")}`;
              const monthOverride = rt.monthOverrides?.[monthKey];
              const effectiveAmount = monthOverride?.amount || rt.amount;
              const effectiveCategory = monthOverride?.category || rt.category;

              let monthlyAmount = effectiveAmount;
              if (rt.frequency === "weekly")
                monthlyAmount = effectiveAmount * 4;
              else if (rt.frequency === "biweekly")
                monthlyAmount = effectiveAmount * 2;
              else if (rt.frequency === "monthly")
                monthlyAmount = effectiveAmount * 1;

              const category = effectiveCategory || "Uncategorized";
              acc[category] = (acc[category] || 0) + monthlyAmount;
              return acc;
            }, {} as Record<string, number>),

          // Top income categories
          topIncomeCategories: (snapshot.recurringTransactions || [])
            .filter((rt) => rt.type === "income" && rt.isActive)
            .reduce((acc, rt) => {
              // Get current month's effective amount (base + month overrides)
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              const monthKey = `${currentYear}-${String(
                currentMonth + 1
              ).padStart(2, "0")}`;
              const monthOverride = rt.monthOverrides?.[monthKey];
              const effectiveAmount = monthOverride?.amount || rt.amount;
              const effectiveCategory = monthOverride?.category || rt.category;

              let monthlyAmount = effectiveAmount;
              if (rt.frequency === "weekly")
                monthlyAmount = effectiveAmount * 4;
              else if (rt.frequency === "biweekly")
                monthlyAmount = effectiveAmount * 2;
              else if (rt.frequency === "monthly")
                monthlyAmount = effectiveAmount * 1;

              const category = effectiveCategory || "Uncategorized";
              acc[category] = (acc[category] || 0) + monthlyAmount;
              return acc;
            }, {} as Record<string, number>),

          // Category breakdown summary
          categoryBreakdown: {
            totalExpenseCategories: Object.keys(
              (snapshot.recurringTransactions || [])
                .filter((rt) => rt.type === "expense" && rt.isActive)
                .reduce((acc, rt) => {
                  acc[rt.category || "Uncategorized"] = true;
                  return acc;
                }, {} as Record<string, boolean>)
            ).length,
            totalIncomeCategories: Object.keys(
              (snapshot.recurringTransactions || [])
                .filter((rt) => rt.type === "income" && rt.isActive)
                .reduce((acc, rt) => {
                  acc[rt.category || "Uncategorized"] = true;
                  return acc;
                }, {} as Record<string, boolean>)
            ).length,
          },
        },

        // Budget categories with spending analysis (only included when budget-related questions are asked)
        budgetCategories:
          snapshot.budgetCategories && snapshot.budgetCategories.length > 0
            ? snapshot.budgetCategories
            : undefined,
      };

      const result = await callBackendAI(
        userQuestion,
        financialData,
        userPreferences,
        conversationHistory
      );
      return result.response;
    } catch (error) {
      console.error("Backend AI failed:", error);
      return "I'm having trouble analyzing your finances right now. Please try again in a moment.";
    }
  }
}

export const aiFinancialAdvisorService =
  AIFinancialAdvisorService.getInstance();
