import { Alert } from "react-native";
import { ref, set, get, update } from "firebase/database";
import { db } from "./firebase";
import { encryptFields, decryptFields } from "./encryption";
import { getAuth } from "firebase/auth";

export interface PlaidAccountForImport {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balances: {
    available: number;
    current: number;
    limit?: number;
  };
}

export interface ImportedAsset {
  id: string;
  name: string;
  balance: number;
  type: "asset";
  category: string;
  source: "plaid";
  plaidAccountId: string;
  lastUpdated: string;
  isAutoImported: boolean;
  userId: string;
}

export interface ImportedDebt {
  id: string;
  name: string;
  balance: number;
  type: "debt";
  category: string;
  source: "plaid";
  plaidAccountId: string;
  lastUpdated: string;
  isAutoImported: boolean;
  userId: string;
  interestRate?: number;
  monthlyPayment?: number;
}

class PlaidAssetDebtImporter {
  private auth = getAuth();

  // Get current user ID
  private getUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  // Map Plaid account types to asset/debt categories
  private mapAccountToCategory(account: PlaidAccountForImport): {
    type: "asset" | "debt";
    category: string;
  } {
    const { type, subtype } = account;

    // Investment accounts = Assets
    if (
      type === "investment" ||
      ["401k", "ira", "brokerage", "cd", "mutual fund"].includes(subtype)
    ) {
      return { type: "asset", category: "investment" };
    }

    // Credit accounts = Debts
    if (type === "credit" && subtype === "credit card") {
      return { type: "debt", category: "credit card" };
    }

    // Loan accounts = Debts
    if (type === "loan") {
      return { type: "debt", category: "loan" };
    }

    // Depository accounts = Assets (but we might not want to auto-import these)
    if (type === "depository" && ["checking", "savings"].includes(subtype)) {
      return { type: "asset", category: "cash" };
    }

    // Default fallback
    return { type: "asset", category: "other" };
  }

  // Generate a unique ID for imported items
  private generateImportId(
    plaidAccountId: string,
    type: "asset" | "debt"
  ): string {
    return `plaid_${type}_${plaidAccountId}`;
  }

  // Check if an account should be auto-imported
  private shouldAutoImport(account: PlaidAccountForImport): boolean {
    const { type, subtype } = account;

    // Always import investment accounts
    if (
      type === "investment" ||
      ["401k", "ira", "brokerage", "cd", "mutual fund"].includes(subtype)
    ) {
      return true;
    }

    // Always import credit cards
    if (type === "credit" && subtype === "credit card") {
      return true;
    }

    // Always import loans
    if (type === "loan") {
      return true;
    }

    // Don't auto-import checking/savings by default (user can add manually)
    if (type === "depository" && ["checking", "savings"].includes(subtype)) {
      return false;
    }

    return false;
  }

  // Import assets and debts from Plaid accounts
  async importFromPlaidAccounts(
    plaidAccounts: PlaidAccountForImport[]
  ): Promise<{
    importedAssets: ImportedAsset[];
    importedDebts: ImportedDebt[];
    skippedAccounts: PlaidAccountForImport[];
  }> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const importedAssets: ImportedAsset[] = [];
    const importedDebts: ImportedDebt[] = [];
    const skippedAccounts: PlaidAccountForImport[] = [];

    for (const account of plaidAccounts) {
      if (!this.shouldAutoImport(account)) {
        skippedAccounts.push(account);
        continue;
      }

      const { type, category } = this.mapAccountToCategory(account);
      const importId = this.generateImportId(account.id, type);
      const now = new Date().toISOString();

      if (type === "asset") {
        const asset: ImportedAsset = {
          id: importId,
          name: account.name,
          balance: Math.abs(account.balances.current),
          type: "asset",
          category,
          source: "plaid",
          plaidAccountId: account.id,
          lastUpdated: now,
          isAutoImported: true,
          userId: userId,
        };

        importedAssets.push(asset);
        await this.saveAssetToFirebase(userId, asset);
      } else if (type === "debt") {
        const debt: ImportedDebt = {
          id: importId,
          name: account.name,
          balance: Math.abs(account.balances.current),
          type: "debt",
          category,
          source: "plaid",
          plaidAccountId: account.id,
          lastUpdated: now,
          isAutoImported: true,
          userId: userId,
        };

        // Add credit limit for credit cards
        if (category === "credit card" && account.balances.limit) {
          // We could store this as additional metadata
        }

        importedDebts.push(debt);
        await this.saveDebtToFirebase(userId, debt);
      }
    }

    return { importedAssets, importedDebts, skippedAccounts };
  }

  // Save asset to Firebase
  private async saveAssetToFirebase(
    userId: string,
    asset: ImportedAsset
  ): Promise<void> {
    try {
      const assetRef = ref(db, `users/${userId}/assets/${asset.id}`);
      await set(assetRef, asset);
      console.log(`✅ Asset imported: ${asset.name}`);
    } catch (error) {
      console.error(`❌ Error saving asset ${asset.name}:`, error);
      throw error;
    }
  }

  // Save debt to Firebase
  private async saveDebtToFirebase(
    userId: string,
    debt: ImportedDebt
  ): Promise<void> {
    try {
      const debtRef = ref(db, `users/${userId}/debts/${debt.id}`);
      await set(debtRef, debt);
      console.log(`✅ Debt imported: ${debt.name}`);
    } catch (error) {
      console.error(`❌ Error saving debt ${debt.name}:`, error);
      throw error;
    }
  }

  // Update existing imported assets/debts with new balances
  async updateImportedBalances(
    plaidAccounts: PlaidAccountForImport[]
  ): Promise<{
    updatedAssets: number;
    updatedDebts: number;
  }> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    let updatedAssets = 0;
    let updatedDebts = 0;

    for (const account of plaidAccounts) {
      if (!this.shouldAutoImport(account)) continue;

      const { type } = this.mapAccountToCategory(account);
      const importId = this.generateImportId(account.id, type);
      const now = new Date().toISOString();

      try {
        if (type === "asset") {
          const assetRef = ref(db, `users/${userId}/assets/${importId}`);
          await update(assetRef, {
            balance: Math.abs(account.balances.current),
            lastUpdated: now,
          });
          updatedAssets++;
        } else if (type === "debt") {
          const debtRef = ref(db, `users/${userId}/debts/${importId}`);
          await update(debtRef, {
            balance: Math.abs(account.balances.current),
            lastUpdated: now,
          });
          updatedDebts++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${type} ${account.name}:`, error);
      }
    }

    return { updatedAssets, updatedDebts };
  }

  // Remove auto-imported items that no longer exist in Plaid
  async removeOrphanedImports(plaidAccounts: PlaidAccountForImport[]): Promise<{
    removedAssets: number;
    removedDebts: number;
  }> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const plaidAccountIds = new Set(plaidAccounts.map((acc) => acc.id));
    let removedAssets = 0;
    let removedDebts = 0;

    try {
      // Check assets
      const assetsRef = ref(db, `users/${userId}/assets`);
      const assetsSnapshot = await get(assetsRef);

      if (assetsSnapshot.exists()) {
        const assets = assetsSnapshot.val();
        for (const [assetId, asset] of Object.entries(assets)) {
          if (
            asset.isAutoImported &&
            asset.plaidAccountId &&
            !plaidAccountIds.has(asset.plaidAccountId)
          ) {
            await set(ref(db, `users/${userId}/assets/${assetId}`), null);
            removedAssets++;
            console.log(`🗑️ Removed orphaned asset: ${asset.name}`);
          }
        }
      }

      // Check debts
      const debtsRef = ref(db, `users/${userId}/debts`);
      const debtsSnapshot = await get(debtsRef);

      if (debtsSnapshot.exists()) {
        const debts = debtsSnapshot.val();
        for (const [debtId, debt] of Object.entries(debts)) {
          if (
            debt.isAutoImported &&
            debt.plaidAccountId &&
            !plaidAccountIds.has(debt.plaidAccountId)
          ) {
            await set(ref(db, `users/${userId}/debts/${debtId}`), null);
            removedDebts++;
            console.log(`🗑️ Removed orphaned debt: ${debt.name}`);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error removing orphaned imports:", error);
    }

    return { removedAssets, removedDebts };
  }

  // Get import summary for user
  async getImportSummary(): Promise<{
    totalAssets: number;
    totalDebts: number;
    lastUpdated: string | null;
  }> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      const assetsRef = ref(db, `users/${userId}/assets`);
      const debtsRef = ref(db, `users/${userId}/debts`);

      const [assetsSnapshot, debtsSnapshot] = await Promise.all([
        get(assetsRef),
        get(debtsRef),
      ]);

      let totalAssets = 0;
      let totalDebts = 0;
      let lastUpdated: string | null = null;

      if (assetsSnapshot.exists()) {
        const assets = assetsSnapshot.val();
        totalAssets = Object.values(assets).filter(
          (asset: any) => asset.isAutoImported
        ).length;

        // Find most recent update
        Object.values(assets).forEach((asset: any) => {
          if (asset.isAutoImported && asset.lastUpdated) {
            if (!lastUpdated || asset.lastUpdated > lastUpdated) {
              lastUpdated = asset.lastUpdated;
            }
          }
        });
      }

      if (debtsSnapshot.exists()) {
        const debts = debtsSnapshot.val();
        totalDebts = Object.values(debts).filter(
          (debt: any) => debt.isAutoImported
        ).length;

        // Find most recent update
        Object.values(debts).forEach((debt: any) => {
          if (debt.isAutoImported && debt.lastUpdated) {
            if (!lastUpdated || debt.lastUpdated > lastUpdated) {
              lastUpdated = debt.lastUpdated;
            }
          }
        });
      }

      return { totalAssets, totalDebts, lastUpdated };
    } catch (error) {
      console.error("❌ Error getting import summary:", error);
      return { totalAssets: 0, totalDebts: 0, lastUpdated: null };
    }
  }
}

export const plaidAssetDebtImporter = new PlaidAssetDebtImporter();
