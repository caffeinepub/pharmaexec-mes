import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WorkOrder {
    status: WorkOrderStatus;
    scheduledStart: bigint;
    assignedTo: Principal;
    description: string;
    workOrderId: string;
    batchRecordId: string;
    priority: string;
}
export interface Equipment {
    status: EquipmentStatus;
    lastMaintenance: bigint;
    name: string;
    equipmentType: string;
    notes: string;
    equipmentId: string;
    location: string;
}
export interface Deviation {
    title: string;
    capaDescription: string;
    reportedDate: bigint;
    description: string;
    deviationStatus: DeviationStatus;
    reportedBy: Principal;
    batchRecordId: string;
    severity: DeviationSeverity;
    deviationId: string;
}
export interface BatchRecord {
    startTime: bigint;
    status: BatchStatus;
    unit: string;
    productName: string;
    operatorId: Principal;
    notes: string;
    batchId: string;
    currentStage: string;
    batchSize: number;
}
export interface Material {
    expiryDate: bigint;
    name: string;
    unit: string;
    materialId: string;
    lotNumber: string;
    materialStatus: MaterialStatus;
    quantity: number;
    storageLocation: string;
}
export interface AuditEvent {
    eventId: string;
    action: string;
    userId: Principal;
    entityId: string;
    timestamp: bigint;
    details: string;
    entityType: EntityType;
}
export interface UserProfile {
    name: string;
    role: PersonnelRole;
    isActive: boolean;
    certifications: Array<string>;
}
export interface PersonnelPure {
    name: string;
    role: PersonnelRole;
    isActive: boolean;
    certifications: Array<string>;
    principalId: Principal;
}
export enum BatchStatus {
    pending = "pending",
    completed = "completed",
    rejected = "rejected",
    inProgress = "inProgress",
    onHold = "onHold"
}
export enum DeviationSeverity {
    major = "major",
    minor = "minor",
    critical = "critical"
}
export enum DeviationStatus {
    closed = "closed",
    open = "open",
    underInvestigation = "underInvestigation"
}
export enum EntityType {
    equipment = "equipment",
    deviation = "deviation",
    personnel = "personnel",
    workOrder = "workOrder",
    material = "material",
    batchRecord = "batchRecord"
}
export enum EquipmentStatus {
    cleaning = "cleaning",
    available = "available",
    maintenance = "maintenance",
    inUse = "inUse"
}
export enum MaterialStatus {
    released = "released",
    consumed = "consumed",
    rejected = "rejected",
    quarantine = "quarantine"
}
export enum PersonnelRole {
    admin = "admin",
    productionManager = "productionManager",
    operator = "operator",
    qaInspector = "qaInspector"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum WorkOrderStatus {
    cancelled = "cancelled",
    open = "open",
    completed = "completed",
    inProgress = "inProgress"
}
export interface backendInterface {
    addEquipment(input: {
        name: string;
        equipmentType: string;
        notes: string;
        location: string;
    }): Promise<string>;
    addMaterial(input: {
        expiryDate: bigint;
        name: string;
        unit: string;
        lotNumber: string;
        quantity: number;
        storageLocation: string;
    }): Promise<string>;
    addPersonnel(input: {
        name: string;
        role: PersonnelRole;
        certifications: Array<string>;
        principalId: Principal;
    }): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignRoleToUser(user: Principal, role: UserRole): Promise<void>;
    closeDeviation(deviationId: string, capaDescription: string): Promise<void>;
    consumeMaterial(materialId: string, amount: number): Promise<void>;
    createBatchRecord(input: {
        unit: string;
        productName: string;
        operatorId: Principal;
        notes: string;
        currentStage: string;
        batchSize: number;
    }): Promise<string>;
    createWorkOrder(input: {
        scheduledStart: bigint;
        assignedTo: Principal;
        description: string;
        batchRecordId: string;
        priority: string;
    }): Promise<string>;
    deactivatePersonnel(principalId: Principal): Promise<void>;
    getAllBatchRecords(): Promise<Array<BatchRecord>>;
    getAllDeviations(): Promise<Array<Deviation>>;
    getAllEquipment(): Promise<Array<Equipment>>;
    getAllMaterials(): Promise<Array<Material>>;
    getAllPersonnel(): Promise<Array<PersonnelPure>>;
    getAllWorkOrders(): Promise<Array<WorkOrder>>;
    getAuditTrailForEntity(entityType: EntityType, entityId: string): Promise<Array<AuditEvent>>;
    getAuditTrailForUser(userId: Principal): Promise<Array<AuditEvent>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWorkOrder(workOrderId: string): Promise<WorkOrder>;
    isCallerAdmin(): Promise<boolean>;
    reportDeviation(input: {
        title: string;
        description: string;
        batchRecordId: string;
        severity: DeviationSeverity;
    }): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBatchStatus(batchId: string, status: BatchStatus): Promise<void>;
    updateEquipmentStatus(equipmentId: string, status: EquipmentStatus): Promise<void>;
    updateWorkOrderStatus(workOrderId: string, status: WorkOrderStatus): Promise<void>;
}
