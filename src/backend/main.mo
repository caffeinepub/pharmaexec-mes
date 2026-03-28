import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";

actor {
  // Types
  type BatchStatus = {
    #pending;
    #inProgress;
    #onHold;
    #completed;
    #rejected;
  };

  type WorkOrderStatus = {
    #open;
    #inProgress;
    #completed;
    #cancelled;
  };

  type EquipmentStatus = {
    #available;
    #inUse;
    #maintenance;
    #cleaning;
  };

  type MaterialStatus = {
    #quarantine;
    #released;
    #rejected;
    #consumed;
  };

  type DeviationSeverity = {
    #critical;
    #major;
    #minor;
  };

  type DeviationStatus = {
    #open;
    #underInvestigation;
    #closed;
  };

  type PersonnelRole = {
    #admin;
    #productionManager;
    #operator;
    #qaInspector;
  };

  type EntityType = {
    #batchRecord;
    #workOrder;
    #equipment;
    #material;
    #deviation;
    #personnel;
  };

  type BatchRecord = {
    batchId : Text;
    productName : Text;
    batchSize : Float;
    unit : Text;
    status : BatchStatus;
    currentStage : Text;
    startTime : Int;
    operatorId : Principal;
    notes : Text;
  };

  type WorkOrder = {
    workOrderId : Text;
    batchRecordId : Text;
    description : Text;
    assignedTo : Principal;
    priority : Text;
    status : WorkOrderStatus;
    scheduledStart : Int;
  };

  type Equipment = {
    equipmentId : Text;
    name : Text;
    equipmentType : Text;
    location : Text;
    status : EquipmentStatus;
    lastMaintenance : Int;
    notes : Text;
  };

  type Material = {
    materialId : Text;
    name : Text;
    lotNumber : Text;
    quantity : Float;
    unit : Text;
    expiryDate : Int;
    storageLocation : Text;
    materialStatus : MaterialStatus;
  };

  type Deviation = {
    deviationId : Text;
    batchRecordId : Text;
    severity : DeviationSeverity;
    title : Text;
    description : Text;
    reportedBy : Principal;
    reportedDate : Int;
    deviationStatus : DeviationStatus;
    capaDescription : Text;
  };

  type Personnel = {
    principalId : Principal;
    name : Text;
    role : PersonnelRole;
    certifications : Set.Set<Text>;
    isActive : Bool;
  };

  type AuditEvent = {
    eventId : Text;
    timestamp : Int;
    userId : Principal;
    action : Text;
    entityType : EntityType;
    entityId : Text;
    details : Text;
  };

  public type UserProfile = {
    name : Text;
    role : PersonnelRole;
    certifications : [Text];
    isActive : Bool;
  };

  type PersonnelPure = {
    principalId : Principal;
    name : Text;
    role : PersonnelRole;
    certifications : [Text];
    isActive : Bool;
  };

  // Comparison modules
  module Text {
    public func compare(text1 : Text, text2 : Text) : Order.Order {
      Text.compare(text1, text2);
    };
  };

  module Principal {
    public func compare(p1 : Principal, p2 : Principal) : Order.Order {
      Principal.compare(p1, p2);
    };
  };

  module FloatId {
    public func compare(a : Float, b : Float) : Order.Order {
      switch (Float.compare(a, b)) {
        case (#equal) { #equal };
        case (#greater) { #greater };
        case (#less) { #less };
      };
    };
  };

  module BatchRecord {
    public func compare(b1 : BatchRecord, b2 : BatchRecord) : Order.Order {
      Text.compare(b1.batchId, b2.batchId);
    };
  };

  module WorkOrder {
    public func compare(w1 : WorkOrder, w2 : WorkOrder) : Order.Order {
      Text.compare(w1.workOrderId, w2.workOrderId);
    };
  };

  module Equipment {
    public func compare(e1 : Equipment, e2 : Equipment) : Order.Order {
      Text.compare(e1.equipmentId, e2.equipmentId);
    };
  };

  module Material {
    public func compare(m1 : Material, m2 : Material) : Order.Order {
      Text.compare(m1.materialId, m2.materialId);
    };
  };

  module Deviation {
    public func compare(d1 : Deviation, d2 : Deviation) : Order.Order {
      Text.compare(d1.deviationId, d2.deviationId);
    };
  };

  module Personnel {
    public func compare(p1 : Personnel, p2 : Personnel) : Order.Order {
      Principal.compare(p1.principalId, p2.principalId);
    };
  };

  module AuditEvent {
    public func compare(a1 : AuditEvent, a2 : AuditEvent) : Order.Order {
      Text.compare(a1.eventId, a2.eventId);
    };
  };

  // Helper functions for ID generation
  func generateId(prefix : Text, counter : Nat) : Text {
    prefix # counter.toText();
  };

  // Helper function to ensure batch record exists
  func getBatchRecordInternal(batchId : Text) : BatchRecord {
    switch (batchRecords.get(batchId)) {
      case (null) { Runtime.trap("Batch record not found") };
      case (?batch) { batch };
    };
  };

  // Helper function to ensure work order exists
  func getWorkOrderInternal(workOrderId : Text) : WorkOrder {
    switch (workOrders.get(workOrderId)) {
      case (null) { Runtime.trap("Work order not found") };
      case (?workOrder) { workOrder };
    };
  };

  // Helper function to ensure equipment exists
  func getEquipmentInternal(equipmentId : Text) : Equipment {
    switch (equipment.get(equipmentId)) {
      case (null) { Runtime.trap("Equipment not found") };
      case (?equip) { equip };
    };
  };

  // Helper function to ensure material exists
  func getMaterialInternal(materialId : Text) : Material {
    switch (materials.get(materialId)) {
      case (null) { Runtime.trap("Material not found") };
      case (?material) { material };
    };
  };

  // Helper function to ensure deviation exists
  func getDeviationInternal(deviationId : Text) : Deviation {
    switch (deviations.get(deviationId)) {
      case (null) { Runtime.trap("Deviation not found") };
      case (?deviation) { deviation };
    };
  };

  // Helper function to ensure personnel exists
  func getPersonnelInternal(principalId : Principal) : Personnel {
    switch (personnel.get(principalId)) {
      case (null) { Runtime.trap("Personnel not found") };
      case (?person) { person };
    };
  };

  // Helper function to get personnel role
  func getPersonnelRole(principalId : Principal) : ?PersonnelRole {
    switch (personnel.get(principalId)) {
      case (null) { null };
      case (?person) { 
        if (person.isActive) {
          ?person.role
        } else {
          null
        }
      };
    };
  };

  // Helper function to check if user has required role
  func hasRequiredRole(caller : Principal, requiredRole : PersonnelRole) : Bool {
    switch (getPersonnelRole(caller)) {
      case (null) { false };
      case (?role) {
        switch (requiredRole, role) {
          case (#admin, #admin) { true };
          case (#productionManager, #admin) { true };
          case (#productionManager, #productionManager) { true };
          case (#qaInspector, #admin) { true };
          case (#qaInspector, #productionManager) { true };
          case (#qaInspector, #qaInspector) { true };
          case (#operator, #admin) { true };
          case (#operator, #productionManager) { true };
          case (#operator, #qaInspector) { true };
          case (#operator, #operator) { true };
          case (_, _) { false };
        };
      };
    };
  };

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Storage
  include MixinStorage();

  // State
  var batchRecordCounter = 0;
  var workOrderCounter = 0;
  var equipmentCounter = 0;
  var materialCounter = 0;
  var deviationCounter = 0;
  var auditEventCounter = 0;
  let batchRecords = Map.empty<Text, BatchRecord>();
  let workOrders = Map.empty<Text, WorkOrder>();
  let equipment = Map.empty<Text, Equipment>();
  let materials = Map.empty<Text, Material>();
  let deviations = Map.empty<Text, Deviation>();
  let personnel = Map.empty<Principal, Personnel>();
  let auditTrail = Map.empty<Text, AuditEvent>();

  // Audit logging function
  func logAuditEvent(userId : Principal, action : Text, entityType : EntityType, entityId : Text, details : Text) {
    let eventId = generateId("AUDIT", auditEventCounter);
    auditEventCounter += 1;
    let event : AuditEvent = {
      eventId;
      timestamp = Time.now();
      userId;
      action;
      entityType;
      entityId;
      details;
    };
    auditTrail.add(eventId, event);
  };

  // User Profile Management (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (personnel.get(caller)) {
      case (null) { null };
      case (?person) {
        ?{
          name = person.name;
          role = person.role;
          certifications = person.certifications.toArray();
          isActive = person.isActive;
        }
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (personnel.get(user)) {
      case (null) { null };
      case (?person) {
        ?{
          name = person.name;
          role = person.role;
          certifications = person.certifications.toArray();
          isActive = person.isActive;
        }
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let certificationSet = Set.empty<Text>();
    profile.certifications.forEach(func(cert) { certificationSet.add(cert) });
    let person : Personnel = {
      principalId = caller;
      name = profile.name;
      role = profile.role;
      certifications = certificationSet;
      isActive = profile.isActive;
    };
    personnel.add(caller, person);
    logAuditEvent(caller, "Update Profile", #personnel, caller.toText(), caller.toText());
  };

  public shared ({ caller }) func createBatchRecord(input : {
    productName : Text;
    batchSize : Float;
    unit : Text;
    currentStage : Text;
    operatorId : Principal;
    notes : Text;
  }) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create batch records");
    };
    if (not hasRequiredRole(caller, #productionManager)) {
      Runtime.trap("Unauthorized: Only Production Managers or Admins can create batch records");
    };
    batchRecordCounter += 1;
    let batchId = generateId("BATCH", batchRecordCounter);
    let record : BatchRecord = {
      batchId;
      productName = input.productName;
      batchSize = input.batchSize;
      unit = input.unit;
      status = #pending;
      currentStage = input.currentStage;
      startTime = Time.now();
      operatorId = input.operatorId;
      notes = input.notes;
    };
    batchRecords.add(batchId, record);
    logAuditEvent(caller, "Create Batch", #batchRecord, batchId, batchId);
    batchId;
  };

  public shared ({ caller }) func updateBatchStatus(batchId : Text, status : BatchStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update batch status");
    };
    if (not hasRequiredRole(caller, #operator)) {
      Runtime.trap("Unauthorized: Only Operators or higher can update batch status");
    };
    let batch = getBatchRecordInternal(batchId);
    let updated : BatchRecord = { batch with status };
    batchRecords.add(batchId, updated);
    logAuditEvent(caller, "Update Batch Status", #batchRecord, batchId, batchId);
  };

  // WorkOrders - ProductionManager can create, assigned operators can update
  public shared ({ caller }) func createWorkOrder(input : {
    batchRecordId : Text;
    description : Text;
    assignedTo : Principal;
    priority : Text;
    scheduledStart : Int;
  }) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create work orders");
    };
    if (not hasRequiredRole(caller, #productionManager)) {
      Runtime.trap("Unauthorized: Only Production Managers or Admins can create work orders");
    };
    workOrderCounter += 1;
    let workOrderId = generateId("WORK", workOrderCounter);
    let workOrder : WorkOrder = {
      workOrderId;
      batchRecordId = input.batchRecordId;
      description = input.description;
      assignedTo = input.assignedTo;
      priority = input.priority;
      status = #open;
      scheduledStart = input.scheduledStart;
    };
    workOrders.add(workOrderId, workOrder);
    logAuditEvent(caller, "Create Work Order", #workOrder, workOrderId, workOrderId);
    workOrderId;
  };

  public query ({ caller }) func getWorkOrder(workOrderId : Text) : async WorkOrder {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view work orders");
    };
    getWorkOrderInternal(workOrderId);
  };

  public shared ({ caller }) func updateWorkOrderStatus(workOrderId : Text, status : WorkOrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update work order status");
    };
    let workOrder = getWorkOrderInternal(workOrderId);
    // Only assigned operator or managers can update
    if (workOrder.assignedTo != caller and not hasRequiredRole(caller, #productionManager)) {
      Runtime.trap("Unauthorized: Only assigned operator or managers can update work order status");
    };
    let updated : WorkOrder = { workOrder with status };
    workOrders.add(workOrderId, updated);
    logAuditEvent(caller, "Update Work Order Status", #workOrder, workOrderId, workOrderId);
  };

  // Equipment - ProductionManager or Admin can manage
  public shared ({ caller }) func addEquipment(input : {
    name : Text;
    equipmentType : Text;
    location : Text;
    notes : Text;
  }) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add equipment");
    };
    if (not hasRequiredRole(caller, #productionManager)) {
      Runtime.trap("Unauthorized: Only Production Managers or Admins can add equipment");
    };
    equipmentCounter += 1;
    let equipmentId = generateId("EQUIP", equipmentCounter);
    let equip : Equipment = {
      equipmentId;
      name = input.name;
      equipmentType = input.equipmentType;
      location = input.location;
      status = #available;
      lastMaintenance = Time.now();
      notes = input.notes;
    };
    equipment.add(equipmentId, equip);
    logAuditEvent(caller, "Add Equipment", #equipment, equipmentId, equipmentId);
    equipmentId;
  };

  public shared ({ caller }) func updateEquipmentStatus(equipmentId : Text, status : EquipmentStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update equipment status");
    };
    if (not hasRequiredRole(caller, #operator)) {
      Runtime.trap("Unauthorized: Only Operators or higher can update equipment status");
    };
    let equip = getEquipmentInternal(equipmentId);
    let updated : Equipment = { equip with status };
    equipment.add(equipmentId, updated);
    logAuditEvent(caller, "Update Equipment Status", #equipment, equipmentId, equipmentId);
  };

  // Materials - ProductionManager or Admin can add, Operators can consume
  public shared ({ caller }) func addMaterial(input : {
    name : Text;
    lotNumber : Text;
    quantity : Float;
    unit : Text;
    expiryDate : Int;
    storageLocation : Text;
  }) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add materials");
    };
    if (not hasRequiredRole(caller, #productionManager)) {
      Runtime.trap("Unauthorized: Only Production Managers or Admins can add materials");
    };
    materialCounter += 1;
    let materialId = generateId("MAT", materialCounter);
    let material : Material = {
      materialId;
      name = input.name;
      lotNumber = input.lotNumber;
      quantity = input.quantity;
      unit = input.unit;
      expiryDate = input.expiryDate;
      storageLocation = input.storageLocation;
      materialStatus = #quarantine;
    };
    materials.add(materialId, material);
    logAuditEvent(caller, "Add Material", #material, materialId, materialId);
    materialId;
  };

  public shared ({ caller }) func consumeMaterial(materialId : Text, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can consume materials");
    };
    if (not hasRequiredRole(caller, #operator)) {
      Runtime.trap("Unauthorized: Only Operators or higher can consume materials");
    };
    let material = getMaterialInternal(materialId);
    if (amount > material.quantity) {
      Runtime.trap("Not enough material available");
    };
    let updated : Material = {
      material with quantity = material.quantity - amount;
    };
    materials.add(materialId, updated);
    logAuditEvent(caller, "Consume Material", #material, materialId, materialId);
  };

  // Deviations - Any authenticated user can report, QA can manage
  public shared ({ caller }) func reportDeviation(input : {
    batchRecordId : Text;
    severity : DeviationSeverity;
    title : Text;
    description : Text;
  }) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can report deviations");
    };
    deviationCounter += 1;
    let deviationId = generateId("DEV", deviationCounter);
    let deviation : Deviation = {
      deviationId;
      batchRecordId = input.batchRecordId;
      severity = input.severity;
      title = input.title;
      description = input.description;
      reportedBy = caller;
      reportedDate = Time.now();
      deviationStatus = #open;
      capaDescription = "";
    };
    deviations.add(deviationId, deviation);
    logAuditEvent(caller, "Report Deviation", #deviation, deviationId, deviationId);
    deviationId;
  };

  public shared ({ caller }) func closeDeviation(deviationId : Text, capaDescription : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can close deviations");
    };
    if (not hasRequiredRole(caller, #qaInspector)) {
      Runtime.trap("Unauthorized: Only QA Inspectors or higher can close deviations");
    };
    let deviation = getDeviationInternal(deviationId);
    let updated : Deviation = { 
      deviation with 
      deviationStatus = #closed;
      capaDescription = capaDescription;
    };
    deviations.add(deviationId, updated);
    logAuditEvent(caller, "Close Deviation", #deviation, deviationId, deviationId);
  };

  // Audit Trail - authenticated users can query
  public query ({ caller }) func getAuditTrailForEntity(entityType : EntityType, entityId : Text) : async [AuditEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view audit trail");
    };
    auditTrail.values().toArray().filter(func(event) { event.entityType == entityType and event.entityId == entityId });
  };

  public query ({ caller }) func getAuditTrailForUser(userId : Principal) : async [AuditEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view audit trail");
    };
    // Users can only view their own audit trail unless they are admin
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own audit trail");
    };
    auditTrail.values().toArray().filter(func(event) { event.userId == userId });
  };

  // Personnel - Admin only for add/deactivate
  public shared ({ caller }) func addPersonnel(input : {
    principalId : Principal;
    name : Text;
    role : PersonnelRole;
    certifications : [Text];
  }) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add personnel");
    };
    let certificationSet = Set.empty<Text>();
    input.certifications.forEach(func(cert) { certificationSet.add(cert) });
    let person : Personnel = {
      principalId = input.principalId;
      name = input.name;
      role = input.role;
      certifications = certificationSet;
      isActive = true;
    };
    personnel.add(input.principalId, person);
    logAuditEvent(caller, "Add Personnel", #personnel, input.principalId.toText(), input.principalId.toText());
  };

  public shared ({ caller }) func deactivatePersonnel(principalId : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can deactivate personnel");
    };
    let person = getPersonnelInternal(principalId);
    let updated : Personnel = { person with isActive = false };
    personnel.add(principalId, updated);
    logAuditEvent(caller, "Deactivate Personnel", #personnel, principalId.toText(), principalId.toText());
  };

  public shared ({ caller }) func assignRoleToUser(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  // Getters - authenticated users can view
  public query ({ caller }) func getAllBatchRecords() : async [BatchRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view batch records");
    };
    batchRecords.values().toArray().sort();
  };

  public query ({ caller }) func getAllWorkOrders() : async [WorkOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view work orders");
    };
    workOrders.values().toArray().sort();
  };

  public query ({ caller }) func getAllEquipment() : async [Equipment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view equipment");
    };
    equipment.values().toArray().sort();
  };

  public query ({ caller }) func getAllMaterials() : async [Material] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view materials");
    };
    materials.values().toArray().sort();
  };

  public query ({ caller }) func getAllDeviations() : async [Deviation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view deviations");
    };
    deviations.values().toArray().sort();
  };

  public query ({ caller }) func getAllPersonnel() : async [PersonnelPure] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personnel");
    };
    personnel.values().toArray().map(
      func(person) {
        {
          principalId = person.principalId;
          name = person.name;
          role = person.role;
          certifications = person.certifications.toArray();
          isActive = person.isActive;
        };
      }
    );
  };
};
