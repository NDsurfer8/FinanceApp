import { FinancialSnapshot } from "./aiFinancialAdvisor";

export interface FinancialPlan {
  id?: string;
  userId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  planData: PlanData;
  csvData: string;
}

export interface PlanData {
  monthlyBudget: MonthlyBudgetPlan;
  debtPayoffPlan: DebtPayoffPlan;
  savingsPlan: SavingsPlan;
  goalTimeline: GoalTimelinePlan;
  recommendations: string[];
}

export interface MonthlyBudgetPlan {
  income: number;
  expenses: number;
  savings: number;
  debtPayoff: number;
  discretionary: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface DebtPayoffPlan {
  totalDebt: number;
  monthlyPayment: number;
  estimatedPayoffDate: string;
  strategy: "avalanche" | "snowball";
  priorityOrder: {
    name: string;
    balance: number;
    rate: number;
    monthlyPayment: number;
    payoffOrder: number;
  }[];
}

export interface SavingsPlan {
  emergencyFund: {
    current: number;
    target: number;
    monthlyContribution: number;
    monthsToTarget: number;
  };
  retirement: {
    monthlyContribution: number;
    targetPercentage: number;
  };
  otherSavings: {
    monthlyContribution: number;
    purpose: string;
  };
}

export interface GoalTimelinePlan {
  goals: {
    name: string;
    currentAmount: number;
    targetAmount: number;
    monthlyContribution: number;
    targetDate: string;
    estimatedCompletionDate: string;
    onTrack: boolean;
  }[];
}

class FinancialPlanGenerator {
  private static instance: FinancialPlanGenerator;

  static getInstance(): FinancialPlanGenerator {
    if (!FinancialPlanGenerator.instance) {
      FinancialPlanGenerator.instance = new FinancialPlanGenerator();
    }
    return FinancialPlanGenerator.instance;
  }

  generateFinancialPlan(
    snapshot: FinancialSnapshot,
    planName: string,
    userId: string
  ): FinancialPlan {
    try {
      const planData = this.analyzeFinancialData(snapshot);
      const csvData = this.generateCSV(planData, snapshot);

      return {
        userId,
        name: planName,
        description: `Financial plan generated on ${
          new Date().toISOString().split("T")[0]
        }`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        planData,
        csvData,
      };
    } catch (error) {
      console.error("Error in generateFinancialPlan:", error);
      // Return a minimal plan if generation fails
      return {
        userId,
        name: planName,
        description: "Financial plan (generated with errors)",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        planData: {
          monthlyBudget: {
            income: snapshot.monthlyIncome,
            expenses: snapshot.monthlyExpenses,
            savings: 0,
            debtPayoff: 0,
            discretionary: 0,
            breakdown: [],
          },
          debtPayoffPlan: {
            totalDebt: snapshot.totalDebt,
            monthlyPayment: 0,
            estimatedPayoffDate: new Date().toISOString().split("T")[0],
            strategy: "avalanche",
            priorityOrder: [],
          },
          savingsPlan: {
            emergencyFund: {
              current: 0,
              target: 0,
              monthlyContribution: 0,
              monthsToTarget: 0,
            },
            retirement: { monthlyContribution: 0, targetPercentage: 0 },
            otherSavings: {
              monthlyContribution: 0,
              purpose: "Error in generation",
            },
          },
          goalTimeline: { goals: [] },
          recommendations: ["Error occurred during plan generation"],
        },
        csvData: "Error generating CSV data",
      };
    }
  }

  private analyzeFinancialData(snapshot: FinancialSnapshot): PlanData {
    // Monthly Budget Plan
    const monthlyBudget = this.generateMonthlyBudgetPlan(snapshot);

    // Debt Payoff Plan
    const debtPayoffPlan = this.generateDebtPayoffPlan(snapshot);

    // Savings Plan
    const savingsPlan = this.generateSavingsPlan(snapshot);

    // Goal Timeline Plan
    const goalTimeline = this.generateGoalTimelinePlan(snapshot);

    // Recommendations
    const recommendations = this.generateRecommendations(snapshot);

    return {
      monthlyBudget,
      debtPayoffPlan,
      savingsPlan,
      goalTimeline,
      recommendations,
    };
  }

  private generateMonthlyBudgetPlan(
    snapshot: FinancialSnapshot
  ): MonthlyBudgetPlan {
    const savingsAmount = (snapshot.monthlyIncome * snapshot.savingsRate) / 100;
    const debtPayoffAmount =
      (snapshot.monthlyIncome * snapshot.debtPayoffRate) / 100;
    const discretionary =
      snapshot.monthlyIncome -
      snapshot.monthlyExpenses -
      savingsAmount -
      debtPayoffAmount;

    const breakdown = [
      { category: "Income", amount: snapshot.monthlyIncome, percentage: 100 },
      {
        category: "Expenses",
        amount: snapshot.monthlyExpenses,
        percentage: (snapshot.monthlyExpenses / snapshot.monthlyIncome) * 100,
      },
      {
        category: "Savings",
        amount: savingsAmount,
        percentage: snapshot.savingsRate,
      },
      {
        category: "Debt Payoff",
        amount: debtPayoffAmount,
        percentage: snapshot.debtPayoffRate,
      },
      {
        category: "Discretionary",
        amount: discretionary,
        percentage: (discretionary / snapshot.monthlyIncome) * 100,
      },
    ];

    return {
      income: snapshot.monthlyIncome,
      expenses: snapshot.monthlyExpenses,
      savings: savingsAmount,
      debtPayoff: debtPayoffAmount,
      discretionary,
      breakdown,
    };
  }

  private generateDebtPayoffPlan(snapshot: FinancialSnapshot): DebtPayoffPlan {
    const totalMonthlyPayments = snapshot.debts.reduce(
      (sum, debt) => sum + debt.payment,
      0
    );

    // Sort debts by interest rate (avalanche method)
    const priorityOrder = snapshot.debts
      .map((debt, index) => ({
        name: debt.name,
        balance: debt.balance,
        rate: debt.rate,
        monthlyPayment: debt.payment,
        payoffOrder: index + 1,
      }))
      .sort((a, b) => b.rate - a.rate);

    // Estimate payoff date (simplified calculation)
    const totalDebt = snapshot.totalDebt;
    const monthlyPayment = totalMonthlyPayments;
    const estimatedPayoffDate = new Date();

    // Use a safer date calculation method to avoid "Date value out of bounds" errors
    try {
      // Handle case where monthlyPayment is 0 (no debt payments)
      if (monthlyPayment <= 0 || totalDebt <= 0) {
        // No debt to pay off
        estimatedPayoffDate.setFullYear(estimatedPayoffDate.getFullYear() + 1);
      } else {
        const estimatedMonths = totalDebt / monthlyPayment;
        const monthsToAdd = Math.ceil(estimatedMonths);

        // Limit to a reasonable number of months to prevent invalid dates
        const safeMonthsToAdd = Math.min(monthsToAdd, 1200); // 100 years max

        estimatedPayoffDate.setTime(
          estimatedPayoffDate.getTime() +
            safeMonthsToAdd * 30 * 24 * 60 * 60 * 1000
        );
      }
    } catch (error) {
      console.warn("Error calculating debt payoff date:", error);
      // Fallback: set to 5 years from now
      estimatedPayoffDate.setFullYear(estimatedPayoffDate.getFullYear() + 5);
    }

    return {
      totalDebt,
      monthlyPayment,
      estimatedPayoffDate: estimatedPayoffDate.toISOString().split("T")[0],
      strategy: "avalanche",
      priorityOrder,
    };
  }

  private generateSavingsPlan(snapshot: FinancialSnapshot): SavingsPlan {
    const emergencyFundTarget = snapshot.monthlyExpenses * 6;
    const currentEmergencyFund = snapshot.totalSavings;

    // Handle edge case where emergency fund target is already met
    const emergencyFundMonthly =
      currentEmergencyFund >= emergencyFundTarget
        ? 0
        : (emergencyFundTarget - currentEmergencyFund) / 12;

    const retirementContribution =
      ((snapshot.monthlyIncome * snapshot.savingsRate) / 100) * 0.6; // 60% of savings to retirement
    const otherSavings =
      ((snapshot.monthlyIncome * snapshot.savingsRate) / 100) * 0.4; // 40% to other goals

    return {
      emergencyFund: {
        current: currentEmergencyFund,
        target: emergencyFundTarget,
        monthlyContribution: Math.max(0, emergencyFundMonthly),
        monthsToTarget: currentEmergencyFund >= emergencyFundTarget ? 0 : 12,
      },
      retirement: {
        monthlyContribution: retirementContribution,
        targetPercentage: snapshot.savingsRate * 0.6,
      },
      otherSavings: {
        monthlyContribution: otherSavings,
        purpose: "Goals and discretionary savings",
      },
    };
  }

  private generateGoalTimelinePlan(
    snapshot: FinancialSnapshot
  ): GoalTimelinePlan {
    const goals = snapshot.goals.map((goal) => {
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
              console.warn("Error calculating months to target:", error);
              return 0;
            }
          })()
        : 0;
      const monthlyNeeded =
        monthsToTarget > 0
          ? (goal.targetAmount - goal.currentAmount) / monthsToTarget
          : goal.monthlyContribution;
      const onTrack =
        goal.monthlyContribution > 0
          ? monthlyNeeded <= goal.monthlyContribution * 1.2
          : false;

      const estimatedCompletionDate = new Date();
      if (monthlyNeeded > 0 && goal.monthlyContribution > 0) {
        const monthsToComplete =
          (goal.targetAmount - goal.currentAmount) / goal.monthlyContribution;

        // Use a safer date calculation method to avoid "Date value out of bounds" errors
        try {
          const monthsToAdd = Math.ceil(monthsToComplete);
          // Limit to a reasonable number of months to prevent invalid dates
          const safeMonthsToAdd = Math.min(monthsToAdd, 1200); // 100 years max

          estimatedCompletionDate.setTime(
            estimatedCompletionDate.getTime() +
              safeMonthsToAdd * 30 * 24 * 60 * 60 * 1000
          );
        } catch (error) {
          console.warn("Error calculating estimated completion date:", error);
          // Fallback: set to 1 year from now
          estimatedCompletionDate.setFullYear(
            estimatedCompletionDate.getFullYear() + 1
          );
        }
      }

      return {
        name: goal.name,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        monthlyContribution: goal.monthlyContribution,
        targetDate: goal.targetDate,
        estimatedCompletionDate: estimatedCompletionDate
          .toISOString()
          .split("T")[0],
        onTrack,
      };
    });

    return { goals };
  }

  private generateRecommendations(snapshot: FinancialSnapshot): string[] {
    const recommendations = [];

    // Emergency fund recommendations
    const emergencyFundTarget = snapshot.monthlyExpenses * 6;
    if (snapshot.totalSavings < emergencyFundTarget) {
      recommendations.push(
        `Build emergency fund to $${emergencyFundTarget.toFixed(
          2
        )} (currently $${snapshot.totalSavings.toFixed(2)})`
      );
    }

    // Debt recommendations
    if (snapshot.totalDebt > 0) {
      const totalMonthlyPayments = snapshot.debts.reduce(
        (sum, debt) => sum + debt.payment,
        0
      );
      const debtToIncomeRatio =
        (totalMonthlyPayments / snapshot.monthlyIncome) * 100;

      if (debtToIncomeRatio > 43) {
        recommendations.push(
          "Focus on debt reduction - debt-to-income ratio exceeds 43%"
        );
      } else if (debtToIncomeRatio > 28) {
        recommendations.push(
          "Consider accelerating debt payoff to improve financial health"
        );
      }
    }

    // Savings recommendations
    if (snapshot.savingsRate < 20) {
      recommendations.push("Increase savings rate to at least 20% of income");
    }

    // Goal recommendations
    if (snapshot.goals.length === 0) {
      recommendations.push("Set specific financial goals to stay motivated");
    } else {
      const totalMonthlyContributions = snapshot.goals.reduce(
        (sum, goal) => sum + goal.monthlyContribution,
        0
      );
      const availableForGoals =
        snapshot.monthlyIncome -
        snapshot.monthlyExpenses -
        (snapshot.monthlyIncome * snapshot.savingsRate) / 100;

      if (totalMonthlyContributions > availableForGoals) {
        recommendations.push("Review goal contributions - may be overextended");
      }
    }

    return recommendations;
  }

  private generateCSV(planData: PlanData, snapshot: FinancialSnapshot): string {
    const csvRows = [];

    // Header
    csvRows.push("Financial Plan Generated by VectorFi AI");
    csvRows.push(`Generated on: ${new Date().toLocaleDateString()}`);
    csvRows.push("");

    // Monthly Budget
    csvRows.push("MONTHLY BUDGET BREAKDOWN");
    csvRows.push("Category,Amount,Percentage");
    planData.monthlyBudget.breakdown.forEach((item) => {
      csvRows.push(
        `${item.category},$${item.amount.toFixed(2)},${item.percentage.toFixed(
          1
        )}%`
      );
    });
    csvRows.push("");

    // Debt Payoff Plan
    csvRows.push("DEBT PAYOFF PLAN");
    csvRows.push(
      "Debt Name,Balance,Interest Rate,Monthly Payment,Payoff Order"
    );
    planData.debtPayoffPlan.priorityOrder.forEach((debt) => {
      csvRows.push(
        `${debt.name},$${debt.balance.toFixed(2)},${
          debt.rate
        }%,$${debt.monthlyPayment.toFixed(2)},${debt.payoffOrder}`
      );
    });
    csvRows.push(
      `Total Debt,$${planData.debtPayoffPlan.totalDebt.toFixed(
        2
      )},,$${planData.debtPayoffPlan.monthlyPayment.toFixed(2)},`
    );
    csvRows.push(
      `Estimated Payoff Date,${planData.debtPayoffPlan.estimatedPayoffDate},,,`
    );
    csvRows.push("");

    // Savings Plan
    csvRows.push("SAVINGS PLAN");
    csvRows.push("Type,Current,Target,Monthly Contribution,Months to Target");
    csvRows.push(
      `Emergency Fund,$${planData.savingsPlan.emergencyFund.current.toFixed(
        2
      )},$${planData.savingsPlan.emergencyFund.target.toFixed(
        2
      )},$${planData.savingsPlan.emergencyFund.monthlyContribution.toFixed(
        2
      )},${planData.savingsPlan.emergencyFund.monthsToTarget}`
    );
    csvRows.push(
      `Retirement,$${snapshot.totalSavings.toFixed(
        2
      )},N/A,$${planData.savingsPlan.retirement.monthlyContribution.toFixed(
        2
      )},N/A`
    );
    csvRows.push(
      `Other Savings,$${snapshot.totalSavings.toFixed(
        2
      )},N/A,$${planData.savingsPlan.otherSavings.monthlyContribution.toFixed(
        2
      )},N/A`
    );
    csvRows.push("");

    // Goal Timeline
    csvRows.push("GOAL TIMELINE");
    csvRows.push(
      "Goal Name,Current Amount,Target Amount,Monthly Contribution,Target Date,Estimated Completion,On Track"
    );
    planData.goalTimeline.goals.forEach((goal) => {
      csvRows.push(
        `${goal.name},$${goal.currentAmount.toFixed(
          2
        )},$${goal.targetAmount.toFixed(2)},$${goal.monthlyContribution.toFixed(
          2
        )},${goal.targetDate},${goal.estimatedCompletionDate},${
          goal.onTrack ? "Yes" : "No"
        }`
      );
    });
    csvRows.push("");

    // Recommendations
    csvRows.push("RECOMMENDATIONS");
    planData.recommendations.forEach((rec, index) => {
      csvRows.push(`${index + 1}. ${rec}`);
    });

    return csvRows.join("\n");
  }
}

export const financialPlanGenerator = FinancialPlanGenerator.getInstance();
