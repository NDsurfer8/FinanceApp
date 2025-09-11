import { Transaction } from "../services/userData";

export interface TransactionSource {
  id: string;
  name: string;
  type: "manual" | "auto-imported" | "account";
  accountId?: string;
  institution?: string;
}

/**
 * Gets unique transaction sources for filtering
 * @param transactions - Array of transactions
 * @returns Array of unique sources including manual entries and auto-imported accounts
 */
export function getUniqueTransactionSources(
  transactions: Transaction[]
): TransactionSource[] {
  const sources: TransactionSource[] = [];
  const seenAccounts = new Set<string>();

  // Always include manual entries option
  sources.push({
    id: "manual",
    name: "Manual Entries",
    type: "manual",
  });

  // Always include auto-imported option (if any auto-imported transactions exist)
  const hasAutoImported = transactions.some((t) => t.isAutoImported);
  if (hasAutoImported) {
    sources.push({
      id: "auto-imported",
      name: "Auto Imported",
      type: "auto-imported",
    });
  }

  // Add individual institutions (grouped by bank name)
  const institutionMap = new Map<string, Set<string>>();

  transactions.forEach((transaction) => {
    if (
      transaction.isAutoImported &&
      transaction.sourceAccountId &&
      transaction.sourceInstitution
    ) {
      if (!institutionMap.has(transaction.sourceInstitution)) {
        institutionMap.set(transaction.sourceInstitution, new Set());
      }
      institutionMap
        .get(transaction.sourceInstitution)!
        .add(transaction.sourceAccountId);
    }
  });

  // Create source entries for each institution
  institutionMap.forEach((accountIds, institution) => {
    const accountCount = accountIds.size;
    const displayName =
      accountCount > 1
        ? `${institution} (${accountCount} accounts)`
        : institution;

    sources.push({
      id: institution,
      name: displayName,
      type: "account",
      institution: institution,
    });
  });

  return sources;
}

/**
 * Filters transactions by source
 * @param transactions - Array of transactions to filter
 * @param sourceId - Source ID to filter by
 * @returns Filtered array of transactions
 */
export function filterTransactionsBySource(
  transactions: Transaction[],
  sourceId: string
): Transaction[] {
  if (sourceId === "manual") {
    return transactions.filter((t) => !t.isAutoImported);
  }

  if (sourceId === "auto-imported") {
    return transactions.filter((t) => t.isAutoImported);
  }

  // Filter by specific institution
  return transactions.filter((t) => {
    if (!t.isAutoImported || !t.sourceInstitution) {
      return false;
    }
    return t.sourceInstitution === sourceId;
  });
}

/**
 * Gets the display name for a transaction source
 * @param source - Transaction source
 * @returns Display name for the source
 */
export function getTransactionSourceDisplayName(
  source: TransactionSource
): string {
  switch (source.type) {
    case "manual":
      return "Manual Entries";
    case "auto-imported":
      return "Auto Imported";
    case "account":
      return source.name;
    default:
      return source.name;
  }
}
