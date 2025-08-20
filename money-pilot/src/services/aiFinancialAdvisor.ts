import { Alert } from "react-native";
import { financialPlanGenerator } from "./financialPlanGenerator";
import { saveFinancialPlan, FinancialPlan } from "./userData";

export interface AIResponse {
  type: "text" | "plan_generated";
  message: string;
  plan?: FinancialPlan;
  planName?: string;
}

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
      lowerQuestion.includes("credit") ||
      lowerQuestion.includes("liability")
    ) {
      if (snapshot.totalDebt > 0) {
        const totalMonthlyDebtPayments = snapshot.debts.reduce(
          (sum, debt) => sum + debt.payment,
          0
        );
        const averageInterestRate =
          snapshot.debts.length > 0
            ? snapshot.debts.reduce((sum, debt) => sum + debt.rate, 0) /
              snapshot.debts.length
            : 0;
        const debtToIncomeRatio =
          snapshot.monthlyIncome > 0
            ? (totalMonthlyDebtPayments / snapshot.monthlyIncome) * 100
            : 0;

        if (debtToIncomeRatio > 43) {
          return `🚨 **High Debt-to-Income Alert**: Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which exceeds the recommended 43% limit.\n\n**Current Debt**: $${snapshot.totalDebt.toFixed(
            2
          )}\n**Monthly Debt Payments**: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n**Average Interest Rate**: ${averageInterestRate.toFixed(
            2
          )}%\n\n**Priority Actions:**\n1. Focus on highest interest rate debt first\n2. Consider debt consolidation to lower rates\n3. Increase income through side hustles\n4. Stop taking on new debt\n5. Create strict debt payoff plan\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        } else if (debtToIncomeRatio > 28) {
          return `⚠️ **Moderate Debt Load**: Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which is manageable but could be improved.\n\n**Current Debt**: $${snapshot.totalDebt.toFixed(
            2
          )}\n**Monthly Debt Payments**: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n**Average Interest Rate**: ${averageInterestRate.toFixed(
            2
          )}%\n\n**Recommendations:**\n1. Pay off highest interest debt first\n2. Consider refinancing high-rate loans\n3. Increase debt payoff rate if possible\n4. Build emergency fund\n5. Avoid new debt\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        } else {
          return `✅ **Healthy Debt Level**: Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which is well within healthy limits.\n\n**Current Debt**: $${snapshot.totalDebt.toFixed(
            2
          )}\n**Monthly Debt Payments**: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n**Average Interest Rate**: ${averageInterestRate.toFixed(
            2
          )}%\n\n**Recommendations:**\n1. Continue current payoff strategy\n2. Consider accelerating payoff on high-rate debt\n3. Build emergency fund\n4. Start investing for long-term goals\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
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
      lowerQuestion.includes("plan") ||
      lowerQuestion.includes("target")
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
        const totalMonthlyContributions = snapshot.goals.reduce(
          (sum, goal) => sum + goal.monthlyContribution,
          0
        );
        const overallProgress = (totalSaved / totalGoalAmount) * 100;

        // Analyze goal feasibility
        const totalMonthlyIncome = snapshot.monthlyIncome;
        const totalMonthlyExpenses = snapshot.monthlyExpenses;
        const availableForGoals =
          totalMonthlyIncome -
          totalMonthlyExpenses -
          (totalMonthlyIncome * snapshot.savingsRate) / 100;
        const goalAffordability =
          availableForGoals >= totalMonthlyContributions;

        // Find goals that might need adjustment
        const goalsNeedingAttention = snapshot.goals.filter((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const monthsToTarget = goal.targetDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )
              )
            : 0;
          const monthlyNeeded =
            monthsToTarget > 0
              ? (goal.targetAmount - goal.currentAmount) / monthsToTarget
              : goal.monthlyContribution;

          return (
            progress < 25 || monthlyNeeded > goal.monthlyContribution * 1.5
          );
        });

        let response = `🎯 **Goal Progress Analysis**: You have ${
          snapshot.goals.length
        } financial goals.\n\n**Overall Progress**: ${overallProgress.toFixed(
          1
        )}%\n**Total Saved**: $${totalSaved.toFixed(
          2
        )} of $${totalGoalAmount.toFixed(
          2
        )}\n**Monthly Contributions**: $${totalMonthlyContributions.toFixed(
          2
        )}\n**Available for Goals**: $${availableForGoals.toFixed(
          2
        )}/month\n\n`;

        if (!goalAffordability) {
          response += `⚠️ **Goal Affordability Alert**: Your monthly goal contributions ($${totalMonthlyContributions.toFixed(
            2
          )}) exceed what's available ($${availableForGoals.toFixed(
            2
          )}).\n\n**Recommendations:**\n1. Reduce goal contributions temporarily\n2. Increase income through side hustles\n3. Prioritize high-priority goals\n4. Extend goal timelines\n\n`;
        } else {
          response += `✅ **Goals are Affordable**: Your monthly contributions are within your budget.\n\n`;
        }

        if (goalsNeedingAttention.length > 0) {
          response += `📋 **Goals Needing Attention:**\n${goalsNeedingAttention
            .map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const monthsToTarget = goal.targetDate
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(goal.targetDate).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24 * 30)
                    )
                  )
                : 0;
              const monthlyNeeded =
                monthsToTarget > 0
                  ? (goal.targetAmount - goal.currentAmount) / monthsToTarget
                  : goal.monthlyContribution;

              return `• ${goal.name}: ${progress.toFixed(
                1
              )}% complete, needs $${monthlyNeeded.toFixed(
                2
              )}/month to reach target`;
            })
            .join("\n")}\n\n`;
        }

        response += `**General Recommendations:**\n1. Review goal priorities regularly\n2. Increase contributions if possible\n3. Consider goal timeline adjustments\n4. Celebrate progress made\n5. Focus on one goal at a time if struggling\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;

        return response;
      }
    }

    // Financial plan creation - enhanced with better triggers
    if (
      lowerQuestion.includes("create plan") ||
      lowerQuestion.includes("generate plan") ||
      lowerQuestion.includes("financial plan") ||
      lowerQuestion.includes("export plan") ||
      lowerQuestion.includes("spreadsheet") ||
      lowerQuestion.includes("csv") ||
      lowerQuestion.includes("make a plan") ||
      lowerQuestion.includes("build a plan") ||
      lowerQuestion.includes("plan for") ||
      lowerQuestion.includes("help me plan") ||
      lowerQuestion.includes("i need a plan") ||
      lowerQuestion.includes("create a plan") ||
      lowerQuestion.includes("generate a plan") ||
      lowerQuestion.includes("financial planning") ||
      lowerQuestion.includes("budget plan") ||
      lowerQuestion.includes("savings plan") ||
      lowerQuestion.includes("debt plan") ||
      lowerQuestion.includes("investment plan") ||
      lowerQuestion.includes("retirement plan") ||
      lowerQuestion.includes("emergency fund plan") ||
      lowerQuestion.includes("goal plan") ||
      lowerQuestion.includes("money plan") ||
      lowerQuestion.includes("finance plan")
    ) {
      try {
        // Create a personalized plan name based on user's request
        let planName = `Financial Plan - ${new Date().toLocaleDateString()}`;

        // Customize plan name based on user's specific request
        if (lowerQuestion.includes("budget")) {
          planName = `Budget Plan - ${new Date().toLocaleDateString()}`;
        } else if (
          lowerQuestion.includes("debt") ||
          lowerQuestion.includes("payoff")
        ) {
          planName = `Debt Payoff Plan - ${new Date().toLocaleDateString()}`;
        } else if (
          lowerQuestion.includes("savings") ||
          lowerQuestion.includes("emergency")
        ) {
          planName = `Savings Plan - ${new Date().toLocaleDateString()}`;
        } else if (
          lowerQuestion.includes("investment") ||
          lowerQuestion.includes("retirement")
        ) {
          planName = `Investment Plan - ${new Date().toLocaleDateString()}`;
        } else if (lowerQuestion.includes("goal")) {
          planName = `Goal Achievement Plan - ${new Date().toLocaleDateString()}`;
        }

        const plan = financialPlanGenerator.generateFinancialPlan(
          snapshot,
          planName,
          "current-user"
        );

        // Create personalized response based on user's request
        let personalizedResponse = `📋 **${planName} Generated Successfully!**\n\n`;

        // Add context about what the user asked for
        if (lowerQuestion.includes("budget")) {
          personalizedResponse += `**Based on your request for budget planning:**\n`;
        } else if (
          lowerQuestion.includes("debt") ||
          lowerQuestion.includes("payoff")
        ) {
          personalizedResponse += `**Based on your request for debt management:**\n`;
        } else if (
          lowerQuestion.includes("savings") ||
          lowerQuestion.includes("emergency")
        ) {
          personalizedResponse += `**Based on your request for savings planning:**\n`;
        } else if (
          lowerQuestion.includes("investment") ||
          lowerQuestion.includes("retirement")
        ) {
          personalizedResponse += `**Based on your request for investment planning:**\n`;
        } else if (lowerQuestion.includes("goal")) {
          personalizedResponse += `**Based on your request for goal planning:**\n`;
        } else {
          personalizedResponse += `**Based on your financial situation:**\n`;
        }

        personalizedResponse += `\n**Plan Summary:**\n• **Monthly Budget**: $${plan.planData.monthlyBudget.income.toFixed(
          2
        )} income, $${plan.planData.monthlyBudget.expenses.toFixed(
          2
        )} expenses\n• **Debt Payoff**: $${plan.planData.debtPayoffPlan.totalDebt.toFixed(
          2
        )} total debt, estimated payoff: ${
          plan.planData.debtPayoffPlan.estimatedPayoffDate
        }\n• **Savings Plan**: Emergency fund target $${plan.planData.savingsPlan.emergencyFund.target.toFixed(
          2
        )}\n• **Goals**: ${
          plan.planData.goalTimeline.goals.length
        } active goals\n• **Recommendations**: ${
          plan.planData.recommendations.length
        } actionable items\n\n**Plan includes:**\n✅ Monthly budget breakdown\n✅ Debt payoff strategy (avalanche method)\n✅ Savings allocation plan\n✅ Goal timeline analysis\n✅ Personalized recommendations\n✅ Exportable CSV data\n\n**To save this plan to your account, please use the app's plan management feature.**\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;

        return personalizedResponse;
      } catch (error) {
        console.error("Error generating financial plan:", error);
        return "I encountered an error while generating your financial plan. Please try again or contact support if the issue persists.";
      }
    }

    // Goal feasibility and timeline advice
    if (
      lowerQuestion.includes("feasible") ||
      lowerQuestion.includes("realistic") ||
      lowerQuestion.includes("timeline") ||
      lowerQuestion.includes("achievable") ||
      lowerQuestion.includes("realistic expectations")
    ) {
      if (snapshot.goals.length === 0) {
        return `🎯 **No Goals to Analyze**: You haven't set any financial goals yet.\n\n**Setting Realistic Goals:**\n1. Start with emergency fund (3-6 months of expenses)\n2. Consider your current income and expenses\n3. Set achievable timelines\n4. Break large goals into smaller milestones\n5. Review and adjust regularly\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        const totalMonthlyContributions = snapshot.goals.reduce(
          (sum, goal) => sum + goal.monthlyContribution,
          0
        );
        const availableForGoals =
          snapshot.monthlyIncome -
          snapshot.monthlyExpenses -
          (snapshot.monthlyIncome * snapshot.savingsRate) / 100;

        // Analyze each goal's feasibility
        const goalAnalysis = snapshot.goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const monthsToTarget = goal.targetDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )
              )
            : 0;
          const monthlyNeeded =
            monthsToTarget > 0
              ? (goal.targetAmount - goal.currentAmount) / monthsToTarget
              : goal.monthlyContribution;
          const isOnTrack = monthlyNeeded <= goal.monthlyContribution * 1.2; // Allow 20% buffer

          return {
            goal,
            progress,
            monthsToTarget,
            monthlyNeeded,
            isOnTrack,
            feasibility: isOnTrack ? "On Track" : "Needs Adjustment",
          };
        });

        const onTrackGoals = goalAnalysis.filter((g) => g.isOnTrack);
        const needsAdjustment = goalAnalysis.filter((g) => !g.isOnTrack);

        let response = `📊 **Goal Feasibility Analysis**:\n\n**Monthly Budget for Goals**: $${availableForGoals.toFixed(
          2
        )}\n**Current Monthly Contributions**: $${totalMonthlyContributions.toFixed(
          2
        )}\n**Affordability**: ${
          availableForGoals >= totalMonthlyContributions
            ? "✅ Affordable"
            : "⚠️ Over Budget"
        }\n\n`;

        if (onTrackGoals.length > 0) {
          response += `✅ **Goals On Track (${
            onTrackGoals.length
          }):**\n${onTrackGoals
            .map(
              (g) =>
                `• ${g.goal.name}: ${g.progress.toFixed(
                  1
                )}% complete, $${g.goal.monthlyContribution.toFixed(2)}/month`
            )
            .join("\n")}\n\n`;
        }

        if (needsAdjustment.length > 0) {
          response += `⚠️ **Goals Needing Adjustment (${
            needsAdjustment.length
          }):**\n${needsAdjustment
            .map(
              (g) =>
                `• ${g.goal.name}: ${g.progress.toFixed(
                  1
                )}% complete, needs $${g.monthlyNeeded.toFixed(
                  2
                )}/month (currently $${g.goal.monthlyContribution.toFixed(2)})`
            )
            .join("\n")}\n\n`;
        }

        response += `**Recommendations:**\n1. Prioritize goals by importance and timeline\n2. Increase contributions to struggling goals\n3. Extend timelines for unrealistic targets\n4. Consider reducing goal count if overextended\n5. Focus on one major goal at a time\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;

        return response;
      }
    }

    // Interest rate and debt payment advice
    if (
      lowerQuestion.includes("interest rate") ||
      lowerQuestion.includes("apr") ||
      lowerQuestion.includes("monthly payment") ||
      lowerQuestion.includes("debt payment")
    ) {
      if (snapshot.debts.length > 0) {
        const totalMonthlyDebtPayments = snapshot.debts.reduce(
          (sum, debt) => sum + debt.payment,
          0
        );
        const averageInterestRate =
          snapshot.debts.reduce((sum, debt) => sum + debt.rate, 0) /
          snapshot.debts.length;
        const highestRateDebt = snapshot.debts.reduce(
          (highest, debt) => (debt.rate > highest.rate ? debt : highest),
          snapshot.debts[0]
        );

        return `💰 **Debt Payment Analysis**:\n\n**Total Monthly Payments**: $${totalMonthlyDebtPayments.toFixed(
          2
        )}\n**Average Interest Rate**: ${averageInterestRate.toFixed(
          2
        )}%\n**Highest Rate Debt**: ${highestRateDebt.name} (${
          highestRateDebt.rate
        }% APR)\n\n**Debt Breakdown:**\n${snapshot.debts
          .map(
            (debt) =>
              `• ${debt.name}: $${debt.payment.toFixed(2)}/month at ${
                debt.rate
              }% APR`
          )
          .join("\n")}\n\n**Recommendations:**\n1. Pay off ${
          highestRateDebt.name
        } first (highest rate)\n2. Consider refinancing if rates are high\n3. Consolidate multiple debts if beneficial\n4. Increase payments on high-rate debt\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return "🎉 **No Debt Payments**: You're debt-free! No monthly debt payments to worry about.\n\n**Recommendations:**\n1. Build emergency fund\n2. Increase savings rate\n3. Start investing for long-term goals\n4. Consider real estate investments\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}";
      }
    }

    // Net worth and assets advice
    if (
      lowerQuestion.includes("net worth") ||
      lowerQuestion.includes("assets") ||
      lowerQuestion.includes("wealth")
    ) {
      if (snapshot.netWorth > 0) {
        const debtToAssetRatio = snapshot.totalDebt / snapshot.totalAssets;
        if (debtToAssetRatio > 0.5) {
          return `⚠️ **Net Worth Analysis**: Your net worth is $${snapshot.netWorth.toFixed(
            2
          )}, but your debt-to-asset ratio is ${(
            debtToAssetRatio * 100
          ).toFixed(
            1
          )}%.\n\n**Current Status**:\n• Total Assets: $${snapshot.totalAssets.toFixed(
            2
          )}\n• Total Debt: $${snapshot.totalDebt.toFixed(
            2
          )}\n• Net Worth: $${snapshot.netWorth.toFixed(
            2
          )}\n\n**Recommendations:**\n1. Focus on debt reduction to improve net worth\n2. Build emergency fund before investing\n3. Consider debt consolidation if rates are high\n4. Increase income through side hustles\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        } else {
          return `✅ **Strong Net Worth**: Your net worth is $${snapshot.netWorth.toFixed(
            2
          )} with a healthy debt-to-asset ratio of ${(
            debtToAssetRatio * 100
          ).toFixed(
            1
          )}%.\n\n**Current Status**:\n• Total Assets: $${snapshot.totalAssets.toFixed(
            2
          )}\n• Total Debt: $${snapshot.totalDebt.toFixed(
            2
          )}\n• Net Worth: $${snapshot.netWorth.toFixed(
            2
          )}\n\n**Recommendations:**\n1. Continue building assets\n2. Consider investment diversification\n3. Set net worth growth goals\n4. Review insurance coverage\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
        }
      } else {
        return `📈 **Building Net Worth**: Your current net worth is $${snapshot.netWorth.toFixed(
          2
        )}. This is common when starting your financial journey!\n\n**Current Status**:\n• Total Assets: $${snapshot.totalAssets.toFixed(
          2
        )}\n• Total Debt: $${snapshot.totalDebt.toFixed(
          2
        )}\n• Net Worth: $${snapshot.netWorth.toFixed(
          2
        )}\n\n**Priority Actions:**\n1. Build emergency fund first\n2. Pay down high-interest debt\n3. Increase income through side hustles\n4. Start investing in retirement accounts\n5. Track net worth monthly\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}`;
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
    const totalMonthlyDebtPayments = snapshot.debts.reduce(
      (sum, debt) => sum + debt.payment,
      0
    );
    const averageInterestRate =
      snapshot.debts.length > 0
        ? snapshot.debts.reduce((sum, debt) => sum + debt.rate, 0) /
          snapshot.debts.length
        : 0;
    const debtToIncomeRatio =
      snapshot.monthlyIncome > 0
        ? (totalMonthlyDebtPayments / snapshot.monthlyIncome) * 100
        : 0;

    // Calculate goal metrics
    const totalGoalAmount = snapshot.goals.reduce(
      (sum, goal) => sum + goal.targetAmount,
      0
    );
    const totalGoalSaved = snapshot.goals.reduce(
      (sum, goal) => sum + goal.currentAmount,
      0
    );
    const totalGoalContributions = snapshot.goals.reduce(
      (sum, goal) => sum + goal.monthlyContribution,
      0
    );
    const overallGoalProgress =
      totalGoalAmount > 0 ? (totalGoalSaved / totalGoalAmount) * 100 : 0;

    return `📊 **Financial Overview**:\n\n**Monthly Income**: $${snapshot.monthlyIncome.toFixed(
      2
    )}\n**Monthly Expenses**: $${snapshot.monthlyExpenses.toFixed(
      2
    )}\n**Net Income**: $${snapshot.netIncome.toFixed(2)}\n**Savings Rate**: ${
      snapshot.savingsRate
    }%\n**Total Assets**: $${snapshot.totalAssets.toFixed(
      2
    )}\n**Total Debt**: $${snapshot.totalDebt.toFixed(
      2
    )}\n**Net Worth**: $${snapshot.netWorth.toFixed(
      2
    )}\n**Monthly Debt Payments**: $${totalMonthlyDebtPayments.toFixed(
      2
    )}\n**Average Interest Rate**: ${averageInterestRate.toFixed(
      2
    )}%\n**Debt-to-Income Ratio**: ${debtToIncomeRatio.toFixed(
      1
    )}%\n**Emergency Fund**: $${snapshot.totalSavings.toFixed(
      2
    )}\n**Financial Goals**: ${
      snapshot.goals.length
    } goals, ${overallGoalProgress.toFixed(
      1
    )}% complete, $${totalGoalContributions.toFixed(
      2
    )}/month\n\n**Top Recommendations:**\n${analysis.priorityActions
      .map((action, index) => `${index + 1}. ${action}`)
      .join(
        "\n"
      )}\n\n**Your Financial Health**: ${analysis.financialHealth.toUpperCase()}\n\n**💡 Need a personalized plan?** Try asking:\n• "Create a budget plan"\n• "Help me plan for debt payoff"\n• "Make a savings plan"\n• "Generate an investment plan"\n• "Create a goal plan"\n• "I need a financial plan"\n\nOr ask about specific topics like budgeting, debt, goals, investments, net worth, or goal feasibility!`;
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

    // Format assets and debts for better context
    const assetsList =
      snapshot.assets.length > 0
        ? snapshot.assets
            .map(
              (asset) =>
                `  • ${asset.name}: $${asset.balance.toFixed(2)} (${
                  asset.type
                })`
            )
            .join("\n")
        : "  • No assets recorded";

    const debtsList =
      snapshot.debts.length > 0
        ? snapshot.debts
            .map(
              (debt) =>
                `  • ${debt.name}: $${debt.balance.toFixed(2)} (${
                  debt.type
                }) - ${debt.rate}% APR, $${debt.payment.toFixed(2)}/month`
            )
            .join("\n")
        : "  • No debts recorded";

    // Format goals for better context
    const goalsList =
      snapshot.goals.length > 0
        ? snapshot.goals
            .map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const monthsToTarget = goal.targetDate
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(goal.targetDate).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24 * 30)
                    )
                  )
                : 0;
              const monthlyNeeded =
                monthsToTarget > 0
                  ? (goal.targetAmount - goal.currentAmount) / monthsToTarget
                  : goal.monthlyContribution;

              return `  • ${goal.name}: $${goal.currentAmount.toFixed(
                2
              )}/$${goal.targetAmount.toFixed(2)} (${progress.toFixed(
                1
              )}%) - $${goal.monthlyContribution.toFixed(
                2
              )}/month, ${monthsToTarget} months left, ${
                goal.priority
              } priority`;
            })
            .join("\n")
        : "  • No goals recorded";

    // Calculate debt metrics
    const totalMonthlyDebtPayments = snapshot.debts.reduce(
      (sum, debt) => sum + debt.payment,
      0
    );
    const averageInterestRate =
      snapshot.debts.length > 0
        ? snapshot.debts.reduce((sum, debt) => sum + debt.rate, 0) /
          snapshot.debts.length
        : 0;
    const debtToIncomeRatio =
      snapshot.monthlyIncome > 0
        ? (totalMonthlyDebtPayments / snapshot.monthlyIncome) * 100
        : 0;

    return `As a financial advisor, analyze this user's financial situation and answer their question: "${userQuestion}"

**User's Financial Data:**
- Monthly Income: $${snapshot.monthlyIncome.toFixed(2)}
- Monthly Expenses: $${snapshot.monthlyExpenses.toFixed(2)}
- Net Income: $${snapshot.netIncome.toFixed(2)}
- Savings Rate: ${snapshot.savingsRate}%
- Debt Payoff Rate: ${snapshot.debtPayoffRate}%
- Total Assets: $${snapshot.totalAssets.toFixed(2)}
- Total Debt: $${snapshot.totalDebt.toFixed(2)}
- Net Worth: $${snapshot.netWorth.toFixed(2)}
- Emergency Fund: $${snapshot.totalSavings.toFixed(2)}
- Number of Financial Goals: ${snapshot.goals.length}
- Recurring Expenses: ${snapshot.recurringExpenses.length}

**Debt Analysis:**
- Total Monthly Debt Payments: $${totalMonthlyDebtPayments.toFixed(2)}
- Average Interest Rate: ${averageInterestRate.toFixed(2)}%
- Debt-to-Income Ratio: ${debtToIncomeRatio.toFixed(1)}%

**Assets Breakdown:**
${assetsList}

**Debts Breakdown:**
${debtsList}

**Goals Breakdown:**
${goalsList}

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
