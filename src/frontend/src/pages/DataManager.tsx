import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Edit2,
  FileDown,
  GitBranch,
  HelpCircle,
  Lock,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HelpPanel } from "../components/HelpPanel";
import { ReportDialog } from "../components/ReportDialog";
import { helpContent } from "../data/helpContent";
import {
  type CleaningLevel,
  type CleaningLogEntry,
  type CleaningRule,
  type ComparisonType,
  type GmpStatus,
  type HealthStatus,
  type MaintenanceStatus,
  type ValidationResult,
  computeCleaningStatus,
  computeEquipmentIndicator,
  computePmStatus,
  validateExecution,
} from "../lib/gmpValidation";

const _PRODUCTS = [
  "Amoxicillin 250mg",
  "Amoxicillin 500mg",
  "Ibuprofen 200mg",
  "Metformin 500mg",
  "Metformin 850mg",
  "Omeprazole 20mg",
  "Atorvastatin 10mg",
  "Atorvastatin 40mg",
  "Ciprofloxacin 500mg",
  "Paracetamol 500mg",
];

type EntityType =
  | "WorkCenter"
  | "Station"
  | "EquipmentClass"
  | "EquipmentEntity"
  | "PropertyType";

interface ChangeEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  action?: "Create" | "Update" | "Delete";
  reason?: string;
}

interface EquipmentNode {
  id: string;
  identifier: string;
  shortDescription: string;
  description: string;
  level: string;
  inventoryNumber: string;
  manufacturer: string;
  externalId: string;
  serialNumber: string;
  manufacturingDate: string;
  disposed: boolean;
  barcode: string;
  barcodeEnabled: boolean;
  entityType: EntityType;
  parentId: string | null;
  automationServerNameDefault: string;
  automationServerName: string;
  dataOpsPath: string;
  historianProvider: string;
  historianAccessServerDefault: string;
  historianAccessServer: string;
  historianServerDefault: string;
  historianServer: string;
  createdAt: string;
  changeHistory: ChangeEntry[];
  // GMP fields
  status?: GmpStatus;
  maintenance_status?: MaintenanceStatus;
  health_status?: HealthStatus;
  last_maintenance_date?: string;
  pm_due_date?: string;
  cleaningRules?: CleaningRule[];
  cleaningLog?: CleaningLogEntry | null;
  // PropertyType capability fields
  min_value?: string;
  max_value?: string;
  required_min?: string;
  required_max?: string;
  comparison_type?: ComparisonType | "";
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  WorkCenter: "Work Center",
  Station: "Station",
  EquipmentClass: "Equipment Class",
  EquipmentEntity: "Equipment Entity",
  PropertyType: "Property Type",
};

const ENTITY_COLORS: Record<
  EntityType,
  { bg: string; badge: string; border: string }
> = {
  WorkCenter: {
    bg: "bg-rose-50",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    border: "border-l-rose-400",
  },
  Station: {
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-l-amber-400",
  },
  EquipmentClass: {
    bg: "bg-gray-50",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    border: "border-l-gray-400",
  },
  EquipmentEntity: {
    bg: "bg-teal-50",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    border: "border-l-teal-400",
  },
  PropertyType: {
    bg: "bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    border: "border-l-indigo-400",
  },
};

const INITIAL_DATA: EquipmentNode[] = [
  {
    id: "wc1",
    identifier: "WC-COAT-001",
    shortDescription: "W&C Coater",
    description: "Coating Unit Work Center — primary film-coating line",
    level: "1",
    inventoryNumber: "INV-2021-0441",
    manufacturer: "Pharma Machines Ltd",
    externalId: "WC001",
    serialNumber: "PML-2021-C001",
    manufacturingDate: "2021-03-15",
    disposed: false,
    barcode: "BC-WC-001",
    barcodeEnabled: true,
    entityType: "WorkCenter",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-COAT-01",
    dataOpsPath: "/pharma/coating/wc001",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-COAT-01",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-10T08:00:00Z",
    changeHistory: [
      {
        timestamp: "2024-06-12T14:32:00Z",
        field: "automationServerName",
        oldValue: "AIS-OLD",
        newValue: "AIS-COAT-01",
        changedBy: "Dr. Sarah Chen",
      },
    ],
    status: "Approved",
  },
  {
    id: "wc2",
    identifier: "WC-COAT-002",
    shortDescription: "W&C Coater-A",
    description: "Coating Unit Work Center — automated secondary line",
    level: "1",
    inventoryNumber: "INV-2022-0552",
    manufacturer: "Pharma Machines Ltd",
    externalId: "WC002",
    serialNumber: "PML-2022-C002",
    manufacturingDate: "2022-07-20",
    disposed: false,
    barcode: "BC-WC-002",
    barcodeEnabled: true,
    entityType: "WorkCenter",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-COAT-02",
    dataOpsPath: "/pharma/coating/wc002",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-COAT-02",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-10T08:30:00Z",
    changeHistory: [],
    status: "Draft",
  },
  {
    id: "sta1",
    identifier: "STA-FEED-001",
    shortDescription: "Sta Feeder",
    description: "Coating Unit Feeder Station",
    level: "2",
    inventoryNumber: "INV-2021-0442",
    manufacturer: "Fluid Air Inc",
    externalId: "STA001",
    serialNumber: "FAI-2021-F001",
    manufacturingDate: "2021-04-10",
    disposed: false,
    barcode: "BC-STA-001",
    barcodeEnabled: true,
    entityType: "Station",
    parentId: "wc1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/coating/wc001/feeder",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-11T09:00:00Z",
    changeHistory: [],
    status: "Approved",
  },
  {
    id: "sta2",
    identifier: "STA-FEED-002",
    shortDescription: "Sta Feeder-A",
    description: "Coating Unit Feeder Duplicate Station",
    level: "2",
    inventoryNumber: "INV-2021-0443",
    manufacturer: "Fluid Air Inc",
    externalId: "STA002",
    serialNumber: "FAI-2021-F002",
    manufacturingDate: "2021-04-12",
    disposed: false,
    barcode: "BC-STA-002",
    barcodeEnabled: true,
    entityType: "Station",
    parentId: "wc1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-FEED-02",
    dataOpsPath: "/pharma/coating/wc001/feeder-a",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-11T09:15:00Z",
    changeHistory: [],
    status: "Draft",
  },
  {
    id: "sta3",
    identifier: "STA-VESS-001",
    shortDescription: "Sta Vessel",
    description: "Coating Unit Vessel Station",
    level: "2",
    inventoryNumber: "INV-2021-0444",
    manufacturer: "Pharma Machines Ltd",
    externalId: "STA003",
    serialNumber: "PML-2021-V001",
    manufacturingDate: "2021-04-15",
    disposed: false,
    barcode: "BC-STA-003",
    barcodeEnabled: false,
    entityType: "Station",
    parentId: "wc1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/coating/wc001/vessel",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-11T09:30:00Z",
    changeHistory: [],
    status: "Approved",
  },
  {
    id: "sta4",
    identifier: "STA-VESS-002",
    shortDescription: "Sta Vessel-A",
    description: "Coating Unit Vessel Automated Station",
    level: "2",
    inventoryNumber: "INV-2022-0553",
    manufacturer: "Pharma Machines Ltd",
    externalId: "STA004",
    serialNumber: "PML-2022-V002",
    manufacturingDate: "2022-08-01",
    disposed: false,
    barcode: "BC-STA-004",
    barcodeEnabled: true,
    entityType: "Station",
    parentId: "wc2",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-VESS-02",
    dataOpsPath: "/pharma/coating/wc002/vessel-a",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-VESS-02",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-11T10:00:00Z",
    changeHistory: [],
    status: "Approved",
  },
  {
    id: "ec1",
    identifier: "EC-COAT-001",
    shortDescription: "Coaters",
    description: "Non-automated coating equipment class",
    level: "1",
    inventoryNumber: "INV-CLASS-001",
    manufacturer: "Pharma Machines Ltd",
    externalId: "EC001",
    serialNumber: "",
    manufacturingDate: "",
    disposed: false,
    barcode: "",
    barcodeEnabled: false,
    entityType: "EquipmentClass",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/classes/coaters",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-05T07:00:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Active",
    health_status: "Good",
    pm_due_date: "2026-06-01",
    cleaningRules: [],
    cleaningLog: null,
  },
  {
    id: "ec2",
    identifier: "EC-COAT-002",
    shortDescription: "Coaters-A",
    description: "Automated coating equipment class",
    level: "1",
    inventoryNumber: "INV-CLASS-002",
    manufacturer: "Pharma Machines Ltd",
    externalId: "EC002",
    serialNumber: "",
    manufacturingDate: "",
    disposed: false,
    barcode: "",
    barcodeEnabled: false,
    entityType: "EquipmentClass",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-CLASS-02",
    dataOpsPath: "/pharma/classes/coaters-a",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-05T07:30:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Active",
    health_status: "Good",
    pm_due_date: "2026-07-15",
    cleaningRules: [],
    cleaningLog: null,
  },
  // ee1: Approved, Active, Good, PM On Time — all green
  {
    id: "ee1",
    identifier: "EE-COAT-S",
    shortDescription: "Coater_S",
    description: "Small non-automated coating unit",
    level: "2",
    inventoryNumber: "INV-2020-0310",
    manufacturer: "Pharma Machines Ltd",
    externalId: "EE001",
    serialNumber: "PML-2020-CS01",
    manufacturingDate: "2020-05-20",
    disposed: false,
    barcode: "BC-EE-001",
    barcodeEnabled: true,
    entityType: "EquipmentEntity",
    parentId: "ec1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/equipment/coater-s",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-12T08:00:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Active",
    health_status: "Good",
    last_maintenance_date: "2025-12-01",
    pm_due_date: "2026-06-01",
    cleaningRules: [],
    cleaningLog: {
      lastProduct: "Amoxicillin 250mg",
      lastCleanedDate: "2026-03-20",
      cleaningLevel: "Major",
    },
  },
  // ee2: Draft, Active, Good, PM Due Soon — yellow
  {
    id: "ee2",
    identifier: "EE-COAT-M",
    shortDescription: "Coater_M",
    description: "Medium non-automated coating unit",
    level: "2",
    inventoryNumber: "INV-2020-0311",
    manufacturer: "Pharma Machines Ltd",
    externalId: "EE002",
    serialNumber: "PML-2020-CM01",
    manufacturingDate: "2020-06-10",
    disposed: false,
    barcode: "BC-EE-002",
    barcodeEnabled: true,
    entityType: "EquipmentEntity",
    parentId: "ec1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/equipment/coater-m",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-12T08:15:00Z",
    changeHistory: [],
    status: "Draft",
    maintenance_status: "Active",
    health_status: "Good",
    last_maintenance_date: "2025-11-15",
    pm_due_date: "2026-04-09",
    cleaningRules: [],
    cleaningLog: null,
  },
  // ee3: Approved, Under Maintenance, Bad, PM Overdue — red
  {
    id: "ee3",
    identifier: "EE-COAT-N",
    shortDescription: "Coater_N",
    description: "Nano non-automated coating unit",
    level: "2",
    inventoryNumber: "INV-2021-0315",
    manufacturer: "Fluid Air Inc",
    externalId: "EE003",
    serialNumber: "FAI-2021-CN01",
    manufacturingDate: "2021-01-25",
    disposed: false,
    barcode: "BC-EE-003",
    barcodeEnabled: false,
    entityType: "EquipmentEntity",
    parentId: "ec1",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/equipment/coater-n",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-12T08:30:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Under Maintenance",
    health_status: "Bad",
    last_maintenance_date: "2025-09-10",
    pm_due_date: "2026-03-15",
    cleaningRules: [],
    cleaningLog: null,
  },
  // ee4: Approved, Active, Good, PM OK, cleaning Required — red
  {
    id: "ee4",
    identifier: "EE-COAT-AT",
    shortDescription: "Coater_At",
    description: "Automated tablet coating unit",
    level: "2",
    inventoryNumber: "INV-2022-0560",
    manufacturer: "GEA Pharma Systems",
    externalId: "EE004",
    serialNumber: "GEA-2022-AT01",
    manufacturingDate: "2022-03-14",
    disposed: false,
    barcode: "BC-EE-004",
    barcodeEnabled: true,
    entityType: "EquipmentEntity",
    parentId: "ec2",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-EE-04",
    dataOpsPath: "/pharma/equipment/coater-at",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-EE-04",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-12T09:00:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Active",
    health_status: "Good",
    last_maintenance_date: "2026-01-20",
    pm_due_date: "2026-07-20",
    cleaningRules: [
      {
        id: "cr1",
        previousProduct: "Amoxicillin 500mg",
        nextProduct: "Metformin 500mg",
        requiredCleaningLevel: "Major",
      },
      {
        id: "cr2",
        previousProduct: "Ciprofloxacin 500mg",
        nextProduct: "Paracetamol 500mg",
        requiredCleaningLevel: "Minor",
      },
    ],
    cleaningLog: {
      lastProduct: "Amoxicillin 500mg",
      lastCleanedDate: "2026-03-28",
      cleaningLevel: "Minor",
    },
  },
  // ee5: Draft, Active, Good, PM OK, cleaning OK — green
  {
    id: "ee5",
    identifier: "EE-COAT-AM",
    shortDescription: "Coater_AM",
    description: "Automated membrane coating unit",
    level: "2",
    inventoryNumber: "INV-2022-0561",
    manufacturer: "GEA Pharma Systems",
    externalId: "EE005",
    serialNumber: "GEA-2022-AM01",
    manufacturingDate: "2022-04-08",
    disposed: false,
    barcode: "BC-EE-005",
    barcodeEnabled: true,
    entityType: "EquipmentEntity",
    parentId: "ec2",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-EE-05",
    dataOpsPath: "/pharma/equipment/coater-am",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-EE-05",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-12T09:15:00Z",
    changeHistory: [],
    status: "Draft",
    maintenance_status: "Active",
    health_status: "Good",
    last_maintenance_date: "2026-02-10",
    pm_due_date: "2026-08-10",
    cleaningRules: [],
    cleaningLog: {
      lastProduct: "Paracetamol 500mg",
      lastCleanedDate: "2026-03-30",
      cleaningLevel: "Major",
    },
  },
  // ee6: Approved, Active, Bad, PM Overdue — red
  {
    id: "ee6",
    identifier: "EE-COAT-AK",
    shortDescription: "Coater_Ak",
    description: "Automated kinetic coating unit",
    level: "2",
    inventoryNumber: "INV-2023-0600",
    manufacturer: "GEA Pharma Systems",
    externalId: "EE006",
    serialNumber: "GEA-2023-AK01",
    manufacturingDate: "2023-01-30",
    disposed: false,
    barcode: "BC-EE-006",
    barcodeEnabled: true,
    entityType: "EquipmentEntity",
    parentId: "ec2",
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "AIS-EE-06",
    dataOpsPath: "/pharma/equipment/coater-ak",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "PI-EE-06",
    historianServerDefault: "PIServer1",
    historianServer: "PI-MAIN",
    createdAt: "2024-01-12T09:30:00Z",
    changeHistory: [],
    status: "Approved",
    maintenance_status: "Active",
    health_status: "Bad",
    last_maintenance_date: "2025-08-01",
    pm_due_date: "2026-02-28",
    cleaningRules: [],
    cleaningLog: null,
  },
  {
    id: "pt1",
    identifier: "PT-BATCHID",
    shortDescription: "Batch ID",
    description: "Unique batch identifier property type",
    level: "1",
    inventoryNumber: "",
    manufacturer: "",
    externalId: "PT001",
    serialNumber: "",
    manufacturingDate: "",
    disposed: false,
    barcode: "",
    barcodeEnabled: false,
    entityType: "PropertyType",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/properties/batch-id",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-08T10:00:00Z",
    changeHistory: [],
    status: "Approved",
    min_value: "",
    max_value: "",
    required_min: "",
    required_max: "",
    comparison_type: "",
  },
  {
    id: "pt2",
    identifier: "PT-COATPREP",
    shortDescription: "Coater Prepared",
    description: "Flag indicating coater has been prepared for batch",
    level: "1",
    inventoryNumber: "",
    manufacturer: "",
    externalId: "PT002",
    serialNumber: "",
    manufacturingDate: "",
    disposed: false,
    barcode: "",
    barcodeEnabled: false,
    entityType: "PropertyType",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/properties/coater-prepared",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-08T10:15:00Z",
    changeHistory: [],
    status: "Approved",
    min_value: "",
    max_value: "",
    required_min: "",
    required_max: "",
    comparison_type: "",
  },
  {
    id: "pt3",
    identifier: "PT-DRUMSIZE",
    shortDescription: "Drum Size",
    description: "Coating drum volume in litres",
    level: "1",
    inventoryNumber: "",
    manufacturer: "",
    externalId: "PT003",
    serialNumber: "",
    manufacturingDate: "",
    disposed: false,
    barcode: "",
    barcodeEnabled: false,
    entityType: "PropertyType",
    parentId: null,
    automationServerNameDefault: "AutomationIntegrationServer1",
    automationServerName: "",
    dataOpsPath: "/pharma/properties/drum-size",
    historianProvider: "PIConnector",
    historianAccessServerDefault: "PIAccessServer1",
    historianAccessServer: "",
    historianServerDefault: "PIServer1",
    historianServer: "",
    createdAt: "2024-01-08T10:30:00Z",
    changeHistory: [],
    status: "Draft",
    min_value: "10",
    max_value: "200",
    required_min: "50",
    required_max: "150",
    comparison_type: "WITHIN_RANGE",
  },
];

const EMPTY_NODE: Omit<EquipmentNode, "id" | "createdAt" | "changeHistory"> = {
  identifier: "",
  shortDescription: "",
  description: "",
  level: "1",
  inventoryNumber: "",
  manufacturer: "",
  externalId: "",
  serialNumber: "",
  manufacturingDate: "",
  disposed: false,
  barcode: "",
  barcodeEnabled: false,
  entityType: "EquipmentEntity",
  parentId: null,
  automationServerNameDefault: "AutomationIntegrationServer1",
  automationServerName: "",
  dataOpsPath: "",
  historianProvider: "PIConnector",
  historianAccessServerDefault: "PIAccessServer1",
  historianAccessServer: "",
  historianServerDefault: "PIServer1",
  historianServer: "",
  status: "Draft",
  maintenance_status: "Active",
  health_status: "Good",
  last_maintenance_date: "",
  pm_due_date: "",
  cleaningRules: [],
  cleaningLog: null,
  min_value: "",
  max_value: "",
  required_min: "",
  required_max: "",
  comparison_type: "",
};

class DetailErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Select an item to view details
        </div>
      );
    }
    return this.props.children;
  }
}

function FieldRow({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-2 py-1.5">
      <Label className="text-[11.5px] font-medium text-muted-foreground pt-2 leading-tight">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function GmpIndicatorDot({ color }: { color: "green" | "yellow" | "red" }) {
  const cls = {
    green: "bg-green-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
  }[color];
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", cls)}
    />
  );
}

export default function DataManager() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [nodes, setNodes] = useState<EquipmentNode[]>(INITIAL_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<EquipmentNode | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newNode, setNewNode] = useState<
    Omit<EquipmentNode, "id" | "createdAt" | "changeHistory">
  >({ ...EMPTY_NODE });
  const [selectedEntityType, setSelectedEntityType] = useState<
    EntityType | "all"
  >("all");
  const [isLoading, setIsLoading] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidationResult | null>(
    null,
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = nodes.filter(
    (n) =>
      (selectedEntityType === "all" || n.entityType === selectedEntityType) &&
      (search.trim() === "" ||
        n.shortDescription.toLowerCase().includes(search.toLowerCase()) ||
        n.identifier.toLowerCase().includes(search.toLowerCase())),
  );

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      if (editMode) {
        if (!confirm("Discard unsaved changes?")) return;
      }
      setSelectedId(null);
      setEditMode(false);
      setDraft(null);
      return;
    }
    if (editMode) {
      if (!confirm("Discard unsaved changes?")) return;
      setEditMode(false);
      setDraft(null);
    }
    setSelectedId(id);
  };

  const handleEdit = () => {
    if (!selected) return;
    if (selected.status === "Approved") {
      toast.error("Approved records are read-only. Cannot edit.");
      return;
    }
    setDraft({ ...selected });
    setEditMode(true);
  };

  const handleSave = () => {
    if (!draft) return;
    if (draft.status === "Approved") {
      toast.error("Approved records cannot be edited.");
      return;
    }
    const now = new Date().toISOString();
    const prev = nodes.find((n) => n.id === draft.id);
    const changes: ChangeEntry[] = [];
    if (prev) {
      const fields = Object.keys(draft) as (keyof EquipmentNode)[];
      for (const f of fields) {
        if (
          f === "changeHistory" ||
          f === "createdAt" ||
          f === "cleaningRules" ||
          f === "cleaningLog"
        )
          continue;
        const oldVal = String(prev[f] ?? "");
        const newVal = String(draft[f] ?? "");
        if (oldVal !== newVal) {
          changes.push({
            timestamp: now,
            field: f,
            oldValue: oldVal,
            newValue: newVal,
            changedBy: "Dr. Sarah Chen",
          });
        }
      }
    }
    setNodes((prev) =>
      prev.map((n) =>
        n.id === draft.id
          ? { ...draft, changeHistory: [...draft.changeHistory, ...changes] }
          : n,
      ),
    );
    setEditMode(false);
    setDraft(null);
    toast.success("Changes saved successfully");
  };

  const handleApprove = () => {
    if (!selected) return;
    const now = new Date().toISOString();
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selected.id
          ? {
              ...n,
              status: "Approved" as GmpStatus,
              changeHistory: [
                ...n.changeHistory,
                {
                  timestamp: now,
                  field: "status",
                  oldValue: "Draft",
                  newValue: "Approved",
                  changedBy: "Dr. Sarah Chen",
                  action: "Update" as const,
                  reason: "GMP Status Approval",
                },
              ],
            }
          : n,
      ),
    );
    toast.success("Record approved successfully");
  };

  const handleDelete = () => {
    if (!selected) return;
    if (selected.status === "Approved") {
      toast.error("Approved records cannot be deleted (GMP compliance).");
      return;
    }
    if (!confirm(`Delete "${selected.shortDescription}"?`)) return;
    setNodes((prev) => prev.filter((n) => n.id !== selected.id));
    setSelectedId(null);
    toast.success("Item deleted");
  };

  const handleCreate = () => {
    const id = `node_${Date.now()}`;
    const node: EquipmentNode = {
      ...newNode,
      id,
      createdAt: new Date().toISOString(),
      changeHistory: [],
    };
    setNodes((prev) => [...prev, node]);
    setNewDialogOpen(false);
    setNewNode({ ...EMPTY_NODE });
    setSelectedId(id);
    toast.success("New item created");
  };

  const handleEntityTypeChange = (type: EntityType | "all") => {
    setSelectedEntityType(type);
    setSelectedId(null);
    setEditMode(false);
    setDraft(null);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleValidate = () => {
    if (!selected) return;
    const result = validateExecution({
      equipment:
        selected.entityType === "EquipmentEntity" ||
        selected.entityType === "EquipmentClass"
          ? {
              status: selected.status ?? "Draft",
              maintenance_status: selected.maintenance_status ?? "Active",
              health_status: selected.health_status ?? "Good",
              pm_due_date: selected.pm_due_date ?? "",
              cleaningLog: selected.cleaningLog ?? null,
              cleaningRules: selected.cleaningRules ?? [],
            }
          : null,
      equipmentId: selected.identifier,
    });
    setValidateResult(result);
    setValidateDialogOpen(true);
  };

  const currentNode = selectedId
    ? editMode && draft
      ? draft
      : selected
    : null;

  const getParentLabel = (parentId: string | null) => {
    if (!parentId) return null;
    const p = nodes.find((n) => n.id === parentId);
    return p?.shortDescription ?? null;
  };

  const breadcrumb = selected
    ? [getParentLabel(selected.parentId), selected.shortDescription]
        .filter(Boolean)
        .join(" / ")
    : "";

  const isEquipmentNode = (n: EquipmentNode) =>
    n.entityType === "EquipmentEntity" || n.entityType === "EquipmentClass";

  return (
    <div className="flex flex-col flex-1 min-h-0 -m-6">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-border shrink-0">
        <Database size={18} className="text-primary" />
        <h1 className="text-[15px] font-semibold text-foreground">
          Data Manager
        </h1>
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wide"
        >
          Equipment
        </Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-7 text-[12px]"
            onClick={() => setHelpOpen(true)}
            data-ocid="data_manager.help.button"
          >
            <HelpCircle size={13} /> Help
          </Button>
        </div>
      </div>

      {/* Split pane body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANE */}
        <div className="flex flex-col flex-1 border-r border-border bg-white min-h-0">
          {/* Toolbar */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 border-b border-border bg-[oklch(0.975_0.004_240)] shrink-0 sticky top-0 z-10 transition-shadow duration-200",
              isScrolled && "shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-7 gap-1 text-[12px] px-3"
                  data-ocid="data_manager.new_button"
                >
                  <Plus size={13} /> New <ChevronDown size={11} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-[13px]">
                {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(
                  (type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => {
                        setNewNode({ ...EMPTY_NODE, entityType: type });
                        setNewDialogOpen(true);
                      }}
                    >
                      {ENTITY_TYPE_LABELS[type]}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[12px] px-3"
              onClick={editMode ? handleSave : handleEdit}
              disabled={!selected}
              data-ocid="data_manager.save_button"
            >
              <Save size={13} /> {editMode ? "Save" : "Edit"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[12px] px-3 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={!selected}
              data-ocid="data_manager.delete_button"
            >
              <Trash2 size={13} /> Delete
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[12px] px-3"
              onClick={() => setReportOpen(true)}
              data-ocid="data_manager.export_report_button"
            >
              <FileDown size={13} /> Export Report
            </Button>

            <div className="flex-1" />

            <Select
              value={selectedEntityType}
              onValueChange={(v) =>
                handleEntityTypeChange(v as EntityType | "all")
              }
            >
              <SelectTrigger
                className="h-7 w-44 text-[12px] bg-white"
                data-ocid="data_manager.entity_type_filter.select"
              >
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[12px]">
                  All Types
                </SelectItem>
                {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(
                  (type) => (
                    <SelectItem key={type} value={type} className="text-[12px]">
                      {ENTITY_TYPE_LABELS[type]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <div className="relative w-44">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="h-7 pl-8 text-[12px] bg-white"
                data-ocid="data_manager.search_input"
              />
            </div>
          </div>

          {/* Viewing label */}
          <div className="px-4 pt-3 pb-1 shrink-0">
            <span className="text-[12px] font-semibold text-foreground">
              Viewing:{" "}
              {selectedEntityType === "all"
                ? "All Types"
                : ENTITY_TYPE_LABELS[selectedEntityType]}
            </span>
            <span className="ml-2 text-[11px] text-muted-foreground">
              ({filtered.length} item{filtered.length !== 1 ? "s" : ""})
            </span>
          </div>

          {/* Cards grid */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto scroll-smooth"
          >
            {isLoading ? (
              <div
                className="flex items-center justify-center py-16 text-muted-foreground"
                data-ocid="data_manager.loading_state"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px]">Loading...</span>
                </div>
              </div>
            ) : (
              <div
                className="p-4 grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
              >
                {filtered.length === 0 && (
                  <div
                    className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground"
                    data-ocid="data_manager.empty_state"
                  >
                    <Database size={32} className="mb-3 opacity-25" />
                    <p className="text-[13px]">No items match your search</p>
                  </div>
                )}
                {filtered.map((node, idx) => {
                  const colors = ENTITY_COLORS[node.entityType];
                  const isSelected = selectedId === node.id;
                  const showGmp = isEquipmentNode(node);
                  const pmStatus = showGmp
                    ? computePmStatus(node.pm_due_date ?? "")
                    : null;
                  const cleaningStatus = showGmp
                    ? computeCleaningStatus(
                        node.cleaningLog ?? null,
                        node.cleaningRules ?? [],
                      )
                    : null;
                  const indicator = showGmp
                    ? computeEquipmentIndicator(
                        node.maintenance_status ?? "Active",
                        node.health_status ?? "Good",
                        pmStatus!,
                        cleaningStatus!,
                      )
                    : null;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelect(node.id)}
                      data-ocid={`data_manager.item.${idx + 1}`}
                      className={cn(
                        "text-left rounded-lg border-l-4 border border-border p-3 cursor-pointer transition-all",
                        colors.bg,
                        colors.border,
                        isSelected
                          ? "ring-2 ring-primary ring-offset-1 shadow-md"
                          : "hover:shadow-sm hover:border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[12.5px] font-semibold text-foreground leading-tight">
                          {node.shortDescription}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {showGmp && indicator && (
                            <GmpIndicatorDot color={indicator} />
                          )}
                          <span
                            className={cn(
                              "text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border whitespace-nowrap",
                              colors.badge,
                            )}
                          >
                            {ENTITY_TYPE_LABELS[node.entityType]}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {node.identifier}
                      </p>
                      {node.parentId && (
                        <p className="text-[10.5px] text-muted-foreground mt-1">
                          ↳ {getParentLabel(node.parentId)}
                        </p>
                      )}
                      {showGmp && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {/* PM Status */}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                              {
                                "bg-green-50 text-green-700 border-green-200":
                                  pmStatus === "On Time",
                                "bg-amber-50 text-amber-700 border-amber-200":
                                  pmStatus === "Due Soon",
                                "bg-red-50 text-red-700 border-red-200":
                                  pmStatus === "Overdue",
                              },
                            )}
                          >
                            PM: {pmStatus}
                          </span>
                          {/* Health Status */}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                              {
                                "bg-green-50 text-green-700 border-green-200":
                                  node.health_status === "Good",
                                "bg-red-50 text-red-700 border-red-200":
                                  node.health_status === "Bad",
                              },
                            )}
                          >
                            {node.health_status ?? "Good"}
                          </span>
                          {/* Cleaning Status */}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                              {
                                "bg-green-50 text-green-700 border-green-200":
                                  cleaningStatus === "OK",
                                "bg-red-50 text-red-700 border-red-200":
                                  cleaningStatus === "Required",
                              },
                            )}
                          >
                            Clean: {cleaningStatus}
                          </span>
                          {/* GMP Status */}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                              {
                                "bg-green-50 text-green-700 border-green-200":
                                  node.status === "Approved",
                                "bg-amber-50 text-amber-700 border-amber-200":
                                  node.status === "Draft" || !node.status,
                              },
                            )}
                          >
                            {node.status ?? "Draft"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border bg-[oklch(0.975_0.004_240)] text-[11px] text-muted-foreground shrink-0">
            <span>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
            {breadcrumb && (
              <>
                <span>·</span>
                <span className="font-mono">{breadcrumb}</span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="flex flex-col w-[420px] shrink-0 bg-white min-h-0 overflow-y-auto">
          {currentNode ? (
            <>
              {/* Detail header */}
              <div className="flex items-start justify-between px-5 py-3 border-b border-border bg-[oklch(0.975_0.004_240)] shrink-0">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {currentNode.shortDescription}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {currentNode.identifier}
                  </p>
                  {/* GMP Status badge */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        {
                          "bg-green-50 text-green-700 border-green-200":
                            currentNode.status === "Approved",
                          "bg-amber-50 text-amber-700 border-amber-200":
                            currentNode.status === "Draft" ||
                            !currentNode.status,
                        },
                      )}
                    >
                      {currentNode.status === "Approved"
                        ? "✓ Approved"
                        : "Draft"}
                    </span>
                    {currentNode.status === "Approved" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock size={10} /> Read-only
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end ml-2">
                  {editMode ? (
                    <>
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-[12px] px-3"
                        onClick={handleSave}
                        data-ocid="data_manager.save_button"
                      >
                        <Save size={12} /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[12px] px-3"
                        onClick={() => {
                          setEditMode(false);
                          setDraft(null);
                        }}
                        data-ocid="data_manager.cancel_button"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 gap-1 text-[12px] px-3",
                          currentNode.status === "Approved" &&
                            "opacity-50 cursor-not-allowed",
                        )}
                        onClick={handleEdit}
                        disabled={currentNode.status === "Approved"}
                        title={
                          currentNode.status === "Approved"
                            ? "Approved records are read-only"
                            : "Edit record"
                        }
                        data-ocid="data_manager.edit_button"
                      >
                        {currentNode.status === "Approved" ? (
                          <Lock size={12} />
                        ) : (
                          <Edit2 size={12} />
                        )}{" "}
                        Edit
                      </Button>
                      {(currentNode.status === "Draft" ||
                        !currentNode.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={handleApprove}
                          data-ocid="data_manager.approve_button"
                        >
                          <Shield size={12} /> Approve
                        </Button>
                      )}
                      {isEquipmentNode(currentNode) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3"
                          onClick={handleValidate}
                          data-ocid="data_manager.validate_button"
                        >
                          <CheckCircle2 size={12} /> Validate
                        </Button>
                      )}
                      {(currentNode.entityType === "EquipmentEntity" ||
                        currentNode.entityType === "EquipmentClass") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3"
                          onClick={() => navigate({ to: "/workflow-designer" })}
                          data-ocid="data_manager.workflow_designer.button"
                        >
                          <GitBranch size={12} /> Workflow
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <DetailErrorBoundary key={selectedId ?? "none"}>
                <Tabs
                  defaultValue="basic"
                  className="flex flex-col flex-1 min-h-0"
                >
                  <div className="overflow-x-auto mx-4 mt-3 shrink-0">
                    <TabsList className="h-8 bg-muted rounded-md text-[11.5px] w-max min-w-full">
                      <TabsTrigger
                        value="basic"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.basic.tab"
                      >
                        Basic
                      </TabsTrigger>
                      <TabsTrigger
                        value="spec"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.spec.tab"
                      >
                        Specification
                      </TabsTrigger>
                      <TabsTrigger
                        value="process"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.process.tab"
                      >
                        Process
                      </TabsTrigger>
                      <TabsTrigger
                        value="engineering"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.engineering.tab"
                      >
                        Engineering
                      </TabsTrigger>
                      {isEquipmentNode(currentNode) && (
                        <TabsTrigger
                          value="cleaning"
                          className="h-6 px-3 text-[11.5px]"
                          data-ocid="data_manager.cleaning.tab"
                        >
                          Cleaning
                        </TabsTrigger>
                      )}
                      <TabsTrigger
                        value="logbook"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.logbook.tab"
                      >
                        Logbook
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.history.tab"
                      >
                        Change History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* BASIC TAB */}
                  <TabsContent
                    value="basic"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 min-h-0 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Asset Attributes" />
                    <FieldRow label="Identifier">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.identifier ?? currentNode.identifier)
                            : currentNode.identifier
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, identifier: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                        data-ocid="data_manager.identifier.input"
                      />
                    </FieldRow>
                    <FieldRow label="Short Description">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.shortDescription
                            : currentNode.shortDescription
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && { ...d, shortDescription: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                        data-ocid="data_manager.short_description.input"
                      />
                    </FieldRow>
                    <FieldRow label="Description">
                      <Textarea
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.description ?? currentNode.description)
                            : currentNode.description
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, description: e.target.value },
                          )
                        }
                        className="text-[12px] min-h-[56px] resize-none"
                        data-ocid="data_manager.description.textarea"
                      />
                    </FieldRow>
                    <FieldRow label="Level">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.level ?? currentNode.level)
                            : currentNode.level
                        }
                        onChange={(e) =>
                          setDraft((d) => d && { ...d, level: e.target.value })
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Inventory Number">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.inventoryNumber
                            : currentNode.inventoryNumber
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && { ...d, inventoryNumber: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Manufacturer">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.manufacturer
                            : currentNode.manufacturer
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, manufacturer: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="ID">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.externalId ?? currentNode.externalId)
                            : currentNode.externalId
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, externalId: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Serial Number">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.serialNumber
                            : currentNode.serialNumber
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, serialNumber: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Manufacturing Date">
                      <Input
                        type="date"
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.manufacturingDate
                            : currentNode.manufacturingDate
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && { ...d, manufacturingDate: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Disposed">
                      <div className="flex items-center h-7">
                        <Checkbox
                          disabled={!editMode}
                          checked={
                            editMode
                              ? (draft?.disposed ?? currentNode.disposed)
                              : currentNode.disposed
                          }
                          onCheckedChange={(v) =>
                            setDraft((d) => d && { ...d, disposed: Boolean(v) })
                          }
                          data-ocid="data_manager.disposed.checkbox"
                        />
                      </div>
                    </FieldRow>
                    <FieldRow label="Barcode">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.barcode ?? currentNode.barcode)
                            : currentNode.barcode
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, barcode: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Barcode Enabled">
                      <div className="flex items-center h-7">
                        <Checkbox
                          disabled={!editMode}
                          checked={
                            editMode
                              ? draft?.barcodeEnabled
                              : currentNode.barcodeEnabled
                          }
                          onCheckedChange={(v) =>
                            setDraft(
                              (d) => d && { ...d, barcodeEnabled: Boolean(v) },
                            )
                          }
                          data-ocid="data_manager.barcode_enabled.checkbox"
                        />
                      </div>
                    </FieldRow>

                    <SectionHeader title="Automation Attributes" />
                    <FieldRow label="Server name default">
                      <Input
                        readOnly
                        value={currentNode.automationServerNameDefault}
                        className="h-7 text-[12px] bg-muted/50"
                        placeholder="AutomationIntegrationServer1"
                      />
                    </FieldRow>
                    <FieldRow label="Server name">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.automationServerName
                            : currentNode.automationServerName
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && {
                                ...d,
                                automationServerName: e.target.value,
                              },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Data OPS path">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? (draft?.dataOpsPath ?? currentNode.dataOpsPath)
                            : currentNode.dataOpsPath
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) => d && { ...d, dataOpsPath: e.target.value },
                          )
                        }
                        className="h-7 text-[12px] font-mono"
                      />
                    </FieldRow>

                    <SectionHeader title="Historian Attributes" />
                    <FieldRow label="Provider default">
                      <Input
                        readOnly
                        value={currentNode.historianProvider}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Access server default">
                      <Input
                        readOnly
                        value={currentNode.historianAccessServerDefault}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Access server">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.historianAccessServer
                            : currentNode.historianAccessServer
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && {
                                ...d,
                                historianAccessServer: e.target.value,
                              },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                    <FieldRow label="Historian server default">
                      <Input
                        readOnly
                        value={currentNode.historianServerDefault}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Historian server">
                      <Input
                        disabled={!editMode}
                        value={
                          editMode
                            ? draft?.historianServer
                            : currentNode.historianServer
                        }
                        onChange={(e) =>
                          setDraft(
                            (d) =>
                              d && { ...d, historianServer: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                      />
                    </FieldRow>
                  </TabsContent>

                  {/* SPECIFICATION TAB */}
                  <TabsContent
                    value="spec"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Specification" />
                    <FieldRow label="Equipment Class">
                      <Input
                        readOnly
                        value={ENTITY_TYPE_LABELS[currentNode.entityType]}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Level">
                      <Input
                        readOnly
                        value={currentNode.level}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Status">
                      <Input
                        readOnly
                        value={currentNode.disposed ? "Disposed" : "Active"}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Manufacturer">
                      <Input
                        readOnly
                        value={currentNode.manufacturer || "—"}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>

                    {currentNode.entityType === "PropertyType" && (
                      <>
                        <SectionHeader title="Range & Capability" />
                        <FieldRow label="Min Value">
                          <Input
                            disabled={!editMode}
                            value={
                              editMode
                                ? (draft?.min_value ?? "")
                                : (currentNode.min_value ?? "")
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) => d && { ...d, min_value: e.target.value },
                              )
                            }
                            className="h-7 text-[12px]"
                            placeholder="e.g. 10"
                          />
                        </FieldRow>
                        <FieldRow label="Max Value">
                          <Input
                            disabled={!editMode}
                            value={
                              editMode
                                ? (draft?.max_value ?? "")
                                : (currentNode.max_value ?? "")
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) => d && { ...d, max_value: e.target.value },
                              )
                            }
                            className="h-7 text-[12px]"
                            placeholder="e.g. 200"
                          />
                        </FieldRow>
                        <FieldRow label="Required Min">
                          <Input
                            disabled={!editMode}
                            value={
                              editMode
                                ? (draft?.required_min ?? "")
                                : (currentNode.required_min ?? "")
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) =>
                                  d && { ...d, required_min: e.target.value },
                              )
                            }
                            className="h-7 text-[12px]"
                            placeholder="e.g. 50"
                          />
                        </FieldRow>
                        <FieldRow label="Required Max">
                          <Input
                            disabled={!editMode}
                            value={
                              editMode
                                ? (draft?.required_max ?? "")
                                : (currentNode.required_max ?? "")
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) =>
                                  d && { ...d, required_max: e.target.value },
                              )
                            }
                            className="h-7 text-[12px]"
                            placeholder="e.g. 150"
                          />
                        </FieldRow>
                        <FieldRow label="Comparison Type">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.comparison_type
                                : currentNode.comparison_type) || "none"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    comparison_type:
                                      v === "none" ? "" : (v as ComparisonType),
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-[12px]">
                                — Not Set —
                              </SelectItem>
                              <SelectItem
                                value="WITHIN_RANGE"
                                className="text-[12px]"
                              >
                                WITHIN_RANGE
                              </SelectItem>
                              <SelectItem
                                value="COVER_RANGE"
                                className="text-[12px]"
                              >
                                COVER_RANGE
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground">
                          <p className="font-semibold mb-1">
                            Comparison Logic:
                          </p>
                          <p>
                            <strong>WITHIN_RANGE:</strong> Value must be inside
                            the required range (required_min ≤ value ≤
                            required_max).
                          </p>
                          <p className="mt-1">
                            <strong>COVER_RANGE:</strong> Equipment range must
                            fully cover the required range (min ≤ required_min
                            AND max ≥ required_max).
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* PROCESS TAB */}
                  <TabsContent
                    value="process"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Process Configuration" />
                    <div className="mb-3 text-[11.5px] text-muted-foreground">
                      Process parameters and operating conditions for this
                      entity.
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] h-7">
                            Parameter
                          </TableHead>
                          <TableHead className="text-[11px] h-7">
                            Value
                          </TableHead>
                          <TableHead className="text-[11px] h-7">
                            Unit
                          </TableHead>
                          <TableHead className="text-[11px] h-7">Min</TableHead>
                          <TableHead className="text-[11px] h-7">Max</TableHead>
                          <TableHead className="text-[11px] h-7">
                            Type
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          {
                            param: "Operating Temperature",
                            value: "25",
                            unit: "°C",
                            min: "15",
                            max: "30",
                            type: "Process",
                          },
                          {
                            param: "Relative Humidity",
                            value: "45",
                            unit: "%",
                            min: "30",
                            max: "60",
                            type: "Process",
                          },
                          {
                            param: "Pressure",
                            value: "1.0",
                            unit: "bar",
                            min: "0.8",
                            max: "1.2",
                            type: "Process",
                          },
                          {
                            param: "Calibration Interval",
                            value: "365",
                            unit: "days",
                            min: "—",
                            max: "—",
                            type: "Maintenance",
                          },
                          {
                            param: "Max Load Capacity",
                            value: "See Spec Sheet",
                            unit: "—",
                            min: "—",
                            max: "—",
                            type: "Specification",
                          },
                          {
                            param: "Cleaning Status",
                            value: "Not Set",
                            unit: "—",
                            min: "—",
                            max: "—",
                            type: "Compliance",
                          },
                        ].map((row, idx) => (
                          <TableRow
                            key={row.param}
                            data-ocid={`data_manager.process.item.${idx + 1}`}
                          >
                            <TableCell className="text-[11px] py-1.5 font-medium">
                              {row.param}
                            </TableCell>
                            <TableCell className="text-[11px] py-1.5 font-mono">
                              {row.value}
                            </TableCell>
                            <TableCell className="text-[11px] py-1.5 text-muted-foreground">
                              {row.unit}
                            </TableCell>
                            <TableCell className="text-[11px] py-1.5 text-muted-foreground">
                              {row.min}
                            </TableCell>
                            <TableCell className="text-[11px] py-1.5 text-muted-foreground">
                              {row.max}
                            </TableCell>
                            <TableCell className="text-[11px] py-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                {row.type}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  {/* ENGINEERING TAB */}
                  <TabsContent
                    value="engineering"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Engineering Data" />
                    <FieldRow label="Data OPS path">
                      <Input
                        readOnly
                        value={currentNode.dataOpsPath || "—"}
                        className="h-7 text-[12px] font-mono bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Automation server">
                      <Input
                        readOnly
                        value={
                          currentNode.automationServerName ||
                          currentNode.automationServerNameDefault
                        }
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Historian server">
                      <Input
                        readOnly
                        value={
                          currentNode.historianServer ||
                          currentNode.historianServerDefault
                        }
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Serial Number">
                      <Input
                        readOnly
                        value={currentNode.serialNumber || "—"}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>

                    {isEquipmentNode(currentNode) && (
                      <>
                        <SectionHeader title="Maintenance & PM" />
                        <FieldRow label="Maintenance Status">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.maintenance_status
                                : currentNode.maintenance_status) ?? "Active"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    maintenance_status: v as MaintenanceStatus,
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="Active"
                                className="text-[12px]"
                              >
                                Active
                              </SelectItem>
                              <SelectItem
                                value="Under Maintenance"
                                className="text-[12px]"
                              >
                                Under Maintenance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Health Status">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.health_status
                                : currentNode.health_status) ?? "Good"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    health_status: v as HealthStatus,
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Good" className="text-[12px]">
                                Good
                              </SelectItem>
                              <SelectItem value="Bad" className="text-[12px]">
                                Bad
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Last Maintenance">
                          <Input
                            type="date"
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.last_maintenance_date
                                : currentNode.last_maintenance_date) ?? ""
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    last_maintenance_date: e.target.value,
                                  },
                              )
                            }
                            className="h-7 text-[12px]"
                          />
                        </FieldRow>
                        <FieldRow label="PM Due Date">
                          <Input
                            type="date"
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.pm_due_date
                                : currentNode.pm_due_date) ?? ""
                            }
                            onChange={(e) =>
                              setDraft(
                                (d) =>
                                  d && { ...d, pm_due_date: e.target.value },
                              )
                            }
                            className="h-7 text-[12px]"
                          />
                        </FieldRow>
                        <FieldRow label="PM Status">
                          {(() => {
                            const pmS = computePmStatus(
                              (editMode
                                ? draft?.pm_due_date
                                : currentNode.pm_due_date) ?? "",
                            );
                            return (
                              <div
                                className={cn(
                                  "h-7 flex items-center px-2 rounded text-[12px] font-semibold border",
                                  {
                                    "bg-green-50 text-green-700 border-green-200":
                                      pmS === "On Time",
                                    "bg-amber-50 text-amber-700 border-amber-200":
                                      pmS === "Due Soon",
                                    "bg-red-50 text-red-700 border-red-200":
                                      pmS === "Overdue",
                                  },
                                )}
                              >
                                {pmS}
                              </div>
                            );
                          })()}
                        </FieldRow>
                      </>
                    )}
                  </TabsContent>

                  {/* CLEANING TAB */}
                  {isEquipmentNode(currentNode) && (
                    <TabsContent
                      value="cleaning"
                      className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                    >
                      <SectionHeader title="Cleaning Status" />
                      {(() => {
                        const cs = computeCleaningStatus(
                          (editMode
                            ? draft?.cleaningLog
                            : currentNode.cleaningLog) ?? null,
                          (editMode
                            ? draft?.cleaningRules
                            : currentNode.cleaningRules) ?? [],
                        );
                        return (
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-semibold mb-4",
                              {
                                "bg-green-50 text-green-700 border-green-200":
                                  cs === "OK",
                                "bg-red-50 text-red-700 border-red-200":
                                  cs === "Required",
                              },
                            )}
                          >
                            {cs === "OK" ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Cleaning Status: {cs}
                            {cs === "Required" && (
                              <span className="font-normal text-[11px] ml-1">
                                — Equipment must be cleaned before next use
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <SectionHeader title="Cleaning Log" />
                      <FieldRow label="Last Product">
                        <Input
                          disabled={!editMode}
                          value={
                            (editMode
                              ? draft?.cleaningLog?.lastProduct
                              : currentNode.cleaningLog?.lastProduct) ?? ""
                          }
                          onChange={(e) =>
                            setDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  cleaningLog: {
                                    ...(d.cleaningLog ?? {
                                      lastCleanedDate: "",
                                      cleaningLevel: "None" as CleaningLevel,
                                    }),
                                    lastProduct: e.target.value,
                                  },
                                },
                            )
                          }
                          className="h-7 text-[12px]"
                          placeholder="e.g. Amoxicillin 500mg"
                        />
                      </FieldRow>
                      <FieldRow label="Last Cleaned Date">
                        <Input
                          type="date"
                          disabled={!editMode}
                          value={
                            (editMode
                              ? draft?.cleaningLog?.lastCleanedDate
                              : currentNode.cleaningLog?.lastCleanedDate) ?? ""
                          }
                          onChange={(e) =>
                            setDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  cleaningLog: {
                                    ...(d.cleaningLog ?? {
                                      lastProduct: "",
                                      cleaningLevel: "None" as CleaningLevel,
                                    }),
                                    lastCleanedDate: e.target.value,
                                  },
                                },
                            )
                          }
                          className="h-7 text-[12px]"
                        />
                      </FieldRow>
                      <FieldRow label="Cleaning Level">
                        <Select
                          disabled={!editMode}
                          value={
                            (editMode
                              ? draft?.cleaningLog?.cleaningLevel
                              : currentNode.cleaningLog?.cleaningLevel) ??
                            "None"
                          }
                          onValueChange={(v) =>
                            setDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  cleaningLog: {
                                    ...(d.cleaningLog ?? {
                                      lastProduct: "",
                                      lastCleanedDate: "",
                                    }),
                                    cleaningLevel: v as CleaningLevel,
                                  },
                                },
                            )
                          }
                        >
                          <SelectTrigger className="h-7 text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None" className="text-[12px]">
                              None
                            </SelectItem>
                            <SelectItem value="Minor" className="text-[12px]">
                              Minor
                            </SelectItem>
                            <SelectItem value="Major" className="text-[12px]">
                              Major
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldRow>

                      <SectionHeader title="Cleaning Rules" />
                      {(
                        (editMode
                          ? draft?.cleaningRules
                          : currentNode.cleaningRules) ?? []
                      ).length === 0 ? (
                        <p className="text-[11.5px] text-muted-foreground py-2">
                          No cleaning rules defined.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[11px] h-7">
                                Previous Product
                              </TableHead>
                              <TableHead className="text-[11px] h-7">
                                Next Product
                              </TableHead>
                              <TableHead className="text-[11px] h-7">
                                Required Level
                              </TableHead>
                              {editMode && (
                                <TableHead className="text-[11px] h-7 w-8" />
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(
                              (editMode
                                ? draft?.cleaningRules
                                : currentNode.cleaningRules) ?? []
                            ).map((rule, ridx) => (
                              <TableRow
                                key={rule.id}
                                data-ocid={`data_manager.cleaning_rule.${ridx + 1}`}
                              >
                                <TableCell className="py-1 text-[11px]">
                                  {editMode ? (
                                    <Input
                                      value={rule.previousProduct}
                                      onChange={(e) =>
                                        setDraft(
                                          (d) =>
                                            d && {
                                              ...d,
                                              cleaningRules: (
                                                d.cleaningRules ?? []
                                              ).map((r, i) =>
                                                i === ridx
                                                  ? {
                                                      ...r,
                                                      previousProduct:
                                                        e.target.value,
                                                    }
                                                  : r,
                                              ),
                                            },
                                        )
                                      }
                                      className="h-6 text-[11px] px-1.5"
                                    />
                                  ) : (
                                    rule.previousProduct
                                  )}
                                </TableCell>
                                <TableCell className="py-1 text-[11px]">
                                  {editMode ? (
                                    <Input
                                      value={rule.nextProduct}
                                      onChange={(e) =>
                                        setDraft(
                                          (d) =>
                                            d && {
                                              ...d,
                                              cleaningRules: (
                                                d.cleaningRules ?? []
                                              ).map((r, i) =>
                                                i === ridx
                                                  ? {
                                                      ...r,
                                                      nextProduct:
                                                        e.target.value,
                                                    }
                                                  : r,
                                              ),
                                            },
                                        )
                                      }
                                      className="h-6 text-[11px] px-1.5"
                                    />
                                  ) : (
                                    rule.nextProduct
                                  )}
                                </TableCell>
                                <TableCell className="py-1 text-[11px]">
                                  {editMode ? (
                                    <Select
                                      value={rule.requiredCleaningLevel}
                                      onValueChange={(v) =>
                                        setDraft(
                                          (d) =>
                                            d && {
                                              ...d,
                                              cleaningRules: (
                                                d.cleaningRules ?? []
                                              ).map((r, i) =>
                                                i === ridx
                                                  ? {
                                                      ...r,
                                                      requiredCleaningLevel:
                                                        v as CleaningLevel,
                                                    }
                                                  : r,
                                              ),
                                            },
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-6 text-[11px] px-1.5">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem
                                          value="None"
                                          className="text-[11px]"
                                        >
                                          None
                                        </SelectItem>
                                        <SelectItem
                                          value="Minor"
                                          className="text-[11px]"
                                        >
                                          Minor
                                        </SelectItem>
                                        <SelectItem
                                          value="Major"
                                          className="text-[11px]"
                                        >
                                          Major
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                        {
                                          "bg-gray-50 text-gray-600 border-gray-200":
                                            rule.requiredCleaningLevel ===
                                            "None",
                                          "bg-amber-50 text-amber-700 border-amber-200":
                                            rule.requiredCleaningLevel ===
                                            "Minor",
                                          "bg-red-50 text-red-700 border-red-200":
                                            rule.requiredCleaningLevel ===
                                            "Major",
                                        },
                                      )}
                                    >
                                      {rule.requiredCleaningLevel}
                                    </span>
                                  )}
                                </TableCell>
                                {editMode && (
                                  <TableCell className="py-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft(
                                          (d) =>
                                            d && {
                                              ...d,
                                              cleaningRules: (
                                                d.cleaningRules ?? []
                                              ).filter((_, i) => i !== ridx),
                                            },
                                        )
                                      }
                                      className="text-destructive hover:text-destructive/80 text-[10px] px-1"
                                    >
                                      ✕
                                    </button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {editMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] mt-2"
                          onClick={() =>
                            setDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  cleaningRules: [
                                    ...(d.cleaningRules ?? []),
                                    {
                                      id: `cr_${Date.now()}`,
                                      previousProduct: "",
                                      nextProduct: "",
                                      requiredCleaningLevel:
                                        "None" as CleaningLevel,
                                    },
                                  ],
                                },
                            )
                          }
                        >
                          <Plus size={12} /> Add Rule
                        </Button>
                      )}
                    </TabsContent>
                  )}

                  {/* LOGBOOK TAB */}
                  <TabsContent
                    value="logbook"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Logbook Entries" />
                    {currentNode.changeHistory.length === 0 ? (
                      <div
                        className="text-[12px] text-muted-foreground py-6 text-center"
                        data-ocid="data_manager.logbook.empty_state"
                      >
                        No logbook entries recorded.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...currentNode.changeHistory]
                          .reverse()
                          .map((entry) => (
                            <div
                              key={entry.timestamp + entry.field}
                              className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                            >
                              <Clock
                                size={13}
                                className="text-muted-foreground mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11.5px] font-medium text-foreground">
                                  <span className="font-semibold">
                                    {entry.field}
                                  </span>{" "}
                                  changed by {entry.changedBy}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* CHANGE HISTORY TAB */}
                  <TabsContent
                    value="history"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Change History" />
                    {currentNode.changeHistory.length === 0 ? (
                      <div
                        className="text-[12px] text-muted-foreground py-6 text-center"
                        data-ocid="data_manager.history.empty_state"
                      >
                        No changes recorded.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px] h-7">
                              Timestamp
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              Field
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              Old Value
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              New Value
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              Changed By
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...currentNode.changeHistory]
                            .reverse()
                            .map((entry, idx) => (
                              <TableRow
                                key={entry.timestamp + entry.field}
                                data-ocid={`data_manager.history.item.${idx + 1}`}
                              >
                                <TableCell className="text-[11px] py-1.5 font-mono">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5 font-medium">
                                  {entry.field}
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5 text-destructive">
                                  {entry.oldValue || "—"}
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5 text-green-600">
                                  {entry.newValue || "—"}
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5">
                                  {entry.changedBy}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </DetailErrorBoundary>
            </>
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center text-muted-foreground"
              data-ocid="data_manager.detail.empty_state"
            >
              <Database size={40} className="mb-3 opacity-20" />
              <p className="text-[13px]">Select an item to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* NEW item dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="data_manager.dialog">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              New {ENTITY_TYPE_LABELS[newNode.entityType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11.5px]">Entity Type</Label>
                <Select
                  value={newNode.entityType}
                  onValueChange={(v) =>
                    setNewNode((n) => ({ ...n, entityType: v as EntityType }))
                  }
                >
                  <SelectTrigger
                    className="h-8 text-[12px]"
                    data-ocid="data_manager.entity_type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(
                      (t) => (
                        <SelectItem key={t} value={t} className="text-[12px]">
                          {ENTITY_TYPE_LABELS[t]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px]">Parent</Label>
                <Select
                  value={newNode.parentId ?? "none"}
                  onValueChange={(v) =>
                    setNewNode((n) => ({
                      ...n,
                      parentId: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger
                    className="h-8 text-[12px]"
                    data-ocid="data_manager.parent.select"
                  >
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-[12px]">
                      None
                    </SelectItem>
                    {nodes.map((n) => (
                      <SelectItem
                        key={n.id}
                        value={n.id}
                        className="text-[12px]"
                      >
                        {n.shortDescription}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Identifier *</Label>
              <Input
                value={newNode.identifier}
                onChange={(e) =>
                  setNewNode((n) => ({ ...n, identifier: e.target.value }))
                }
                className="h-8 text-[12px]"
                placeholder="e.g. EE-COAT-XY"
                data-ocid="data_manager.new_identifier.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Short Description *</Label>
              <Input
                value={newNode.shortDescription}
                onChange={(e) =>
                  setNewNode((n) => ({
                    ...n,
                    shortDescription: e.target.value,
                  }))
                }
                className="h-8 text-[12px]"
                placeholder="e.g. Coater_XY"
                data-ocid="data_manager.new_short_description.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Description</Label>
              <Textarea
                value={newNode.description}
                onChange={(e) =>
                  setNewNode((n) => ({ ...n, description: e.target.value }))
                }
                className="text-[12px] min-h-[60px] resize-none"
                data-ocid="data_manager.new_description.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11.5px]">Manufacturer</Label>
                <Input
                  value={newNode.manufacturer}
                  onChange={(e) =>
                    setNewNode((n) => ({ ...n, manufacturer: e.target.value }))
                  }
                  className="h-8 text-[12px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px]">Serial Number</Label>
                <Input
                  value={newNode.serialNumber}
                  onChange={(e) =>
                    setNewNode((n) => ({ ...n, serialNumber: e.target.value }))
                  }
                  className="h-8 text-[12px]"
                />
              </div>
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewDialogOpen(false)}
              data-ocid="data_manager.new_cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newNode.identifier || !newNode.shortDescription}
              data-ocid="data_manager.new_submit_button"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GMP Validation Result Dialog */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Shield size={16} className="text-primary" /> GMP Validation
              Result
            </DialogTitle>
          </DialogHeader>
          {validateResult && (
            <div className="space-y-3 py-1">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg border text-[13px] font-semibold",
                  validateResult.success
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200",
                )}
              >
                {validateResult.success ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                {validateResult.success
                  ? "Equipment cleared for execution"
                  : "Equipment BLOCKED — validation failed"}
              </div>
              {validateResult.errors.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold text-destructive mb-1.5">
                    Errors ({validateResult.errors.length}):
                  </p>
                  <ul className="space-y-1">
                    {validateResult.errors.map((e) => (
                      <li
                        key={e}
                        className="flex gap-2 text-[12px] text-destructive"
                      >
                        <XCircle size={13} className="shrink-0 mt-0.5" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validateResult.warnings.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold text-amber-600 mb-1.5">
                    Warnings ({validateResult.warnings.length}):
                  </p>
                  <ul className="space-y-1">
                    {validateResult.warnings.map((w) => (
                      <li
                        key={w}
                        className="flex gap-2 text-[12px] text-amber-700"
                      >
                        <span className="shrink-0">⚠</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validateResult.success &&
                validateResult.warnings.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">
                    All GMP checks passed. No warnings.
                  </p>
                )}
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setValidateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        nodes={nodes}
      />
      <HelpPanel
        title={helpContent.dataManager.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.dataManager.sections}
      />
      <footer className="shrink-0 text-center py-2 text-[10.5px] text-muted-foreground border-t border-border bg-white">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
