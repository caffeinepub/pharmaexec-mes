# PharmaExec MES — Data Manager Refactor

## Current State

The Data Manager (`src/frontend/src/pages/DataManager.tsx`) is a large monolithic component (~1500+ lines) that:
- Manages multiple entity types (EquipmentEntity, EquipmentClass, WorkCenter, Station, PropertyType)
- Has GMP fields, status control (Draft/Approved), audit trail via Change History, and a GMP validation engine
- Uses EquipmentNode interface from `lib/equipmentNodes.ts` for equipment-specific entities
- Has some inline validation logic and state management scattered throughout the component
- Status model is currently Draft | Approved (2 states)
- No `isUsedInBatch` field on Data Manager records
- No `Executed` status
- No pagination (loads all records at once)
- Edit button UX: disabled for Approved, enabled for Draft (Make Draft flow implemented)
- Audit trail: Change History tab logs field-level changes with user/timestamp
- No `createdBy`, `createdAt`, `updatedAt` timestamps on records
- No `canEdit()`, `canDelete()`, `canApprove()` utility functions (logic is inline)
- No try/catch error handling with toast notifications
- No batch safety check (isUsedInBatch guard)
- No pagination controls
- No Delete action (GMP-compliant — deletion disabled)
- Code structure: everything in one file, no services/ or utils/ separation

## Requested Changes (Diff)

### Add
- `Executed` status (3rd state: strictly locked, no changes at all)
- `isUsedInBatch: boolean` field on DMRecord data model
- `createdBy`, `createdAt`, `updatedAt` timestamps on all DM records
- Utility functions: `canEdit(record)`, `canDelete(record)`, `canApprove(record)` in `utils/dmRules.ts`
- Validation utilities in `utils/dmValidation.ts`: mandatory field checks, user-friendly error messages
- Service layer in `services/dmService.ts`: CRUD operations with try/catch, localStorage integration, audit trail writes
- Pagination: 15 records per page, client-side pagination with page controls
- Toast notifications on errors ("Something went wrong. Please try again")
- Batch safety check: disable Edit + Delete if `isUsedInBatch = true`, show alert message
- Status color coding: Draft → grey, Approved → green, Executed → blue
- Tooltips on disabled buttons explaining WHY they are disabled
- Warning dialog when Approved record is attempted to be modified
- Executed status badge (blue) and full lock state in UI

### Modify
- `DataManager.tsx`: refactor to use utility functions and service layer; remove inline logic; add pagination UI; use memoization (useMemo, useCallback) to prevent unnecessary re-renders
- `lib/equipmentNodes.ts` (or equivalent DM types): extend DMRecord interface to include `status: 'Draft' | 'Approved' | 'Executed'`, `isUsedInBatch`, `createdBy`, `createdAt`, `updatedAt`
- Audit trail: ensure every action (Create, Update, Delete, Approve, Execute) is logged with user/action/field/old/new/timestamp
- Edit button: disable for Approved AND Executed; show tooltip; Executed records show NO edit path at all
- Delete: enabled only for Draft records where `isUsedInBatch = false`

### Remove
- Inline status-check logic scattered in DataManager.tsx (replaced by utility functions)
- Direct localStorage reads/writes inside component event handlers (moved to service layer)

## Implementation Plan

1. Create `src/frontend/src/utils/dmRules.ts`
   - `canEdit(record)`: returns true only if status === 'Draft' AND isUsedInBatch === false
   - `canDelete(record)`: same rules as canEdit
   - `canApprove(record)`: returns true only if status === 'Draft'
   - `canExecute(record)`: returns true only if status === 'Approved'
   - `getEditTooltip(record)`: returns the appropriate tooltip message
   - `getDeleteTooltip(record)`: returns the appropriate tooltip message

2. Create `src/frontend/src/utils/dmValidation.ts`
   - `validateRecord(record)`: checks all mandatory fields, returns `{ valid: boolean, errors: string[] }`
   - Field rules: name required, status required

3. Create `src/frontend/src/services/dmService.ts`
   - `createRecord(data)`: try/catch, writes to localStorage, appends audit event, returns new record
   - `updateRecord(id, changes, reason)`: try/catch, diffs old vs new, logs each changed field to audit trail
   - `deleteRecord(id)`: try/catch, logs DELETE action
   - `approveRecord(id)`: changes status Draft→Approved, logs APPROVE action
   - `executeRecord(id)`: changes status Approved→Executed, logs EXECUTE action
   - All functions accept `user: string` param for audit trail

4. Update `DataManager.tsx`
   - Import and use `canEdit`, `canDelete`, `canApprove` from dmRules.ts
   - Import and use `validateRecord` from dmValidation.ts
   - Import and use service functions from dmService.ts
   - Add `isUsedInBatch`, `createdBy`, `createdAt`, `updatedAt` to DM record data model and seed data
   - Add `Executed` status handling throughout (badge, lock state, no Make Draft for Executed)
   - Implement client-side pagination (15 per page) with page controls in the card list area
   - Add batch safety alert banner when editing/deleting isUsedInBatch record is attempted
   - Wrap all event handlers in try/catch, show toast on error
   - Use useMemo for filtered/paginated record lists; useCallback for event handlers
   - Status badge colors: Draft=grey, Approved=green, Executed=blue
   - Buttons: disabled (not hidden) for non-Draft statuses; TooltipProvider wrapping disabled buttons
