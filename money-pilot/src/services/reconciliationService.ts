import { Transaction } from "./userData";

export interface ReconciliationMatch {
  expectedTransaction: Transaction;
  actualTransaction: Transaction;
  confidence: number; // 0-1, how confident we are in the match
  matchReason: string; // Why we think these match
}

export interface ReconciliationResult {
  matches: ReconciliationMatch[];
  unmatchedExpected: Transaction[];
  unmatchedActual: Transaction[];
  suggestions: string[];
}

export interface BudgetComparison {
  category: string;
  expected: number;
  actual: number;
  variance: number;
  percentage: number;
  status: "on_track" | "under_budget" | "over_budget" | "close_to_limit";
}

// Smart matching algorithm for reconciliation
export const findReconciliationMatches = (
  expectedTransactions: Transaction[],
  actualTransactions: Transaction[]
): ReconciliationResult => {
  const matches: ReconciliationMatch[] = [];
  const unmatchedExpected = [...expectedTransactions];
  const unmatchedActual = [...actualTransactions];

  // Sort by confidence - try exact matches first
  const potentialMatches: Array<{
    expected: Transaction;
    actual: Transaction;
    confidence: number;
    reason: string;
  }> = [];

  // Find all potential matches
  for (const expected of expectedTransactions) {
    for (const actual of actualTransactions) {
      const match = calculateMatchConfidence(expected, actual);
      if (match.confidence > 0.3) {
        // Only consider reasonable matches
        potentialMatches.push({
          expected,
          actual,
          confidence: match.confidence,
          reason: match.reason,
        });
      }
    }
  }

  // Sort by confidence (highest first)
  potentialMatches.sort((a, b) => b.confidence - a.confidence);

  // Process matches starting with highest confidence
  for (const match of potentialMatches) {
    const expectedIndex = unmatchedExpected.findIndex(
      (t) => t.id === match.expected.id
    );
    const actualIndex = unmatchedActual.findIndex(
      (t) => t.id === match.actual.id
    );

    // Only match if both transactions are still unmatched
    if (expectedIndex !== -1 && actualIndex !== -1) {
      matches.push({
        expectedTransaction: match.expected,
        actualTransaction: match.actual,
        confidence: match.confidence,
        matchReason: match.reason,
      });

      // Remove matched transactions from unmatched lists
      unmatchedExpected.splice(expectedIndex, 1);
      unmatchedActual.splice(actualIndex, 1);
    }
  }

  // Generate suggestions based on unmatched transactions
  const suggestions = generateSuggestions(unmatchedExpected, unmatchedActual);

  return {
    matches,
    unmatchedExpected,
    unmatchedActual,
    suggestions,
  };
};

// Calculate how well two transactions match
const calculateMatchConfidence = (
  expected: Transaction,
  actual: Transaction
): { confidence: number; reason: string } => {
  let confidence = 0;
  const reasons: string[] = [];

  // Type must match
  if (expected.type !== actual.type) {
    return { confidence: 0, reason: "Type mismatch" };
  }

  // Category matching (high weight)
  if (expected.category.toLowerCase() === actual.category.toLowerCase()) {
    confidence += 0.4;
    reasons.push("Same category");
  } else if (categoriesAreSimilar(expected.category, actual.category)) {
    confidence += 0.3;
    reasons.push("Similar category");
  }

  // Amount matching (high weight)
  const amountDiff = Math.abs(expected.amount - actual.amount);
  const amountTolerance = Math.max(expected.amount * 0.1, 1); // 10% tolerance or $1

  if (amountDiff <= amountTolerance) {
    confidence += 0.4;
    reasons.push("Amount matches");
  } else if (amountDiff <= amountTolerance * 2) {
    confidence += 0.2;
    reasons.push("Amount close");
  }

  // Date matching (medium weight)
  const dateDiff = Math.abs(expected.date - actual.date);
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (dateDiff <= oneDayMs) {
    confidence += 0.2;
    reasons.push("Date matches");
  } else if (dateDiff <= oneDayMs * 3) {
    confidence += 0.1;
    reasons.push("Date close");
  }

  // Description similarity (low weight)
  if (descriptionsAreSimilar(expected.description, actual.description)) {
    confidence += 0.1;
    reasons.push("Description similar");
  }

  return {
    confidence: Math.min(confidence, 1),
    reason: reasons.join(", "),
  };
};

// Check if categories are similar
const categoriesAreSimilar = (cat1: string, cat2: string): boolean => {
  const similarCategories = {
    food: ["groceries", "dining", "restaurant", "fast food"],
    groceries: ["food", "dining", "restaurant"],
    transportation: ["gas", "fuel", "uber", "lyft", "taxi"],
    gas: ["transportation", "fuel"],
    entertainment: ["movies", "shows", "concerts", "games"],
    shopping: ["clothing", "electronics", "home goods"],
  };

  const cat1Lower = cat1.toLowerCase();
  const cat2Lower = cat2.toLowerCase();

  if (cat1Lower === cat2Lower) return true;

  for (const [main, similar] of Object.entries(similarCategories)) {
    if (
      (cat1Lower === main && similar.includes(cat2Lower)) ||
      (cat2Lower === main && similar.includes(cat1Lower))
    ) {
      return true;
    }
  }

  return false;
};

// Check if descriptions are similar
const descriptionsAreSimilar = (desc1: string, desc2: string): boolean => {
  const desc1Lower = desc1.toLowerCase();
  const desc2Lower = desc2.toLowerCase();

  if (desc1Lower === desc2Lower) return true;
  if (desc1Lower.includes(desc2Lower) || desc2Lower.includes(desc1Lower))
    return true;

  // Check for common variations
  const variations = {
    salary: ["paycheck", "pay", "wages"],
    rent: ["rental", "housing"],
    utilities: ["electric", "water", "gas bill"],
    groceries: ["food", "supermarket", "market"],
  };

  for (const [main, similar] of Object.entries(variations)) {
    if (
      (desc1Lower.includes(main) &&
        similar.some((s) => desc2Lower.includes(s))) ||
      (desc2Lower.includes(main) && similar.some((s) => desc1Lower.includes(s)))
    ) {
      return true;
    }
  }

  return false;
};

// Generate helpful suggestions for users
const generateSuggestions = (
  unmatchedExpected: Transaction[],
  unmatchedActual: Transaction[]
): string[] => {
  const suggestions: string[] = [];

  if (unmatchedExpected.length > 0) {
    suggestions.push(
      `You have ${unmatchedExpected.length} expected transactions that haven't been matched yet`
    );
  }

  if (unmatchedActual.length > 0) {
    suggestions.push(
      `You have ${unmatchedActual.length} actual transactions that might need categorization`
    );
  }

  // Suggest creating expected transactions for recurring actual transactions
  const recurringActual = unmatchedActual.filter(
    (t) =>
      t.description.toLowerCase().includes("salary") ||
      t.description.toLowerCase().includes("paycheck") ||
      t.description.toLowerCase().includes("rent")
  );

  if (recurringActual.length > 0) {
    suggestions.push(
      `Consider creating expected transactions for recurring expenses like rent and salary`
    );
  }

  return suggestions;
};

// Calculate budget vs. actual comparison
export const calculateBudgetComparison = (
  expectedTransactions: Transaction[],
  actualTransactions: Transaction[]
): BudgetComparison[] => {
  const categoryMap = new Map<string, { expected: number; actual: number }>();

  // Sum up expected amounts by category (identified by description prefix "Expected:")
  for (const transaction of expectedTransactions) {
    if (transaction.description?.startsWith("Expected:")) {
      const current = categoryMap.get(transaction.category) || {
        expected: 0,
        actual: 0,
      };
      current.expected += transaction.amount;
      categoryMap.set(transaction.category, current);
    }
  }

  // Sum up actual amounts by category (anything that doesn't start with "Expected:")
  for (const transaction of actualTransactions) {
    if (!transaction.description?.startsWith("Expected:")) {
      const current = categoryMap.get(transaction.category) || {
        expected: 0,
        actual: 0,
      };
      current.actual += transaction.amount;
      categoryMap.set(transaction.category, current);
    }
  }

  // Convert to array and calculate variances
  return Array.from(categoryMap.entries()).map(([category, amounts]) => {
    const variance = amounts.actual - amounts.expected;
    const percentage =
      amounts.expected > 0 ? (amounts.actual / amounts.expected) * 100 : 0;

    let status: BudgetComparison["status"] = "on_track";
    if (percentage > 110) status = "over_budget";
    else if (percentage > 90) status = "close_to_limit";
    else if (percentage < 70) status = "under_budget";

    return {
      category,
      expected: amounts.expected,
      actual: amounts.actual,
      variance,
      percentage,
      status,
    };
  });
};

// Helper function to create expected transactions from recurring ones
export const createExpectedFromRecurring = (
  recurringTransactions: any[],
  month: string
): Transaction[] => {
  const expected: Transaction[] = [];

  for (const recurring of recurringTransactions) {
    if (!recurring.isActive) continue;

    // Calculate expected amount for the month
    let monthlyAmount = recurring.amount;

    switch (recurring.frequency) {
      case "weekly":
        monthlyAmount = recurring.amount * 4.33; // Average weeks per month
        break;
      case "biweekly":
        monthlyAmount = recurring.amount * 2.17; // Average biweekly periods per month
        break;
      case "monthly":
        monthlyAmount = recurring.amount;
        break;
      case "quarterly":
        monthlyAmount = recurring.amount / 3;
        break;
      case "yearly":
        monthlyAmount = recurring.amount / 12;
        break;
    }

    expected.push({
      amount: monthlyAmount,
      type: recurring.type,
      category: recurring.category,
      description: `Expected: ${recurring.name}`,
      date: new Date(month + "-01").getTime(),
      userId: recurring.userId,
      // Note: We're not adding transactionType, expectedAmount, isReconciled
      // since these fields are not saved in the actual transaction structure
    });
  }

  return expected;
};
