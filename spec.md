# PharmaExec MES — Cleaning Status Update Fix

## Current State
- `cleaningValidationService.ts` contains the full cleaning validation logic (product code, campaign length, DETH time, Fixed vs Moveable rules). This must NOT be changed.
- `DataManager.tsx` has `handleConfirmSave` which saves entity changes but does NOT recalculate `cleaningStatus` or `cleaningValidTill` after save.
- The cleaning badge in the warning banner and Specification tab reads from the saved `currentNode`, so it shows stale values after fields like `lastProductUsed`, `cleaningReason`, `lastCleanedAt`, or `currentCampaignBatches` are changed and saved.
- `computeCleaningBadge` and `computeCleaningValidTill` are already imported from `cleaningValidationService.ts`.
- There is a `Log Cleaning Event` dialog that does update cleaningStatus/lastCleanedAt, but there is no simple `Perform Cleaning` button that resets `lastCleanedAt = now` + `currentCampaignBatches = 0`.

## Requested Changes (Diff)

### Add
- **Recalculate cleaning on save**: In `handleConfirmSave`, after building `savedDraft` (post campaign reset), check if any of these fields changed: `lastProductUsed`, `cleaningReason`, `currentCampaignBatches`, `lastCleanedAt`. If so, call `computeCleaningBadge(savedDraft)` and `computeCleaningValidTill(savedDraft.lastCleanedAt, savedDraft.lastProductUsed)` (if applicable) and update `cleaningStatus` and `cleaningValidTill` on the node being saved. Log the cleaning status recalculation as a change history entry.
- **"Perform Cleaning" button**: Add a teal/green button labeled "Perform Cleaning" in the Equipment Specification tab's cleaning check section (and/or near the cleaning warning banner). This button is visible for Equipment nodes when NOT in editMode. On click: show a confirmation dialog asking for a cleaning reason. On confirm: set `lastCleanedAt = now (ISO string)`, `currentCampaignBatches = 0`, call `computeCleaningBadge` and `computeCleaningValidTill` with the updated values, update `cleaningStatus` and `cleaningValidTill` on the node, log a logbook entry (action: "Cleaning") and a change history entry. Show toast "Cleaning performed. Status updated to Clean.".

### Modify
- **`handleConfirmSave`**: After computing `savedDraft` (which already handles campaign reset), add cleaning recalculation logic. Check if trigger fields changed (`lastProductUsed`, `cleaningReason`, `currentCampaignBatches`, `lastCleanedAt`). For equipment nodes only, run `computeCleaningBadge` on the savedDraft fields and update `cleaningStatus`. If `lastCleanedAt` and `lastProductUsed` are both present, also recompute `cleaningValidTill` via `computeCleaningValidTill`.
- **Cleaning warning banner** (lines ~2582-2632): Already reads from `currentNode` (saved state), so it will auto-update after save. No changes needed here.
- **Equipment card cleaning badge** (lines ~1925-1935): Already uses `computeCleaningBadge` live from node fields. No changes needed.

### Remove
- Nothing removed.

## Implementation Plan

1. In `handleConfirmSave` (after the `savedDraft` is built from campaign reset logic):
   - Define trigger fields: `['lastProductUsed', 'cleaningReason', 'currentCampaignBatches', 'lastCleanedAt']`
   - Check if `savedDraft.entityType === 'EquipmentEntity' || === 'EquipmentClass'`
   - Check if any trigger field changed between `prev` and `savedDraft`
   - If changed: call `computeCleaningBadge({ equipmentId: savedDraft.id, equipmentType: savedDraft.equipmentType, lastCleanedAt: savedDraft.lastCleanedAt, cleaningValidTill: savedDraft.cleaningValidTill, lastProductUsed: savedDraft.lastProductUsed, cleaningReason: savedDraft.cleaningReason, currentCampaignBatches: savedDraft.currentCampaignBatches })` → get `newBadge`
   - Also call `computeCleaningValidTill(savedDraft.lastCleanedAt, savedDraft.lastProductUsed)` if both are defined → get `newValidTill`
   - Build `cleaningRecalcEntries` (change history) for `cleaningStatus` and `cleaningValidTill` changes
   - Apply to the final saved node: `{ ...savedDraft, cleaningStatus: newBadge, cleaningValidTill: newValidTill ?? savedDraft.cleaningValidTill }`
   - Append `cleaningRecalcEntries` to `allChanges`

2. Add `performCleaningDialogOpen` state (boolean) and `performCleaningReason` state (string).

3. Add `handlePerformCleaning` function:
   - Validate `performCleaningReason.trim()` is non-empty
   - Build `now = new Date().toISOString()`
   - Compute `newValidTill = computeCleaningValidTill(now, node.lastProductUsed ?? '')` (fallback 72h if no product)
   - Compute `newBadge = computeCleaningBadge({ ..., lastCleanedAt: now, currentCampaignBatches: 0 })`
   - Call `setNodes` to update: `lastCleanedAt: now`, `currentCampaignBatches: 0`, `cleaningStatus: newBadge`, `cleaningValidTill: newValidTill`, append logbook entry (action: 'Cleaning', reason: performCleaningReason, user: CURRENT_USER, timestamp: now), append change history entries
   - Close dialog, show toast

4. Add "Perform Cleaning" button in the Equipment Specification tab's Cleaning Check section (after the `cleaningValidTill` field row, before any existing cleaning warning). Button is shown only when `!editMode && isEquipmentNode(currentNode)`. Style: teal outline button, size sm, icon `Sparkles` or `Droplets`.

5. Also place the "Perform Cleaning" button in the cleaning warning banner area (near the banner shown when `cb === 'Due'` or `'Expired'`) for quick access from the header.

6. Add a simple confirmation dialog for "Perform Cleaning" with a textarea for reason input.
