/**
 * Entity Required Fields
 * Defines which fields are mandatory per entity type.
 * Used for validation alignment and RequiredLabel rendering.
 */

import type { EntityType } from "../lib/equipmentNodes";

/**
 * Map of entity type -> list of required field keys.
 * Field keys correspond to EquipmentNode properties or form field IDs.
 */
export const ENTITY_REQUIRED_FIELDS: Record<EntityType, string[]> = {
  WorkCenter: ["identifier", "shortDescription"],
  Room: ["identifier", "shortDescription"],
  Station: ["identifier", "shortDescription", "parentId"],
  SubStation: ["identifier", "shortDescription", "parentId"],
  EquipmentClass: ["identifier", "shortDescription", "manufacturer"],
  EquipmentEntity: [
    "identifier",
    "shortDescription",
    "roomId",
    "stationId",
    "manufacturer",
    "serialNumber",
  ],
  PropertyType: ["identifier", "shortDescription"],
  ProductMaster: ["identifier", "shortDescription"],
};

/**
 * Returns the list of required field names for a given entity type.
 */
export function getRequiredFields(entityType: EntityType): string[] {
  return (
    ENTITY_REQUIRED_FIELDS[entityType] ?? ["identifier", "shortDescription"]
  );
}

/**
 * Returns true if the given field is required for the given entity type.
 */
export function isFieldRequired(
  entityType: EntityType,
  fieldName: string,
): boolean {
  return getRequiredFields(entityType).includes(fieldName);
}

/**
 * Validates all required fields for a given entity type.
 * Returns a map of fieldName -> error message for missing fields.
 */
export function validateRequiredFields(
  entityType: EntityType,
  values: Record<string, unknown>,
): Record<string, string> {
  const required = getRequiredFields(entityType);
  const errors: Record<string, string> = {};

  for (const field of required) {
    const val = values[field];
    if (
      val === undefined ||
      val === null ||
      String(val).trim() === "" ||
      val === "none"
    ) {
      errors[field] = "Field is required";
    }
  }

  return errors;
}
