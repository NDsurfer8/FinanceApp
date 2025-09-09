// Enhanced mapping of Plaid's categories to our budget categories
export const mapPlaidCategoryToBudgetCategory = (
  plaidCategory: string
): string => {
  const category = plaidCategory.toUpperCase();

  // Food & Dining
  if (category === "FOOD_AND_DRINK") {
    return "Food";
  }

  // Transportation
  if (category === "TRANSPORTATION") {
    return "Transportation";
  }

  // Shopping & Merchandise
  if (category === "SHOPPING" || category === "GENERAL_MERCHANDISE") {
    return "Shopping";
  }

  // Home & Utilities - More specific mapping
  if (category === "HOME_IMPROVEMENT") {
    return "Utilities";
  }
  if (category === "GENERAL_SERVICES") {
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

  // Business & Professional - Better mapping
  if (category === "EDUCATION") {
    return "Business";
  }

  // Income (for income transactions)
  if (category === "INCOME") {
    return "Salary";
  }

  // Transfer and Loan categories
  if (category === "TRANSFER_IN") {
    return "Other Income";
  }
  if (category === "TRANSFER_OUT") {
    return "Other Expenses";
  }

  if (category === "LOAN_PAYMENTS") {
    return "Loan Payment";
  }

  if (category === "BANK_FEES") {
    return "Other Expenses";
  }

  // Personal Care - Better categorization
  if (category === "PERSONAL_CARE") {
    return "Health"; // Personal care often relates to health/wellness
  }

  // Travel - Better categorization
  if (category === "TRAVEL") {
    return "Transportation"; // Travel is often transportation-related
  }

  // Financial Services
  if (category === "FINANCIAL_SERVICES") {
    return "Other Expenses";
  }

  // Government & Non-Profit
  if (category === "GOVERNMENT_AND_NON_PROFIT") {
    return "Other Expenses";
  }

  // Recreation & Sports
  if (category === "RECREATION") {
    return "Entertainment";
  }

  // Service
  if (category === "SERVICE") {
    return "Utilities";
  }

  // Default to "Other Expenses" if no match found
  return "Other Expenses";
};
