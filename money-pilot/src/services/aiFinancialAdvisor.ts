import { callBackendAI } from "./backendAI";

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  savingsRate: number;
  debtPayoffRate: number;
  totalDebt: number;
  totalSavings: number;
  totalAssets: number;
  netWorth: number;
  goals: any[];
  recurringExpenses: any[];
  assets: any[];
  debts: any[];
  transactions: any[];
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
    isPlanRequest: boolean = false,
    userPreferences?: any,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      console.log("Using backend AI... sending snapshot to backend");
      console.log("User preferences:", userPreferences);

      // Prepare financial data for backend - optimized for token usage
      const financialData = {
        // Core metrics only
        monthlyIncome: snapshot.monthlyIncome,
        monthlyExpenses: snapshot.monthlyExpenses,
        netIncome: snapshot.netIncome,
        totalDebt: snapshot.totalDebt,
        totalSavings: snapshot.totalSavings,
        netWorth: snapshot.netWorth,
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
          })) || [],
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
