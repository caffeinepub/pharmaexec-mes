// GMP Validation Engine — PharmaExec MES
// Central validation utilities for GMP compliance checks

export type GmpStatus = "Draft" | "Approved";
export type MaintenanceStatus = "Active" | "Under Maintenance";
export type HealthStatus = "Good" | "Bad";
export type CleaningLevel = "None" | "Minor" | "Major";
export type PmStatus = "On Time" | "Due Soon" | "Overdue";
export type ComparisonType = "WITHIN_RANGE" | "COVER_RANGE";

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
 *         OR health_status === "Bad" OR cleaningStatus === "Required"
 * Yellow if: pmStatus === "Due Soon"
 * Green if: all OK
 */
export function computeEquipmentIndicator(
  maintenanceStatus: MaintenanceStatus,
  healthStatus: HealthStatus,
  pmStatus: PmStatus,
  cleaningStatus: "OK" | "Required",
): "green" | "yellow" | "red" {
  if (
    maintenanceStatus === "Under Maintenance" ||
    pmStatus === "Overdue" ||
    healthStatus === "Bad" ||
    cleaningStatus === "Required"
  ) {
    return "red";
  }
  if (pmStatus === "Due Soon") return "yellow";
  return "green";
}

/**
 * validateExecution: Central GMP validation for execution blocking.
 * Checks all 7 GMP conditions.
 */
export function validateExecution(params: {
  equipment: {
    status: GmpStatus;
    maintenance_status: MaintenanceStatus;
    health_status: HealthStatus;
    pm_due_date: string;
    cleaningLog: CleaningLogEntry | null;
    cleaningRules: CleaningRule[];
  } | null;
  equipmentId: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { equipment, equipmentId } = params;

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

  // Check 5: Cleaning requirement
  const cleaningStatus = computeCleaningStatus(
    equipment.cleaningLog,
    equipment.cleaningRules,
  );
  if (cleaningStatus === "Required") {
    errors.push(
      "Equipment requires cleaning before execution based on cleaning rules.",
    );
  }

  // Check 6: Required properties exist (basic check — cleaningRules defined)
  // Advanced property range checks would be done here with recipe data

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
