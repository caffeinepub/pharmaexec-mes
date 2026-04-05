# PharmaExec MES — Advanced Pharma Execution Logic

## Current State

- Data Manager has: WorkCenter / Station / EquipmentClass / EquipmentEntity / PropertyType entities
- EquipmentNode interface has GMP fields: status, maintenance_status, health_status, pm_due_date, cleaningRules, cleaningLog
- gmpValidation.ts has: computePmStatus, computeCleaningStatus, computeEquipmentIndicator, validateExecution
- No Room / Sub-Station hierarchy levels
- No equipmentType (Fixed / Moveable) field
- No Product Master entity
- No cleaningValidTill / lastCleanedAt / lastProductUsed on Equipment
- Cleaning logic does not differentiate between Fixed and Moveable equipment
- No DETH (Dirty Equipment Hold Time) or campaign length validation in execution engine
- No dedicated cleaningValidation service

## Requested Changes (Diff)

### Add

- **Room entity type** in EntityType union — forms top of location hierarchy
- **Sub-Station entity type** — sits between Station and Equipment
- **Location hierarchy**: Room → Station → Sub-Station → Equipment (each Equipment linked to a Station or Sub-Station, each Station linked to a Room)
- **equipmentType field** on EquipmentEntity/Class: `"Fixed" | "Moveable"`
- **Product Master** entity type with fields: productCode, productName, campaignLength (number, days), dethTime (number, hours = Dirty Equipment Hold Time)
- **New Equipment fields**: cleaningStatus (`"Clean" | "Due" | "Expired"`), lastCleanedAt (ISO date), cleaningValidTill (ISO date), lastProductUsed (productCode string)
- **cleaningReason field** on CleaningLogEntry (required for Fixed equipment cleaning validity)
- **New service file** `lib/cleaningValidationService.ts`:
  - `computeCleaningBadge(equipment, product)` → `"Clean" | "Due" | "Expired"`
  - `validateCleaningForExecution(equipment, product)` → `{ valid: boolean, reasons: string[] }`
  - Fixed equipment: validity depends on cleaningReason + productCode
  - Moveable equipment: validity depends ONLY on productCode
  - DETH check: if (now - lastCleanedAt) > product.dethTime → Expired
  - Campaign check: if current campaign exceeds campaignLength → cleaning required
  - cleaningValidTill check: if now > cleaningValidTill → Expired
- **New data file** `lib/productMaster.ts` — ProductMaster interface + INITIAL_PRODUCTS seed data
- **New data file** `lib/locationHierarchy.ts` — Room and SubStation seed data, helper to build full hierarchy tree
- **Execution blocking** in service layer: cleaningValidationService called before execution; returns structured block reason
- **UI badge** on Equipment cards: Clean (green), Due (amber), Expired (red)
- **Warning banner** `"Cleaning required before execution"` when cleaningStatus is Due or Expired
- **Equipment form** additions: equipmentType dropdown, Room/Station/SubStation assignment selectors
- **Product Master tab** in Data Manager sidebar — CRUD for products
- **DataManager entity type selector** extended with Room, Sub-Station, Product Master tabs

### Modify

- `lib/gmpValidation.ts`: extend `validateExecution` to call `validateCleaningForExecution` from new service
- `lib/equipmentNodes.ts`: extend EquipmentNode interface with new fields; add Room and SubStation to EntityType; add new initial data for Rooms and SubStations
- `lib/gmpValidation.ts`: update CleaningLogEntry to include cleaningReason optional field
- `pages/DataManager.tsx`: add Product Master tab, Room/SubStation hierarchy dropdowns in Equipment form, cleaning badge display
- `pages/Equipment.tsx`: reflect new hierarchy, type badge, cleaning badge

### Remove

- Nothing removed

## Implementation Plan

1. Create `src/frontend/src/lib/productMaster.ts` — ProductMaster interface + 5 sample products
2. Create `src/frontend/src/lib/locationHierarchy.ts` — Room / SubStation types + seed data + hierarchy helpers
3. Update `src/frontend/src/lib/gmpValidation.ts` — add cleaningReason to CleaningLogEntry, extend CleaningStatus types
4. Update `src/frontend/src/lib/equipmentNodes.ts` — add new fields to EquipmentNode, expand EntityType, add sample Rooms/SubStations/equipmentType seed data
5. Create `src/frontend/src/services/cleaningValidationService.ts` — all cleaning validation logic in service layer
6. Update `src/frontend/src/lib/gmpValidation.ts` validateExecution to use cleaningValidationService
7. Update `pages/DataManager.tsx` — Product Master tab, Room/SubStation hierarchy selectors, cleaning badge, equipment type field
8. Update `pages/Equipment.tsx` — hierarchy display, type badge, cleaning badge with warning
