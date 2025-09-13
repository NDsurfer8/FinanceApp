// Enhanced mapping of Plaid's categories to our budget categories
export const mapPlaidCategoryToBudgetCategory = (
  plaidCategory: string
): string => {
  const category = plaidCategory.toUpperCase();

  // Food & Dining - Handle both primary and detailed categories
  if (category === "FOOD_AND_DRINK" || category.startsWith("FOOD_AND_DRINK_")) {
    return "Food";
  }

  // Transportation - Handle both primary and detailed categories
  if (category === "TRANSPORTATION" || category.startsWith("TRANSPORTATION_")) {
    return "Transportation";
  }

  // Shopping & Merchandise - Handle both primary and detailed categories
  if (
    category === "SHOPPING" ||
    category === "GENERAL_MERCHANDISE" ||
    category.startsWith("GENERAL_MERCHANDISE_")
  ) {
    return "Shopping";
  }

  // Home & Utilities - More specific mapping
  if (category === "HOME_IMPROVEMENT") {
    return "Utilities";
  }
  if (
    category === "GENERAL_SERVICES" ||
    category.startsWith("GENERAL_SERVICES_")
  ) {
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

  // Income (for income transactions) - Handle both primary and detailed categories
  if (category === "INCOME" || category.startsWith("INCOME_")) {
    return "Salary";
  }

  // Transfer and Loan categories
  if (category === "TRANSFER_IN") {
    return "Other Income";
  }
  if (category === "TRANSFER_OUT" || category.startsWith("TRANSFER_OUT_")) {
    return "Other Expenses";
  }

  if (category === "LOAN_PAYMENTS" || category.startsWith("LOAN_PAYMENTS_")) {
    return "Credit Card";
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

  // Rent and Housing - Handle both primary and detailed categories
  if (
    category === "RENT_AND_UTILITIES" ||
    category === "RENT" ||
    category.startsWith("RENT_AND_UTILITIES_")
  ) {
    return "Rent";
  }

  // Car Payment and Automotive
  if (category === "AUTOMOTIVE" || category === "AUTO_LOAN") {
    return "Car Payment";
  }

  // Insurance - Handle both primary and detailed categories
  if (
    category === "INSURANCE" ||
    category.startsWith("GENERAL_SERVICES_INSURANCE")
  ) {
    return "Insurance";
  }

  // Internet and Telecom - Handle both primary and detailed categories
  if (
    category === "TELECOM" ||
    category === "INTERNET" ||
    category.startsWith("RENT_AND_UTILITIES_INTERNET") ||
    category.startsWith("RENT_AND_UTILITIES_CABLE")
  ) {
    return "Internet";
  }

  // Phone specifically
  if (category === "MOBILE_PHONE" || category === "CELL_PHONE") {
    return "Phone";
  }

  // Subscriptions and recurring services - Handle both primary and detailed categories
  if (
    category === "SUBSCRIPTION" ||
    category === "RECURRING_SUBSCRIPTION" ||
    category.startsWith("SUBSCRIPTION_") ||
    category.startsWith("RECURRING_SUBSCRIPTION_")
  ) {
    return "Subscriptions";
  }

  // Credit Card payments
  if (category === "CREDIT_CARD_PAYMENT" || category === "CREDIT_CARD") {
    return "Credit Card";
  }

  // Default to "Other Expenses" if no match found
  return "Other Expenses";
};
