// unbindService.ts — Unbind Equipment / Room from Batch
// PharmaExec MES — GMP-compliant batch release logic

import type { EquipmentNode, LogbookEntry } from "../lib/equipmentNodes";

export interface UnbindParams {
  node: EquipmentNode;
  batchId: string;
  reason: string;
  user: string;
  /** True when the batch is currently in an active state (In Process / Released) */
  isActiveBatch: boolean;
  /** Must be true when isActiveBatch is true; requires Supervisor override */
  override: boolean;
}

export interface UnbindResult {
  success: boolean;
  updatedNode: EquipmentNode;
  error?: string;
}

/**
 * Unbind an equipment or room entity from a batch.
 *
 * Business rules:
 * - If batch is active (In Process / Released) and override = false → block and return error.
 * - On success:
 *   - Clear currentBatchId and currentBatchStatus.
 *   - Move currentBatchId → lastBatch.
 *   - Set isUsedInBatch = false.
 *   - Add a logbook entry with action "Unbind".
 *   - Add a changeHistory entry with action = "Update".
 */
export function unbindFromBatch(params: UnbindParams): UnbindResult {
  const { node, batchId, reason, user, isActiveBatch, override } = params;

  // Validation: block if batch is active and no override
  if (isActiveBatch && !override) {
    return {
      success: false,
      updatedNode: node,
      error:
        "Batch is currently active (In Process / Released). Supervisor override is required to unbind.",
    };
  }

  const now = new Date().toISOString();
  const isRoom = node.entityType === "Room" || node.entityType === "WorkCenter";

  // Build logbook entry
  const logbookEntry: LogbookEntry = {
    id: `lb-unbind-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    user,
    action: "Unbind",
    reason: `${override ? "[SUPERVISOR OVERRIDE] " : ""}${reason}`,
    statusChange: `Bound (${batchId}) → Available`,
    details: `Unbound from batch ${batchId}${override ? " via supervisor override" : ""}`,
    entityType: isRoom ? "Room" : "Equipment",
    entityIdentifier: node.identifier,
  };

  // Build change history entry
  const changeEntry = {
    timestamp: now,
    field: "batchBinding",
    oldValue: batchId,
    newValue: "null",
    changedBy: user,
    action: "Update" as const,
    reason: `UNBIND: ${reason}${override ? " [SUPERVISOR OVERRIDE]" : ""}`,
  };

  const updatedNode: EquipmentNode = {
    ...node,
    // Clear batch linkage
    currentBatchId: undefined,
    currentBatchStatus: undefined,
    // Move current batch to previous context
    lastBatch: batchId,
    // Release batch lock
    isUsedInBatch: false,
    // Audit trail
    updatedAt: now,
    logbookEntries: [...(node.logbookEntries ?? []), logbookEntry],
    changeHistory: [...node.changeHistory, changeEntry],
  };

  return { success: true, updatedNode };
}

/**
 * Returns true if the given batch status string represents an active batch
 * that would require Supervisor override to unbind.
 */
export function isBatchActive(batchStatus: string | undefined): boolean {
  if (!batchStatus) return false;
  const active = ["In Process", "Released", "inProgress"];
  return active.includes(batchStatus);
}
