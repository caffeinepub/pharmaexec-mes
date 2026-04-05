// DM Record Validation — PharmaExec MES
// Field-level validation rules for Data Manager records.
// Returns a ValidationResult with all errors for inline display.

import type { EntityType } from "../lib/equipmentNodes";
import { validateRequiredFields } from "./entityRequiredFields";

export interface DMValidationResult {
  valid: boolean;
  errors: Record<string, string>; // field -> error message
  errorList: string[]; // flat list for toast/summary
}

export interface DMRecordFields {
  name?: string; // maps to shortDescription
  identifier?: string;
  shortDescription?: string;
  description?: string;
  [key: string]: unknown;
}

/** Validate required and format rules before save. */
export function validateRecord(
  record: DMRecordFields,
  entityType?: EntityType,
): DMValidationResult {
  const errors: Record<string, string> = {};

  // shortDescription (displayed as "Name" in UI) is the primary required field
  const name = (record.shortDescription ?? record.name ?? "").trim();
  if (!name) {
    errors.shortDescription = "Name is required";
  } else if (name.length < 2) {
    errors.shortDescription = "Name must be at least 2 characters";
  }

  // identifier is required and must follow a basic pattern
  const identifier = (record.identifier ?? "").trim();
  if (!identifier) {
    errors.identifier = "Identifier is required";
  } else if (identifier.length < 2) {
    errors.identifier = "Identifier must be at least 2 characters";
  }

  // If entityType is provided, run entity-specific required field validation
  if (entityType) {
    const values: Record<string, unknown> = {};
    for (const k of Object.keys(record)) {
      values[k] = record[k];
    }
    // Map name -> shortDescription for the check
    if (!values.shortDescription && values.name) {
      values.shortDescription = values.name;
    }
    const entityErrors = validateRequiredFields(entityType, values);
    for (const [field, msg] of Object.entries(entityErrors)) {
      if (!errors[field]) {
        errors[field] = msg;
      }
    }
  }

  const errorList = Object.values(errors);
  return {
    valid: errorList.length === 0,
    errors,
    errorList,
  };
}

/** Validate only the New Record dialog fields (lighter rules). */
export function validateNewRecord(
  fields: {
    identifier: string;
    shortDescription: string;
    [key: string]: unknown;
  },
  entityType?: EntityType,
): DMValidationResult {
  const errors: Record<string, string> = {};

  if (!fields.identifier.trim()) {
    errors.identifier = "Identifier is required";
  }
  if (!fields.shortDescription.trim()) {
    errors.shortDescription = "Short Description is required";
  } else if (fields.shortDescription.trim().length < 2) {
    errors.shortDescription = "Short Description must be at least 2 characters";
  }

  // If entityType is provided, run entity-specific required field validation
  if (entityType) {
    const entityErrors = validateRequiredFields(
      entityType,
      fields as Record<string, unknown>,
    );
    for (const [field, msg] of Object.entries(entityErrors)) {
      if (!errors[field]) {
        errors[field] = msg;
      }
    }
  }

  const errorList = Object.values(errors);
  return { valid: errorList.length === 0, errors, errorList };
}
