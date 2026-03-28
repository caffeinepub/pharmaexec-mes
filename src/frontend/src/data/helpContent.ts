interface HelpSection {
  heading: string;
  content: string;
  tips?: string[];
  warning?: string;
}

interface PageHelp {
  title: string;
  sections: HelpSection[];
}

export const helpContent: Record<string, PageHelp> = {
  dashboard: {
    title: "Dashboard Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Manufacturing Operations Dashboard provides a real-time, consolidated view of all active manufacturing activities. It aggregates data from batch records, equipment, deviations, and work orders into a single command center for production managers and operators.",
      },
      {
        heading: "Key Performance Indicators (KPIs)",
        content:
          "The top row displays four critical KPIs: Active Batches (batches currently In Progress), Equipment Utilization (percentage of equipment currently in use vs. total registered), Open Deviations (unresolved GMP deviations), and Completed Today (batches completed in the current calendar day). Color-coded trend arrows indicate whether each metric is improving or degrading.",
        tips: [
          "Green arrows indicate an improving trend compared to the prior period.",
          "Red arrows indicate a worsening trend requiring attention.",
          "Click any KPI card to navigate to the respective module for detailed information.",
        ],
      },
      {
        heading: "Batch Status Table",
        content:
          "The central table lists all active and recent batches. Each row shows the Batch ID, Product Name, current Stage (e.g., Granulation, Blending, Compression), Status badge, and a Progress bar representing how far through the manufacturing pipeline the batch has advanced. Stages are ordered: Dispensing → Granulation → Blending → Compression → Coating → QA Testing → Packaging → Completed.",
        tips: [
          "In Progress batches are highlighted for quick identification.",
          "Hover over the progress bar for a percentage completion tooltip.",
        ],
      },
      {
        heading: "Equipment Status Grid",
        content:
          "The equipment grid shows all registered equipment units with their current operational status. Statuses include Available (ready for use), In Use (currently running a batch operation), Cleaning (undergoing mandatory post-batch cleaning), and Maintenance (out of service for repairs or calibration).",
        warning:
          "Equipment showing 'Maintenance' status must not be used for any production activity until cleared by a qualified engineer and the status is updated in the system.",
      },
      {
        heading: "Navigating to Other Modules",
        content:
          "Use the left sidebar navigation to access all MES modules: Batch Records for full batch lifecycle management, Work Orders for task scheduling, Equipment for asset management, Materials for inventory tracking, Deviations for GMP event management, Personnel for staff records, Audit Trail for regulatory compliance logs, and Data Manager for master data configuration.",
      },
    ],
  },

  batchRecords: {
    title: "Batch Records Help",
    sections: [
      {
        heading: "What is a Batch Record?",
        content:
          "A Batch Record (also known as an electronic Batch Manufacturing Record, or eBMR) documents every step taken to produce a specific lot of a pharmaceutical product. Under 21 CFR Part 11, all electronic batch records must be attributable, legible, contemporaneous, original, and accurate (ALCOA principles). Each batch record links personnel, equipment, materials, and process steps to a unique batch identifier.",
        warning:
          "21 CFR Part 11 requires that all electronic records used in place of paper records for GMP activities are subject to FDA audit. Ensure all entries are accurate, complete, and made by the responsible person.",
      },
      {
        heading: "Creating a New Batch Record",
        content:
          "Click 'New Batch' to open the creation dialog. Fill in: Product Name (the pharmaceutical product being manufactured), Batch Size (numeric quantity), Unit (Tablets, Capsules, mL, g, kg), Starting Stage (usually Dispensing for a new batch), and Notes (any relevant instructions or conditions). Click 'Create Batch Record' to save.",
        tips: [
          "Batch ID is automatically generated in the format B-XXXXXX for traceability.",
          "Always verify the Product Name matches the approved master formula record before creating.",
          "Notes should include any special handling instructions or deviations from standard procedure.",
        ],
      },
      {
        heading: "Batch Stages",
        content:
          "Batches progress through defined manufacturing stages: Dispensing (raw material weighing and dispensing), Granulation (particle size reduction and granule formation), Blending (homogeneous mixing of ingredients), Compression (tablet formation), Coating (protective or functional film application), QA Testing (in-process and release testing), Packaging (final product packaging), Completed (released for distribution).",
        tips: [
          "Each stage transition should be accompanied by in-process checks.",
          "QA Testing stage requires sign-off from a qualified QA Inspector before moving to Packaging.",
        ],
      },
      {
        heading: "Filtering Batch Records",
        content:
          "Use the filter tabs above the batch list to view records by status: All (all records), In Progress (active manufacturing), Completed (finished batches), Pending (scheduled but not started), Failed (batches that did not meet specifications). Filtering helps operators focus on their current assignments.",
      },
      {
        heading: "Batch Status Meanings",
        content:
          "In Progress: batch is actively being manufactured. Completed: all stages finished and product released. Pending: batch is scheduled but manufacturing has not started. Failed: batch did not meet one or more critical quality attributes (CQAs) and was rejected by QA. Failed batches require a formal deviation investigation.",
        warning:
          "A Failed batch must never be released to distribution. Initiate a deviation immediately and follow your site's batch failure SOP.",
      },
    ],
  },

  workOrders: {
    title: "Work Orders Help",
    sections: [
      {
        heading: "Overview",
        content:
          "Work Orders are task assignments that link specific manufacturing activities to batch records, equipment, or facilities. They enable production planners to schedule operations, assign responsible operators, set priority levels, and track scheduled vs. actual start times.",
      },
      {
        heading: "Relationship to Batch Records",
        content:
          "Each Work Order should reference a Batch Record ID when applicable, creating a traceable link between the task and the specific batch it supports. This linkage is critical for batch record completeness and regulatory inspections. For facility maintenance tasks, the Batch Record ID field may be left blank.",
        tips: [
          "Always link production work orders to their corresponding batch record ID.",
          "Use the Notes field to document any batch-specific instructions.",
        ],
      },
      {
        heading: "Creating a Work Order",
        content:
          "Click 'New Work Order' to open the creation dialog. Enter a clear Description of the work to be performed, the associated Batch Record ID (if applicable), Priority level, and Scheduled Start date/time. The system records who created the work order and when for traceability.",
        tips: [
          "Write descriptions that clearly state the action, location, and any special requirements.",
          "Set the scheduled start time as accurately as possible to support production planning.",
        ],
      },
      {
        heading: "Priority Levels",
        content:
          "Work orders are assigned one of four priority levels: Low (routine tasks with flexible scheduling, no production impact), Medium (standard production tasks that should be completed on schedule), High (time-sensitive tasks with potential production impact if delayed), Critical (immediate action required — production is stopped or at risk). Use priority levels consistently to support effective production scheduling.",
        warning:
          "Critical priority work orders must be actioned immediately. Escalate to the Production Manager if a Critical work order cannot be started within 1 hour.",
      },
      {
        heading: "Scheduled vs. Actual Start",
        content:
          "The Scheduled Start field records the planned start time. The Actual Start is recorded when the work order is accepted by an operator. Variance between scheduled and actual start times is tracked for production efficiency analysis and is visible in the Audit Trail module.",
      },
    ],
  },

  equipment: {
    title: "Equipment Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Equipment module manages the complete lifecycle of all manufacturing equipment in the facility. This includes registration of new equipment, tracking operational status, recording location, and maintaining notes for maintenance history. Equipment records are referenced by batch records and work orders to ensure full traceability.",
      },
      {
        heading: "Adding New Equipment",
        content:
          "Click 'Add Equipment' to register a new asset. Provide: Equipment Name (descriptive name including model if applicable), Equipment Type (Mixer, Granulator, Tablet Press, Coating Pan, HPLC, Autoclave, etc.), Location (room or area within the facility), and Notes (serial number, calibration schedule, or special instructions).",
        tips: [
          "Use a consistent naming convention, e.g., 'GRANULATOR-01 Fluid Bed Granulator'.",
          "Record the equipment serial number and manufacturer in the Notes field.",
          "Assign the correct facility location for easy identification during audits.",
        ],
      },
      {
        heading: "Equipment Status Meanings",
        content:
          "Available: equipment has passed all checks and is ready for production use. In Use: equipment is currently assigned to an active batch operation and cannot be allocated to another process. Cleaning: post-batch cleaning is in progress; equipment must not be used until cleaning is verified and status updated. Maintenance: equipment is out of service for repair, calibration, or preventive maintenance.",
        warning:
          "Never use equipment with 'Maintenance' or 'Cleaning' status for any production activity. Using unclean or unqualified equipment is a GMP violation and must be reported as a deviation.",
      },
      {
        heading: "Maintenance Scheduling",
        content:
          "Use the Notes field and Work Orders module to schedule preventive maintenance. When maintenance is due, update the equipment status to 'Maintenance' to prevent accidental use. After maintenance is completed and verified by a qualified engineer, update the status back to 'Available' and document the completion in the Notes field.",
        tips: [
          "Link maintenance work orders to the equipment record for full traceability.",
          "Document the date, technician name, and work performed after each maintenance event.",
        ],
      },
      {
        heading: "Equipment Qualification",
        content:
          "Pharmaceutical equipment must undergo Installation Qualification (IQ), Operational Qualification (OQ), and Performance Qualification (PQ) before use in GMP production. Use the Notes field to record qualification status and reference the qualification document numbers. Equipment failing requalification must remain in 'Maintenance' status until requalified.",
      },
    ],
  },

  materials: {
    title: "Materials Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Materials module manages raw material and excipient inventory from receipt through use or rejection. Every material lot is tracked by lot number, quantity, storage location, expiry date, and QC release status. This module supports GMP lot traceability requirements and material disposition.",
      },
      {
        heading: "Receiving New Material",
        content:
          "Click 'Add Material' to record a new material receipt. Required fields: Material Name (INN or INCI name and grade), Lot Number (supplier lot/batch number — must be unique per material), Quantity and Unit (amount received), Storage Location (warehouse zone or refrigerated area), and Expiry Date (from the Certificate of Analysis).",
        tips: [
          "Always verify the lot number matches the Certificate of Analysis (CoA) before entering.",
          "New materials should be received in Quarantine status pending QC sampling and testing.",
          "Record the storage location accurately to support material traceability.",
        ],
        warning:
          "Never use a material lot that is in Quarantine or Rejected status in a production batch. Doing so constitutes a GMP deviation.",
      },
      {
        heading: "Material Status Lifecycle",
        content:
          "Quarantine: material has been received but not yet tested by QC — do not use in production. Released: QC has reviewed the CoA and test results and approved the lot for use in production. Rejected: material has failed one or more QC specifications and must be segregated and disposed of per your site's SOP. Consumed: the material lot has been fully used in a batch and is no longer available in inventory.",
        warning:
          "Rejected materials must be physically segregated (locked area or labeled) immediately to prevent accidental use. Destruction or return to supplier must follow an approved procedure.",
      },
      {
        heading: "Lot Traceability",
        content:
          "Each material lot is assigned a unique internal ID in addition to the supplier lot number. When materials are issued to a batch, the lot number is linked to the batch record, enabling full forward and backward traceability. In the event of a recall, the lot number allows identification of all batches that used the suspect material.",
        tips: [
          "Always record the supplier's lot number exactly as it appears on the label.",
          "Link material usage to batch records for complete traceability.",
        ],
      },
      {
        heading: "Expiry Date Management",
        content:
          "The expiry date for each material lot is recorded at receipt and displayed in the materials list. Material with a past expiry date must be moved to Rejected status and segregated. The system does not automatically prevent use of expired material — operators and QA are responsible for verifying expiry before material issuance.",
        warning:
          "Using expired raw materials in pharmaceutical production is a critical GMP violation. Always check the expiry date before issuing materials to a batch.",
      },
    ],
  },

  dataManager: {
    title: "Data Manager Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Data Manager module provides a centralized interface for managing all master data that defines the manufacturing environment. It is modeled after PharmaSuite® Data Manager and covers equipment hierarchy, property types, and configuration data. Changes to master data are tracked with full change history and require appropriate authorization.",
      },
      {
        heading: "Entity Types",
        content:
          "Work Centers: physical areas or production zones in the facility (e.g., Granulation Suite, Packaging Hall). Stations: individual work positions or benches within a Work Center. Equipment Classes: template definitions that describe a category of equipment with common properties (e.g., all Fluid Bed Granulators share an Equipment Class). Equipment Entities: specific physical equipment items that are instances of an Equipment Class. Property Types: custom attribute definitions that can be applied to equipment for data collection (e.g., temperature range, RPM limit).",
        tips: [
          "Build your hierarchy top-down: Work Centers → Stations → Equipment Classes → Equipment Entities.",
          "Property Types defined here can be applied across multiple Equipment Classes.",
        ],
      },
      {
        heading: "Browse and Detail Layout",
        content:
          "The Data Manager uses a split-pane layout. The left pane (Browse) lists all entities with search and filter capabilities. Clicking an entity loads its full details in the right pane. The toolbar above the list allows you to create New entities, Edit, Delete, and Import/Export data.",
      },
      {
        heading: "Detail Tabs",
        content:
          "Each entity has multiple detail tabs: General (name, description, parent, status), Asset (asset number, manufacturer, model, serial number, install date), Automation (PLC/DCS connection details, tag names), Historian (process data historian configuration), and Change History (immutable log of all modifications with timestamp, user, and description of change).",
        tips: [
          "Always fill in the Asset tab for physical equipment to support maintenance tracking.",
          "The Change History tab cannot be edited — it is automatically maintained by the system.",
        ],
      },
      {
        heading: "Status Lifecycle",
        content:
          "Master data entities follow a defined lifecycle: Draft (entity is being configured and is not yet active — cannot be used in production), Active (entity is approved and available for production use), Obsolete (entity is retired and cannot be used in new production activities but historical records are preserved).",
        warning:
          "Changing an Active entity to Obsolete will prevent it from being used in any new batches or work orders. Ensure no active batch processes depend on the entity before making it Obsolete.",
      },
      {
        heading: "Electronic Signatures",
        content:
          "Status transitions from Draft to Active, and from Active to Obsolete, require an electronic signature from an authorized user under 21 CFR Part 11. The signature captures the user identity, timestamp, and meaning of the signature (e.g., 'Approved for Production Use'). These signatures are stored in the Change History and cannot be altered.",
        warning:
          "Electronic signatures have the same legal standing as handwritten signatures. Never sign on behalf of another user or share your login credentials.",
      },
    ],
  },

  deviations: {
    title: "Deviations Help",
    sections: [
      {
        heading: "What is a Deviation?",
        content:
          "A Deviation is any departure from an approved procedure, specification, or established standard during manufacturing or laboratory operations. Under GMP regulations, all deviations must be documented, investigated, and dispositioned. Examples include: out-of-specification (OOS) test results, process parameters outside validated ranges, equipment failures during production, incorrect material usage, environmental excursions, and documentation errors.",
        warning:
          "All deviations must be reported and documented immediately upon discovery. Failure to report a GMP deviation is itself a GMP violation and may result in regulatory action.",
      },
      {
        heading: "Severity Levels",
        content:
          "Minor: deviation with low impact on product quality, process, or compliance. Can typically be resolved by correction without CAPA. Major: deviation with significant potential impact on product quality or patient safety. Requires full investigation and CAPA. Critical: deviation that directly impacts product quality, patient safety, or regulatory compliance. Requires immediate action, batch quarantine, and potential regulatory notification.",
        tips: [
          "When in doubt, assign a higher severity level — it can be downgraded after investigation.",
          "Critical deviations should be immediately escalated to QA management.",
        ],
      },
      {
        heading: "Deviation Lifecycle",
        content:
          "Open: deviation has been reported and is awaiting assignment. Under Investigation: root cause analysis is in progress by the responsible team. CAPA Required: investigation is complete and a Corrective and Preventive Action plan has been identified and must be implemented. Closed: CAPA has been implemented, verified as effective, and QA has approved closure.",
        tips: [
          "Set a realistic target closure date at the time of opening.",
          "Document all investigation findings, even if they are inconclusive.",
          "CAPA effectiveness must be verified before closing the deviation.",
        ],
      },
      {
        heading: "Linking to Batch Records",
        content:
          "When a deviation occurs during a batch operation, always link it to the affected batch record ID. This linkage is mandatory for batch record completeness and ensures that QA reviewers can identify all deviations affecting a specific batch before making a batch release decision. A batch with an unresolved Critical or Major deviation cannot be released for distribution.",
        warning:
          "A batch with open Critical deviations must be quarantined and must not be released until the deviation is fully resolved and QA approves the batch.",
      },
      {
        heading: "Root Cause Analysis",
        content:
          "Use structured root cause analysis tools (5-Why, Fishbone/Ishikawa diagram) to identify the true root cause of the deviation. Avoid superficial causes (e.g., 'operator error') without digging deeper into systemic factors (e.g., inadequate training, unclear SOPs, equipment design issues). Document the root cause clearly in the deviation record before closing.",
      },
    ],
  },

  personnel: {
    title: "Personnel Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Personnel module manages all staff records for individuals who perform, supervise, or approve GMP activities. Each person's role, certification status, and active/inactive status is tracked. Personnel records are referenced in batch records, work orders, and deviation investigations to establish accountability.",
      },
      {
        heading: "User Roles",
        content:
          "Admin: full system access including user management, system configuration, and all module access. Production Manager: access to batch records, work orders, equipment, materials, and personnel — can create and update records, approve work orders, and view audit trail. Operator: access to batch records and work orders for their assigned activities — can update stages and record process data. QA Inspector: access to all modules for review — can approve batch records, close deviations, and sign off on status transitions requiring QA authorization.",
        tips: [
          "Assign the minimum necessary role for each user (principle of least privilege).",
          "QA Inspectors should not have Operator access to maintain independence.",
        ],
      },
      {
        heading: "Adding Personnel",
        content:
          "Click 'Add Personnel' to create a new staff record. Enter the person's Full Name, assign a Role, list their relevant Certifications (GMP Training, Equipment Operation, HPLC Analysis, etc.), and set their status. The system records when each person was added and their current active status.",
        tips: [
          "Add certifications that are referenced in your SOPs for the person's role.",
          "Keep certification records current — expired certifications should prompt retraining.",
        ],
      },
      {
        heading: "Certification Tracking",
        content:
          "GMP regulations require that all personnel performing critical manufacturing operations are appropriately trained and certified. The certifications listed in a person's record should match the operations they are authorized to perform. Examples: GMP Basic Training (required for all), Aseptic Technique (required for sterile manufacturing operators), Equipment-specific training (for each major equipment type operated).",
        warning:
          "An operator must not perform any GMP activity for which they do not have a current, valid certification on record. Unqualified personnel performing GMP operations is a critical compliance violation.",
      },
      {
        heading: "Active vs. Inactive Status",
        content:
          "Active personnel can be assigned to work orders and batch records. Inactive status is used when an employee leaves the organization, is on extended leave, or has their system access suspended. Inactive records are retained for historical traceability — records referencing that person (past batch records, deviations) remain intact and auditable.",
      },
    ],
  },

  auditTrail: {
    title: "Audit Trail Help",
    sections: [
      {
        heading: "Overview & Regulatory Basis",
        content:
          "The Audit Trail is an immutable, time-stamped electronic record of all create, update, and status change events in the system. It is required by 21 CFR Part 11 (FDA) and EU GMP Annex 11, which mandate that computer systems used in GMP environments maintain a secure, computer-generated audit trail. The audit trail cannot be edited, deleted, or disabled by any user.",
        warning:
          "Attempting to alter, delete, or circumvent the audit trail is a serious regulatory violation that can result in FDA Warning Letters, import alerts, or criminal prosecution.",
      },
      {
        heading: "Event Types",
        content:
          "CREATE: a new record was created (batch, work order, equipment, material, deviation, personnel). STATUS_UPDATE: the status of a record was changed (e.g., batch moved from In Progress to Completed, material changed from Quarantine to Released). CLOSE: a deviation or work order was closed. CONSUME: a material lot was marked as consumed in a batch. UPDATE: one or more fields of an existing record were modified. DELETE: a record was deleted (where permitted).",
      },
      {
        heading: "What Each Entry Records",
        content:
          "Every audit trail entry captures: Timestamp (exact date and time of the event in UTC), User ID (the account that performed the action — shared accounts are not permitted), Entity Type (Batch Record, Equipment, Material, etc.), Entity ID (unique identifier of the affected record), Event Type (from the list above), and Description (a system-generated or user-provided explanation of what changed).",
        tips: [
          "Use the Entity Type filter to focus on a specific module's events during an inspection.",
          "Search for a specific batch ID to find all actions taken on that batch.",
        ],
      },
      {
        heading: "Filtering the Audit Trail",
        content:
          "Use the Entity Type dropdown to filter events by module (All, Batch Record, Work Order, Equipment, Material, Deviation, Personnel). The list is sorted with the most recent events first. For date-range filtering and export (required for FDA inspections), use the Export function above the list.",
      },
      {
        heading: "Using the Audit Trail for Regulatory Inspections",
        content:
          "During FDA or regulatory authority inspections, investigators may request audit trail reviews for specific batches, periods, or user activities. To prepare: filter by the relevant entity type and date range, review all entries for completeness and accuracy, and be prepared to demonstrate that all status changes were made by authorized personnel. The audit trail supports demonstration of data integrity (ALCOA+ principles).",
        tips: [
          "Regularly review audit trails as part of your periodic data integrity program.",
          "Unexplained anomalies (e.g., entries made outside business hours) should be investigated.",
          "Retain audit trail records for at least the lifetime of the product plus 1 year (per 21 CFR 211.68).",
        ],
      },
    ],
  },

  settings: {
    title: "Settings Help",
    sections: [
      {
        heading: "Overview",
        content:
          "The Settings module provides access to system-wide configuration options for PharmaExec MES. Configuration changes made here affect the behavior of the entire system and should only be performed by authorized administrators.",
        warning:
          "All configuration changes are recorded in the Audit Trail. Only users with the Admin role should access or modify system settings.",
      },
      {
        heading: "User Preferences",
        content:
          "User-specific preferences such as time zone, display format (date/time locale), and default module on login will be configurable in this section. These preferences are stored per user account and do not affect other users.",
      },
      {
        heading: "Notification Settings",
        content:
          "Notifications can be configured to alert designated users when critical events occur: new Critical deviations, batch failures, equipment entering Maintenance status, or material lots approaching expiry. Notifications may be delivered via in-app alerts or integrated email (when email integration is enabled).",
        tips: [
          "Ensure QA Managers are subscribed to Critical deviation notifications.",
          "Production Managers should receive alerts when equipment enters Maintenance status.",
        ],
      },
      {
        heading: "System Configuration",
        content:
          "Advanced system settings including electronic signature configuration, session timeout duration, password policy enforcement, and data retention periods will be managed in this section. These settings must comply with your site's validated computer system procedures and any applicable regulatory requirements.",
        warning:
          "Changes to electronic signature configuration or session timeout settings may affect 21 CFR Part 11 compliance validation. Consult your Quality Assurance department before modifying these settings.",
      },
      {
        heading: "Feature Roadmap",
        content:
          "The Settings panel is actively being developed. Upcoming features include: role-based permission management, audit trail export configuration, integration with LIMS and ERP systems, automated backup scheduling, and two-factor authentication (2FA) for enhanced security. Contact your system administrator for the current deployment roadmap.",
      },
    ],
  },
};
