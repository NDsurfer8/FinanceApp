#!/usr/bin/env node

/**
 * i18n Consistency Verification Script
 *
 * This script verifies that all language files have the same keys as the English file.
 * It can be run during development to ensure no translation keys are missing.
 *
 * Usage: node scripts/verify-i18n-consistency.js
 */

const fs = require("fs");
const path = require("path");

// Configuration
const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "ja",
  "zh",
  "hi",
  "ar",
  "ru",
];

// Function to get all nested keys from an object
function getAllKeys(obj, prefix = "") {
  let keys = [];
  for (const key in obj) {
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys = keys.concat(
        getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key)
      );
    } else {
      keys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  return keys.sort();
}

// Function to get nested value from object
function getNestedValue(obj, path) {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Main verification function
function verifyI18nConsistency() {
  console.log("🔍 Verifying i18n consistency across all language files...\n");

  // Read English file as reference
  const enFilePath = path.join(LOCALES_DIR, "en.json");
  if (!fs.existsSync(enFilePath)) {
    console.error("❌ English locale file not found:", enFilePath);
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(enFilePath, "utf8"));
  const enKeys = getAllKeys(enData);

  console.log(`📋 English file (en.json) has ${enKeys.length} total keys\n`);

  let totalIssues = 0;
  let allConsistent = true;

  // Check each language file
  SUPPORTED_LANGUAGES.forEach((lang) => {
    if (lang === "en") return; // Skip English as it's our reference

    const filePath = path.join(LOCALES_DIR, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ ${lang}.json not found`);
      allConsistent = false;
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const langKeys = getAllKeys(data);

      // Find missing keys
      const missingKeys = enKeys.filter((key) => !langKeys.includes(key));

      // Find extra keys (keys in this language but not in English)
      const extraKeys = langKeys.filter((key) => !enKeys.includes(key));

      if (missingKeys.length > 0 || extraKeys.length > 0) {
        console.log(`❌ ${lang}.json has issues:`);
        if (missingKeys.length > 0) {
          console.log(
            `   Missing ${missingKeys.length} keys: ${missingKeys
              .slice(0, 5)
              .join(", ")}${missingKeys.length > 5 ? "..." : ""}`
          );
          totalIssues += missingKeys.length;
        }
        if (extraKeys.length > 0) {
          console.log(
            `   Extra ${extraKeys.length} keys: ${extraKeys
              .slice(0, 5)
              .join(", ")}${extraKeys.length > 5 ? "..." : ""}`
          );
          totalIssues += extraKeys.length;
        }
        allConsistent = false;
      } else {
        console.log(`✅ ${lang}.json - consistent (${langKeys.length} keys)`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${lang}.json:`, error.message);
      allConsistent = false;
    }
  });

  // Summary
  console.log("\n📊 Verification Summary:");
  console.log(`   - Total keys in English: ${enKeys.length}`);
  console.log(`   - Total issues found: ${totalIssues}`);
  console.log(`   - Languages checked: ${SUPPORTED_LANGUAGES.length}`);

  if (allConsistent) {
    console.log("\n✨ All language files are perfectly synchronized!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some language files have inconsistencies.");
    console.log("   Run the translation scripts to fix missing keys.");
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifyI18nConsistency();
}

module.exports = { verifyI18nConsistency, getAllKeys, getNestedValue };
