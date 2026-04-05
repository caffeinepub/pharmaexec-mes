// DM Service — PharmaExec MES
// Wraps all Data Manager localStorage operations with error handling,
// audit trail logging, and business rule enforcement.

import type { EquipmentNode } from "../lib/equipmentNodes";
import { auditStore } from "../lib/localStore";

const DM_KEY = "mes_dm_nodes";

// ---- Storage helpers ----

function loadNodes(): EquipmentNode[] {
  try {
    const raw = localStorage.getItem(DM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EquipmentNode[];
  } catch {
    return [];
  }
}

function saveNodes(nodes: EquipmentNode[]): void {
  localStorage.setItem(DM_KEY, JSON.stringify(nodes));
}

// ---- Audit helper ----

function logAudit(
  action: string,
  entityId: string,
  entityName: string,
  user: string,
  details: string,
): void {
  try {
    // Use the existing auditStore if entity types match;
    // otherwise just record the event in a DM-specific audit log.
    const event = {
      eventId: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      action,
      entityId,
      entityName,
      performedBy: user,
      details,
    };
    // auditStore.add expects AuditEvent shape — log only if compatible
    try {
      (auditStore as { add: (e: unknown) => void }).add(event);
    } catch {
      // Fallback: append to a separate DM audit key
      const key = "mes_dm_audit";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      list.push(event);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    // Non-blocking — never let audit logging crash the UI
  }
}

// ---- Public API ----

export function getAllDMNodes(): EquipmentNode[] {
  return loadNodes();
}

/**
 * Create a new DM record and log the CREATE audit event.
 */
export function createDMRecord(
  data: Omit<EquipmentNode, "id" | "createdAt" | "changeHistory">,
  user: string,
): EquipmentNode {
  try {
    const nodes = loadNodes();
    const now = new Date().toISOString();
    const record: EquipmentNode = {
      ...data,
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      createdBy: user,
      updatedAt: now,
      isUsedInBatch: false,
      changeHistory: [
        {
          timestamp: now,
          field: "*",
          oldValue: "",
          newValue: "Created",
          changedBy: user,
          action: "Create",
          reason: "Record created",
        },
      ],
    };
    nodes.push(record);
    saveNodes(nodes);
    logAudit(
      "Create",
      record.id,
      record.shortDescription,
      user,
      `Created ${record.entityType}: ${record.identifier}`,
    );
    return record;
  } catch (err) {
    throw new Error(`Failed to create record: ${String(err)}`);
  }
}

/**
 * Update a DM record, diff old vs new fields, and log each changed field.
 */
export function updateDMRecord(
  id: string,
  changes: Partial<EquipmentNode>,
  user: string,
  reason?: string,
): EquipmentNode {
  try {
    const nodes = loadNodes();
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found`);

    const prev = nodes[idx];
    if (prev.status === "Executed") {
      throw new Error(
        "Executed records are strictly locked and cannot be modified",
      );
    }
    if (prev.isUsedInBatch) {
      throw new Error(
        "This record is used in an active batch and cannot be modified",
      );
    }

    const now = new Date().toISOString();
    const skipFields = new Set([
      "changeHistory",
      "createdAt",
      "cleaningRules",
      "cleaningLog",
      "id",
    ]);

    const newChangeEntries = Object.entries(changes)
      .filter(([field]) => !skipFields.has(field))
      .filter(
        ([field, newVal]) =>
          String(prev[field as keyof EquipmentNode] ?? "") !==
          String(newVal ?? ""),
      )
      .map(([field, newVal]) => ({
        timestamp: now,
        field,
        oldValue: String(prev[field as keyof EquipmentNode] ?? ""),
        newValue: String(newVal ?? ""),
        changedBy: user,
        action: "Update" as const,
        reason: reason ?? "",
      }));

    const updated: EquipmentNode = {
      ...prev,
      ...changes,
      id: prev.id,
      createdAt: prev.createdAt,
      createdBy: prev.createdBy,
      updatedAt: now,
      changeHistory: [...prev.changeHistory, ...newChangeEntries],
    };

    nodes[idx] = updated;
    saveNodes(nodes);

    if (newChangeEntries.length > 0) {
      logAudit(
        "Update",
        id,
        updated.shortDescription,
        user,
        `Updated ${newChangeEntries.map((c) => c.field).join(", ")}`,
      );
    }

    return updated;
  } catch (err) {
    throw new Error(String(err));
  }
}

/**
 * Delete a DM record (only allowed for Draft, not in batch).
 */
export function deleteDMRecord(id: string, user: string): void {
  try {
    const nodes = loadNodes();
    const target = nodes.find((n) => n.id === id);
    if (!target) throw new Error(`Record ${id} not found`);
    if (target.status !== "Draft") {
      throw new Error(
        `Only Draft records can be deleted (current status: ${target.status})`,
      );
    }
    if (target.isUsedInBatch) {
      throw new Error(
        "This record is used in an active batch and cannot be deleted",
      );
    }
    const filtered = nodes.filter((n) => n.id !== id);
    saveNodes(filtered);
    logAudit(
      "Delete",
      id,
      target.shortDescription,
      user,
      `Deleted record: ${target.identifier}`,
    );
  } catch (err) {
    throw new Error(String(err));
  }
}

/**
 * Approve a DM record (Draft → Approved).
 */
export function approveDMRecord(id: string, user: string): EquipmentNode {
  try {
    const nodes = loadNodes();
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found`);
    const prev = nodes[idx];
    if (prev.status !== "Draft") {
      throw new Error(
        `Only Draft records can be approved (current: ${prev.status})`,
      );
    }
    const now = new Date().toISOString();
    const updated: EquipmentNode = {
      ...prev,
      status: "Approved",
      updatedAt: now,
      changeHistory: [
        ...prev.changeHistory,
        {
          timestamp: now,
          field: "status",
          oldValue: "Draft",
          newValue: "Approved",
          changedBy: user,
          action: "Update" as const,
          reason: "GMP Status Approval",
        },
      ],
    };
    nodes[idx] = updated;
    saveNodes(nodes);
    logAudit("Approve", id, updated.shortDescription, user, "Record approved");
    return updated;
  } catch (err) {
    throw new Error(String(err));
  }
}

/**
 * Execute a DM record (Approved → Executed).
 * This is a terminal state — no further modifications allowed.
 */
export function executeDMRecord(id: string, user: string): EquipmentNode {
  try {
    const nodes = loadNodes();
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found`);
    const prev = nodes[idx];
    if (prev.status !== "Approved") {
      throw new Error(
        `Only Approved records can be executed (current: ${prev.status})`,
      );
    }
    const now = new Date().toISOString();
    const updated: EquipmentNode = {
      ...prev,
      status: "Executed",
      updatedAt: now,
      changeHistory: [
        ...prev.changeHistory,
        {
          timestamp: now,
          field: "status",
          oldValue: "Approved",
          newValue: "Executed",
          changedBy: user,
          action: "Update" as const,
          reason: "Batch Execution confirmed",
        },
      ],
    };
    nodes[idx] = updated;
    saveNodes(nodes);
    logAudit(
      "Execute",
      id,
      updated.shortDescription,
      user,
      "Record executed — terminal state",
    );
    return updated;
  } catch (err) {
    throw new Error(String(err));
  }
}

/**
 * Convert an Approved record back to Draft for controlled editing.
 * NOT allowed from Executed status.
 */
export function makeDraftDMRecord(
  id: string,
  user: string,
  reason: string,
): EquipmentNode {
  try {
    const nodes = loadNodes();
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found`);
    const prev = nodes[idx];
    if (prev.status === "Executed") {
      throw new Error(
        "Executed records cannot be reverted to Draft. This is a terminal state.",
      );
    }
    if (prev.status !== "Approved") {
      throw new Error(
        `Only Approved records can be converted to Draft (current: ${prev.status})`,
      );
    }
    const now = new Date().toISOString();
    const updated: EquipmentNode = {
      ...prev,
      status: "Draft",
      updatedAt: now,
      changeHistory: [
        ...prev.changeHistory,
        {
          timestamp: now,
          field: "status",
          oldValue: "Approved",
          newValue: "Draft",
          changedBy: user,
          action: "Update" as const,
          reason: reason || "Converted to Draft for modification",
        },
      ],
    };
    nodes[idx] = updated;
    saveNodes(nodes);
    logAudit(
      "Make Draft",
      id,
      updated.shortDescription,
      user,
      reason || "Converted to Draft",
    );
    return updated;
  } catch (err) {
    throw new Error(String(err));
  }
}
