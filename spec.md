# PharmaExec MES — Planning & Scheduling: Advanced Resolution & Simulation

## Current State
ProductionPlanning.tsx is a large single-file module (~168KB) with:
- Campaign planning with dirty hold, PM, holiday, and shift constraints
- Gantt chart (hourly, 24h, monthly view)
- Feasibility tab for plan change testing
- Holiday calendar (currently no type distinction — all holidays are hard blocks)
- Shift A/B/C (07-15, 15-23, 23-07)
- Conflict resolution with basic options
- Export Excel (4-sheet workbook)

## Requested Changes (Diff)

### Add
- **Holiday types:** Hard (no work allowed) / Soft (work allowed with approval flag)
- **"Work on holiday" resolution option** in conflict resolution panel — only shown when holiday is Soft
- **Holiday flag on tasks** — tasks scheduled on Soft holidays get a visual marker (⚠️ holiday override badge)
- **Approval required** indicator when working on a Soft holiday
- **What-if Simulation Engine:**
  - "Simulate" button on Gantt task click → opens simulation panel
  - Clones current schedule in memory (no mutations to actual data)
  - Applies selected user change to the clone
  - Re-runs scheduling engine on clone
  - Shows impact comparison table (before vs. after):
    - Completion time
    - Conflict count
    - Cleaning count
    - Equipment utilization %
- **Simulation Options:**
  - Delay task (+1 hr, +2 hr)
  - Move to next shift
  - Move to alternate equipment
  - Work on holiday (if Soft holiday)
- **Ghost Gantt bars** — semi-transparent bars overlaid on Gantt showing simulated task positions
- **Risk highlights** — simulated tasks that create new conflicts shown in red outline
- **Insights panel** — warnings for: new conflicts introduced, deadline risk, extra cleaning triggered
- **"Apply Simulation" button** — promotes simulated schedule to actual
- **"Discard" button** — clears simulation overlay

### Modify
- Holiday calendar UI: add Hard/Soft toggle per holiday entry
- Conflict resolution dialog: add "Work on holiday" option with impact display (delay avoided, approval required)
- Gantt bar rendering: show holiday-override badge on affected tasks

### Remove
- Nothing removed

## Implementation Plan
1. Extend holiday data model: add `type: 'hard' | 'soft'` field; default existing holidays to 'hard'
2. Update holiday calendar UI to allow type selection per entry
3. Update scheduling engine: Soft holidays no longer block scheduling but set `holidayOverride: true` flag on the task
4. Update conflict resolution dialog: add "Work on holiday" option (conditional on Soft holiday), show delay avoided and approval required
5. Add simulation engine function: `runSimulation(schedule, change)` → cloned schedule recalculation
6. Add simulation panel (side drawer or bottom panel, opens on Gantt task click)
7. Add simulation option buttons (delay +1hr, +2hr, next shift, alternate equipment, work on holiday)
8. Add ghost bar rendering in Gantt SVG (semi-transparent, dashed outline)
9. Add impact comparison table (before vs after)
10. Add insights/warnings panel (new conflicts, deadline risk, extra cleaning)
11. Apply / Discard simulation actions
