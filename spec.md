# PharmaExec MES — Change Control Revision Workflow

## Current State

- `DataManager.tsx` manages `EquipmentNode[]` in local state, initialized from `INITIAL_DATA` in `equipmentNodes.ts`.
- Each node has `status: 'Draft' | 'Approved'` and `changeHistory: ChangeEntry[]`.
- `EquipmentNode.changeHistory` tracks field-level diffs with `timestamp`, `field`, `oldValue`, `newValue`, `changedBy`, and optional `reason`.
- When `status === 'Approved'`, the Edit button is disabled and a lock icon is shown; direct editing is blocked.
- An "Approve" button transitions a Draft record to Approved.
- No revision/duplication workflow exists. No concept of `superseded` status or version lineage.

## Requested Changes (Diff)

### Add

- **`Superseded` status** to `GmpStatus` type in `gmpValidation.ts`.
- **`versionNumber` field** on `EquipmentNode` (number, default 1).
- **`originalId` field** on `EquipmentNode` (string | null) — points to the record this was revised from.
- **`revisedById` field** on `EquipmentNode` (string | null) — reverse pointer: which record superseded this one.
- **`changeControlReason` field** on `EquipmentNode` (string) — reason captured at revision time.
- **"Revise" button** in the detail header (replaces Edit when status === 'Approved').
- **Revision dialog** — prompts user for "Reason for Change" before creating the draft duplicate.
- **Revision creation logic** — duplicates the Approved record with a new id, status='Draft', versionNumber incremented, originalId set, preserves all fields.
- **Approval logic update** — when approving a revised record (originalId set), automatically set the original record's status to 'Superseded'.
- **"Version History" tab** in the right-panel tabs — shows all versions of the record (original + revisions), with version number, status badge, timestamp, and a "View" button to navigate to that version.
- **Superseded status styling** — gray badge with strikethrough for superseded records in cards and header.
- **Superseded card indicator** — grayed-out style on cards for superseded records.

### Modify

- `ChangeEntry` interface in `equipmentNodes.ts`: add optional `reason?: string` (already present) — no change needed.
- `handleApprove` in `DataManager.tsx`: after approving a revised record, mark the `originalId` record as Superseded and add change history entry.
- Edit button in toolbar (`data-ocid="data_manager.save_button"`) — when status === 'Approved', show "Revise" instead of "Edit".
- Change History tab — add `Reason` column.
- Logbook tab — include reason when present.
- Card status badge — add Superseded styling.

### Remove

- Nothing removed.

## Implementation Plan

1. **Update `gmpValidation.ts`** — add `'Superseded'` to `GmpStatus` type.
2. **Update `equipmentNodes.ts`** — add `versionNumber`, `originalId`, `revisedById`, `changeControlReason` fields to `EquipmentNode` interface.
3. **Update `DataManager.tsx`**:
   a. Add state: `reviseDialogOpen`, `reviseReason`.
   b. Add `handleRevise()` — opens revision dialog.
   c. Add `handleConfirmRevise()` — creates duplicate node with Draft status, incremented version, originalId.
   d. Update `handleApprove()` — if node has `originalId`, mark the original as Superseded, set `revisedById` on original.
   e. Update toolbar Edit/Save button — show "Revise" when Approved.
   f. Update detail header Edit button — show "Revise" with GitBranch icon when Approved.
   g. Add "Version History" tab between Logbook and Change History tabs.
   h. Implement Version History tab content — query all nodes sharing the same version chain (by originalId / revisedById), display in reverse-version order with status, version, created date, and a "View" button.
   i. Update card status badge — Superseded = gray badge.
   j. Add Revision Dialog component (reason-for-change input, Confirm/Cancel).
   k. Update Change History table to show Reason column.
