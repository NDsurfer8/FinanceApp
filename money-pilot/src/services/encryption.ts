import CryptoJS from "react-native-crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Encryption key management
const ENCRYPTION_KEY_STORAGE_KEY = "finance_app_encryption_key";

// Generate a secure encryption key
const generateEncryptionKey = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get or create encryption key
export const getEncryptionKey = async (): Promise<string> => {
  try {
    let key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
    if (!key) {
      key = generateEncryptionKey();
      await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, key);
    }
    return key;
  } catch (error) {
    console.error("Error getting encryption key:", error);
    throw new Error("Failed to get encryption key");
  }
};

// Encrypt a single value
export const encryptValue = async (value: any): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    const jsonString = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error("Error encrypting value:", error);
    throw new Error("Failed to encrypt value");
  }
};

// Decrypt a single value
export const decryptValue = async (encryptedValue: string): Promise<any> => {
  try {
    const key = await getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(encryptedValue, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    // Check if decryption resulted in empty string
    if (!jsonString || jsonString.trim() === "") {
      console.warn(
        "Decryption resulted in empty string, returning original value"
      );
      return encryptedValue; // Return original encrypted value as fallback
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decrypting value:", error);
    // Return the original encrypted value instead of throwing
    return encryptedValue;
  }
};

// Check if a value is encrypted
export const isEncrypted = (value: any): boolean => {
  if (typeof value !== "string") return false;
  // Encrypted values are typically long base64-like strings
  return value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value);
};

// Encrypt specific fields in a data object
export const encryptFields = async (
  data: any,
  fieldsToEncrypt: string[]
): Promise<any> => {
  // Check if encryption is enabled
  const { getEncryptionEnabled } = await import("./settings");
  const encryptionEnabled = await getEncryptionEnabled();

  if (!encryptionEnabled) {
    // If encryption is disabled, return data as-is
    return data;
  }

  const encryptedData = { ...data };

  for (const field of fieldsToEncrypt) {
    if (data[field] !== undefined && data[field] !== null) {
      // Store encrypted value in a separate field to maintain Firebase validation
      encryptedData[`${field}Encrypted`] = await encryptValue(data[field]);
      // Keep original field for Firebase validation
      encryptedData[field] = data[field];
    }
  }

  return encryptedData;
};

// Decrypt specific fields in a data object
export const decryptFields = async (
  data: any,
  fieldsToDecrypt: string[]
): Promise<any> => {
  // Check if encryption is enabled
  const { getEncryptionEnabled } = await import("./settings");
  const encryptionEnabled = await getEncryptionEnabled();

  if (!encryptionEnabled) {
    // If encryption is disabled, return data as-is
    return data;
  }

  const decryptedData = { ...data };

  for (const field of fieldsToDecrypt) {
    const encryptedField = `${field}Encrypted`;

    // Check if encrypted version exists
    if (data[encryptedField] !== undefined && data[encryptedField] !== null) {
      try {
        const decryptedValue = await decryptValue(data[encryptedField]);

        // If decryption failed and returned the original encrypted value,
        // use the original field value instead
        if (decryptedValue === data[encryptedField]) {
          console.warn(
            `Decryption failed for field ${field}, using original value`
          );
          decryptedData[field] = data[field];
        } else {
          decryptedData[field] = decryptedValue;
        }
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        // Keep original value if decryption fails
        decryptedData[field] = data[field];
      }
    } else {
      // No encrypted version, use original field
      decryptedData[field] = data[field];
    }
  }

  return decryptedData;
};

// Transaction encryption/decryption (income and expense)
export const encryptTransaction = async (transaction: any): Promise<any> => {
  const fieldsToEncrypt = ["description", "amount", "category"];
  return await encryptFields(transaction, fieldsToEncrypt);
};

export const decryptTransaction = async (transaction: any): Promise<any> => {
  const fieldsToDecrypt = ["description", "amount", "category"];
  return await decryptFields(transaction, fieldsToDecrypt);
};

// Asset encryption/decryption
export const encryptAsset = async (asset: any): Promise<any> => {
  const fieldsToEncrypt = ["name", "balance"];
  return await encryptFields(asset, fieldsToEncrypt);
};

export const decryptAsset = async (asset: any): Promise<any> => {
  const fieldsToDecrypt = ["name", "balance"];
  return await decryptFields(asset, fieldsToDecrypt);
};

// Debt encryption/decryption
export const encryptDebt = async (debt: any): Promise<any> => {
  const fieldsToEncrypt = ["name", "balance", "rate", "payment"];
  return await encryptFields(debt, fieldsToEncrypt);
};

export const decryptDebt = async (debt: any): Promise<any> => {
  const fieldsToDecrypt = ["name", "balance", "rate", "payment"];
  return await decryptFields(debt, fieldsToDecrypt);
};

// Goal encryption/decryption
export const encryptGoal = async (goal: any): Promise<any> => {
  const fieldsToEncrypt = [
    "name",
    "targetAmount",
    "currentAmount",
    "monthlyContribution",
    "category",
  ];
  return await encryptFields(goal, fieldsToEncrypt);
};

export const decryptGoal = async (goal: any): Promise<any> => {
  const fieldsToDecrypt = [
    "name",
    "targetAmount",
    "currentAmount",
    "monthlyContribution",
    "category",
  ];
  return await decryptFields(goal, fieldsToDecrypt);
};

// Recurring Transaction encryption/decryption
export const encryptRecurringTransaction = async (
  transaction: any
): Promise<any> => {
  const fieldsToEncrypt = ["name", "amount", "category"];
  return await encryptFields(transaction, fieldsToEncrypt);
};

export const decryptRecurringTransaction = async (
  transaction: any
): Promise<any> => {
  const fieldsToDecrypt = ["name", "amount", "category"];
  return await decryptFields(transaction, fieldsToDecrypt);
};

// Budget Settings encryption/decryption
export const encryptBudgetSettings = async (settings: any): Promise<any> => {
  const fieldsToEncrypt = ["savingsPercentage", "debtPayoffPercentage"];
  return await encryptFields(settings, fieldsToEncrypt);
};

export const decryptBudgetSettings = async (settings: any): Promise<any> => {
  const fieldsToDecrypt = ["savingsPercentage", "debtPayoffPercentage"];
  return await decryptFields(settings, fieldsToDecrypt);
};

// Emergency Fund encryption/decryption
export const encryptEmergencyFund = async (fund: any): Promise<any> => {
  const fieldsToEncrypt = [
    "currentBalance",
    "targetMonths",
    "monthlyContribution",
  ];
  return await encryptFields(fund, fieldsToEncrypt);
};

export const decryptEmergencyFund = async (fund: any): Promise<any> => {
  const fieldsToDecrypt = [
    "currentBalance",
    "targetMonths",
    "monthlyContribution",
  ];
  return await decryptFields(fund, fieldsToDecrypt);
};

// Batch operations for arrays
export const encryptTransactions = async (
  transactions: any[]
): Promise<any[]> => {
  return await Promise.all(
    transactions.map((transaction) => encryptTransaction(transaction))
  );
};

export const decryptTransactions = async (
  transactions: any[]
): Promise<any[]> => {
  return await Promise.all(
    transactions.map((transaction) => decryptTransaction(transaction))
  );
};

export const encryptAssets = async (assets: any[]): Promise<any[]> => {
  return await Promise.all(assets.map((asset) => encryptAsset(asset)));
};

export const decryptAssets = async (assets: any[]): Promise<any[]> => {
  return await Promise.all(assets.map((asset) => decryptAsset(asset)));
};

export const encryptDebts = async (debts: any[]): Promise<any[]> => {
  return await Promise.all(debts.map((debt) => encryptDebt(debt)));
};

export const decryptDebts = async (debts: any[]): Promise<any[]> => {
  return await Promise.all(debts.map((debt) => decryptDebt(debt)));
};

export const encryptGoals = async (goals: any[]): Promise<any[]> => {
  return await Promise.all(goals.map((goal) => encryptGoal(goal)));
};

export const decryptGoals = async (goals: any[]): Promise<any[]> => {
  return await Promise.all(goals.map((goal) => decryptGoal(goal)));
};

// ===== FINANCIAL PLAN ENCRYPTION =====

export const encryptFinancialPlan = async (plan: any): Promise<any> => {
  try {
    const key = await getEncryptionKey();
    const planDataString = JSON.stringify(plan.planData);
    const csvDataString = plan.csvData;

    const encryptedPlanData = CryptoJS.AES.encrypt(
      planDataString,
      key
    ).toString();
    const encryptedCsvData = CryptoJS.AES.encrypt(
      csvDataString,
      key
    ).toString();

    return {
      ...plan,
      planData: encryptedPlanData,
      csvData: encryptedCsvData,
    };
  } catch (error) {
    console.error("Error encrypting financial plan:", error);
    return plan;
  }
};

export const decryptFinancialPlan = async (plan: any): Promise<any> => {
  try {
    const key = await getEncryptionKey();

    if (typeof plan.planData === "string") {
      const decryptedPlanData = CryptoJS.AES.decrypt(
        plan.planData,
        key
      ).toString(CryptoJS.enc.Utf8);
      plan.planData = JSON.parse(decryptedPlanData);
    }

    if (typeof plan.csvData === "string") {
      const decryptedCsvData = CryptoJS.AES.decrypt(plan.csvData, key).toString(
        CryptoJS.enc.Utf8
      );
      plan.csvData = decryptedCsvData;
    }

    return plan;
  } catch (error) {
    console.error("Error decrypting financial plan:", error);
    return plan;
  }
};

export const encryptRecurringTransactions = async (
  transactions: any[]
): Promise<any[]> => {
  return await Promise.all(
    transactions.map((transaction) => encryptRecurringTransaction(transaction))
  );
};

export const decryptRecurringTransactions = async (
  transactions: any[]
): Promise<any[]> => {
  return await Promise.all(
    transactions.map((transaction) => decryptRecurringTransaction(transaction))
  );
};

// Reset encryption key (use this if you're having decryption issues)
export const resetEncryptionKey = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE_KEY);
    console.log("Encryption key reset successfully");
  } catch (error) {
    console.error("Error resetting encryption key:", error);
  }
};
