// DM Workflow Rules — PharmaExec MES
// Pure utility functions for workflow rule evaluation.
// No side effects, no React imports.

export type DMRuleRecord = {
  status: "Draft" | "Approved" | "Executed";
  isUsedInBatch?: boolean;
};

/** Edit is allowed ONLY for Draft records that are not in an active batch. */
export function canEdit(record: DMRuleRecord): boolean {
  return record.status === "Draft" && !record.isUsedInBatch;
}

/** Delete is allowed ONLY for Draft records that are not in an active batch. */
export function canDelete(record: DMRuleRecord): boolean {
  return record.status === "Draft" && !record.isUsedInBatch;
}

/** Approve is allowed only from Draft. */
export function canApprove(record: DMRuleRecord): boolean {
  return record.status === "Draft";
}

/** Execute is allowed only from Approved. */
export function canExecute(record: DMRuleRecord): boolean {
  return record.status === "Approved";
}

/** Make Draft (revert) is allowed only from Approved (not Executed). */
export function canMakeDraft(record: DMRuleRecord): boolean {
  return record.status === "Approved";
}

/** Tooltip text for the Edit button based on current record state. */
export function getEditTooltip(record: DMRuleRecord): string {
  if (record.isUsedInBatch) {
    return "This record is used in an active batch and cannot be modified";
  }
  if (record.status === "Approved") {
    return "Only Draft records can be edited. Click 'Make Draft' to edit.";
  }
  if (record.status === "Executed") {
    return "Executed records are strictly locked and cannot be modified";
  }
  return "Edit this record";
}

/** Tooltip text for the Delete button based on current record state. */
export function getDeleteTooltip(record: DMRuleRecord): string {
  if (record.isUsedInBatch) {
    return "This record is used in an active batch and cannot be modified";
  }
  if (record.status === "Executed") {
    return "Executed records cannot be deleted";
  }
  if (record.status !== "Draft") {
    return "Only Draft records can be deleted";
  }
  return "Delete this record";
}

/** Returns the Tailwind CSS classes for a status badge. */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-700 border-gray-300";
    case "Approved":
      return "bg-green-100 text-green-800 border-green-300";
    case "Executed":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

/** Returns a semantic color key for the status (for programmatic use). */
export function getStatusColor(status: string): "grey" | "green" | "blue" {
  switch (status) {
    case "Approved":
      return "green";
    case "Executed":
      return "blue";
    default:
      return "grey";
  }
}
