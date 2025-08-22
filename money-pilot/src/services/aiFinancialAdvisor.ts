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
    return lowerQuestion.includes("generate");
  }

  // Generate AI response using backend AI
  async generateAIResponse(
    userQuestion: string,
    snapshot: FinancialSnapshot,
    isPlanRequest: boolean = false,
    userPreferences?: any
  ): Promise<string> {
    try {
      console.log("Using backend AI...");
      console.log("User preferences:", userPreferences);

      // Prepare financial data for backend
      const financialData = {
        monthlyIncome: snapshot.monthlyIncome,
        monthlyExpenses: snapshot.monthlyExpenses,
        netIncome: snapshot.netIncome,
        totalDebt: snapshot.totalDebt,
        totalSavings: snapshot.totalSavings,
        totalAssets: snapshot.totalAssets,
        netWorth: snapshot.netWorth,
        assets: snapshot.assets?.slice(0, 5) || [], // Limit to 5 items
        debts: snapshot.debts?.slice(0, 5) || [], // Limit to 5 items
        goals: snapshot.goals?.slice(0, 5) || [], // Limit to 5 items
      };

      const result = await callBackendAI(
        userQuestion,
        financialData,
        userPreferences
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
