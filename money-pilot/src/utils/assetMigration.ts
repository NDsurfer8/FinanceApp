import { Asset } from "../services/userData";

/**
 * Migrates existing assets to have proper types
 * This function can be called to update assets that were created before asset types were implemented
 */
export const migrateAssetsToTypes = (assets: Asset[]): Asset[] => {
  return assets.map((asset) => {
    // If asset already has a type, keep it
    if (asset.type && asset.type !== "asset") {
      return asset;
    }

    // Try to infer type from name
    const name = asset.name.toLowerCase();

    if (
      name.includes("savings") ||
      name.includes("emergency") ||
      name.includes("fund")
    ) {
      return { ...asset, type: "savings" };
    }

    if (
      name.includes("checking") ||
      name.includes("bank") ||
      name.includes("account")
    ) {
      return { ...asset, type: "checking" };
    }

    if (
      name.includes("investment") ||
      name.includes("stock") ||
      name.includes("portfolio") ||
      name.includes("401k") ||
      name.includes("ira")
    ) {
      return { ...asset, type: "investment" };
    }

    if (
      name.includes("house") ||
      name.includes("home") ||
      name.includes("property") ||
      name.includes("real estate")
    ) {
      return { ...asset, type: "real_estate" };
    }

    if (
      name.includes("car") ||
      name.includes("vehicle") ||
      name.includes("auto")
    ) {
      return { ...asset, type: "vehicle" };
    }

    // Default to "other" for unrecognized assets
    return { ...asset, type: "other" };
  });
};

/**
 * Gets a user-friendly label for asset types
 */
export const getAssetTypeLabel = (type: string): string => {
  const typeLabels: { [key: string]: string } = {
    savings: "💾 Savings",
    checking: "🏦 Checking",
    investment: "📈 Investment",
    real_estate: "🏠 Real Estate",
    vehicle: "🚗 Vehicle",
    other: "💼 Other",
    asset: "💼 Asset", // Fallback for old assets
  };
  return typeLabels[type] || "💼 Asset";
};

/**
 * Gets a color for asset types
 */
export const getAssetTypeColor = (type: string): string => {
  const typeColors: { [key: string]: string } = {
    savings: "#16a34a", // Green
    checking: "#3b82f6", // Blue
    investment: "#f59e0b", // Amber
    real_estate: "#8b5cf6", // Purple
    vehicle: "#ef4444", // Red
    other: "#6b7280", // Gray
    asset: "#6b7280", // Gray fallback
  };
  return typeColors[type] || "#6b7280";
};
