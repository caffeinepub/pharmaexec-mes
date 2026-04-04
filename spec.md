# PharmaExec MES

## Current State
Data Manager has status control (Draft/Approved). Edit button is disabled for Approved records with no path to re-enable editing. Approved records are fully read-only with no mechanism to convert back to Draft.

## Requested Changes (Diff)

### Add
- "Make Draft" button in detail header, visible only when status = "Approved"
- Confirmation dialog before converting: "Are you sure you want to convert this Approved record to Draft?"
- Success toast/message after conversion: "Record converted to Draft. You can now edit."
- Change History entry on Make Draft: field_name="status", old_value="Approved", new_value="Draft", changed_by=current user, timestamp, reason="Converted to Draft for modification"

### Modify
- Edit button: when status = "Approved", show tooltip "Approved records are read-only. Click 'Make Draft' to edit." and keep disabled
- Edit button: when status = "Draft", normal enabled behavior (no change)
- Detail header button layout: add Make Draft button next to Validate button

### Remove
- Nothing removed

## Implementation Plan
1. Read DataManager.tsx to understand current Edit button and header button layout
2. Add tooltip wrapper around the disabled Edit button for Approved records
3. Add "Make Draft" button in detail header (conditional on status = "Approved")
4. Implement `handleMakeDraft()` function:
   - Show confirmation dialog
   - On confirm: update record status to "Draft", append Change History entry, show success message
5. Use existing dialog/toast patterns already in the file
