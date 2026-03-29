import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuditEvent,
  BatchRecord,
  BatchStatus,
  Deviation,
  DeviationSeverity,
  EntityType,
  Equipment,
  EquipmentStatus,
  Material,
  PersonnelPure,
  PersonnelRole,
  WorkOrder,
  WorkOrderStatus,
} from "../backend";
import { DeviationStatus, WorkOrderStatus as WOS } from "../backend";
import {
  auditStore,
  batchStore,
  deviationStore,
  equipmentStore,
  materialStore,
  nextId,
  personnelStore,
  workOrderStore,
} from "../lib/localStore";

const anon = Principal.anonymous();

// ---- Batch Records ----

export function useAllBatchRecords() {
  return useQuery<BatchRecord[]>({
    queryKey: ["batchRecords"],
    queryFn: () => batchStore.getAll(),
  });
}

export function useCreateBatchRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      unit: string;
      productName: string;
      operatorId?: Principal;
      notes: string;
      currentStage: string;
      batchSize: number;
    }) => {
      const id = nextId("B");
      const record: BatchRecord = {
        batchId: id,
        productName: input.productName,
        batchSize: input.batchSize,
        unit: input.unit,
        status: { pending: null } as any,
        currentStage: input.currentStage,
        operatorId: input.operatorId ?? anon,
        startTime: BigInt(Date.now()) * BigInt(1_000_000),
        notes: input.notes,
      };
      batchStore.add(record);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchRecords"] }),
  });
}

export function useUpdateBatchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      status,
    }: { batchId: string; status: BatchStatus }) => {
      batchStore.update(batchId, (b) => ({ ...b, status }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchRecords"] }),
  });
}

// ---- Work Orders ----

export function useAllWorkOrders() {
  return useQuery<WorkOrder[]>({
    queryKey: ["workOrders"],
    queryFn: () => workOrderStore.getAll(),
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      scheduledStart: bigint;
      assignedTo?: Principal;
      description: string;
      batchRecordId: string;
      priority: string;
    }) => {
      const id = nextId("WO");
      const wo: WorkOrder = {
        workOrderId: id,
        batchRecordId: input.batchRecordId,
        description: input.description,
        priority: input.priority,
        status: WOS.open,
        assignedTo: input.assignedTo ?? anon,
        scheduledStart: input.scheduledStart,
      };
      workOrderStore.add(wo);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workOrders"] }),
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workOrderId,
      status,
    }: { workOrderId: string; status: WorkOrderStatus }) => {
      workOrderStore.update(workOrderId, (w) => ({ ...w, status }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workOrders"] }),
  });
}

// ---- Equipment ----

export function useAllEquipment() {
  return useQuery<Equipment[]>({
    queryKey: ["equipment"],
    queryFn: () => equipmentStore.getAll(),
  });
}

export function useAddEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      equipmentType: string;
      notes: string;
      location: string;
    }) => {
      const id = nextId("EQ");
      const eq: Equipment = {
        equipmentId: id,
        name: input.name,
        equipmentType: input.equipmentType,
        location: input.location,
        status: { available: null } as any,
        lastMaintenance: BigInt(Date.now()) * BigInt(1_000_000),
        notes: input.notes,
      };
      equipmentStore.add(eq);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useUpdateEquipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      equipmentId,
      status,
    }: { equipmentId: string; status: EquipmentStatus }) => {
      equipmentStore.update(equipmentId, (e) => ({ ...e, status }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

// ---- Materials ----

export function useAllMaterials() {
  return useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: () => materialStore.getAll(),
  });
}

export function useAddMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      expiryDate: bigint;
      name: string;
      unit: string;
      lotNumber: string;
      quantity: number;
      storageLocation: string;
    }) => {
      const id = nextId("MAT");
      const mat: Material = {
        materialId: id,
        name: input.name,
        lotNumber: input.lotNumber,
        quantity: input.quantity,
        unit: input.unit,
        expiryDate: input.expiryDate,
        storageLocation: input.storageLocation,
        materialStatus: { released: null } as any,
      };
      materialStore.add(mat);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

// ---- Deviations ----

export function useAllDeviations() {
  return useQuery<Deviation[]>({
    queryKey: ["deviations"],
    queryFn: () => deviationStore.getAll(),
  });
}

export function useReportDeviation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      batchRecordId: string;
      severity: DeviationSeverity;
    }) => {
      const id = nextId("DEV");
      const dev: Deviation = {
        deviationId: id,
        title: input.title,
        description: input.description,
        batchRecordId: input.batchRecordId,
        severity: input.severity,
        deviationStatus: DeviationStatus.open,
        reportedBy: anon,
        reportedDate: BigInt(Date.now()) * BigInt(1_000_000),
        capaDescription: "",
      };
      deviationStore.add(dev);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deviations"] }),
  });
}

// ---- Personnel ----

export function useAllPersonnel() {
  return useQuery<PersonnelPure[]>({
    queryKey: ["personnel"],
    queryFn: () => personnelStore.getAll(),
  });
}

export function useAddPersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      role: PersonnelRole;
      certifications: string[];
      principalId?: Principal;
    }) => {
      const p: PersonnelPure = {
        name: input.name,
        role: input.role,
        isActive: true,
        certifications: input.certifications,
        principalId: input.principalId ?? anon,
      };
      personnelStore.add(p);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personnel"] }),
  });
}

// ---- Audit Trail ----

export function useAuditTrail(entityType: EntityType, entityId: string) {
  return useQuery<AuditEvent[]>({
    queryKey: ["auditTrail", entityType, entityId],
    queryFn: () => {
      const all = auditStore.getAll();
      if (entityId === "all" || !entityId) return all;
      return all.filter(
        (e) => e.entityType === entityType && e.entityId === entityId,
      );
    },
  });
}

export function useAllAuditEvents() {
  return useQuery<AuditEvent[]>({
    queryKey: ["auditTrail", "all"],
    queryFn: () => auditStore.getAll(),
  });
}
