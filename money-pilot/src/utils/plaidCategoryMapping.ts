// Map Plaid's new 16 primary categories to our budget categories
export const mapPlaidCategoryToBudgetCategory = (plaidCategory: string): string => {
  const category = plaidCategory.toUpperCase();

  // Food & Dining
  if (category === "FOOD_AND_DRINK") {
    return "Food";
  }

  // Transportation
  if (category === "TRANSPORTATION") {
    return "Transportation";
  }

  // Shopping
  if (category === "SHOPPING" || category === "GENERAL_MERCHANDISE") {
    return "Shopping";
  }

  // Home & Utilities
  if (category === "HOME_IMPROVEMENT" || category === "GENERAL_SERVICES") {
    return "Utilities";
  }

  // Entertainment
  if (category === "ENTERTAINMENT") {
    return "Entertainment";
  }

  // Health & Fitness
  if (category === "HEALTHCARE") {
    return "Health";
  }

  // Business & Professional
  if (category === "EDUCATION") {
    return "Business";
  }

  // Income (for income transactions)
  if (category === "INCOME") {
    return "Salary"; // Default to Salary for income
  }

  // Transfer and Loan categories
  if (category === "TRANSFER_IN" || category === "TRANSFER_OUT") {
    return "Other Income"; // For transfers
  }

  if (category === "LOAN_PAYMENTS") {
    return "Loan Payment";
  }

  if (category === "BANK_FEES") {
    return "Other Expenses";
  }

  // Personal Care
  if (category === "PERSONAL_CARE") {
    return "Other Expenses";
  }

  // Travel
  if (category === "TRAVEL") {
    return "Other Expenses";
  }

  // Default to "Other Expenses" if no match found
  return "Other Expenses";
};
