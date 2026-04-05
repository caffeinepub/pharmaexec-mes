// Cleaning Validation Service — PharmaExec MES
// Service layer for pharma-compliant cleaning validation.
// Implements Fixed vs Moveable equipment logic, DETH, campaign length checks.
// All validation logic is here — NOT in the UI.

import type { ProductMaster } from "../lib/productMaster";
import { getProductByCode } from "../lib/productMaster";

export type CleaningBadge = "Clean" | "Due" | "Expired";

export interface CleaningValidationInput {
  equipmentId: string;
  equipmentType?: "Fixed" | "Moveable"; // defaults to Fixed if unset
  cleaningStatus?: string;
  lastCleanedAt?: string; // ISO date string
  cleaningValidTill?: string; // ISO date string
  lastProductUsed?: string; // productCode
  cleaningReason?: string; // required for Fixed equipment validity check
  currentCampaignBatches?: number; // how many batches in current campaign
}

export interface CleaningValidationResult {
  valid: boolean;
  badge: CleaningBadge;
  reasons: string[]; // reasons for blocking (errors)
  warnings: string[]; // non-blocking warnings
}

/**
 * computeCleaningBadge
 * Determines the cleaning status badge for an equipment record.
 * Clean: all checks pass
 * Due: cleaning will expire soon (within 24 hours)
 * Expired: past cleaningValidTill OR DETH exceeded OR no cleaning on record
 */
export function computeCleaningBadge(
  equipment: CleaningValidationInput,
  targetProductCode?: string,
): CleaningBadge {
  const result = _runCleaningChecks(equipment, targetProductCode);
  return result.badge;
}

/**
 * validateCleaningForExecution
 * Full cleaning validation before batch execution.
 * Returns valid=false with reasons if any check fails.
 */
export function validateCleaningForExecution(
  equipment: CleaningValidationInput,
  targetProductCode?: string,
): CleaningValidationResult {
  return _runCleaningChecks(equipment, targetProductCode);
}

function _runCleaningChecks(
  equipment: CleaningValidationInput,
  targetProductCode?: string,
): CleaningValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const now = new Date();
  const equipType = equipment.equipmentType ?? "Fixed";

  // ── Check 1: cleaningValidTill ──────────────────────────────────────────
  if (equipment.cleaningValidTill) {
    const validTill = new Date(equipment.cleaningValidTill);
    if (now > validTill) {
      reasons.push(
        `Cleaning validity expired on ${validTill.toLocaleDateString()}. Equipment must be re-cleaned before use.`,
      );
    } else {
      const hoursLeft =
        (validTill.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft <= 24) {
        warnings.push(
          `Cleaning validity expires in ${Math.ceil(hoursLeft)} hours. Schedule cleaning soon.`,
        );
      }
    }
  } else if (equipment.lastCleanedAt) {
    // No cleaningValidTill set but has cleaning log — warn
    warnings.push(
      "No cleaning validity period defined. Verify cleaning record is current.",
    );
  } else {
    // Never cleaned
    reasons.push(
      "No cleaning record found for this equipment. Cleaning required before first use.",
    );
  }

  // ── Check 2: DETH (Dirty Equipment Hold Time) ──────────────────────────
  if (equipment.lastCleanedAt && equipment.lastProductUsed) {
    const product = getProductByCode(equipment.lastProductUsed);
    if (product) {
      const lastCleaned = new Date(equipment.lastCleanedAt);
      const hoursSinceCleaning =
        (now.getTime() - lastCleaned.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCleaning > product.dethTime) {
        reasons.push(
          `Dirty Equipment Hold Time (DETH) exceeded for product ${equipment.lastProductUsed}. ` +
            `Max allowed: ${product.dethTime}h, Elapsed: ${Math.ceil(hoursSinceCleaning)}h.`,
        );
      } else if (hoursSinceCleaning > product.dethTime * 0.9) {
        warnings.push(
          `DETH approaching limit for ${equipment.lastProductUsed}: ` +
            `${Math.ceil(hoursSinceCleaning)}h elapsed of ${product.dethTime}h allowed.`,
        );
      }
    }
  }

  // ── Check 3: Campaign Length ──────────────────────────────────────────
  if (
    equipment.lastProductUsed &&
    equipment.currentCampaignBatches !== undefined
  ) {
    const product = getProductByCode(equipment.lastProductUsed);
    if (product && equipment.currentCampaignBatches >= product.campaignLength) {
      reasons.push(
        `Campaign length limit reached for product ${equipment.lastProductUsed}. ` +
          `Max campaign: ${product.campaignLength} batches. Equipment must be cleaned before continuing.`,
      );
    } else if (
      product &&
      equipment.currentCampaignBatches >= product.campaignLength - 1
    ) {
      warnings.push(
        `Campaign length limit approaching: ${equipment.currentCampaignBatches} of ${product.campaignLength} batches used for ${equipment.lastProductUsed}.`,
      );
    }
  }

  // ── Check 4: Equipment Type–specific cleaning validity ─────────────────
  if (equipType === "Fixed") {
    // Fixed equipment: validity depends on BOTH cleaningReason AND productCode
    if (!equipment.cleaningReason) {
      reasons.push(
        "Fixed equipment requires a documented Cleaning Reason for cleaning validity.",
      );
    }
    if (!equipment.lastProductUsed) {
      reasons.push(
        "Fixed equipment requires last Product Used to validate cleaning scope.",
      );
    }
    // Product code mismatch check for Fixed
    if (
      targetProductCode &&
      equipment.lastProductUsed &&
      targetProductCode !== equipment.lastProductUsed
    ) {
      // Cross-product use — check if cleaning occurred after the product change
      if (!equipment.lastCleanedAt) {
        reasons.push(
          `Fixed equipment was last used for ${equipment.lastProductUsed} but new product is ${targetProductCode}. Cleaning required for product changeover.`,
        );
      }
    }
  } else {
    // Moveable equipment: validity depends ONLY on productCode
    if (
      targetProductCode &&
      equipment.lastProductUsed &&
      targetProductCode !== equipment.lastProductUsed &&
      !equipment.lastCleanedAt
    ) {
      reasons.push(
        `Moveable equipment was last used for product ${equipment.lastProductUsed}. Cleaning required before use with ${targetProductCode}.`,
      );
    }
  }

  // ── Determine badge ────────────────────────────────────────────────────
  let badge: CleaningBadge;
  if (reasons.length > 0) {
    badge = "Expired";
  } else if (warnings.length > 0) {
    badge = "Due";
  } else {
    badge = "Clean";
  }

  return {
    valid: reasons.length === 0,
    badge,
    reasons,
    warnings,
  };
}

/**
 * getCleaningBadgeStyle
 * Returns Tailwind classes for the cleaning badge.
 */
export function getCleaningBadgeStyle(badge: CleaningBadge): string {
  switch (badge) {
    case "Clean":
      return "bg-green-100 text-green-800 border-green-300";
    case "Due":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Expired":
      return "bg-red-100 text-red-800 border-red-300";
  }
}

/**
 * getCleaningBadgeDot
 * Returns Tailwind color class for the small indicator dot.
 */
export function getCleaningBadgeDot(badge: CleaningBadge): string {
  switch (badge) {
    case "Clean":
      return "bg-green-500";
    case "Due":
      return "bg-amber-500";
    case "Expired":
      return "bg-red-500";
  }
}

/**
 * computeCleaningValidTill
 * Given a cleaning date and a product, calculates when cleaning validity expires.
 * Uses the lesser of DETH or a default 30-day validity window.
 */
export function computeCleaningValidTill(
  lastCleanedAt: string,
  productCode: string,
): string {
  const product: ProductMaster | undefined = getProductByCode(productCode);
  const dethHours = product ? product.dethTime : 72;
  const cleaned = new Date(lastCleanedAt);
  const validTill = new Date(cleaned.getTime() + dethHours * 60 * 60 * 1000);
  return validTill.toISOString();
}
