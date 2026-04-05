// GMP Validation Engine — PharmaExec MES
// Central validation utilities for GMP compliance checks
import { validateCleaningForExecution as _validateCleaning } from "../services/cleaningValidationService";

// Updated: Added 'Executed' to GmpStatus as a terminal workflow state.
export type GmpStatus = "Draft" | "Approved" | "Executed" | "Superseded";
export type MaintenanceStatus = "Active" | "Under Maintenance";
export type HealthStatus = "Good" | "Bad";
export type CleaningLevel = "None" | "Minor" | "Major";
export type PmStatus = "On Time" | "Due Soon" | "Overdue";
export type ComparisonType = "WITHIN_RANGE" | "COVER_RANGE";
export type EquipmentType = "Fixed" | "Moveable";

export interface CleaningRule {
  id: string;
  previousProduct: string;
  nextProduct: string;
  requiredCleaningLevel: CleaningLevel;
}

export interface CleaningLogEntry {
  lastProduct: string;
  lastCleanedDate: string;
  cleaningLevel: CleaningLevel;
  cleaningReason?: string; // Required for Fixed equipment cleaning validity
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * computePmStatus: Determines PM status based on today vs pm_due_date.
 * - "Overdue" if today > pm_due_date
 * - "Due Soon" if today within 7 days of pm_due_date
 * - "On Time" otherwise
 * Returns "On Time" if pm_due_date is empty
 */
export function computePmStatus(pmDueDate: string): PmStatus {
  if (!pmDueDate) return "On Time";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(pmDueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Due Soon";
  return "On Time";
}

/**
 * computeCleaningStatus: Checks if cleaning is required.
 * Returns "Required" if cleaning log exists and rules dictate cleaning
 * for the current product combination, "OK" otherwise.
 */
export function computeCleaningStatus(
  cleaningLog: CleaningLogEntry | null,
  cleaningRules: CleaningRule[],
  nextProduct?: string,
): "OK" | "Required" {
  if (!cleaningLog || cleaningRules.length === 0) return "OK";
  const lastProduct = cleaningLog.lastProduct;
  if (!lastProduct) return "OK";

  // Check if any rule requires cleaning for this product transition
  const matchingRule = cleaningRules.find(
    (rule) =>
      rule.previousProduct === lastProduct &&
      (rule.nextProduct === nextProduct ||
        rule.nextProduct === "*" ||
        !nextProduct) &&
      rule.requiredCleaningLevel !== "None",
  );

  if (matchingRule) {
    // Check if the last cleaning meets the requirement
    const cleaningLevelOrder: Record<CleaningLevel, number> = {
      None: 0,
      Minor: 1,
      Major: 2,
    };
    const performedLevel = cleaningLevelOrder[cleaningLog.cleaningLevel];
    const requiredLevel =
      cleaningLevelOrder[matchingRule.requiredCleaningLevel];
    if (performedLevel < requiredLevel) return "Required";
  }

  return "OK";
}

/**
 * computeEquipmentIndicator: Returns overall card color indicator.
 * Red if: maintenance_status === "Under Maintenance" OR pmStatus === "Overdue"
 *         OR health_status === "Bad" OR cleaningStatus === "Required"/"Expired"
 * Yellow if: pmStatus === "Due Soon" OR cleaningStatus === "Due"
 * Green if: all OK
 */
export function computeEquipmentIndicator(
  maintenanceStatus: MaintenanceStatus,
  healthStatus: HealthStatus,
  pmStatus: PmStatus,
  cleaningStatus: "OK" | "Required" | "Clean" | "Due" | "Expired",
): "green" | "yellow" | "red" {
  if (
    maintenanceStatus === "Under Maintenance" ||
    pmStatus === "Overdue" ||
    healthStatus === "Bad" ||
    cleaningStatus === "Required" ||
    cleaningStatus === "Expired"
  ) {
    return "red";
  }
  if (pmStatus === "Due Soon" || cleaningStatus === "Due") return "yellow";
  return "green";
}

/**
 * validateExecution: Central GMP validation for execution blocking.
 * Checks all GMP conditions including new cleaning validation service.
 */
export function validateExecution(params: {
  equipment: {
    status: GmpStatus;
    maintenance_status: MaintenanceStatus;
    health_status: HealthStatus;
    pm_due_date: string;
    cleaningLog: CleaningLogEntry | null;
    cleaningRules: CleaningRule[];
    // New fields for advanced cleaning validation
    equipmentType?: EquipmentType;
    lastCleanedAt?: string;
    cleaningValidTill?: string;
    lastProductUsed?: string;
    cleaningReason?: string;
    currentCampaignBatches?: number;
  } | null;
  equipmentId: string;
  targetProductCode?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { equipment, equipmentId, targetProductCode } = params;

  // Check 1: Equipment must exist and be Approved
  if (!equipment) {
    errors.push(`Equipment "${equipmentId}" not found in master data.`);
    return { success: false, errors, warnings };
  }

  if (equipment.status !== "Approved") {
    errors.push(
      `Equipment is in "${equipment.status}" status. Only Approved equipment can be used in execution.`,
    );
  }

  // Check 2: Maintenance status must not be "Under Maintenance"
  if (equipment.maintenance_status === "Under Maintenance") {
    errors.push(
      "Equipment is currently Under Maintenance and cannot be used for execution.",
    );
  }

  // Check 3: Health status must be Good
  if (equipment.health_status !== "Good") {
    errors.push(
      `Equipment health status is "${equipment.health_status}". Only equipment with Good health status can be used.`,
    );
  }

  // Check 4: PM status must not be Overdue
  const pmStatus = computePmStatus(equipment.pm_due_date);
  if (pmStatus === "Overdue") {
    errors.push(
      "Preventive Maintenance is Overdue. Equipment must be serviced before execution.",
    );
  } else if (pmStatus === "Due Soon") {
    warnings.push(
      "Preventive Maintenance is Due Soon. Schedule PM after current batch.",
    );
  }

  // Check 5: Advanced cleaning validation (service layer)
  if (
    equipment.lastCleanedAt ||
    equipment.cleaningValidTill ||
    equipment.lastProductUsed
  ) {
    const cleaningResult = _validateCleaning(
      {
        equipmentId,
        equipmentType: equipment.equipmentType,
        lastCleanedAt: equipment.lastCleanedAt,
        cleaningValidTill: equipment.cleaningValidTill,
        lastProductUsed: equipment.lastProductUsed,
        cleaningReason: equipment.cleaningReason,
        currentCampaignBatches: equipment.currentCampaignBatches,
      },
      targetProductCode,
    );
    errors.push(...cleaningResult.reasons);
    warnings.push(...cleaningResult.warnings);
  } else {
    // Fallback to legacy cleaning check for older records
    const cleaningStatus = computeCleaningStatus(
      equipment.cleaningLog,
      equipment.cleaningRules,
    );
    if (cleaningStatus === "Required") {
      errors.push(
        "Equipment requires cleaning before execution based on cleaning rules.",
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
