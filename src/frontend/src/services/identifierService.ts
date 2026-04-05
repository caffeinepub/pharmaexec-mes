/**
 * Identifier Service
 * Auto-generates and validates entity identifiers.
 * Format rules: uppercase letters, numbers, and hyphens only.
 * Each entity type has a designated prefix.
 */

import type { EntityType, EquipmentNode } from "../lib/equipmentNodes";

// Prefix map per entity type
export const IDENTIFIER_PREFIXES: Record<EntityType, string> = {
  WorkCenter: "WC-",
  Room: "RM-",
  Station: "STA-",
  SubStation: "SUB-",
  EquipmentClass: "EQ-",
  EquipmentEntity: "EQ-",
  PropertyType: "PT-",
  ProductMaster: "PRD-",
};

// Format hint per entity type
export const IDENTIFIER_HINTS: Record<EntityType, string> = {
  WorkCenter: "Example: WC-MFG-01",
  Room: "Example: RM-MFG-01",
  Station: "Example: STA-COAT-01",
  SubStation: "Example: SUB-COAT-01A",
  EquipmentClass: "Example: EQ-COATER-CLS",
  EquipmentEntity: "Example: EQ-COAT-01",
  PropertyType: "Example: PT-TEMP-01",
  ProductMaster: "Example: PRD-AMX-001",
};

// Identifier format regex: uppercase letters, numbers, hyphens only, min 3 chars
const _IDENTIFIER_REGEX = /^[A-Z0-9][A-Z0-9-]{1,}[A-Z0-9]$|^[A-Z0-9]{2,}$/;

/**
 * Validates identifier format.
 * Only uppercase letters, numbers, and hyphens.
 * No leading/trailing hyphens. Min length 2.
 */
export function validateIdentifierFormat(id: string): {
  valid: boolean;
  message: string;
} {
  if (!id || id.trim() === "") {
    return { valid: false, message: "Identifier is required" };
  }
  if (id !== id.toUpperCase()) {
    return { valid: false, message: "Identifier must be uppercase" };
  }
  if (!/^[A-Z0-9-]+$/.test(id)) {
    return {
      valid: false,
      message: "Only uppercase letters, numbers, and hyphens allowed",
    };
  }
  if (id.startsWith("-") || id.endsWith("-")) {
    return {
      valid: false,
      message: "Identifier cannot start or end with a hyphen",
    };
  }
  if (id.includes("--")) {
    return {
      valid: false,
      message: "Identifier cannot contain consecutive hyphens",
    };
  }
  if (id.length < 2) {
    return {
      valid: false,
      message: "Identifier must be at least 2 characters",
    };
  }
  return { valid: true, message: "" };
}

/**
 * Validates that identifier is unique for the given entity type.
 * Optionally excludes a record by ID (for future use if unlocking is added).
 */
export function validateIdentifierUniqueness(
  identifier: string,
  entityType: EntityType,
  existingNodes: EquipmentNode[],
  excludeId?: string,
): { unique: boolean; message: string } {
  const duplicate = existingNodes.find(
    (n) =>
      n.entityType === entityType &&
      n.identifier.toUpperCase() === identifier.toUpperCase() &&
      n.id !== excludeId,
  );
  if (duplicate) {
    return {
      unique: false,
      message: `Identifier "${identifier}" already exists for ${entityType}`,
    };
  }
  return { unique: true, message: "" };
}

/**
 * Auto-generates a unique identifier for the given entity type.
 * Format: PREFIX + random 4-digit alphanumeric suffix.
 * Retries if collision detected.
 */
export function generateIdentifier(
  entityType: EntityType,
  existingNodes: EquipmentNode[],
): string {
  const prefix = IDENTIFIER_PREFIXES[entityType] ?? "ID-";
  const existingIds = new Set(
    existingNodes
      .filter((n) => n.entityType === entityType)
      .map((n) => n.identifier.toUpperCase()),
  );

  // Try up to 20 times to generate a unique ID
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = generateSuffix();
    const candidate = `${prefix}${suffix}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }

  // Fallback: use timestamp
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

function generateSuffix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude ambiguous chars
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitizes an identifier input: converts to uppercase, replaces spaces with hyphens,
 * removes invalid characters.
 */
export function sanitizeIdentifier(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}
