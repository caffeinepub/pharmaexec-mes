# PharmaExec MES — Data Manager Simplification

## Current State

DataManager.tsx (~2761 lines) implements a version control workflow for Approved records:
- Approved records are **read-only**; editing is blocked with a toast error
- A "Revise" button (replaces Edit for Approved records) creates a **duplicate Draft copy** of the record with incremented `versionNumber`, `originalId`, and `changeControlReason`
- Approving a revision marks all prior versions as `"Superseded"` status
- A **"Versions" tab** shows the full revision chain with "View" navigation buttons
- A "Revise" dialog prompts for a mandatory reason before creating the duplicate
- The detail header shows a "Workflow" button navigating to `/workflow-designer`
- States: `reviseDialogOpen`, `reviseReason`
- Handlers: `handleRevise`, `handleConfirmRevise`
- EquipmentNode has optional fields: `versionNumber`, `originalId`, `revisedById`, `changeControlReason`
- GmpStatus includes `"Superseded"` value
- Change History tab already exists and shows field-level changes with timestamp/changedBy/reason

## Requested Changes (Diff)

### Add
- Save confirmation dialog: before applying edits, show "Are you sure you want to modify this record?" — user can cancel or proceed
- Enhanced Change History tracking: when Save is clicked, capture `reason` alongside each changed field entry (prompt user for reason in the confirmation dialog)
- Save confirmation dialog state and handler

### Modify
- `handleEdit`: Remove the block that prevents editing Approved records; allow editing for both Draft and Approved status
- `handleSave`: Remove the block that prevents saving Approved records; wrap with confirmation dialog before saving; capture reason from confirmation dialog
- Detail header button logic: Replace the `Approved → Revise` / `Draft → Edit` conditional with a single **Edit** button visible for both Draft and Approved (hide for Superseded only); remove Revise button
- Detail header: Remove the Read-only lock badge shown for Approved records
- Tabs: Remove the `"Versions"` TabsTrigger and TabsContent entirely
- Detail header: Remove the Workflow button JSX block (keep navigation import and backend logic intact)
- Status badge: Keep showing Draft/Approved badge; remove Superseded-specific handling in the read-only lock display

### Remove
- `reviseDialogOpen` state
- `reviseReason` state  
- `handleRevise` function
- `handleConfirmRevise` function
- Revise dialog JSX block (Dialog for revise reason)
- Versions TabsTrigger and TabsContent
- Workflow Button JSX block in detail header
- Version badge (`v{currentNode.versionNumber}`) display in detail header
- Read-only lock icon display in header for Approved records
- All guards in `handleEdit`/`handleSave` that block Approved records

## Implementation Plan

1. Remove `reviseDialogOpen`, `reviseReason` states
2. Remove `handleRevise` and `handleConfirmRevise` functions
3. Modify `handleEdit`: remove the `if (selected.status === "Approved") { toast.error... return; }` guard — allow editing any non-null record
4. Add `saveConfirmOpen` and `saveConfirmReason` states
5. Modify `handleSave`: instead of directly saving, open confirmation dialog; move actual save logic to `handleConfirmSave`
6. Add `handleConfirmSave`: executes the existing save logic but includes `reason: saveConfirmReason` in each ChangeEntry
7. In detail header buttons: remove the `currentNode.status === "Approved" ? <Revise button> : ...` conditional; show plain Edit button for all non-Superseded records; remove Workflow button JSX; remove Read-only lock badge; remove version badge display
8. In Tabs: remove `<TabsTrigger value="versions">` and corresponding `<TabsContent value="versions">`
9. Add save confirmation Dialog JSX with reason textarea
10. Remove the Revise Dialog JSX block
