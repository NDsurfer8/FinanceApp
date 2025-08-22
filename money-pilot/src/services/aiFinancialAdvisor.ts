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

  private SYSTEM_PROMPT: string = `
You are Vectra, an expert financial advisor with the knowledge of a certified financial planner and a business law expert. Your expertise spans personal finance, budgeting, debt management, investing (stocks, cryptocurrency, and real estate), entrepreneurship, and creating/executing side hustles. You also serve as a VectorFi app guide, helping users understand and maximize app features. Your role is to educate and guide users toward financial freedom — not to provide legal, tax, or guaranteed investment advice.

Style & conduct:
- Be encouraging, approachable, and laid-back — like a local friend helping them ride the money waves 🌊.
- Use simple ocean/surf/Hawai'i metaphors where natural; do not overdo it. Use at most 1–2 emojis (🌊🤙🌺💵💰💸🚀💪🎯🔒🏆🎉🪙🌴).
- Keep answers concise and scannable: short sentences, headings, and bullet points.
- If the question is about finances → answer as a financial advisor. If it’s about the app → answer as a VectorFi expert. If unclear → ask one clarifying question.
- Ask for missing inputs when needed (income, expenses, debt rates, timelines) instead of guessing.

Reasoning & transparency:
- For “what if” scenarios: analyze outcomes, show assumptions, compare trade-offs (pros/cons), and tie advice back to the user’s VectorFi data when available.
- When using numbers, include units and simple formulas (e.g., "$500/mo × 12 = $6,000/yr").
- If uncertain, say "I’m not sure" and propose the next best step. Do not invent VectorFi features that don’t exist.

VectorFi app features (reference):
- Dashboard: overview of financial health, recent transactions, quick insights
- Budget: set income sources, fixed/variable expenses, track spending vs budget
- Assets & Debts: track net worth; add/edit savings, investments, property, loans, credit cards
- Goals: set target amounts, timelines, monthly contributions
- Transactions: add, edit, categorize with detailed tracking
- AI Financial Advisor: personalized advice and financial plan generation
- Shared Finance: groups with family/friends to share finances and goals
- Settings: manage profile, security, notifications, subscription, financial plans

Advanced features:
- Recurring Transactions: automatically track regular payments and income
- Bank Integration (Plaid): connect accounts for automatic imports
- Financial Plans: generate comprehensive plans with actionable steps
- Biometric Security: Face ID/Touch ID for secure access
- Data Export: export data for external analysis
- Premium: unlimited transactions, advanced analytics, shared finance, AI advisor

Usage tips:
- Log transactions regularly for more accurate advice
- Set up recurring transactions for consistent tracking
- Use the AI advisor for step-by-step guidance
- Connect bank accounts for automatic sync
- Share finances with family for collaborative planning
- Export data periodically for backups/external use
`;

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
              content: this.SYSTEM_PROMPT,
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

  // Generate app-specific advice and guidance
  generateAppAdvice(userQuestion: string): string {
    const lowerQuestion = userQuestion.toLowerCase();

    // Dashboard questions
    if (lowerQuestion.includes("dashboard")) {
      return `📊 Dashboard Overview\n\nThe Dashboard is your financial command center!\n\n📋 What you'll find:\n• Financial health summary\n• Recent transactions\n• Quick insights and alerts\n• Net worth overview\n• Goal progress highlights\n\n💡 Pro Tips:\n• Check daily for financial awareness\n• Use insights to spot spending patterns\n• Monitor goal progress regularly\n• Review alerts for important updates\n\n📍 Location: Main tab at the bottom of the app 🌊`;
    }

    // Budget screen questions
    if (
      lowerQuestion.includes("budget") ||
      lowerQuestion.includes("budget screen")
    ) {
      return `💰 Budget Screen\n\nYour personal financial planning hub!\n\n🔧 Key Features:\n• Set monthly income sources\n• Add fixed expenses (rent, utilities, etc.)\n• Track variable expenses (food, entertainment)\n• Real-time spending vs budget tracking\n• Recurring transaction suggestions\n• Budget insights and recommendations\n\n📝 How to Use Effectively:\n1. Start with income - add all sources\n2. List fixed expenses first (rent, bills)\n3. Estimate variable expenses realistically\n4. Review spending patterns monthly\n5. Adjust budget based on actual spending\n6. Use recurring transactions for consistency\n\n💡 Pro Tips:\n• Be realistic with your estimates\n• Review and adjust monthly\n• Use the AI advisor for budget optimization\n• Connect bank accounts for automatic tracking\n\n📍 Location: Second tab from the left 🤙`;
    }

    // Assets & Debts questions
    if (
      lowerQuestion.includes("assets") ||
      lowerQuestion.includes("debts") ||
      lowerQuestion.includes("net worth")
    ) {
      return `🏦 Assets & Debts\n\nTrack your complete financial picture!\n\n💎 Assets You Can Track:\n• Savings accounts\n• Investment accounts\n• Real estate\n• Vehicles\n• Other valuable items\n\n💳 Debts You Can Track:\n• Credit cards\n• Student loans\n• Car loans\n• Mortgages\n• Personal loans\n\n🔧 Key Features:\n• Add/edit assets and debts\n• Track interest rates and payments\n• View net worth calculation\n• Financial overview chart\n• Debt-to-asset ratio analysis\n\n📝 How to Use Effectively:\n1. Add all major assets and debts\n2. Update balances regularly\n3. Include interest rates for debts\n4. Monitor net worth trends\n5. Use for loan applications\n\n💡 Pro Tips:\n• Update balances monthly\n• Include all significant items\n• Track interest rates for debt payoff strategy\n• Use net worth tracking for motivation\n\n📍 Location: Third tab from the left 💵`;
    }

    // Goals questions
    if (lowerQuestion.includes("goals") || lowerQuestion.includes("goal")) {
      return `🎯 Goals\n\nTurn your financial dreams into reality!\n\n📋 What You Can Track:\n• Emergency fund\n• Down payment for house\n• Vacation fund\n• Debt payoff\n• Investment goals\n• Any financial target\n\n🔧 Key Features:\n• Set target amounts and timelines\n• Monthly contribution tracking\n• Progress visualization\n• Goal categories and priorities\n• Achievement celebrations\n\n📝 How to Set Effective Goals:\n1. Be Specific: "Save $10,000 for emergency fund"\n2. Set Realistic Timelines: Consider your income\n3. Choose Monthly Contributions: What you can afford\n4. Prioritize: Focus on 2-3 goals at a time\n5. Review Regularly: Adjust as needed\n\n💡 Pro Tips:\n• Start with emergency fund (3-6 months expenses)\n• Use the AI advisor for goal feasibility analysis\n• Celebrate milestones along the way\n• Adjust contributions based on income changes\n• Consider goal sharing with family\n\n📍 Location: Fourth tab from the left 🌺`;
    }

    // Transactions questions
    if (
      lowerQuestion.includes("transactions") ||
      lowerQuestion.includes("transaction")
    ) {
      return `📝 Transactions\n\nThe foundation of your financial tracking!\n\n📋 What You Can Track:\n• Income (salary, side hustles, gifts)\n• Expenses (food, entertainment, bills)\n• Transfers between accounts\n• Investment contributions\n• Any money movement\n\n🔧 Key Features:\n• Add transactions manually\n• Categorize for better insights\n• Add notes and descriptions\n• Edit and delete transactions\n• Search and filter\n• Recurring transaction setup\n\n📝 How to Use Effectively:\n1. Log Regularly: Daily or weekly\n2. Be Specific: Use clear descriptions\n3. Categorize Properly: Helps with insights\n4. Set Up Recurring: For regular payments\n5. Review Monthly: Spot patterns\n\n💡 Pro Tips:\n• Log transactions within 24 hours\n• Use consistent categories\n• Set up recurring for regular bills\n• Connect bank accounts for automatic import\n• Use notes for tax purposes\n\n📍 Location: Available from Dashboard and Budget screens 💸`;
    }

    // AI Advisor questions
    if (
      lowerQuestion.includes("ai") ||
      lowerQuestion.includes("advisor") ||
      lowerQuestion.includes("vectra")
    ) {
      return `🤖 AI Financial Advisor (Vectra)\n\nYour personal financial coach!\n\n🔧 What Vectra Can Do:\n• Analyze your financial health\n• Provide personalized advice\n• Generate financial plans\n• Answer specific questions\n• Help with budgeting, debt, goals\n• Guide investment decisions\n• Suggest side hustle opportunities\n\n📝 How to Get the Best Advice:\n1. Ask Specific Questions: "How can I improve my budget?"\n2. Request Plans: "Create a debt payoff plan"\n3. Get Analysis: "How am I doing financially?"\n4. Seek Guidance: "Help me plan for a house down payment"\n\n💡 Pro Tips:\n• Keep transaction data updated for better advice\n• Ask follow-up questions for clarification\n• Use generated plans as starting points\n• Request specific action steps\n• Ask about app features and usage\n\n📍 Location: Fifth tab from the left (AI icon) 🌊`;
    }

    // Shared Finance questions
    if (
      lowerQuestion.includes("shared") ||
      lowerQuestion.includes("family") ||
      lowerQuestion.includes("group")
    ) {
      return `👨‍👩‍👧‍👦 Shared Finance\n\nCollaborate with family and friends!\n\n📋 What You Can Share:\n• Financial goals\n• Group expenses\n• Shared budgets\n• Progress tracking\n• Collaborative planning\n\n🔧 Key Features:\n• Create family/friend groups\n• Set shared financial goals\n• Track group contributions\n• Share progress updates\n• Selective data syncing\n• Group insights and analytics\n\n📝 How to Use Effectively:\n1. Create Groups: For family or roommates\n2. Set Shared Goals: House down payment, vacation\n3. Track Contributions: Who's contributing what\n4. Use Selective Sync: Choose what to share\n5. Regular Updates: Keep everyone informed\n\n💡 Pro Tips:\n• Start with simple goals\n• Be clear about contribution expectations\n• Use selective sync for privacy\n• Regular group check-ins\n• Celebrate group achievements\n\n📍 Location: Available from main menu or Settings 🤙`;
    }

    // Bank Integration questions
    if (
      lowerQuestion.includes("bank") ||
      lowerQuestion.includes("plaid") ||
      lowerQuestion.includes("connect")
    ) {
      return `🏦 Bank Integration\n\nAutomate your financial tracking!\n\n🔧 What It Does:\n• Automatically import transactions\n• Sync account balances\n• Reduce manual data entry\n• Improve tracking accuracy\n• Provide real-time insights\n\n🏛️ Supported Banks:\n• Most major US banks\n• Credit unions\n• Investment accounts\n• Credit cards\n\n📝 How to Connect:\n1. Go to Settings → Bank Integration\n2. Select your bank\n3. Enter credentials securely\n4. Choose accounts to sync\n5. Set up automatic imports\n\n🔒 Security Features:\n• Bank-level encryption\n• Read-only access\n• Secure credential storage\n• No access to transfer funds\n\n💡 Pro Tips:\n• Start with one account\n• Review imported transactions\n• Set up recurring transactions\n• Use for expense categorization\n• Regular sync for accuracy\n\n📍 Location: Settings → Bank Integration 💵`;
    }

    // Recurring Transactions questions
    if (lowerQuestion.includes("recurring")) {
      return `🔄 Recurring Transactions\n\nSet it and forget it!\n\n📋 What You Can Automate:\n• Monthly bills (rent, utilities)\n• Subscription services\n• Regular income (salary)\n• Loan payments\n• Investment contributions\n\n🔧 Key Features:\n• Set frequency (monthly, weekly, etc.)\n• Automatic transaction creation\n• Easy editing and management\n• Smart suggestions based on patterns\n• Payment reminders\n\n📝 How to Set Up:\n1. Go to Recurring Transactions\n2. Tap "Add Recurring Transaction"\n3. Choose type (income/expense)\n4. Set amount and frequency\n5. Choose start date\n6. Save and activate\n\n💡 Pro Tips:\n• Set up all regular bills\n• Include your salary/income\n• Review monthly for accuracy\n• Use for budget planning\n• Adjust as needed\n\n📍 Location: Available from main menu 💸`;
    }

    // Settings questions
    if (
      lowerQuestion.includes("settings") ||
      lowerQuestion.includes("preferences")
    ) {
      return `⚙️ Settings\n\nCustomize your VectorFi experience!\n\n📋 Main Categories:\n• Profile: Edit personal information\n• Security: Biometric auth, encryption\n• Notifications: Alerts and reminders\n• Subscription: Premium features\n• Bank Integration: Connect accounts\n• Data Export: Backup your data\n• Help & Support: Get assistance\n\n🔧 Key Features:\n• Biometric authentication (fingerprint/Face ID)\n• Custom notification preferences\n• Data encryption settings\n• Subscription management\n• Privacy controls\n• Account deletion\n\n💡 Pro Tips:\n• Enable biometric auth for security\n• Set up helpful notifications\n• Regular data exports for backup\n• Review privacy settings\n• Keep app updated\n\n📍 Location: Bottom right tab (gear icon) 🔧`;
    }

    // Premium/Subscription questions
    if (
      lowerQuestion.includes("premium") ||
      lowerQuestion.includes("subscription")
    ) {
      return `⭐ Premium Features\n\nUnlock VectorFi's full potential!\n\n🔧 Premium Benefits:\n• Unlimited Transactions: No monthly limits\n• Advanced Analytics: Detailed insights\n• Shared Finance: Family/group features\n• AI Financial Advisor: Personalized advice\n• Data Export: Full data backup\n• Priority Support: Faster help\n• No Ads: Clean experience\n\n📝 How to Upgrade:\n1. Go to Settings → Subscription\n2. Choose your plan (monthly/yearly)\n3. Complete secure payment\n4. Enjoy premium features immediately\n\n💰 Pricing:\n• Monthly: $X.XX/month\n• Yearly: $X.XX/year (save XX%)\n• Lifetime: One-time payment\n\n💡 Pro Tips:\n• Try free features first\n• Yearly plans offer best value\n• Premium features enhance AI advice\n• Shared finance requires premium\n• Cancel anytime\n\n📍 Location: Settings → Subscription 💰`;
    }

    // Security questions
    if (
      lowerQuestion.includes("security") ||
      lowerQuestion.includes("biometric") ||
      lowerQuestion.includes("privacy")
    ) {
      return `🔒 Security & Privacy\n\nYour data is protected!\n\n🔧 Security Features:\n• Biometric Authentication: Fingerprint/Face ID\n• Data Encryption: Bank-level security\n• Auto-Lock: Automatic app locking\n• Two-Factor Auth: Extra protection\n• Privacy Controls: Choose what to share\n\n📝 How to Set Up Security:\n1. Go to Settings → Privacy & Security\n2. Enable biometric authentication\n3. Set up auto-lock timer\n4. Configure privacy settings\n5. Review data sharing options\n\n🔐 Privacy Features:\n• Selective data syncing\n• Local data storage\n• Encrypted backups\n• Account deletion option\n• No data selling\n\n💡 Pro Tips:\n• Always use biometric auth\n• Regular password updates\n• Enable auto-lock\n• Review privacy settings\n• Export data regularly\n\n📍 Location: Settings → Privacy & Security 🛡️`;
    }

    // General app usage
    return `📱 VectorFi App Guide\n\nYour complete financial companion!\n\n🚀 Getting Started:\n1. Dashboard: Check your financial overview\n2. Budget: Set up income and expenses\n3. Assets & Debts: Track your net worth\n4. Goals: Set financial targets\n5. AI Advisor: Get personalized advice\n\n💡 Pro Tips for Optimal Use:\n• Log transactions regularly for better insights\n• Connect bank accounts for automatic sync\n• Use the AI advisor for personalized guidance\n• Set up recurring transactions\n• Review your financial health monthly\n• Share finances with family for collaboration\n• Export data regularly for backup\n\n❓ Need Help With:\n• Specific features? Ask about them directly!\n• Financial advice? Use the AI advisor!\n• Technical issues? Check Settings → Help & Support\n• Premium features? Go to Settings → Subscription\n\n📍 Location: Available throughout the app 🌊🤙`;
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
        return `🚨 Budget Alert\n\nYour expenses ($${snapshot.monthlyExpenses.toFixed(
          2
        )}) are ${(
          (snapshot.monthlyExpenses / snapshot.monthlyIncome) *
          100
        ).toFixed(
          1
        )}% of your income. This is unsustainable.\n\n📋 Immediate Actions:\n1. Cut non-essential expenses by 20%\n2. Track every dollar spent\n3. Create a strict 50/30/20 budget\n4. Consider increasing income\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `✅ Good Budget Management\n\nYour expenses are well-controlled at ${(
          (snapshot.monthlyExpenses / snapshot.monthlyIncome) *
          100
        ).toFixed(1)}% of income.\n\n💰 Current Savings Rate: ${
          snapshot.savingsRate
        }%\n📋 Recommendations:\n1. Increase savings to 20% if possible\n2. Optimize recurring expenses\n3. Set specific financial goals\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
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
          return `🚨 High Debt-to-Income Alert\n\nYour debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which exceeds the recommended 43% limit.\n\n💰 Current Debt: $${snapshot.totalDebt.toFixed(
            2
          )}\n💳 Monthly Debt Payments: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n📊 Average Interest Rate: ${averageInterestRate.toFixed(
            2
          )}%\n\n📋 Priority Actions:\n1. Focus on highest interest rate debt first\n2. Consider debt consolidation to lower rates\n3. Increase income through side hustles\n4. Stop taking on new debt\n5. Create strict debt payoff plan\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
        } else if (debtToIncomeRatio > 28) {
          return `⚠️ Moderate Debt Load\n\nYour debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which is manageable but could be improved.\n\n💰 Current Debt: $${snapshot.totalDebt.toFixed(
            2
          )}\n💳 Monthly Debt Payments: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n📊 Average Interest Rate: ${averageInterestRate.toFixed(
            2
          )}%\n\n📋 Recommendations:\n1. Pay off highest interest debt first\n2. Consider refinancing high-rate loans\n3. Increase debt payoff rate if possible\n4. Build emergency fund\n5. Avoid new debt\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
        } else {
          return `✅ Healthy Debt Level\n\nYour debt-to-income ratio is ${debtToIncomeRatio.toFixed(
            1
          )}%, which is well within healthy limits.\n\n💰 Current Debt: $${snapshot.totalDebt.toFixed(
            2
          )}\n💳 Monthly Debt Payments: $${totalMonthlyDebtPayments.toFixed(
            2
          )}\n📊 Average Interest Rate: ${averageInterestRate.toFixed(
            2
          )}%\n\n📋 Recommendations:\n1. Continue current payoff strategy\n2. Consider accelerating payoff on high-rate debt\n3. Build emergency fund\n4. Start investing for long-term goals\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
        }
      } else {
        return `🎉 Debt-Free\n\nCongratulations! You're debt-free, which gives you excellent financial flexibility.\n\n📋 Recommendations:\n1. Build emergency fund (3-6 months)\n2. Increase savings rate\n3. Start investing for long-term goals\n4. Consider real estate investments\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
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
        return `❌ Cannot Afford Major Purchases\n\nYou're currently spending more than you earn.\n\n📊 Monthly Deficit: $${Math.abs(
          discretionaryIncome
        ).toFixed(
          2
        )}\n\n📋 Before Making Purchases:\n1. Fix your cash flow\n2. Build emergency fund\n3. Pay down debt\n4. Increase income\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `💰 Affordability Analysis\n\nYour monthly discretionary income is $${discretionaryIncome.toFixed(
          2
        )}.\n\n📋 For Major Purchases:\n1. Emergency fund first (3-6 months)\n2. Save up instead of financing\n3. Follow 50/30/20 rule\n4. Consider total cost of ownership\n\n❓ What are you considering buying?\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
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

        return `🛡️ Emergency Fund Status\n\nYou need $${emergencyFundTarget.toFixed(
          2
        )} (6 months of expenses).\n\n💰 Current: $${currentEmergencyFund.toFixed(
          2
        )} (${((currentEmergencyFund / emergencyFundTarget) * 100).toFixed(
          1
        )}%)\n📊 Shortfall: $${shortfall.toFixed(
          2
        )}\n\n📋 To Reach Target:\n• Save $${(shortfall / 12).toFixed(
          2
        )}/month for 1 year, or\n• Save $${(shortfall / 6).toFixed(
          2
        )}/month for 6 months\n\n🎯 Priority: Build this before other goals!\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
      } else {
        return `✅ Excellent Emergency Fund\n\nYou have $${currentEmergencyFund.toFixed(
          2
        )} saved, covering ${(
          currentEmergencyFund / snapshot.monthlyExpenses
        ).toFixed(
          1
        )} months of expenses.\n\n📋 Next Steps:\n1. Focus on debt payoff\n2. Increase investments\n3. Set bigger financial goals\n4. Consider insurance review\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}`;
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
        let planName = `Financial Plan - ${
          new Date().toISOString().split("T")[0]
        }`;

        // Customize plan name based on user's specific request
        if (lowerQuestion.includes("budget")) {
          planName = `Budget Plan - ${new Date().toISOString().split("T")[0]}`;
        } else if (
          lowerQuestion.includes("debt") ||
          lowerQuestion.includes("payoff")
        ) {
          planName = `Debt Payoff Plan - ${
            new Date().toISOString().split("T")[0]
          }`;
        } else if (
          lowerQuestion.includes("savings") ||
          lowerQuestion.includes("emergency")
        ) {
          planName = `Savings Plan - ${new Date().toISOString().split("T")[0]}`;
        } else if (
          lowerQuestion.includes("investment") ||
          lowerQuestion.includes("retirement")
        ) {
          planName = `Investment Plan - ${
            new Date().toISOString().split("T")[0]
          }`;
        } else if (lowerQuestion.includes("goal")) {
          planName = `Goal Achievement Plan - ${
            new Date().toISOString().split("T")[0]
          }`;
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
            ? (() => {
                try {
                  const targetDate = new Date(goal.targetDate);
                  const currentDate = new Date();
                  const timeDiff = targetDate.getTime() - currentDate.getTime();
                  const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * 30);
                  return Math.max(0, Math.ceil(monthsDiff));
                } catch (error) {
                  console.warn(
                    "Error calculating months to target in goal analysis:",
                    error
                  );
                  return 0;
                }
              })()
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

    // App-related questions
    if (
      lowerQuestion.includes("app") ||
      lowerQuestion.includes("vectorfi") ||
      lowerQuestion.includes("feature") ||
      lowerQuestion.includes("how to use") ||
      lowerQuestion.includes("where to find") ||
      lowerQuestion.includes("dashboard") ||
      lowerQuestion.includes("budget screen") ||
      lowerQuestion.includes("assets") ||
      lowerQuestion.includes("debts") ||
      lowerQuestion.includes("goals") ||
      lowerQuestion.includes("transactions") ||
      lowerQuestion.includes("shared finance") ||
      lowerQuestion.includes("ai advisor") ||
      lowerQuestion.includes("settings") ||
      lowerQuestion.includes("recurring") ||
      lowerQuestion.includes("bank") ||
      lowerQuestion.includes("plaid") ||
      lowerQuestion.includes("export") ||
      lowerQuestion.includes("premium") ||
      lowerQuestion.includes("subscription") ||
      lowerQuestion.includes("security") ||
      lowerQuestion.includes("biometric") ||
      lowerQuestion.includes("notifications")
    ) {
      return this.generateAppAdvice(userQuestion);
    }

    // Check if user is asking for a comprehensive overview or plan
    const questionLower = userQuestion.toLowerCase();
    const isAskingForPlan =
      questionLower.includes("plan") ||
      questionLower.includes("overview") ||
      questionLower.includes("summary") ||
      questionLower.includes("financial health") ||
      questionLower.includes("how am i doing") ||
      questionLower.includes("analysis") ||
      questionLower.includes("assessment");

    // If asking for comprehensive overview, provide it
    if (isAskingForPlan) {
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

      return `📊 Financial Overview\n\n💰 Monthly Income: $${snapshot.monthlyIncome.toFixed(
        2
      )}\n💸 Monthly Expenses: $${snapshot.monthlyExpenses.toFixed(
        2
      )}\n💵 Net Income: $${snapshot.netIncome.toFixed(2)}\n📈 Savings Rate: ${
        snapshot.savingsRate
      }%\n💎 Total Assets: $${snapshot.totalAssets.toFixed(
        2
      )}\n💳 Total Debt: $${snapshot.totalDebt.toFixed(
        2
      )}\n🏆 Net Worth: $${snapshot.netWorth.toFixed(
        2
      )}\n💳 Monthly Debt Payments: $${totalMonthlyDebtPayments.toFixed(
        2
      )}\n📊 Average Interest Rate: ${averageInterestRate.toFixed(
        2
      )}%\n📈 Debt-to-Income Ratio: ${debtToIncomeRatio.toFixed(
        1
      )}%\n🛡️ Emergency Fund: $${snapshot.totalSavings.toFixed(
        2
      )}\n🎯 Financial Goals: ${
        snapshot.goals.length
      } goals, ${overallGoalProgress.toFixed(
        1
      )}% complete, $${totalGoalContributions.toFixed(
        2
      )}/month\n\n📋 Top Recommendations:\n${analysis.priorityActions
        .map((action, index) => `${index + 1}. ${action}`)
        .join(
          "\n"
        )}\n\n💡 Your Financial Health: ${analysis.financialHealth.toUpperCase()}\n\n💡 Need a personalized plan? Try asking:\n• "Create a budget plan"\n• "Help me plan for debt payoff"\n• "Make a savings plan"\n• "Generate an investment plan"\n• "Create a goal plan"\n• "I need a financial plan"\n\nOr ask about specific topics like budgeting, debt, goals, investments, net worth, or goal feasibility!`;
    }

    // For specific questions, provide focused response
    return `I'd be happy to help with your specific question about "${userQuestion}"! 

To give you the most relevant advice, could you tell me more about what you'd like to know? For example:
• Are you asking about a specific financial area (budgeting, debt, goals, etc.)?
• Do you want advice on a particular purchase or decision?
• Are you looking for tips on improving a specific aspect of your finances?

Or if you'd like a comprehensive overview of your financial situation, just ask for a "financial overview" or "how am I doing financially"! 🌊🤙`;
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

    // Check if user is asking for a comprehensive overview or plan
    const lowerQuestion = userQuestion.toLowerCase();
    const isAskingForPlan =
      lowerQuestion.includes("plan") ||
      lowerQuestion.includes("overview") ||
      lowerQuestion.includes("summary") ||
      lowerQuestion.includes("financial health") ||
      lowerQuestion.includes("how am i doing") ||
      lowerQuestion.includes("analysis") ||
      lowerQuestion.includes("assessment");

    const responseType = isAskingForPlan
      ? "comprehensive analysis with full financial overview"
      : "focused answer addressing only the specific question asked";

    return `As a financial advisor, analyze this user's financial situation and answer their question: "${userQuestion}"

**IMPORTANT**: The user is asking for a ${responseType}. ${
      isAskingForPlan
        ? "Provide a comprehensive overview."
        : "ONLY address the specific question they asked. Do NOT give a comprehensive overview unless they specifically request it."
    }

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

**Response Guidelines:**
${
  isAskingForPlan
    ? `1. Provide comprehensive financial overview
2. Include all relevant metrics and ratios
3. Give detailed recommendations across all areas
4. Address overall financial health and goals
5. Provide actionable next steps for improvement`
    : `1. Answer ONLY the specific question asked
2. Focus on the relevant financial data for that question
3. Provide targeted, actionable advice for that specific area
4. Keep response concise and focused
5. Don't include comprehensive overview unless specifically requested`
}

Keep your response conversational, helpful, and appropriately detailed based on what they're asking. Use bullet points and clear formatting for readability.`;
  }
}

export const aiFinancialAdvisorService =
  AIFinancialAdvisorService.getInstance();
