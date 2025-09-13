import { ref, get, set } from "firebase/database";
import { db } from "./firebase";

export type UserOverride = { category: string; updatedAt: number };
export interface OverrideStore {
  getByMerchantId: (
    uid: string,
    merchantId: string
  ) => Promise<UserOverride | null>;
  getByName: (
    uid: string,
    normalizedName: string
  ) => Promise<UserOverride | null>;
  setByMerchantId: (
    uid: string,
    merchantId: string,
    category: string
  ) => Promise<void>;
  setName: (
    uid: string,
    normalizedName: string,
    category: string
  ) => Promise<void>;
}

export class FirebaseOverrideStore implements OverrideStore {
  async getByMerchantId(
    uid: string,
    merchantId: string
  ): Promise<UserOverride | null> {
    try {
      const overrideRef = ref(
        db,
        `users/${uid}/merchantOverrides/${merchantId}`
      );
      const snapshot = await get(overrideRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          category: data.lastCategory,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting merchant override:", error);
      return null;
    }
  }

  async getByName(
    uid: string,
    normalizedName: string
  ): Promise<UserOverride | null> {
    try {
      const overrideRef = ref(
        db,
        `users/${uid}/merchantOverridesByName/${normalizedName}`
      );
      const snapshot = await get(overrideRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          category: data.lastCategory,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting name override:", error);
      return null;
    }
  }

  async setByMerchantId(
    uid: string,
    merchantId: string,
    category: string
  ): Promise<void> {
    try {
      const overrideRef = ref(
        db,
        `users/${uid}/merchantOverrides/${merchantId}`
      );
      await set(overrideRef, {
        lastCategory: category,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error setting merchant override:", error);
      throw error;
    }
  }

  async setName(
    uid: string,
    normalizedName: string,
    category: string
  ): Promise<void> {
    try {
      const overrideRef = ref(
        db,
        `users/${uid}/merchantOverridesByName/${normalizedName}`
      );
      await set(overrideRef, {
        lastCategory: category,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error setting name override:", error);
      throw error;
    }
  }
}

export const overrideStore = new FirebaseOverrideStore();
