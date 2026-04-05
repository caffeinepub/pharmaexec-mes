/**
 * Execution Orchestrator Service
 * Central function for validating execution readiness.
 * Calls the interlock engine and decides block vs. override path.
 */

import {
  type InterlockContext,
  type InterlockResult,
  checkInterlocks,
} from "./interlockService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExecutionValidationResult {
  /** True if execution can proceed (no HARD interlocks) */
  success: boolean;
  /** True if execution is completely blocked (HARD interlock present) */
  blocked: boolean;
  /** True if execution has SOFT interlocks requiring override reason */
  requiresOverride: boolean;
  /** The override reason provided by the user (populated after override confirmation) */
  overrideReason?: string;
  /** Full interlock result from the engine */
  interlockResult: InterlockResult;
  /** Flat error strings (from HARD interlocks) */
  errors: string[];
  /** Flat warning strings (from SOFT interlocks) */
  warnings: string[];
}

export interface ExecutionOverrideContext extends InterlockContext {
  overrideReason: string;
  overrideBy: string;
}

// ─── Main Functions ────────────────────────────────────────────────────────

/**
 * Validates whether execution can proceed.
 * - HARD interlocks → blocked=true, success=false
 * - SOFT interlocks only → requiresOverride=true, success=false (until override provided)
 * - No interlocks → success=true
 */
export function validateExecution(
  context: InterlockContext,
): ExecutionValidationResult {
  const interlockResult = checkInterlocks(context);

  const hardInterlocks = interlockResult.interlocks.filter(
    (i) => i.type === "HARD",
  );
  const softInterlocks = interlockResult.interlocks.filter(
    (i) => i.type === "SOFT",
  );

  const blocked = hardInterlocks.length > 0;
  const requiresOverride = !blocked && softInterlocks.length > 0;
  const success = !blocked && !requiresOverride;

  return {
    success,
    blocked,
    requiresOverride,
    interlockResult,
    errors: hardInterlocks.map((i) => i.message),
    warnings: softInterlocks.map((i) => i.message),
  };
}

/**
 * Validates with override applied.
 * Only valid if there are no HARD interlocks and overrideReason is non-empty.
 */
export function validateExecutionWithOverride(
  context: ExecutionOverrideContext,
): ExecutionValidationResult {
  const result = validateExecution(context);

  if (result.blocked) {
    // HARD interlocks cannot be overridden
    return result;
  }

  if (!context.overrideReason || context.overrideReason.trim() === "") {
    return {
      ...result,
      success: false,
      requiresOverride: true,
      errors: ["Override reason is mandatory when bypassing soft interlocks"],
    };
  }

  // Override accepted
  return {
    ...result,
    success: true,
    requiresOverride: false,
    overrideReason: context.overrideReason,
  };
}
