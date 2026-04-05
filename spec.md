# PharmaExec MES — Logbook Enhancement

## Current State

Logbook tab already exists for EquipmentEntity/EquipmentClass with:
- `LogbookAction = 'Cleaning' | 'Pause' | 'Resume' | 'Execution'` (single generic Execution)
- `LogbookEntry` has: id, timestamp, user, action, reason, details?
- Timeline display with left-border color coding
- Seed data has logbook entries per equipment

## Requested Changes (Diff)

### Add
- Split `'Execution'` into `'Execution Start'` and `'Execution Stop'`
- Add `statusChange?: string` field to LogbookEntry (to record what status changed during the event)
- More robust seed data showing start/stop pairs with status changes

### Modify
- `LogbookAction` type: add `'Execution Start'` and `'Execution Stop'`, keep `'Execution'` for backward compat
- `LogbookEntry` interface: add optional `statusChange?: string`
- Logbook timeline UI: add status change display (small badge/row if `statusChange` present)
- Action icon mapping: different icons per action type for at-a-glance scanning
- Color coding: Execution Start = teal, Execution Stop = purple, Cleaning = blue, Pause = amber, Resume = green, Execution = teal (legacy)
- Update seed data for ee1–ee6 to use Execution Start/Stop and include statusChange

### Remove
- Nothing removed

## Implementation Plan
1. Update `LogbookAction` type in equipmentNodes.ts
2. Add `statusChange` field to `LogbookEntry`
3. Update seed data for all equipment items
4. Update Logbook tab in DataManager.tsx with new colors, icons, statusChange display
