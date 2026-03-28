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
import {
  sampleAuditEvents,
  sampleBatches,
  sampleDeviations,
  sampleEquipment,
  sampleMaterials,
  samplePersonnel,
  sampleWorkOrders,
} from "../data/sampleData";
import { useActor } from "./useActor";

export function useAllBatchRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<BatchRecord[]>({
    queryKey: ["batchRecords"],
    queryFn: async () => {
      if (!actor) return sampleBatches;
      try {
        const result = await actor.getAllBatchRecords();
        return result.length > 0 ? result : sampleBatches;
      } catch {
        return sampleBatches;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleBatches,
  });
}

export function useCreateBatchRecord() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      unit: string;
      productName: string;
      operatorId: import("@icp-sdk/core/principal").Principal;
      notes: string;
      currentStage: string;
      batchSize: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createBatchRecord(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchRecords"] }),
  });
}

export function useUpdateBatchStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      status,
    }: { batchId: string; status: BatchStatus }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateBatchStatus(batchId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchRecords"] }),
  });
}

export function useAllWorkOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<WorkOrder[]>({
    queryKey: ["workOrders"],
    queryFn: async () => {
      if (!actor) return sampleWorkOrders;
      try {
        const result = await actor.getAllWorkOrders();
        return result.length > 0 ? result : sampleWorkOrders;
      } catch {
        return sampleWorkOrders;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleWorkOrders,
  });
}

export function useCreateWorkOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      scheduledStart: bigint;
      assignedTo: import("@icp-sdk/core/principal").Principal;
      description: string;
      batchRecordId: string;
      priority: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createWorkOrder(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workOrders"] }),
  });
}

export function useUpdateWorkOrderStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workOrderId,
      status,
    }: { workOrderId: string; status: WorkOrderStatus }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateWorkOrderStatus(workOrderId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workOrders"] }),
  });
}

export function useAllEquipment() {
  const { actor, isFetching } = useActor();
  return useQuery<Equipment[]>({
    queryKey: ["equipment"],
    queryFn: async () => {
      if (!actor) return sampleEquipment;
      try {
        const result = await actor.getAllEquipment();
        return result.length > 0 ? result : sampleEquipment;
      } catch {
        return sampleEquipment;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleEquipment,
  });
}

export function useAddEquipment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      equipmentType: string;
      notes: string;
      location: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addEquipment(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useUpdateEquipmentStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      equipmentId,
      status,
    }: { equipmentId: string; status: EquipmentStatus }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateEquipmentStatus(equipmentId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useAllMaterials() {
  const { actor, isFetching } = useActor();
  return useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: async () => {
      if (!actor) return sampleMaterials;
      try {
        const result = await actor.getAllMaterials();
        return result.length > 0 ? result : sampleMaterials;
      } catch {
        return sampleMaterials;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleMaterials,
  });
}

export function useAddMaterial() {
  const { actor } = useActor();
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
      if (!actor) throw new Error("No actor");
      return actor.addMaterial(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useAllDeviations() {
  const { actor, isFetching } = useActor();
  return useQuery<Deviation[]>({
    queryKey: ["deviations"],
    queryFn: async () => {
      if (!actor) return sampleDeviations;
      try {
        const result = await actor.getAllDeviations();
        return result.length > 0 ? result : sampleDeviations;
      } catch {
        return sampleDeviations;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleDeviations,
  });
}

export function useReportDeviation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      batchRecordId: string;
      severity: DeviationSeverity;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.reportDeviation(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deviations"] }),
  });
}

export function useAllPersonnel() {
  const { actor, isFetching } = useActor();
  return useQuery<PersonnelPure[]>({
    queryKey: ["personnel"],
    queryFn: async () => {
      if (!actor) return samplePersonnel;
      try {
        const result = await actor.getAllPersonnel();
        return result.length > 0 ? result : samplePersonnel;
      } catch {
        return samplePersonnel;
      }
    },
    enabled: !isFetching,
    placeholderData: samplePersonnel,
  });
}

export function useAddPersonnel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      role: PersonnelRole;
      certifications: string[];
      principalId: import("@icp-sdk/core/principal").Principal;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addPersonnel(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personnel"] }),
  });
}

export function useAuditTrail(entityType: EntityType, entityId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AuditEvent[]>({
    queryKey: ["auditTrail", entityType, entityId],
    queryFn: async () => {
      if (!actor) return sampleAuditEvents;
      try {
        const result = await actor.getAuditTrailForEntity(entityType, entityId);
        return result.length > 0 ? result : sampleAuditEvents;
      } catch {
        return sampleAuditEvents;
      }
    },
    enabled: !isFetching,
    placeholderData: sampleAuditEvents,
  });
}
