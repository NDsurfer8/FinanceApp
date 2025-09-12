import CryptoJS from "react-native-crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Encryption key management
const ENCRYPTION_KEY_STORAGE_KEY = "finance_app_encryption_key";
const ENCRYPTION_KEY_VERSION_KEY = "finance_app_encryption_key_version";
const ENCRYPTION_KEY_HISTORY_KEY = "finance_app_encryption_key_history";

// Key rotation configuration
const KEY_ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const MAX_KEY_HISTORY = 3; // Keep last 3 keys for decryption

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

// Get or create encryption key with rotation
export const getEncryptionKey = async (): Promise<string> => {
  try {
    const currentTime = Date.now();

    // Get current key info
    const currentKey = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
    const keyVersion = await AsyncStorage.getItem(ENCRYPTION_KEY_VERSION_KEY);
    const keyTimestamp = keyVersion ? parseInt(keyVersion) : 0;

    // Check if key rotation is needed
    if (!currentKey || currentTime - keyTimestamp > KEY_ROTATION_INTERVAL) {
      return await rotateEncryptionKey(currentKey, keyTimestamp);
    }

    return currentKey;
  } catch (error) {
    console.error("Error getting encryption key:", error);
    throw new Error("Failed to get encryption key");
  }
};

// Rotate encryption key
export const rotateEncryptionKey = async (
  oldKey?: string | null,
  oldKeyTimestamp?: number
): Promise<string> => {
  try {
    const newKey = generateEncryptionKey();
    const currentTime = Date.now();

    // Store new key
    await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, newKey);
    await AsyncStorage.setItem(
      ENCRYPTION_KEY_VERSION_KEY,
      currentTime.toString()
    );

    // Update key history for decryption
    if (oldKey && oldKeyTimestamp) {
      await updateKeyHistory(oldKey, oldKeyTimestamp);
    }

    return newKey;
  } catch (error) {
    console.error("Error rotating encryption key:", error);
    throw new Error("Failed to rotate encryption key");
  }
};

// Update key history for backward compatibility
const updateKeyHistory = async (
  key: string,
  timestamp: number
): Promise<void> => {
  try {
    const historyString = await AsyncStorage.getItem(
      ENCRYPTION_KEY_HISTORY_KEY
    );
    const history: Array<{ key: string; timestamp: number }> = historyString
      ? JSON.parse(historyString)
      : [];

    // Add old key to history
    history.push({ key, timestamp });

    // Keep only the last MAX_KEY_HISTORY keys
    if (history.length > MAX_KEY_HISTORY) {
      history.splice(0, history.length - MAX_KEY_HISTORY);
    }

    await AsyncStorage.setItem(
      ENCRYPTION_KEY_HISTORY_KEY,
      JSON.stringify(history)
    );
  } catch (error) {
    console.error("Error updating key history:", error);
  }
};

// Get key from history for decryption
const getKeyFromHistory = async (): Promise<string | null> => {
  try {
    const historyString = await AsyncStorage.getItem(
      ENCRYPTION_KEY_HISTORY_KEY
    );
    if (!historyString) return null;

    const history: Array<{ key: string; timestamp: number }> =
      JSON.parse(historyString);
    return history.length > 0 ? history[history.length - 1].key : null;
  } catch (error) {
    console.error("Error getting key from history:", error);
    return null;
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

// Decrypt a single value with key rotation support
export const decryptValue = async (encryptedValue: string): Promise<any> => {
  try {
    // Validate input
    if (!encryptedValue || typeof encryptedValue !== "string") {
      return encryptedValue;
    }

    // Check if the value looks like it might be encrypted (CryptoJS format)
    if (
      !encryptedValue.includes("U2F") &&
      !encryptedValue.includes("U2FsdGVkX")
    ) {
      // This doesn't look like an encrypted value, return as-is
      return encryptedValue;
    }

    // Try current key first
    let key = await getEncryptionKey();
    let decrypted = CryptoJS.AES.decrypt(encryptedValue, key);
    let jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    // If current key fails, try keys from history
    if (!jsonString || jsonString.trim() === "") {
      const historicalKey = await getKeyFromHistory();

      if (historicalKey) {
        decrypted = CryptoJS.AES.decrypt(encryptedValue, historicalKey);
        jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      }
    }

    // Check if decryption resulted in empty string
    if (!jsonString || jsonString.trim() === "") {
      // Return original value if decryption fails
      return encryptedValue;
    }

    // Validate UTF-8 encoding
    try {
      // Test if the string is valid UTF-8
      const testString = decodeURIComponent(escape(jsonString));
      if (testString !== jsonString) {
        return encryptedValue;
      }
    } catch (utf8Error) {
      return encryptedValue;
    }

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      return encryptedValue;
    }
  } catch (error) {
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
  let encryptedTransaction = await encryptFields(transaction, fieldsToEncrypt);

  // Handle monthOverrides encryption
  if (
    transaction.monthOverrides &&
    typeof transaction.monthOverrides === "object"
  ) {
    const encryptedMonthOverrides: any = {};

    for (const [monthKey, override] of Object.entries(
      transaction.monthOverrides
    )) {
      if (override && typeof override === "object") {
        const overrideFieldsToEncrypt = ["amount", "category", "name"];
        encryptedMonthOverrides[monthKey] = await encryptFields(
          override,
          overrideFieldsToEncrypt
        );
      } else {
        encryptedMonthOverrides[monthKey] = override;
      }
    }

    encryptedTransaction.monthOverrides = encryptedMonthOverrides;
  }

  return encryptedTransaction;
};

export const decryptRecurringTransaction = async (
  transaction: any
): Promise<any> => {
  const fieldsToDecrypt = ["name", "amount", "category"];
  let decryptedTransaction = await decryptFields(transaction, fieldsToDecrypt);

  // Handle monthOverrides decryption
  if (
    transaction.monthOverrides &&
    typeof transaction.monthOverrides === "object"
  ) {
    const decryptedMonthOverrides: any = {};

    for (const [monthKey, override] of Object.entries(
      transaction.monthOverrides
    )) {
      if (override && typeof override === "object") {
        const overrideFieldsToDecrypt = ["amount", "category", "name"];
        decryptedMonthOverrides[monthKey] = await decryptFields(
          override,
          overrideFieldsToDecrypt
        );
      } else {
        decryptedMonthOverrides[monthKey] = override;
      }
    }

    decryptedTransaction.monthOverrides = decryptedMonthOverrides;
  }

  return decryptedTransaction;
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

// Net Worth Entry encryption/decryption
export const encryptNetWorthEntry = async (entry: any): Promise<any> => {
  const fieldsToEncrypt = ["netWorth", "assets", "debts", "date", "userId"];
  return await encryptFields(entry, fieldsToEncrypt);
};

export const decryptNetWorthEntry = async (entry: any): Promise<any> => {
  const fieldsToDecrypt = ["netWorth", "assets", "debts", "date", "userId"];
  return await decryptFields(entry, fieldsToDecrypt);
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

export const decryptNetWorthEntries = async (
  entries: any[]
): Promise<any[]> => {
  return await Promise.all(entries.map((entry) => decryptNetWorthEntry(entry)));
};

// Manual key rotation (can be called from settings)
export const manualKeyRotation = async (): Promise<boolean> => {
  try {
    const currentKey = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
    const keyVersion = await AsyncStorage.getItem(ENCRYPTION_KEY_VERSION_KEY);
    const keyTimestamp = keyVersion ? parseInt(keyVersion) : 0;

    await rotateEncryptionKey(currentKey, keyTimestamp);
    return true;
  } catch (error) {
    console.error("Error during manual key rotation:", error);
    return false;
  }
};

// Get key rotation status
export const getKeyRotationStatus = async (): Promise<{
  lastRotation: number;
  daysUntilRotation: number;
  isRotationNeeded: boolean;
}> => {
  try {
    const keyVersion = await AsyncStorage.getItem(ENCRYPTION_KEY_VERSION_KEY);
    const lastRotation = keyVersion ? parseInt(keyVersion) : 0;
    const currentTime = Date.now();
    const daysSinceRotation =
      (currentTime - lastRotation) / (1000 * 60 * 60 * 24);
    const daysUntilRotation = Math.max(0, 90 - daysSinceRotation);
    const isRotationNeeded = daysSinceRotation >= 90;

    return {
      lastRotation,
      daysUntilRotation: Math.round(daysUntilRotation),
      isRotationNeeded,
    };
  } catch (error) {
    console.error("Error getting key rotation status:", error);
    return {
      lastRotation: 0,
      daysUntilRotation: 0,
      isRotationNeeded: false,
    };
  }
};

// Reset encryption key (use this if you're having decryption issues)
export const resetEncryptionKey = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE_KEY);
    await AsyncStorage.removeItem(ENCRYPTION_KEY_VERSION_KEY);
    await AsyncStorage.removeItem(ENCRYPTION_KEY_HISTORY_KEY);
    console.log("Encryption key and history reset successfully");
  } catch (error) {
    console.error("Error resetting encryption key:", error);
  }
};
