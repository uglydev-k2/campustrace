/**
 * Fixed vocabularies used across the app.
 *
 * This file is safe to import from both server and client code: it contains
 * no secrets and no database access.
 */

export const APP_NAME = "CampusTrace";
export const CAMPUS_NAME = "University of Cape Coast";

/**
 * CampusTrace serves one campus, so every date is shown in that campus's time
 * zone. Africa/Accra is UTC+0 all year, which keeps date handling simple.
 */
export const CAMPUS_TIME_ZONE = "Africa/Accra";

export const CATEGORIES = [
  "ELECTRONICS",
  "ID_AND_BANK_CARDS",
  "KEYS",
  "BAGS",
  "WALLETS",
  "BOOKS_AND_NOTES",
  "CLOTHING",
  "JEWELLERY_AND_WATCHES",
  "OTHER",
] as const;

export type CategoryValue = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  ELECTRONICS: "Electronics",
  ID_AND_BANK_CARDS: "ID and bank cards",
  KEYS: "Keys",
  BAGS: "Bags",
  WALLETS: "Wallets and purses",
  BOOKS_AND_NOTES: "Books and notes",
  CLOTHING: "Clothing",
  JEWELLERY_AND_WATCHES: "Jewellery and watches",
  OTHER: "Something else",
};

/**
 * Photos of these items usually show a name, face or card number, so they are
 * never shown publicly, whatever the reporter chose.
 */
export const SENSITIVE_CATEGORIES: readonly CategoryValue[] = ["ID_AND_BANK_CARDS"];

/** Places on campus that a report can be filed against. */
export const CAMPUS_AREAS = [
  "Sam Jonah Library",
  "Science Market",
  "Large Lecture Theatre (LLT)",
  "New Examination Centre (NEC)",
  "C. A. Ackah Lecture Theatre Complex (CALC)",
  "Sandwich Lecture Theatre (SWLT)",
  "Faculty of Arts",
  "School of Business",
  "College of Distance Education (CoDE)",
  "Central Administration",
  "Oguaa Hall",
  "Atlantic Hall",
  "Adehye Hall",
  "Casely Hayford Hall",
  "Kwame Nkrumah Hall",
  "Valco Hall",
  "SRC Hall",
  "Superannuation Hall",
  "Campus shuttle",
  "Sports complex",
  "University Hospital",
  "Somewhere else on campus",
] as const;

export type CampusArea = (typeof CAMPUS_AREAS)[number];

export const UPLOAD_LIMITS = {
  maxFileBytes: 4 * 1024 * 1024,
  maxEvidenceFiles: 3,
} as const;

export const REPORTS_PER_PAGE = 12;
