import { Alert } from "react-native";

export interface FinancialSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  savingsRate: number;
  debtPayoffRate: number;
  totalDebt: number;
  totalSavings: number;
  goals: any[];
  recurringExpenses: any[];
  assets: any[];
  debts: any[];
  transactions: any[];
}

export interface AIAnalysisResult {
  advice: string;
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
  priorityActions: string[];
  financialHealth: "excellent" | "good" | "fair" | "poor";
}

// OpenAI API Configuration
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class AIFinancialAdvisorService {
  private static instance: AIFinancialAdvisorService;

  static getInstance(): AIFinancialAdvisorService {
    if (!AIFinancialAdvisorService.instance) {
      AIFinancialAdvisorService.instance = new AIFinancialAdvisorService();
    }
    return AIFinancialAdvisorService.instance;
  }

  // Check if OpenAI is configured
  private isOpenAIConfigured(): boolean {
    return !!OPENAI_API_KEY;
  }

  // Call OpenAI API
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.isOpenAIConfigured()) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert financial advisor with deep knowledge of personal finance, budgeting, debt management, investing, and financial planning. You also have deep expertise in side hustles, entrepreneurship, and creative ways to make extra income. You provide personalized, actionable advice based on the user's financial data. Keep your tone encouraging, approachable, and laid-back—like a local friend helping them ride the waves of money with balance. Use simple ocean/surf/Hawai'i metaphors where natural, but don't overdo it. Prioritize financial safety, long-term stability, and peace of mind. Use emojis sparingly (🌊🤙🌺💵) to highlight key points, and always focus on clear, practical advice that feels professional but relaxed.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      return (
        data.choices[0]?.message?.content ||
        "I apologize, but I was unable to generate a response."
      );
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      throw error;
    }
  }

  // Analyze financial health and provide recommendations
  analyzeFinancialHealth(snapshot: FinancialSnapshot): AIAnalysisResult {
    const analysis: AIAnalysisResult = {
      advice: "",
      recommendations: [],
      riskLevel: "low",
      priorityActions: [],
      financialHealth: "excellent",
    };

    // Calculate key financial ratios
    const debtToIncomeRatio =
      snapshot.totalDebt / (snapshot.monthlyIncome * 12);
    const savingsToExpensesRatio =
      snapshot.totalSavings / snapshot.monthlyExpenses;
    const expenseToIncomeRatio =
      snapshot.monthlyExpenses / snapshot.monthlyIncome;

    // Determine financial health
    if (expenseToIncomeRatio > 0.9) {
      analysis.financialHealth = "poor";
      analysis.riskLevel = "high";
    } else if (expenseToIncomeRatio > 0.7) {
      analysis.financialHealth = "fair";
      analysis.riskLevel = "medium";
    } else if (expenseToIncomeRatio > 0.5) {
      analysis.financialHealth = "good";
      analysis.riskLevel = "low";
    } else {
      analysis.financialHealth = "excellent";
      analysis.riskLevel = "low";
    }

    // Generate recommendations based on financial health
    if (analysis.financialHealth === "poor") {
      analysis.advice =
        "Your financial situation needs immediate attention. You're spending more than you earn, which is unsustainable.";
      analysis.recommendations = [
        "Immediately reduce expenses by 20-30%",
        "Create a strict budget and track every dollar",
        "Consider increasing your income through side hustles",
        "Stop all non-essential spending",
        "Build an emergency fund as your top priority",
      ];
      analysis.priorityActions = [
        "Cut discretionary spending",
        "Increase income",
        "Build emergency fund",
      ];
    } else if (analysis.financialHealth === "fair") {
      analysis.advice =
        "Your finances are manageable but could be improved. Focus on building savings and reducing debt.";
      analysis.recommendations = [
        "Increase your savings rate to at least 20%",
        "Pay down high-interest debt first",
        "Build a 3-6 month emergency fund",
        "Review and optimize recurring expenses",
        "Set specific financial goals",
      ];
      analysis.priorityActions = [
        "Increase savings rate",
        "Pay down debt",
        "Build emergency fund",
      ];
    } else if (analysis.financialHealth === "good") {
      analysis.advice =
        "Good job! Your finances are in good shape. Focus on building wealth and achieving your goals.";
      analysis.recommendations = [
        "Maximize your savings and investments",
        "Consider increasing retirement contributions",
        "Diversify your investments",
        "Set ambitious financial goals",
        "Consider tax optimization strategies",
      ];
      analysis.priorityActions = [
        "Increase investments",
        "Set bigger goals",
        "Optimize taxes",
      ];
    } else {
      analysis.advice =
        "Excellent! Your financial foundation is strong. Focus on wealth building and long-term planning.";
      analysis.recommendations = [
        "Maximize retirement contributions",
        "Consider real estate investments",
        "Explore advanced investment strategies",
        "Plan for early retirement",
        "Consider charitable giving strategies",
      ];
      analysis.priorityActions = [
        "Wealth building",
        "Advanced planning",
        "Legacy planning",
      ];
    }

    return analysis;
  }

  // Generate personalized advice based on user question
  generatePersonalizedAdvice(
    userQuestion: string,
    snapshot: FinancialSnapshot
  ): string {
    const lowerQuestion = userQuestion.toLowerCase();
    const analysis = this.analyzeFinancialHealth(snapshot);

    // Budget and spending advice
    if (
      lowerQuestion.includes("budget") ||
      lowerQuestion.includes("spending") ||
      lowerQuestion.includes("expenses")
    ) {
      if (snapshot.monthlyExpenses > snapshot.monthlyIncome * 0.8) {
        return `🚨 **Budget Alert**: Your expenses ($${snapshot.monthlyExpenses.toFixed(
          2
        )}) are ${(
          (snapshot.monthlyExpenses / snapshot.monthlyIncome) *
          100
        ).toFixed(
          1
        )}% of your income. This is unsustainable.\n\n**Immediate Actions:**\n1. Cut non-essential expenses by 20%\n2. Track every dollar spent\n3. Create a strict 50/30/20 budget\n4. Consider increasing income\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `✅ **Good Budget Management**: Your expenses are well-controlled at ${(
          (snapshot.monthlyExpenses / snapshot.monthlyIncome) *
          100
        ).toFixed(1)}% of income.\n\n**Current Savings Rate**: ${
          snapshot.savingsRate
        }%\n**Recommendations**:\n1. Increase savings to 20% if possible\n2. Optimize recurring expenses\n3. Set specific financial goals\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      }
    }

    // Debt advice
    if (
      lowerQuestion.includes("debt") ||
      lowerQuestion.includes("loan") ||
      lowerQuestion.includes("credit")
    ) {
      if (snapshot.totalDebt > 0) {
        const debtToIncomeRatio =
          snapshot.totalDebt / (snapshot.monthlyIncome * 12);
        if (debtToIncomeRatio > 0.4) {
          return `⚠️ **High Debt Alert**: Your debt-to-income ratio is ${(
            debtToIncomeRatio * 100
          ).toFixed(
            1
          )}%, which is concerning.\n\n**Current Debt**: $${snapshot.totalDebt.toFixed(
            2
          )}\n**Monthly Debt Payment**: $${(
            (snapshot.monthlyIncome * snapshot.debtPayoffRate) /
            100
          ).toFixed(
            2
          )}\n\n**Priority Actions:**\n1. Focus on high-interest debt first\n2. Consider debt consolidation\n3. Increase debt payoff rate\n4. Stop taking on new debt\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        } else {
          return `✅ **Manageable Debt**: Your debt-to-income ratio is ${(
            debtToIncomeRatio * 100
          ).toFixed(
            1
          )}%, which is reasonable.\n\n**Current Debt**: $${snapshot.totalDebt.toFixed(
            2
          )}\n**Debt Payoff Rate**: ${
            snapshot.debtPayoffRate
          }%\n\n**Recommendations:**\n1. Continue current payoff strategy\n2. Consider accelerating payoff\n3. Build emergency fund\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        }
      } else {
        return "🎉 **Debt-Free**: Congratulations! You're debt-free, which gives you excellent financial flexibility.\n\n**Recommendations:**\n1. Build emergency fund (3-6 months)\n2. Increase savings rate\n3. Start investing for long-term goals\n4. Consider real estate investments\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}";
      }
    }

    // Affordability analysis
    if (
      lowerQuestion.includes("afford") ||
      lowerQuestion.includes("buy") ||
      lowerQuestion.includes("purchase")
    ) {
      const discretionaryIncome =
        snapshot.netIncome *
        (1 - snapshot.savingsRate / 100 - snapshot.debtPayoffRate / 100);

      if (discretionaryIncome < 0) {
        return `❌ **Cannot Afford Major Purchases**: You're currently spending more than you earn.\n\n**Monthly Deficit**: $${Math.abs(
          discretionaryIncome
        ).toFixed(
          2
        )}\n\n**Before Making Purchases:**\n1. Fix your cash flow\n2. Build emergency fund\n3. Pay down debt\n4. Increase income\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `💰 **Affordability Analysis**: Your monthly discretionary income is $${discretionaryIncome.toFixed(
          2
        )}.\n\n**For Major Purchases:**\n1. Emergency fund first (3-6 months)\n2. Save up instead of financing\n3. Follow 50/30/20 rule\n4. Consider total cost of ownership\n\n**What are you considering buying?**\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      }
    }

    // Emergency fund advice
    if (
      lowerQuestion.includes("emergency") ||
      lowerQuestion.includes("fund") ||
      lowerQuestion.includes("safety")
    ) {
      const emergencyFundTarget = snapshot.monthlyExpenses * 6;
      const currentEmergencyFund = snapshot.totalSavings;

      if (currentEmergencyFund < emergencyFundTarget) {
        const shortfall = emergencyFundTarget - currentEmergencyFund;
        const monthsToTarget =
          shortfall / ((snapshot.monthlyIncome * snapshot.savingsRate) / 100);

        return `🛡️ **Emergency Fund Status**: You need $${emergencyFundTarget.toFixed(
          2
        )} (6 months of expenses).\n\n**Current**: $${currentEmergencyFund.toFixed(
          2
        )} (${((currentEmergencyFund / emergencyFundTarget) * 100).toFixed(
          1
        )}%)\n**Shortfall**: $${shortfall.toFixed(
          2
        )}\n\n**To Reach Target:**\n• Save $${(shortfall / 12).toFixed(
          2
        )}/month for 1 year, or\n• Save $${(shortfall / 6).toFixed(
          2
        )}/month for 6 months\n\n**Priority**: Build this before other goals!\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `✅ **Excellent Emergency Fund**: You have $${currentEmergencyFund.toFixed(
          2
        )} saved, covering ${(
          currentEmergencyFund / snapshot.monthlyExpenses
        ).toFixed(
          1
        )} months of expenses.\n\n**Next Steps:**\n1. Focus on debt payoff\n2. Increase investments\n3. Set bigger financial goals\n4. Consider insurance review\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      }
    }

    // Goal planning advice
    if (
      lowerQuestion.includes("goal") ||
      lowerQuestion.includes("save") ||
      lowerQuestion.includes("plan")
    ) {
      if (snapshot.goals.length === 0) {
        return `🎯 **No Financial Goals Set**: Setting specific goals helps you stay motivated and track progress.\n\n**Recommended Goals:**\n1. Emergency fund (3-6 months)\n2. Debt payoff\n3. Down payment for house\n4. Retirement savings\n5. Vacation fund\n\n**Goal Setting Tips:**\n• Make them specific and measurable\n• Set realistic timelines\n• Track progress regularly\n• Celebrate milestones\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        const totalGoalAmount = snapshot.goals.reduce(
          (sum, goal) => sum + goal.targetAmount,
          0
        );
        const totalSaved = snapshot.goals.reduce(
          (sum, goal) => sum + goal.currentAmount,
          0
        );
        const progress = (totalSaved / totalGoalAmount) * 100;

        return `🎯 **Goal Progress**: You have ${
          snapshot.goals.length
        } financial goals.\n\n**Overall Progress**: ${progress.toFixed(
          1
        )}%\n**Saved**: $${totalSaved.toFixed(2)} of $${totalGoalAmount.toFixed(
          2
        )}\n\n**Recommendations:**\n1. Review goal priorities\n2. Increase contributions if possible\n3. Consider goal timeline adjustments\n4. Celebrate progress made\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      }
    }

    // Investment advice
    if (
      lowerQuestion.includes("invest") ||
      lowerQuestion.includes("stock") ||
      lowerQuestion.includes("retirement")
    ) {
      if (
        analysis.financialHealth === "poor" ||
        analysis.financialHealth === "fair"
      ) {
        return `⚠️ **Investment Readiness**: Before investing, focus on:\n\n1. **Emergency Fund** - Build 3-6 months of expenses\n2. **Debt Payoff** - Pay off high-interest debt first\n3. **Basic Budget** - Ensure positive cash flow\n\n**Current Status**:\n• Emergency Fund: ${(
          (snapshot.totalSavings / (snapshot.monthlyExpenses * 6)) *
          100
        ).toFixed(1)}%\n• Debt-to-Income: ${(
          (snapshot.totalDebt / (snapshot.monthlyIncome * 12)) *
          100
        ).toFixed(
          1
        )}%\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `💼 **Investment Ready**: Your financial foundation is solid for investing!\n\n**Investment Recommendations:**\n1. **401(k)/IRA** - Maximize retirement contributions\n2. **Index Funds** - Low-cost, diversified approach\n3. **Real Estate** - Consider rental properties\n4. **Emergency Fund** - Keep 3-6 months liquid\n\n**Current Savings Rate**: ${
          snapshot.savingsRate
        }%\n**Investment Capacity**: $${(
          (snapshot.monthlyIncome * snapshot.savingsRate) /
          100
        ).toFixed(
          2
        )}/month\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      }
    }

    // Default comprehensive advice
    return `📊 **Financial Overview**:\n\n**Monthly Income**: $${snapshot.monthlyIncome.toFixed(
      2
    )}\n**Monthly Expenses**: $${snapshot.monthlyExpenses.toFixed(
      2
    )}\n**Net Income**: $${snapshot.netIncome.toFixed(2)}\n**Savings Rate**: ${
      snapshot.savingsRate
    }%\n**Total Debt**: $${snapshot.totalDebt.toFixed(
      2
    )}\n**Emergency Fund**: $${snapshot.totalSavings.toFixed(
      2
    )}\n\n**Top Recommendations:**\n${analysis.priorityActions
      .map((action, index) => `${index + 1}. ${action}`)
      .join(
        "\n"
      )}\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}\n\nAsk me about specific topics like budgeting, debt, goals, or investments!`;
  }

  // Generate AI response using OpenAI or fallback to rule-based system
  async generateAIResponse(
    userQuestion: string,
    snapshot: FinancialSnapshot
  ): Promise<string> {
    try {
      // Try OpenAI first if configured
      if (this.isOpenAIConfigured()) {
        const prompt = this.buildOpenAIPrompt(userQuestion, snapshot);
        const aiResponse = await this.callOpenAI(prompt);
        return aiResponse;
      }
    } catch (error) {
      console.error(
        "OpenAI API call failed, falling back to rule-based system:",
        error
      );
    }

    // Fallback to rule-based system
    try {
      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.generatePersonalizedAdvice(userQuestion, snapshot);
    } catch (error) {
      console.error("AI response generation error:", error);
      return "I'm having trouble analyzing your finances right now. Please try again in a moment.";
    }
  }

  // Build OpenAI prompt with financial context
  private buildOpenAIPrompt(
    userQuestion: string,
    snapshot: FinancialSnapshot
  ): string {
    const analysis = this.analyzeFinancialHealth(snapshot);

    return `As a financial advisor, analyze this user's financial situation and answer their question: "${userQuestion}"

**User's Financial Data:**
- Monthly Income: $${snapshot.monthlyIncome.toFixed(2)}
- Monthly Expenses: $${snapshot.monthlyExpenses.toFixed(2)}
- Net Income: $${snapshot.netIncome.toFixed(2)}
- Savings Rate: ${snapshot.savingsRate}%
- Debt Payoff Rate: ${snapshot.debtPayoffRate}%
- Total Debt: $${snapshot.totalDebt.toFixed(2)}
- Emergency Fund: $${snapshot.totalSavings.toFixed(2)}
- Number of Financial Goals: ${snapshot.goals.length}
- Recurring Expenses: ${snapshot.recurringExpenses.length}

**Financial Health Assessment:**
- Overall Health: ${analysis.financialHealth.toUpperCase()}
- Risk Level: ${analysis.riskLevel.toUpperCase()}
- Priority Actions: ${analysis.priorityActions.join(", ")}

**Provide:**
1. Direct answer to their question
2. Specific, actionable advice based on their data
3. Relevant financial ratios and calculations
4. Next steps they should take
5. Encouragement while being realistic

Keep your response conversational, helpful, and focused on their specific situation. Use bullet points and clear formatting for readability.`;
  }
}

export const aiFinancialAdvisorService =
  AIFinancialAdvisorService.getInstance();
