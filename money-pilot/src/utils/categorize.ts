import { mapPlaidCategoryToBudgetCategory } from "./plaidCategoryMapping";

// ---- Normalization helpers
const STOPWORDS = [
  "inc",
  "llc",
  "ltd",
  "co",
  "corp",
  "store",
  "online",
  "payment",
  "purchase",
  "debit",
  "credit",
  "pos",
  "card",
  "auth",
  "apple pay",
  "google pay",
  "visa",
  "mastercard",
  "discover",
  "#",
  "*",
  "txn",
  "id",
];

export const normalizeName = (raw?: string) => {
  if (!raw) return "";
  let s = raw.toLowerCase();
  s = s.replace(/(pos|card|ach|online)\s*[:-]?\s*/g, " ");
  s = s.replace(/[^a-z0-9\s]/g, " "); // remove punctuation
  s = s.replace(/\s+/g, " ").trim();
  const parts = s.split(" ").filter((w) => !STOPWORDS.includes(w));
  return parts.join(" ");
};

const includesAny = (s: string, arr: string[]) =>
  arr.some((w) => s.includes(w));

// ---- Keyword tables (keep short in code, expand via remote config)
const TABLE: Record<string, { inc?: string[]; exc?: string[]; w: number }[]> = {
  Food: [
    {
      inc: [
        "restaurant",
        "cafe",
        "coffee",
        "bar",
        "tavern",
        "grill",
        "pizza",
        "burger",
        "deli",
      ],
      w: 0.6,
    },
    {
      inc: [
        "mcdonald",
        "starbucks",
        "dunkin",
        "chipotle",
        "doordash",
        "ubereats",
        "grubhub",
      ],
      w: 0.8,
    },
    {
      inc: [
        "grocery",
        "supermarket",
        "market",
        "kroger",
        "safeway",
        "publix",
        "wegman",
        "trader joe",
        "whole food",
        "aldi",
      ],
      w: 0.7,
    },
    { exc: ["apple store", "app store"], w: -0.6 }, // negative rule
  ],
  Transportation: [
    {
      inc: ["uber", "lyft", "taxi", "metro", "bus", "train", "parking", "toll"],
      w: 0.7,
    },
    {
      inc: [
        "shell",
        "chevron",
        "bp",
        "exxon",
        "mobil",
        "speedway",
        "7 eleven",
        "fuel",
        "gas",
      ],
      w: 0.6,
    },
  ],
  Shopping: [
    {
      inc: [
        "amazon",
        "walmart",
        "target",
        "costco",
        "best buy",
        "home depot",
        "lowe",
        "ikea",
        "mall",
        "retail",
        "shop",
      ],
      w: 0.6,
    },
    { inc: ["apple store", "microsoft", "google store"], w: 0.7 },
  ],
  Utilities: [
    {
      inc: [
        "electric",
        "water",
        "gas",
        "cable",
        "hoa",
        "mortgage",
        "utility",
        "power",
        "electricity",
        "sewer",
        "trash",
        "garbage",
        "heating",
        "cooling",
        "hvac",
      ],
      w: 0.6,
    },
  ],
  Health: [
    {
      inc: [
        "pharmacy",
        "cvs",
        "walgreen",
        "doctor",
        "medical",
        "hospital",
        "clinic",
        "dental",
        "vision",
        "fitness",
        "gym",
        "yoga",
      ],
      w: 0.7,
    },
  ],
  Entertainment: [
    {
      inc: [
        "movie",
        "theater",
        "cinema",
        "concert",
        "ticket",
        "amc",
        "regal",
        "bowling",
        "arcade",
        "golf",
        "sports",
      ],
      w: 0.6,
    },
  ],
  Business: [
    {
      inc: [
        "office",
        "software",
        "adobe",
        "microsoft",
        "slack",
        "zoom",
        "notion",
        "license",
        "subscription",
        "training",
        "course",
        "book",
      ],
      w: 0.6,
    },
  ],
  "Credit Card": [
    {
      inc: [
        "credit card",
        "visa",
        "mastercard",
        "amex",
        "american express",
        "discover",
        "chase",
        "capital one",
        "citi",
        "bank of america",
        "wells fargo",
        "card payment",
        "cc payment",
      ],
      w: 0.8,
    },
  ],
  "Loan Payment": [
    {
      inc: [
        "loan",
        "mortgage",
        "car loan",
        "auto loan",
        "student loan",
        "personal loan",
        "home loan",
      ],
      w: 0.7,
    },
  ],
  Rent: [
    {
      inc: [
        "rent",
        "apartment",
        "housing",
        "lease",
        "landlord",
        "property management",
        "rental",
      ],
      w: 0.8,
    },
  ],
  "Car Payment": [
    {
      inc: [
        "car payment",
        "auto payment",
        "vehicle payment",
        "honda",
        "toyota",
        "ford",
        "chevrolet",
        "nissan",
        "hyundai",
        "kia",
        "mazda",
        "subaru",
        "volkswagen",
        "bmw",
        "mercedes",
        "audi",
        "lexus",
        "acura",
        "infiniti",
        "cadillac",
        "lincoln",
        "chrysler",
        "dodge",
        "jeep",
        "ram",
        "gmc",
        "buick",
        "genesis",
        "volvo",
        "jaguar",
        "land rover",
        "porsche",
        "tesla",
        "auto loan",
        "car loan",
        "vehicle loan",
      ],
      w: 0.8,
    },
  ],
  Insurance: [
    {
      inc: [
        "insurance",
        "geico",
        "state farm",
        "progressive",
        "allstate",
        "farmers",
        "liberty mutual",
        "usaa",
        "nationwide",
        "travelers",
        "auto insurance",
        "car insurance",
        "home insurance",
        "renters insurance",
        "health insurance",
        "life insurance",
        "disability insurance",
        "umbrella insurance",
      ],
      w: 0.8,
    },
  ],
  Internet: [
    {
      inc: [
        "internet",
        "wifi",
        "broadband",
        "comcast",
        "xfinity",
        "verizon fios",
        "att internet",
        "spectrum",
        "cox",
        "optimum",
        "frontier",
        "centurylink",
        "windstream",
        "mediacom",
        "suddenlink",
        "cable internet",
        "dsl",
        "fiber",
        "isp",
      ],
      w: 0.8,
    },
  ],
  Phone: [
    {
      inc: [
        "phone",
        "mobile",
        "cell",
        "cellular",
        "verizon",
        "att",
        "t mobile",
        "tmobile",
        "sprint",
        "boost",
        "cricket",
        "metropcs",
        "metro pcs",
        "mint mobile",
        "visible",
        "google fi",
        "phone bill",
        "mobile bill",
        "cell bill",
        "wireless",
      ],
      w: 0.8,
    },
  ],
  Subscriptions: [
    {
      inc: [
        "netflix",
        "spotify",
        "hulu",
        "disney",
        "youtube",
        "prime",
        "amazon prime",
        "apple music",
        "pandora",
        "tidal",
        "soundcloud",
        "audible",
        "kindle",
        "adobe",
        "microsoft 365",
        "office 365",
        "slack",
        "zoom",
        "dropbox",
        "google drive",
        "icloud",
        "subscription",
        "membership",
        "monthly",
        "annual",
        "recurring",
        "auto renew",
        "subscription service",
        "rapidapi",
        "plaid",
        "api",
        "apis",
        "webhook",
        "webhooks",
        "stripe",
        "twilio",
        "sendgrid",
        "mailchimp",
        "hubspot",
        "salesforce",
        "zendesk",
      ],
      w: 0.8,
    },
  ],
  Transfers: [
    {
      inc: [
        "transfer",
        "zelle",
        "venmo",
        "cash app",
        "paypal",
        "paypal *instant",
      ],
      w: 0.8,
    },
  ],
  Refunds: [{ inc: ["refund", "return", "reversal", "chargeback"], w: 0.9 }],
};

type TypeKind = "income" | "expense";

export interface CategorizationResult {
  category: string;
  type: TypeKind;
  confidence: number;
  reason: string; // for debugging / analytics
}

// ---- User override store (inject your real persistence)
export type UserOverride = { category: string; updatedAt: number };
export interface OverrideStore {
  // lookups by merchant_id then normalized name
  getByMerchantId: (
    uid: string,
    merchantId: string
  ) => Promise<UserOverride | null>;
  getByName: (
    uid: string,
    normalizedName: string
  ) => Promise<UserOverride | null>;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ---- Main function
export async function categorizeTransactionEnhanced(
  tx: any,
  uid: string,
  overrides: OverrideStore
): Promise<CategorizationResult> {
  const amount = Math.abs(tx.amount ?? 0);
  const isCredit = (tx.amount ?? 0) < 0; // Plaid: negative = money in
  const type: TypeKind = isCredit ? "income" : "expense";

  const pf =
    tx.personal_finance_category?.detailed ||
    tx.personal_finance_category?.primary;
  const merchantId = tx.merchant_id;
  const merchantName = tx.merchant_name || tx.name || "";
  const normName = normalizeName(merchantName);
  const code = (tx.transaction_code || "").toLowerCase();

  // 1) User overrides
  if (merchantId) {
    const o = await overrides.getByMerchantId(uid, merchantId);
    if (o)
      return {
        category: o.category,
        type,
        confidence: 1,
        reason: "user_override_merchant_id",
      };
  }
  if (normName) {
    const o2 = await overrides.getByName(uid, normName);
    if (o2)
      return {
        category: o2.category,
        type,
        confidence: 0.95,
        reason: "user_override_name",
      };
  }

  // 2) Plaid mapping
  if (pf) {
    const mapped = mapPlaidCategoryToBudgetCategory(pf);
    if (mapped) {
      return { category: mapped, type, confidence: 0.9, reason: `plaid:${pf}` };
    }
  }

  // 3) Income heuristics - check this FIRST for income transactions
  if (type === "income") {
    // You can get more granular: "Salary" vs "Other Income" by name keywords
    const isSalary = includesAny(normName, [
      "payroll",
      "salary",
      "direct deposit",
      "paychex",
      "adp",
      "workday",
      "paycheck",
      "wage",
      "income",
      "deposit",
      "credit",
      "refund",
      "return",
      "bonus",
      "commission",
    ]);
    return {
      category: isSalary ? "Salary" : "Other Income",
      type,
      confidence: isSalary ? 0.85 : 0.7,
      reason: isSalary ? "income_keyword_salary" : "income_default",
    };
  }

  // 4) Hard rules: refunds/transfers (for expenses only)
  if (
    code &&
    ["refund", "reversal", "chargeback", "return"].some((k) => code.includes(k))
  ) {
    return {
      category: "Adjustments",
      type,
      confidence: 0.9,
      reason: "transaction_code",
    };
  }
  if (includesAny(normName, ["refund", "return", "reversal", "chargeback"])) {
    return {
      category: "Adjustments",
      type,
      confidence: 0.85,
      reason: "keyword_refund",
    };
  }
  if (
    includesAny(normName, ["transfer", "zelle", "venmo", "cash app", "paypal"])
  ) {
    return {
      category: "Transfers Out",
      type,
      confidence: 0.85,
      reason: "keyword_transfer",
    };
  }

  // 5) Weighted keyword scoring (for expenses only)
  const scores: Record<string, number> = {};
  for (const [cat, rules] of Object.entries(TABLE)) {
    let score = 0;
    for (const r of rules) {
      if (r.inc && includesAny(normName, r.inc)) score += r.w;
      if (r.exc && includesAny(normName, r.exc)) score += r.w; // negative weight
    }
    // amount or time-of-day heuristics (examples):
    if (cat === "Rent" || cat === "Utilities") {
      // high amount & monthly-ish values can boost these if you add a recurring detector
    }
    scores[cat] = score;
  }

  // Choose best category above threshold
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestCat, bestScore = 0] = entries[0] || ["Other Expenses", 0];

  // 6) Expense fallback with confidence
  if (bestScore >= 0.6) {
    return {
      category: bestCat,
      type,
      confidence: clamp01(bestScore),
      reason: "keyword_scoring",
    };
  }

  // 7) Final fallback (expenses only at this point)
  return {
    category: "Other Expenses",
    type,
    confidence: 0.4,
    reason: "fallback",
  };
}
