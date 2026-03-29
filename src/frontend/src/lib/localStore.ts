import { Principal } from "@icp-sdk/core/principal";
import {
  type AuditEvent,
  type BatchRecord,
  BatchStatus,
  type Deviation,
  DeviationSeverity,
  DeviationStatus,
  EntityType,
  type Equipment,
  EquipmentStatus,
  type Material,
  MaterialStatus,
  type PersonnelPure,
  PersonnelRole,
  type WorkOrder,
  WorkOrderStatus,
} from "../backend";

const KEYS = {
  batches: "mes_batches",
  deviations: "mes_deviations",
  workOrders: "mes_work_orders",
  equipment: "mes_equipment",
  materials: "mes_materials",
  personnel: "mes_personnel",
  auditEvents: "mes_audit_events",
  recipes: "mes_recipes",
  workflows: "mes_workflows",
};

const anon = Principal.anonymous();
const ts = (daysAgo: number) =>
  BigInt(Date.now() - daysAgo * 86400000) * BigInt(1_000_000);

// Serialization helpers that handle Principal and BigInt
function serialize(value: any): string {
  return JSON.stringify(value, (_k, v) => {
    if (typeof v === "bigint") return { __bigint__: v.toString() };
    if (
      v &&
      typeof v === "object" &&
      typeof v.toText === "function" &&
      typeof v._isPrincipal === "boolean"
    ) {
      return { __principal__: v.toText() };
    }
    return v;
  });
}

function deserialize(json: string): any {
  return JSON.parse(json, (_k, v) => {
    if (v && typeof v === "object" && "__bigint__" in v)
      return BigInt(v.__bigint__);
    if (v && typeof v === "object" && "__principal__" in v)
      return Principal.fromText(v.__principal__);
    return v;
  });
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return deserialize(raw) as T[];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, serialize(items));
}

function makeStore<T extends Record<string, any>>(
  key: string,
  idField: keyof T,
) {
  return {
    getAll(): T[] {
      return loadList<T>(key);
    },
    add(item: T): void {
      const list = loadList<T>(key);
      list.push(item);
      saveList(key, list);
    },
    update(id: string, updater: (item: T) => T): void {
      const list = loadList<T>(key);
      const idx = list.findIndex((i) => i[idField] === id);
      if (idx !== -1) {
        list[idx] = updater(list[idx]);
        saveList(key, list);
      }
    },
    remove(id: string): void {
      const list = loadList<T>(key).filter((i) => i[idField] !== id);
      saveList(key, list);
    },
  };
}

export const batchStore = makeStore<BatchRecord>(KEYS.batches, "batchId");
export const deviationStore = makeStore<Deviation>(
  KEYS.deviations,
  "deviationId",
);
export const workOrderStore = makeStore<WorkOrder>(
  KEYS.workOrders,
  "workOrderId",
);
export const equipmentStore = makeStore<Equipment>(
  KEYS.equipment,
  "equipmentId",
);
export const materialStore = makeStore<Material>(KEYS.materials, "materialId");
export const personnelStore = makeStore<PersonnelPure>(
  KEYS.personnel,
  "principalId",
);
export const auditStore = makeStore<AuditEvent>(KEYS.auditEvents, "eventId");

// ---- seed defaults ----
function seed() {
  if (!localStorage.getItem(KEYS.batches)) {
    saveList<BatchRecord>(KEYS.batches, [
      {
        batchId: "B-2026-001",
        productName: "Amoxicillin 500mg Capsules",
        batchSize: 50000,
        unit: "Capsules",
        status: BatchStatus.inProgress,
        currentStage: "Granulation",
        operatorId: anon,
        startTime: ts(1),
        notes: "Line 3 — standard batch",
      },
      {
        batchId: "B-2026-002",
        productName: "Metformin 850mg Tablets",
        batchSize: 80000,
        unit: "Tablets",
        status: BatchStatus.inProgress,
        currentStage: "Compression",
        operatorId: anon,
        startTime: ts(2),
        notes: "Priority order",
      },
      {
        batchId: "B-2026-003",
        productName: "Atorvastatin 20mg Tablets",
        batchSize: 60000,
        unit: "Tablets",
        status: BatchStatus.pending,
        currentStage: "Dispensing",
        operatorId: anon,
        startTime: ts(0),
        notes: "",
      },
      {
        batchId: "B-2026-004",
        productName: "Omeprazole 20mg Capsules",
        batchSize: 40000,
        unit: "Capsules",
        status: BatchStatus.onHold,
        currentStage: "Coating",
        operatorId: anon,
        startTime: ts(3),
        notes: "QA hold — minor deviation",
      },
      {
        batchId: "B-2026-005",
        productName: "Lisinopril 10mg Tablets",
        batchSize: 100000,
        unit: "Tablets",
        status: BatchStatus.completed,
        currentStage: "Packaging",
        operatorId: anon,
        startTime: ts(5),
        notes: "Released to warehouse",
      },
      {
        batchId: "B-2026-006",
        productName: "Azithromycin 250mg Tablets",
        batchSize: 30000,
        unit: "Tablets",
        status: BatchStatus.inProgress,
        currentStage: "Blending",
        operatorId: anon,
        startTime: ts(1),
        notes: "",
      },
      {
        batchId: "B-2026-007",
        productName: "Ciprofloxacin 500mg Tablets",
        batchSize: 45000,
        unit: "Tablets",
        status: BatchStatus.rejected,
        currentStage: "QA Testing",
        operatorId: anon,
        startTime: ts(7),
        notes: "Dissolution failure — OOS result",
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.deviations)) {
    saveList<Deviation>(KEYS.deviations, [
      {
        deviationId: "DEV-2026-001",
        batchRecordId: "B-2026-004",
        title: "Coating defect — orange peel texture on Omeprazole tablets",
        description:
          "Visual inspection revealed orange peel texture on approximately 8% of coated tablets.",
        severity: DeviationSeverity.major,
        deviationStatus: DeviationStatus.underInvestigation,
        reportedBy: anon,
        reportedDate: ts(3),
        capaDescription: "",
      },
      {
        deviationId: "DEV-2026-002",
        batchRecordId: "B-2026-007",
        title: "OOS dissolution result — Ciprofloxacin Q6h 45% vs 75% spec",
        description:
          "Dissolution testing at 60 minutes showed only 45% release against the specification minimum of 75%.",
        severity: DeviationSeverity.critical,
        deviationStatus: DeviationStatus.open,
        reportedBy: anon,
        reportedDate: ts(7),
        capaDescription: "",
      },
      {
        deviationId: "DEV-2026-003",
        batchRecordId: "B-2026-002",
        title: "Tablet weight variation — 3 tablets outside ±5% limit",
        description:
          "During IPC weight check, 3 out of 20 tablets were found outside the ±5% individual weight variation limit.",
        severity: DeviationSeverity.minor,
        deviationStatus: DeviationStatus.closed,
        reportedBy: anon,
        reportedDate: ts(10),
        capaDescription:
          "Tablet press tooling inspected and worn punches replaced.",
      },
      {
        deviationId: "DEV-2026-004",
        batchRecordId: "B-2026-001",
        title: "Granulation endpoint moisture content 3.2% vs 2.0% spec",
        description:
          "Loss on drying measurement at granulation endpoint was 3.2% against specification of ≤2.0%.",
        severity: DeviationSeverity.minor,
        deviationStatus: DeviationStatus.underInvestigation,
        reportedBy: anon,
        reportedDate: ts(1),
        capaDescription: "",
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.workOrders)) {
    saveList<WorkOrder>(KEYS.workOrders, [
      {
        workOrderId: "WO-2026-001",
        batchRecordId: "B-2026-001",
        description: "Granulator cleaning and calibration before batch start",
        priority: "Critical",
        status: WorkOrderStatus.inProgress,
        assignedTo: anon,
        scheduledStart: ts(0),
      },
      {
        workOrderId: "WO-2026-002",
        batchRecordId: "B-2026-002",
        description: "Tablet press changeover from 7mm to 12mm tooling",
        priority: "High",
        status: WorkOrderStatus.open,
        assignedTo: anon,
        scheduledStart: ts(-1),
      },
      {
        workOrderId: "WO-2026-003",
        batchRecordId: "B-2026-003",
        description: "Raw material dispensing for Atorvastatin batch",
        priority: "High",
        status: WorkOrderStatus.open,
        assignedTo: anon,
        scheduledStart: ts(-1),
      },
      {
        workOrderId: "WO-2026-004",
        batchRecordId: "B-2026-004",
        description: "Coating pan inspection and deviation investigation",
        priority: "Medium",
        status: WorkOrderStatus.inProgress,
        assignedTo: anon,
        scheduledStart: ts(0),
      },
      {
        workOrderId: "WO-2026-005",
        batchRecordId: "B-2026-005",
        description: "Final QC release testing for Lisinopril batch",
        priority: "Medium",
        status: WorkOrderStatus.completed,
        assignedTo: anon,
        scheduledStart: ts(4),
      },
      {
        workOrderId: "WO-2026-006",
        batchRecordId: "B-2026-006",
        description: "Preventive maintenance — V-blender bearings",
        priority: "Low",
        status: WorkOrderStatus.open,
        assignedTo: anon,
        scheduledStart: ts(-2),
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.equipment)) {
    saveList<Equipment>(KEYS.equipment, [
      {
        equipmentId: "EQ-001",
        name: "Fluid Bed Granulator FBG-300",
        equipmentType: "Granulator",
        location: "Production Area A — Room 101",
        status: EquipmentStatus.inUse,
        lastMaintenance: ts(15),
        notes: "Currently processing B-2026-001",
      },
      {
        equipmentId: "EQ-002",
        name: "Rotary Tablet Press RTP-45",
        equipmentType: "Tablet Press",
        location: "Production Area B — Room 205",
        status: EquipmentStatus.inUse,
        lastMaintenance: ts(10),
        notes: "Running Metformin batch",
      },
      {
        equipmentId: "EQ-003",
        name: "Pan Coater PC-200",
        equipmentType: "Coating Equipment",
        location: "Production Area A — Room 103",
        status: EquipmentStatus.maintenance,
        lastMaintenance: ts(30),
        notes: "Under deviation investigation",
      },
      {
        equipmentId: "EQ-004",
        name: "V-Blender VB-500",
        equipmentType: "Blender",
        location: "Production Area C — Room 301",
        status: EquipmentStatus.inUse,
        lastMaintenance: ts(7),
        notes: "",
      },
      {
        equipmentId: "EQ-005",
        name: "Capsule Filling Machine CFM-80",
        equipmentType: "Capsule Filler",
        location: "Production Area B — Room 207",
        status: EquipmentStatus.available,
        lastMaintenance: ts(5),
        notes: "Calibrated and ready",
      },
      {
        equipmentId: "EQ-006",
        name: "Blister Packaging BPM-120",
        equipmentType: "Packaging Machine",
        location: "Packaging Area — Room 401",
        status: EquipmentStatus.cleaning,
        lastMaintenance: ts(2),
        notes: "Post-batch cleaning in progress",
      },
      {
        equipmentId: "EQ-007",
        name: "HPLC Analyzer HP-1200",
        equipmentType: "Analytical Equipment",
        location: "QC Lab — Room 501",
        status: EquipmentStatus.available,
        lastMaintenance: ts(3),
        notes: "",
      },
      {
        equipmentId: "EQ-008",
        name: "Autoclave AC-750",
        equipmentType: "Sterilization",
        location: "Utility Room — Room 105",
        status: EquipmentStatus.available,
        lastMaintenance: ts(20),
        notes: "",
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.materials)) {
    saveList<Material>(KEYS.materials, [
      {
        materialId: "MAT-001",
        name: "Amoxicillin Trihydrate API",
        lotNumber: "LOT-AMX-2026-04",
        quantity: 250,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2027-06-30").getTime()) * BigInt(1_000_000),
        storageLocation: "Cold Storage A",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-002",
        name: "Metformin HCl API",
        lotNumber: "LOT-MET-2026-02",
        quantity: 500,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2028-01-31").getTime()) * BigInt(1_000_000),
        storageLocation: "Dry Store B",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-003",
        name: "Microcrystalline Cellulose (Excipient)",
        lotNumber: "LOT-MCC-2026-07",
        quantity: 1200,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2028-12-31").getTime()) * BigInt(1_000_000),
        storageLocation: "Dry Store A",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-004",
        name: "Magnesium Stearate",
        lotNumber: "LOT-MGS-2026-03",
        quantity: 80,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2027-09-30").getTime()) * BigInt(1_000_000),
        storageLocation: "Dry Store A",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-005",
        name: "Hydroxypropyl Methylcellulose",
        lotNumber: "LOT-HPC-2025-11",
        quantity: 15,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2026-04-30").getTime()) * BigInt(1_000_000),
        storageLocation: "Dry Store B",
        materialStatus: MaterialStatus.quarantine,
      },
      {
        materialId: "MAT-006",
        name: "Atorvastatin Calcium API",
        lotNumber: "LOT-ATV-2026-05",
        quantity: 120,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2027-12-31").getTime()) * BigInt(1_000_000),
        storageLocation: "Cold Storage B",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-007",
        name: "Hard Gelatin Capsules Size 1",
        lotNumber: "LOT-CAP-2026-08",
        quantity: 200000,
        unit: "Units",
        expiryDate:
          BigInt(new Date("2028-06-30").getTime()) * BigInt(1_000_000),
        storageLocation: "Packaging Store",
        materialStatus: MaterialStatus.released,
      },
      {
        materialId: "MAT-008",
        name: "Ciprofloxacin HCl API",
        lotNumber: "LOT-CIP-2025-09",
        quantity: 0,
        unit: "kg",
        expiryDate:
          BigInt(new Date("2026-02-28").getTime()) * BigInt(1_000_000),
        storageLocation: "Cold Storage A",
        materialStatus: MaterialStatus.rejected,
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.personnel)) {
    saveList<PersonnelPure>(KEYS.personnel, [
      {
        name: "Dr. Sarah Chen",
        role: PersonnelRole.productionManager,
        isActive: true,
        certifications: [
          "GMP Certified",
          "Six Sigma Green Belt",
          "Lean Manufacturing",
        ],
        principalId: anon,
      },
      {
        name: "James Okafor",
        role: PersonnelRole.operator,
        isActive: true,
        certifications: ["GMP Certified", "Equipment Operator Level 3"],
        principalId: anon,
      },
      {
        name: "Maria Santos",
        role: PersonnelRole.qaInspector,
        isActive: true,
        certifications: [
          "GMP Certified",
          "QA Inspector Level 2",
          "HPLC Operation",
        ],
        principalId: anon,
      },
      {
        name: "Robert Fischer",
        role: PersonnelRole.operator,
        isActive: true,
        certifications: ["GMP Certified", "Equipment Operator Level 2"],
        principalId: anon,
      },
      {
        name: "Priya Nair",
        role: PersonnelRole.qaInspector,
        isActive: true,
        certifications: [
          "GMP Certified",
          "Microbiology",
          "Dissolution Testing",
        ],
        principalId: anon,
      },
      {
        name: "Thomas Müller",
        role: PersonnelRole.admin,
        isActive: true,
        certifications: ["GMP Certified", "Data Integrity", "21 CFR Part 11"],
        principalId: anon,
      },
      {
        name: "Linda Park",
        role: PersonnelRole.operator,
        isActive: false,
        certifications: ["GMP Certified"],
        principalId: anon,
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.auditEvents)) {
    saveList<AuditEvent>(KEYS.auditEvents, [
      {
        eventId: "AE-001",
        action: "CREATE",
        userId: anon,
        entityId: "B-2026-001",
        timestamp: ts(1),
        details:
          "Batch record B-2026-001 created for Amoxicillin 500mg Capsules",
        entityType: EntityType.batchRecord,
      },
      {
        eventId: "AE-002",
        action: "STATUS_UPDATE",
        userId: anon,
        entityId: "B-2026-001",
        timestamp: ts(1),
        details: "Status changed from Pending to In Progress",
        entityType: EntityType.batchRecord,
      },
      {
        eventId: "AE-003",
        action: "CREATE",
        userId: anon,
        entityId: "DEV-2026-004",
        timestamp: ts(1),
        details: "Deviation reported for B-2026-001: Granulation moisture OOS",
        entityType: EntityType.deviation,
      },
      {
        eventId: "AE-004",
        action: "CREATE",
        userId: anon,
        entityId: "WO-2026-001",
        timestamp: ts(0),
        details: "Work order WO-2026-001 created for granulator cleaning",
        entityType: EntityType.workOrder,
      },
      {
        eventId: "AE-005",
        action: "STATUS_UPDATE",
        userId: anon,
        entityId: "EQ-003",
        timestamp: ts(3),
        details: "Equipment EQ-003 status changed to Maintenance",
        entityType: EntityType.equipment,
      },
    ]);
  }
}

// Run seed on module load
seed();

// ID generation helpers
let _idCounter = Date.now();
export function nextId(prefix: string): string {
  _idCounter++;
  return `${prefix}-${_idCounter}`;
}
