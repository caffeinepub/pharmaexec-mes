# PharmaExec MES

## Current State
The Data Manager has full cleaning management for Equipment entities (Cleaning tab, cleaning status badges, cleaning validation service integration). However, Room entities currently:
- Show **"No simplified specification data for this entity type"** in the Specification tab
- Have no cleaning fields (`cleaningStatus`, `lastCleanedAt`, `cleaningValidTill`, `requiresCleaning`, `cleaningType`) on the `EquipmentNode` interface or seed data
- Have no Cleaning Check section in the Specification tab or a dedicated cleaning section

## Requested Changes (Diff)

### Add
- **Room Cleaning fields** on `EquipmentNode` interface: `roomCleaningStatus` ("Clean" | "Required" | "Overdue"), `roomLastCleanedAt`, `roomCleaningValidTill`, `roomCleaningType` ("CIP" | "Manual" | "None"), `roomRequiresCleaning` (boolean), `roomLastProduct`, `roomCleaningLevel` ("None" | "Minor" | "Major")
- **Specification Tab content for Room entities**: Show room-specific cleaning specification fields — Room Type, Clean Room Class, Cleaning Type, Requires Cleaning, Cleaning Frequency, and Cleaning Status badge (Clean/Required/Overdue)
- **Cleaning Check section in Specification tab for Room**: Show last cleaned date, cleaning valid till, cleaning status badge with color-coding
- **Seed data updates**: Add realistic cleaning field values to RM-MFG-01 and RM-MFG-02 room nodes

### Modify
- **`EquipmentNode` interface in `equipmentNodes.ts`**: Add room-specific cleaning fields
- **`INITIAL_DATA` in `equipmentNodes.ts`**: Update Room seed data with cleaning check fields
- **`DataManager.tsx` Specification tab**: Add Room entity case with Cleaning Specification and Cleaning Check sections
- **`DataManager.tsx` edit mode for Room Specification**: Allow editing of cleaningType and requiresCleaning when in Draft/edit mode; show cleaning status badge as read-only

### Remove
- Nothing removed

## Implementation Plan
1. Add room cleaning fields to `EquipmentNode` interface in `equipmentNodes.ts`
2. Update Room seed data (RM-MFG-01, RM-MFG-02) with cleaning check field values
3. In `DataManager.tsx` Specification tab — add `isRoomNode(currentNode)` case between the equipment check and the fallback, rendering:
   - **Room Specification** section: roomType (read-only from description), cleanRoomClass, cleaningType (editable dropdown: CIP / Manual / None), requiresCleaning (editable toggle), cleaningFrequency
   - **Cleaning Check** section: Cleaning Status badge (green=Clean, amber=Required, red=Overdue), Last Cleaned At, Cleaning Valid Till, Last Product Used, Cleaning Level
4. The cleaning status badge derives from `roomCleaningStatus` field or auto-computed from `roomCleaningValidTill` vs today
