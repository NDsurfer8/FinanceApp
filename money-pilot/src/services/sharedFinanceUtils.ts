import { ref, remove } from "firebase/database";
import { db } from "./firebase";

/**
 * Utility functions for shared finance data management
 * This file breaks the circular dependency between userData.ts and sharedFinanceDataSync.ts
 */

// Utility function to handle permission denied errors
const handlePermissionError = (error: any, context: string) => {
  if (
    error?.code === "PERMISSION_DENIED" ||
    error?.message?.includes("Permission denied")
  ) {
    console.log(`⚠️ Permission denied for ${context}, skipping operation`);
    return true;
  }
  return false;
};

export const removeUserFromGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  try {
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await remove(sharedDataRef);
  } catch (error: any) {
    if (handlePermissionError(error, "skipping user removal from group")) {
      return;
    }

    console.error("❌ Error removing user from group:", error);
    throw error;
  }
};

export const removeGroupSharedData = async (groupId: string): Promise<void> => {
  try {
    const sharedDataRef = ref(db, `sharedFinanceData/${groupId}`);
    await remove(sharedDataRef);
    console.log("✅ Removed all shared data for group:", groupId);
  } catch (error: any) {
    if (handlePermissionError(error, "skipping group shared data removal")) {
      return;
    }

    console.error("❌ Error removing group shared data:", error);
    throw error;
  }
};
