/**
 * Central Interlock Engine
 * Checks all execution interlocks for equipment before batch execution.
 * Returns a typed result with HARD/SOFT interlocks, messages, and override flags.
 */

import type { EquipmentNode } from "../lib/equipmentNodes";
import { computePmStatus } from "../lib/gmpValidation";
import { validateCleaningForExecution } from "./cleaningValidationService";
import { getAllDMNodes } from "./dmService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InterlockItem {
  type: "HARD" | "SOFT";
  message: string;
  allowOverride: boolean;
  category:
    | "CLEANING"
    | "DETH"
    | "CAMPAIGN"
    | "ACTIVE_BATCH"
    | "ROOM_READINESS"
    | "MAINTENANCE"
    | "STATUS"
    | "HEALTH";
}

export interface InterlockResult {
  status: "OK" | "BLOCKED" | "WARNING";
  interlocks: InterlockItem[];
}

export interface InterlockContext {
  equipment: EquipmentNode | null;
  equipmentId: string;
  targetProductCode?: string;
  /** IDs of batches currently "In Process" — used to check active batch interlock */
  activeBatchEquipmentIds?: string[];
  /** Whether the room/station is marked ready */
  roomReady?: boolean;
  stationReady?: boolean;
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Checks all interlocks for a given execution context.
 * HARD interlocks block execution unconditionally.
 * SOFT interlocks can be overridden with a mandatory reason.
 */
export function checkInterlocks(context: InterlockContext): InterlockResult {
  const {
    equipment,
    targetProductCode,
    activeBatchEquipmentIds = [],
    roomReady,
    stationReady,
  } = context;

  const interlocks: InterlockItem[] = [];

  if (!equipment) {
    return {
      status: "BLOCKED",
      interlocks: [
        {
          type: "HARD",
          message: "Equipment not found",
          allowOverride: false,
          category: "STATUS",
        },
      ],
    };
  }

  // ── 1. Status check (HARD) ────────────────────────────────────────────────
  if (equipment.status !== "Approved") {
    interlocks.push({
      type: "HARD",
      message: `Equipment status is "${equipment.status ?? "Draft"}" — only Approved equipment can be used in execution`,
      allowOverride: false,
      category: "STATUS",
    });
  }

  // ── 2. Maintenance check (HARD) ───────────────────────────────────────────
  if (equipment.maintenance_status === "Under Maintenance") {
    interlocks.push({
      type: "HARD",
      message: "Equipment is currently Under Maintenance",
      allowOverride: false,
      category: "MAINTENANCE",
    });
  }

  // ── 3. Health check (HARD) ────────────────────────────────────────────────
  if (equipment.health_status === "Bad") {
    interlocks.push({
      type: "HARD",
      message: "Equipment health status is Bad",
      allowOverride: false,
      category: "HEALTH",
    });
  }

  // ── 4. PM overdue check (HARD) ────────────────────────────────────────────
  if (equipment.pm_due_date) {
    const pmStatus = computePmStatus(equipment.pm_due_date);
    if (pmStatus === "Overdue") {
      interlocks.push({
        type: "HARD",
        message: `Preventive Maintenance is Overdue (due: ${equipment.pm_due_date})`,
        allowOverride: false,
        category: "MAINTENANCE",
      });
    } else if (pmStatus === "Due Soon") {
      interlocks.push({
        type: "SOFT",
        message: `Preventive Maintenance is Due Soon (due: ${equipment.pm_due_date})`,
        allowOverride: true,
        category: "MAINTENANCE",
      });
    }
  }

  // ── 5. Cleaning validation (reuse cleaningValidationService) ─────────────
  const cleaningResult = validateCleaningForExecution(
    {
      equipmentId: equipment.id,
      equipmentType: equipment.equipmentType,
      cleaningStatus: equipment.cleaningStatus,
      lastCleanedAt: equipment.lastCleanedAt,
      cleaningValidTill: equipment.cleaningValidTill,
      lastProductUsed: equipment.lastProductUsed,
      cleaningReason: equipment.cleaningReason,
      currentCampaignBatches: equipment.currentCampaignBatches,
    },
    targetProductCode,
  );

  if (!cleaningResult.valid) {
    for (const reason of cleaningResult.reasons) {
      interlocks.push({
        type: "HARD",
        message: reason,
        allowOverride: false,
        category: "CLEANING",
      });
    }
  }

  // Cleaning warnings → SOFT interlocks
  for (const warning of cleaningResult.warnings) {
    interlocks.push({
      type: "SOFT",
      message: warning,
      allowOverride: true,
      category: "CLEANING",
    });
  }

  // ── 6. Equipment already in active batch (HARD) ───────────────────────────
  if (
    activeBatchEquipmentIds.includes(equipment.id) ||
    activeBatchEquipmentIds.includes(equipment.identifier)
  ) {
    interlocks.push({
      type: "HARD",
      message: `Equipment "${equipment.identifier}" is already assigned to an active batch`,
      allowOverride: false,
      category: "ACTIVE_BATCH",
    });
  }

  // ── 7. Room readiness (SOFT) ──────────────────────────────────────────────
  if (roomReady === false) {
    interlocks.push({
      type: "SOFT",
      message: "Room is not marked as ready for production",
      allowOverride: true,
      category: "ROOM_READINESS",
    });
  }

  // ── 8. Station readiness (SOFT) ───────────────────────────────────────────
  if (stationReady === false) {
    interlocks.push({
      type: "SOFT",
      message: "Station is not marked as ready for production",
      allowOverride: true,
      category: "ROOM_READINESS",
    });
  }

  // ── Determine overall status ─────────────────────────────────────────────
  const hasHard = interlocks.some((i) => i.type === "HARD");
  const hasSoft = interlocks.some((i) => i.type === "SOFT");

  let status: InterlockResult["status"] = "OK";
  if (hasHard) status = "BLOCKED";
  else if (hasSoft) status = "WARNING";

  return { status, interlocks };
}
