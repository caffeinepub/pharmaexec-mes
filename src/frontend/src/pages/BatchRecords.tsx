import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  GitBranch,
  HelpCircle,
  History,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Unlock,
  XCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { BatchStatus } from "../backend";
import type { BatchRecord } from "../backend";
import { FieldTooltip } from "../components/FieldTooltip";
import { useAllBatchRecords, useCreateBatchRecord } from "../hooks/useQueries";
import { PRODUCTS } from "../lib/mesData";

import { INITIAL_DATA } from "../lib/equipmentNodes";
import { validateExecution } from "../lib/gmpValidation";

// ── Types ─────────────────────────────────────────────────────────────────────

type PharmaSuiteStatus =
  | "Defined"
  | "Exploded"
  | "Released"
  | "In Process"
  | "Finished"
  | "Production-reviewed"
  | "Reviewed"
  | "Annulled"
  | "Canceled";

type OrderStepStatus =
  | "Generated"
  | "In Process"
  | "Held"
  | "Aborted"
  | "Reactivated"
  | "Finished"
  | "Canceled";

interface StepInput {
  id: string;
  material: string;
  plannedQtyOriginal: number;
  plannedQtyExecution: number;
  plannedQtyMode: "As Defined" | "As Produced" | "None";
  unit: string;
  batchAllocations: string[];
}

interface StepOutput {
  id: string;
  material: string;
  plannedQtyOriginal: number;
  plannedQtyExecution: number;
  plannedQtyMode: "As Defined" | "None";
  unit: string;
}

interface OrderStep {
  id: string;
  description: string;
  type: string;
  workCenter: string;
  status: OrderStepStatus;
  inputs: StepInput[];
  outputs: StepOutput[];
}

interface StatusTransition {
  timestamp: string;
  fromStatus: PharmaSuiteStatus | "—";
  toStatus: PharmaSuiteStatus;
  user: string;
  comment: string;
}

interface LocalOrder extends BatchRecord {
  pharmaSuiteStatus: PharmaSuiteStatus;
  masterRecipe: string;
  targetBatch: string;
  erpStart: string;
  erpEnd: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
  exportedForArchive: boolean;
  steps: OrderStep[];
  statusHistory: StatusTransition[];
}

// ── Status Mapping ────────────────────────────────────────────────────────────

function mapToPharmaSuite(status: BatchStatus): PharmaSuiteStatus {
  switch (status) {
    case BatchStatus.pending:
      return "Defined";
    case BatchStatus.inProgress:
      return "In Process";
    case BatchStatus.onHold:
      return "Released";
    case BatchStatus.completed:
      return "Finished";
    case BatchStatus.rejected:
      return "Annulled";
    default:
      return "Defined";
  }
}

// ── Sample Steps Generator ────────────────────────────────────────────────────

function generateSteps(batch: BatchRecord): OrderStep[] {
  const stage = batch.currentStage || "Dispensing";
  const batchId = batch.batchId;

  const stepMap: Record<string, OrderStep[]> = {
    Dispensing: [
      {
        id: `${batchId}-S010`,
        description: "Raw Material Dispensing",
        type: "Dispense",
        workCenter: "WC-DISP-01",
        status: "Finished",
        inputs: [
          {
            id: "I1",
            material: "API Compound",
            plannedQtyOriginal: 25.5,
            plannedQtyExecution: 25.5,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: ["BT-API-2024-001"],
          },
          {
            id: "I2",
            material: "Microcrystalline Cellulose",
            plannedQtyOriginal: 18.2,
            plannedQtyExecution: 18.2,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: ["BT-MCC-2024-003"],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Dispensed Blend",
            plannedQtyOriginal: 43.7,
            plannedQtyExecution: 43.4,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
      {
        id: `${batchId}-S020`,
        description: "Granulation",
        type: "Granulation",
        workCenter: "WC-GRAN-01",
        status: "In Process",
        inputs: [
          {
            id: "I1",
            material: "Dispensed Blend",
            plannedQtyOriginal: 43.4,
            plannedQtyExecution: 43.4,
            plannedQtyMode: "As Produced",
            unit: "kg",
            batchAllocations: ["SL-DISP-001"],
          },
          {
            id: "I2",
            material: "Purified Water",
            plannedQtyOriginal: 5.0,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "L",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Wet Granules",
            plannedQtyOriginal: 48.0,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
    ],
    Granulation: [
      {
        id: `${batchId}-S010`,
        description: "Raw Material Dispensing",
        type: "Dispense",
        workCenter: "WC-DISP-01",
        status: "Finished",
        inputs: [
          {
            id: "I1",
            material: "Active Pharmaceutical Ingredient",
            plannedQtyOriginal: 30.0,
            plannedQtyExecution: 30.0,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: ["BT-API-2024-002"],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Dispensed Materials",
            plannedQtyOriginal: 30.0,
            plannedQtyExecution: 30.0,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
      {
        id: `${batchId}-S020`,
        description: "Wet Granulation",
        type: "Granulation",
        workCenter: "WC-GRAN-02",
        status: "In Process",
        inputs: [
          {
            id: "I1",
            material: "Dispensed Materials",
            plannedQtyOriginal: 30.0,
            plannedQtyExecution: 30.0,
            plannedQtyMode: "As Produced",
            unit: "kg",
            batchAllocations: [],
          },
          {
            id: "I2",
            material: "Binder Solution",
            plannedQtyOriginal: 4.5,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "L",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Wet Granules",
            plannedQtyOriginal: 34.0,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
      {
        id: `${batchId}-S030`,
        description: "Drying",
        type: "Drying",
        workCenter: "WC-DRY-01",
        status: "Generated",
        inputs: [
          {
            id: "I1",
            material: "Wet Granules",
            plannedQtyOriginal: 34.0,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Produced",
            unit: "kg",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Dry Granules",
            plannedQtyOriginal: 31.5,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
    ],
    Compression: [
      {
        id: `${batchId}-S010`,
        description: "Dispensing & Pre-blending",
        type: "Dispense",
        workCenter: "WC-DISP-01",
        status: "Finished",
        inputs: [
          {
            id: "I1",
            material: "API Granules",
            plannedQtyOriginal: 28.0,
            plannedQtyExecution: 28.0,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: ["BT-GRN-2024-001"],
          },
          {
            id: "I2",
            material: "Magnesium Stearate",
            plannedQtyOriginal: 0.28,
            plannedQtyExecution: 0.28,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: ["BT-MgSt-2024-001"],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Final Blend",
            plannedQtyOriginal: 28.28,
            plannedQtyExecution: 28.28,
            plannedQtyMode: "As Defined",
            unit: "kg",
          },
        ],
      },
      {
        id: `${batchId}-S020`,
        description: "Tablet Compression",
        type: "Compression",
        workCenter: "WC-COMP-01",
        status: "Finished",
        inputs: [
          {
            id: "I1",
            material: "Final Blend",
            plannedQtyOriginal: 28.28,
            plannedQtyExecution: 28.28,
            plannedQtyMode: "As Produced",
            unit: "kg",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Tablet Cores",
            plannedQtyOriginal: 100000,
            plannedQtyExecution: 98500,
            plannedQtyMode: "As Defined",
            unit: "ea",
          },
        ],
      },
      {
        id: `${batchId}-S030`,
        description: "Film Coating",
        type: "Coating",
        workCenter: "WC-COAT-01",
        status: "In Process",
        inputs: [
          {
            id: "I1",
            material: "Tablet Cores",
            plannedQtyOriginal: 98500,
            plannedQtyExecution: 98500,
            plannedQtyMode: "As Produced",
            unit: "ea",
            batchAllocations: [],
          },
          {
            id: "I2",
            material: "Coating Solution",
            plannedQtyOriginal: 2.5,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "kg",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Coated Tablets",
            plannedQtyOriginal: 98500,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "ea",
          },
        ],
      },
      {
        id: `${batchId}-S040`,
        description: "QA Release Testing",
        type: "Testing",
        workCenter: "WC-QA-01",
        status: "Generated",
        inputs: [
          {
            id: "I1",
            material: "Coated Tablets (Sample)",
            plannedQtyOriginal: 500,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "ea",
            batchAllocations: [],
          },
        ],
        outputs: [
          {
            id: "O1",
            material: "Released Tablets",
            plannedQtyOriginal: 98000,
            plannedQtyExecution: 0,
            plannedQtyMode: "As Defined",
            unit: "ea",
          },
        ],
      },
    ],
  };

  return stepMap[stage] ?? stepMap.Compression;
}

function generateStatusHistory(
  status: PharmaSuiteStatus,
  _batchId: string,
): StatusTransition[] {
  const users = ["J.Smith", "M.Johnson", "R.Patel", "A.Chen"];
  const history: StatusTransition[] = [];
  const statusChain: PharmaSuiteStatus[] = [
    "Defined",
    "Exploded",
    "Released",
    "In Process",
    "Finished",
    "Production-reviewed",
    "Reviewed",
  ];
  const idx = statusChain.indexOf(status);
  const cutoff = idx === -1 ? 0 : idx + 1;
  for (let i = 0; i < cutoff; i++) {
    history.push({
      timestamp: new Date(
        Date.now() - (cutoff - i) * 86400000 * 2,
      ).toISOString(),
      fromStatus: i === 0 ? "—" : statusChain[i - 1],
      toStatus: statusChain[i],
      user: users[i % users.length],
      comment:
        i === 0
          ? "Order created from master recipe"
          : `Status advanced to ${statusChain[i]}`,
    });
  }
  return history.reverse();
}

function enrichBatch(batch: BatchRecord): LocalOrder {
  const pharmaSuiteStatus = mapToPharmaSuite(batch.status);
  const startMs = Number(batch.startTime / BigInt(1_000_000));
  const startDate = new Date(startMs);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const offsetDate = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return fmtDate(nd);
  };

  return {
    ...batch,
    pharmaSuiteStatus,
    masterRecipe: `MR-${batch.productName.replace(/\s+/g, "-").toUpperCase().slice(0, 8)}-001 (V2.1, Valid)`,
    targetBatch: `BT-${batch.batchId.slice(-6).toUpperCase()}`,
    erpStart: fmtDate(startDate),
    erpEnd: offsetDate(startDate, 14),
    plannedStart: fmtDate(startDate),
    plannedEnd: offsetDate(startDate, 10),
    actualStart:
      pharmaSuiteStatus !== "Defined" && pharmaSuiteStatus !== "Exploded"
        ? fmtDate(startDate)
        : "",
    actualEnd:
      pharmaSuiteStatus === "Finished" ||
      pharmaSuiteStatus === "Reviewed" ||
      pharmaSuiteStatus === "Production-reviewed"
        ? offsetDate(startDate, 12)
        : "",
    exportedForArchive: pharmaSuiteStatus === "Reviewed",
    steps: generateSteps(batch),
    statusHistory: generateStatusHistory(pharmaSuiteStatus, batch.batchId),
  };
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PharmaSuiteStatus, string> = {
  Defined: "bg-gray-100 text-gray-700 border-gray-300",
  Exploded: "bg-blue-100 text-blue-700 border-blue-300",
  Released: "bg-indigo-100 text-indigo-700 border-indigo-300",
  "In Process": "bg-amber-100 text-amber-700 border-amber-300",
  Finished: "bg-green-100 text-green-700 border-green-300",
  "Production-reviewed": "bg-teal-100 text-teal-700 border-teal-300",
  Reviewed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Annulled: "bg-orange-100 text-orange-700 border-orange-300",
  Canceled: "bg-red-100 text-red-700 border-red-300",
};

const STEP_STATUS_STYLES: Record<OrderStepStatus, string> = {
  Generated: "bg-gray-100 text-gray-600",
  "In Process": "bg-amber-100 text-amber-700",
  Held: "bg-purple-100 text-purple-700",
  Aborted: "bg-red-100 text-red-700",
  Reactivated: "bg-sky-100 text-sky-700",
  Finished: "bg-green-100 text-green-700",
  Canceled: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: PharmaSuiteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

function StepStatusBadge({ status }: { status: OrderStepStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium",
        STEP_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Defined", value: "Defined" },
  { label: "Exploded", value: "Exploded" },
  { label: "Released", value: "Released" },
  { label: "In Process", value: "In Process" },
  { label: "Finished", value: "Finished" },
  { label: "Reviewed", value: "Reviewed" },
  { label: "Annulled", value: "Annulled" },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function BatchRecords() {
  const navigate = useNavigate();
  const { data: rawBatches = [], isLoading } = useAllBatchRecords();
  const createBatch = useCreateBatchRecord();

  // Left pane state
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [gmpBlockOpen, setGmpBlockOpen] = useState(false);
  const [gmpBlockResult, setGmpBlockResult] = useState<{
    success: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [gmpBlockEquipId, setGmpBlockEquipId] = useState("");

  // Local overrides for status changes
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, PharmaSuiteStatus>
  >({});
  const [stepOverrides, setStepOverrides] = useState<
    Record<string, OrderStep[]>
  >({});

  // Right pane state
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Dialog state
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [statusHistoryOpen, setStatusHistoryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  // Dialog sub-state
  const [pendingTransition, setPendingTransition] =
    useState<PharmaSuiteStatus | null>(null);
  const [selectedTransition, setSelectedTransition] = useState("");
  const [transitionTestResult, setTransitionTestResult] = useState<
    string | null
  >(null);
  const [exportProgress, setExportProgress] = useState<string[]>([]);
  const [exportDone, setExportDone] = useState(false);
  const [purgeProgress, setPurgeProgress] = useState<string[]>([]);
  const [purgeDone, setPurgeDone] = useState(false);
  const [sigForm, setSigForm] = useState({
    username: "",
    password: "",
    comment: "",
  });

  // New order form
  const [newForm, setNewForm] = useState({
    productName: "",
    batchSize: "",
    unit: "Tablets",
    masterRecipe: "",
    erpStart: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Enriched orders
  const orders: LocalOrder[] = rawBatches.map(enrichBatch);

  const selectedOrder = orders.find((o) => o.batchId === selectedId) ?? null;
  const effectiveStatus: PharmaSuiteStatus | null = selectedOrder
    ? (statusOverrides[selectedOrder.batchId] ??
      selectedOrder.pharmaSuiteStatus)
    : null;
  const effectiveSteps: OrderStep[] = selectedOrder
    ? (stepOverrides[selectedOrder.batchId] ?? selectedOrder.steps)
    : [];
  // selectedStep computed in sub-component

  // Filtered list
  const filteredOrders = orders.filter((o) => {
    const status = statusOverrides[o.batchId] ?? o.pharmaSuiteStatus;
    const matchFilter = filterTab === "all" || status === filterTab;
    const matchSearch =
      !search ||
      o.batchId.toLowerCase().includes(search.toLowerCase()) ||
      o.productName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Action availability
  const canExplode = effectiveStatus === "Defined";
  const canReset = effectiveStatus === "Exploded";
  const canRelease = effectiveStatus === "Exploded";
  const canUnrelease = effectiveStatus === "Released";
  const canOpenReport = effectiveStatus
    ? [
        "Exploded",
        "Released",
        "In Process",
        "Finished",
        "Canceled",
        "Production-reviewed",
        "Reviewed",
      ].includes(effectiveStatus)
    : false;
  const canExport =
    effectiveStatus === "Canceled" || effectiveStatus === "Reviewed";
  const canPurge =
    effectiveStatus === "Annulled" ||
    effectiveStatus === "Canceled" ||
    effectiveStatus === "Reviewed";
  const canChangeStatus = !!selectedOrder;

  const getTransitionOptions = (
    status: PharmaSuiteStatus,
  ): PharmaSuiteStatus[] => {
    switch (status) {
      case "Defined":
        return ["Annulled"];
      case "Exploded":
        return ["Annulled"];
      case "Released":
        return ["Annulled"];
      case "In Process":
        return ["Canceled"];
      case "Finished":
        return ["Production-reviewed", "Reviewed"];
      case "Production-reviewed":
        return ["Reviewed"];
      default:
        return [];
    }
  };

  // Actions
  const doExplode = () => {
    if (!selectedOrder) return;
    setStatusOverrides((p) => ({ ...p, [selectedOrder.batchId]: "Exploded" }));
    toast.success(`Order ${selectedOrder.batchId} exploded successfully`);
  };
  const doReset = () => {
    if (!selectedOrder) return;
    setStatusOverrides((p) => ({ ...p, [selectedOrder.batchId]: "Defined" }));
    setStepOverrides((p) => {
      const n = { ...p };
      delete n[selectedOrder.batchId];
      return n;
    });
    toast.success("Order reset to Defined status");
  };
  const doRelease = () => {
    if (!selectedOrder) return;

    // Find equipment entities used by this order's steps
    const equipmentNodes = INITIAL_DATA.filter(
      (n) =>
        n.entityType === "EquipmentEntity" || n.entityType === "EquipmentClass",
    );

    // Try to match order steps' work centers to equipment identifiers
    const stepsToCheck = selectedOrder.steps ?? [];
    let blockingResult: {
      success: boolean;
      errors: string[];
      warnings: string[];
    } | null = null;
    let blockingEquipId = "";

    for (const step of stepsToCheck) {
      const matchedEquip = equipmentNodes.find(
        (n) =>
          n.identifier.includes(step.workCenter) ||
          step.workCenter.includes(n.identifier) ||
          (step.workCenter &&
            n.identifier &&
            step.workCenter.split("-").slice(1).join("-") ===
              n.identifier.split("-").slice(1).join("-")),
      );

      if (matchedEquip) {
        const result = validateExecution({
          equipment: {
            status: matchedEquip.status ?? "Draft",
            maintenance_status: matchedEquip.maintenance_status ?? "Active",
            health_status: matchedEquip.health_status ?? "Good",
            pm_due_date: matchedEquip.pm_due_date ?? "",
            cleaningLog: matchedEquip.cleaningLog ?? null,
            cleaningRules: matchedEquip.cleaningRules ?? [],
          },
          equipmentId: matchedEquip.identifier,
        });

        if (!result.success) {
          blockingResult = result;
          blockingEquipId = matchedEquip.identifier;
          break;
        }
      }
    }

    // Fallback: check coating equipment if batch has coating step
    if (!blockingResult && equipmentNodes.length > 0) {
      const coatingStep = stepsToCheck.find((s) =>
        s.workCenter?.includes("COAT"),
      );
      if (coatingStep) {
        const coatingEquip = equipmentNodes.find((n) =>
          n.identifier.includes("COAT"),
        );
        if (coatingEquip) {
          const result = validateExecution({
            equipment: {
              status: coatingEquip.status ?? "Draft",
              maintenance_status: coatingEquip.maintenance_status ?? "Active",
              health_status: coatingEquip.health_status ?? "Good",
              pm_due_date: coatingEquip.pm_due_date ?? "",
              cleaningLog: coatingEquip.cleaningLog ?? null,
              cleaningRules: coatingEquip.cleaningRules ?? [],
            },
            equipmentId: coatingEquip.identifier,
          });
          if (!result.success) {
            blockingResult = result;
            blockingEquipId = coatingEquip.identifier;
          }
        }
      }
    }

    if (blockingResult && !blockingResult.success) {
      setGmpBlockResult(blockingResult);
      setGmpBlockEquipId(blockingEquipId);
      setGmpBlockOpen(true);
      return; // block release
    }

    // All GMP checks passed — proceed with release
    setStatusOverrides((p) => ({ ...p, [selectedOrder.batchId]: "Released" }));
    if (blockingResult?.warnings?.length) {
      toast.warning(`Order released with GMP warnings for ${blockingEquipId}`);
    } else {
      toast.success(`Order ${selectedOrder.batchId} released for production`);
    }
  };
  const doUnrelease = () => {
    if (!selectedOrder) return;
    setStatusOverrides((p) => ({ ...p, [selectedOrder.batchId]: "Exploded" }));
    toast.success("Order unreleased to Exploded status");
  };

  const applyTransition = () => {
    if (!selectedOrder || !pendingTransition) return;
    setStatusOverrides((p) => ({
      ...p,
      [selectedOrder.batchId]: pendingTransition,
    }));
    setChangeStatusOpen(false);
    setSignatureOpen(false);
    setPendingTransition(null);
    setSigForm({ username: "", password: "", comment: "" });
    toast.success(`Status changed to ${pendingTransition}`);
  };

  const doTestTransition = () => {
    setTransitionTestResult(
      "✓ All prerequisites met. Status transition can be performed.",
    );
  };

  const openBatchReport = () => {
    setActiveTab("report");
    toast.success("Batch report opened in preview pane");
  };

  const doExportArchive = () => {
    const steps = [
      "Collecting order data...",
      "Generating batch report PDF...",
      "Generating XML batch record...",
      "Exporting label files...",
      "Writing XSD schema files...",
      "Export completed successfully.",
    ];
    setExportProgress([]);
    setExportDone(false);
    setExportOpen(true);
    steps.forEach((s, i) => {
      setTimeout(
        () => {
          setExportProgress((p) => [...p, s]);
          if (i === steps.length - 1) setExportDone(true);
        },
        (i + 1) * 400,
      );
    });
    if (selectedOrder) {
      setStatusOverrides((p) => ({
        ...p,
        [selectedOrder.batchId]: selectedOrder.pharmaSuiteStatus,
      }));
    }
  };

  const doPurge = () => {
    const steps = [
      "Verifying export status...",
      "Removing batch report data...",
      "Removing label data...",
      "Removing order step data...",
      "Purge completed. Order removed from system.",
    ];
    setPurgeProgress([]);
    setPurgeDone(false);
    setPurgeOpen(true);
    steps.forEach((s, i) => {
      setTimeout(
        () => {
          setPurgeProgress((p) => [...p, s]);
          if (i === steps.length - 1) {
            setPurgeDone(true);
            if (selectedOrder) {
              setStatusOverrides((p) => ({
                ...p,
                [selectedOrder.batchId]: "Annulled",
              }));
            }
          }
        },
        (i + 1) * 400,
      );
    });
  };

  const handleCreateOrder = async () => {
    const errors: Record<string, string> = {};
    if (!newForm.productName) errors.productName = "Product name is required";
    if (!newForm.batchSize) errors.batchSize = "Batch size is required";
    else if (Number(newForm.batchSize) <= 0)
      errors.batchSize = "Batch size must be a positive number";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      await createBatch.mutateAsync({
        productName: newForm.productName,
        batchSize: Number(newForm.batchSize),
        unit: newForm.unit,
        currentStage: "Dispensing",
        notes: newForm.notes,
        operatorId: Principal.anonymous(),
      });
      toast.success("New batch order created");
      setNewOrderOpen(false);
      setNewForm({
        productName: "",
        batchSize: "",
        unit: "Tablets",
        masterRecipe: "",
        erpStart: "",
        notes: "",
      });
    } catch {
      toast.error("Failed to create order");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" data-ocid="batch_orders.page">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <FlaskConical size={20} className="text-primary" />
          <div>
            <h1 className="text-[16px] font-bold text-foreground leading-tight">
              Manage Batch Orders
            </h1>
            <p className="text-[11px] text-muted-foreground">
              PharmaSuite Production Management · {orders.length} orders
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-[13px]"
          onClick={() => setNewOrderOpen(true)}
          data-ocid="batch_orders.new.open_modal_button"
        >
          <Plus size={14} /> New Order
        </Button>
      </div>

      {/* Main content: split pane */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left Pane ── */}
        <div className="w-[300px] shrink-0 flex flex-col border-r border-border bg-card">
          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-8 h-8 text-[13px]"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="batch_orders.search_input"
              />
            </div>
          </div>

          {/* Filter tabs (scrollable) */}
          <div className="overflow-x-auto border-b border-border shrink-0">
            <div className="flex gap-0 px-1 py-1">
              {FILTER_TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() => setFilterTab(tab.value)}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-medium rounded whitespace-nowrap transition-colors",
                    filterTab === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  data-ocid="batch_orders.filter.tab"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div
                className="flex items-center justify-center py-12"
                data-ocid="batch_orders.loading_state"
              >
                <Loader2
                  className="animate-spin text-muted-foreground"
                  size={20}
                />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground text-[13px]"
                data-ocid="batch_orders.empty_state"
              >
                No orders found
              </div>
            ) : (
              <div className="py-1">
                {filteredOrders.map((order, i) => {
                  const status =
                    statusOverrides[order.batchId] ?? order.pharmaSuiteStatus;
                  const isSelected = selectedId === order.batchId;
                  return (
                    <motion.button
                      key={order.batchId}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => {
                        setSelectedId(order.batchId);
                        setSelectedStepId(null);
                        setActiveTab("overview");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors border-b border-border/50",
                        isSelected
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-accent/50",
                      )}
                      data-ocid={`batch_orders.item.${i + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[12px] font-bold text-primary truncate">
                            {order.batchId}
                          </span>
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-[11.5px] text-foreground truncate mt-0.5">
                          {order.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ERP: {order.erpStart}
                        </p>
                      </div>
                      {isSelected && (
                        <ChevronRight
                          size={14}
                          className="text-primary mt-1 shrink-0"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Right Pane ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-background">
          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <ClipboardList size={40} className="opacity-30" />
              <p className="text-[14px]">
                Select an order from the list to view details
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-card shrink-0 flex-wrap">
                {/* Primary actions */}
                <div className="flex items-center gap-1 pr-2 border-r border-border">
                  <ToolbarBtn
                    icon={<Zap size={13} />}
                    label="Explode"
                    disabled={!canExplode}
                    onClick={doExplode}
                    ocid="batch_orders.explode.button"
                  />
                  <ToolbarBtn
                    icon={<RotateCcw size={13} />}
                    label="Reset"
                    disabled={!canReset}
                    onClick={doReset}
                    ocid="batch_orders.reset.button"
                  />
                  <ToolbarBtn
                    icon={<Unlock size={13} />}
                    label="Release"
                    disabled={!canRelease}
                    onClick={doRelease}
                    ocid="batch_orders.release.button"
                  />
                  <ToolbarBtn
                    icon={<RefreshCw size={13} />}
                    label="Unrelease"
                    disabled={!canUnrelease}
                    onClick={doUnrelease}
                    ocid="batch_orders.unrelease.button"
                  />
                </div>

                {/* Report actions */}
                <div className="flex items-center gap-1 pr-2 border-r border-border">
                  <ToolbarBtn
                    icon={<FileText size={13} />}
                    label="Open Report"
                    disabled={!canOpenReport}
                    onClick={openBatchReport}
                    ocid="batch_orders.open_report.button"
                  />
                  <ToolbarBtn
                    icon={<Printer size={13} />}
                    label="Print Report"
                    disabled={!canOpenReport}
                    onClick={() => toast.info("Print dialog opening...")}
                    ocid="batch_orders.print_report.button"
                  />
                </div>

                {/* Admin actions */}
                <div className="flex items-center gap-1">
                  <ToolbarBtn
                    icon={<Shield size={13} />}
                    label="Change Status"
                    disabled={!canChangeStatus}
                    onClick={() => {
                      setTransitionTestResult(null);
                      setSelectedTransition("");
                      setChangeStatusOpen(true);
                    }}
                    ocid="batch_orders.change_status.button"
                  />
                  <ToolbarBtn
                    icon={<History size={13} />}
                    label="Status History"
                    disabled={!canChangeStatus}
                    onClick={() => setStatusHistoryOpen(true)}
                    ocid="batch_orders.status_history.button"
                  />
                  <ToolbarBtn
                    icon={<Archive size={13} />}
                    label="Export Archive"
                    disabled={!canExport}
                    onClick={doExportArchive}
                    ocid="batch_orders.export.button"
                  />
                  <ToolbarBtn
                    icon={<Trash2 size={13} />}
                    label="Purge"
                    disabled={!canPurge}
                    onClick={() => {
                      setPurgeProgress([]);
                      setPurgeDone(false);
                      setPurgeOpen(true);
                    }}
                    danger
                    ocid="batch_orders.purge.button"
                  />
                </div>
                {/* Navigation links */}
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 text-[11px] px-2"
                    onClick={() => navigate({ to: "/recipe-designer" })}
                    data-ocid="batch_orders.recipe_designer.button"
                  >
                    <BookOpen size={12} /> Recipe Designer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 text-[11px] px-2"
                    onClick={() => navigate({ to: "/workflow-designer" })}
                    data-ocid="batch_orders.workflow_designer.button"
                  >
                    <GitBranch size={12} /> Workflow Designer
                  </Button>
                </div>
              </div>

              {/* Order title bar */}
              <div className="px-4 py-2.5 border-b border-border bg-card/60 flex items-center gap-3 shrink-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground">
                      {selectedOrder.batchId}
                    </span>
                    {effectiveStatus && (
                      <StatusBadge status={effectiveStatus} />
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {selectedOrder.productName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">
                    Master Recipe
                  </p>
                  <p className="text-[12px] font-medium text-foreground">
                    {selectedOrder.masterRecipe}
                  </p>
                </div>
              </div>

              {/* Detail tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 min-h-0 flex flex-col"
              >
                <TabsList
                  className="mx-4 mt-2 w-auto justify-start shrink-0"
                  data-ocid="batch_orders.detail.tab"
                >
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="steps">Order Steps</TabsTrigger>
                  <TabsTrigger value="report">Batch Report</TabsTrigger>
                  <TabsTrigger value="history">Status History</TabsTrigger>
                  <TabsTrigger value="help">Help</TabsTrigger>
                </TabsList>

                {/* ── Overview Tab ── */}
                <TabsContent
                  value="overview"
                  className="flex-1 min-h-0 overflow-auto"
                >
                  <OverviewTab
                    order={selectedOrder}
                    effectiveStatus={effectiveStatus!}
                  />
                </TabsContent>

                {/* ── Order Steps Tab ── */}
                <TabsContent value="steps" className="flex-1 min-h-0 flex">
                  <OrderStepsTab
                    order={selectedOrder}
                    steps={effectiveSteps}
                    selectedStepId={selectedStepId}
                    onSelectStep={setSelectedStepId}
                    onAbortStep={(stepId) => {
                      const updated = effectiveSteps.map((s) =>
                        s.id === stepId
                          ? { ...s, status: "Aborted" as OrderStepStatus }
                          : s,
                      );
                      setStepOverrides((p) => ({
                        ...p,
                        [selectedOrder.batchId]: updated,
                      }));
                      toast.success("Order step aborted");
                    }}
                    onReactivateStep={(stepId) => {
                      const updated = effectiveSteps.map((s) =>
                        s.id === stepId
                          ? { ...s, status: "Reactivated" as OrderStepStatus }
                          : s,
                      );
                      setStepOverrides((p) => ({
                        ...p,
                        [selectedOrder.batchId]: updated,
                      }));
                      toast.success("Order step reactivated");
                    }}
                  />
                </TabsContent>

                {/* ── Batch Report Tab ── */}
                <TabsContent
                  value="report"
                  className="flex-1 min-h-0 overflow-auto"
                >
                  <BatchReportTab
                    order={selectedOrder}
                    steps={effectiveSteps}
                    effectiveStatus={effectiveStatus!}
                  />
                </TabsContent>

                {/* ── Status History Tab ── */}
                <TabsContent
                  value="history"
                  className="flex-1 min-h-0 overflow-auto"
                >
                  <StatusHistoryTab
                    history={selectedOrder.statusHistory}
                    statusOverrides={statusOverrides}
                    batchId={selectedOrder.batchId}
                    effectiveStatus={effectiveStatus!}
                  />
                </TabsContent>

                {/* ── Help Tab ── */}
                <TabsContent
                  value="help"
                  className="flex-1 min-h-0 overflow-auto"
                >
                  <HelpTab />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* New Order */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent className="max-w-md" data-ocid="batch_orders.new.modal">
          <DialogHeader>
            <DialogTitle>New Batch Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>
                Product Name <span className="text-destructive">*</span>
              </Label>
              <FieldTooltip tip="Select the product name and strength from the list">
                <Select
                  value={newForm.productName}
                  onValueChange={(v) =>
                    setNewForm({ ...newForm, productName: v })
                  }
                >
                  <SelectTrigger data-ocid="batch_orders.product_name.select">
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldTooltip>
              {!newForm.productName && formErrors.productName && (
                <p className="text-destructive text-[11px]">
                  {formErrors.productName}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Batch Size <span className="text-destructive">*</span>
                </Label>
                <FieldTooltip tip="Enter the planned production quantity. Must be a positive number.">
                  <Input
                    data-ocid="batch_orders.batch_size.input"
                    type="number"
                    min={1}
                    value={newForm.batchSize}
                    onChange={(e) =>
                      setNewForm({ ...newForm, batchSize: e.target.value })
                    }
                    placeholder="100000"
                  />
                </FieldTooltip>
                {formErrors.batchSize && (
                  <p className="text-destructive text-[11px]">
                    {formErrors.batchSize}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={newForm.unit}
                  onValueChange={(v) => setNewForm({ ...newForm, unit: v })}
                >
                  <SelectTrigger data-ocid="batch_orders.unit.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Tablets", "Capsules", "kg", "L", "mL", "ea"].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Master Recipe</Label>
              <FieldTooltip tip="Enter the master recipe code linked to this batch (e.g. MR-AMOX-500-001)">
                <Input
                  data-ocid="batch_orders.master_recipe.input"
                  value={newForm.masterRecipe}
                  onChange={(e) =>
                    setNewForm({ ...newForm, masterRecipe: e.target.value })
                  }
                  placeholder="e.g. MR-AMOX-500-001"
                />
              </FieldTooltip>
            </div>
            <div className="space-y-1.5">
              <Label>ERP Start Date</Label>
              <Input
                data-ocid="batch_orders.erp_start.input"
                type="date"
                value={newForm.erpStart}
                onChange={(e) =>
                  setNewForm({ ...newForm, erpStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <FieldTooltip tip="Optional: Add any special instructions or observations for this batch">
                <Textarea
                  data-ocid="batch_orders.notes.textarea"
                  value={newForm.notes}
                  onChange={(e) =>
                    setNewForm({ ...newForm, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                  rows={3}
                />
              </FieldTooltip>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewOrderOpen(false);
                setFormErrors({});
              }}
              data-ocid="batch_orders.new.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={
                !newForm.productName ||
                !newForm.batchSize ||
                createBatch.isPending
              }
              data-ocid="batch_orders.new.submit_button"
            >
              {createBatch.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={changeStatusOpen} onOpenChange={setChangeStatusOpen}>
        <DialogContent
          className="max-w-sm"
          data-ocid="batch_orders.change_status.dialog"
        >
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          {selectedOrder && effectiveStatus && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <StatusBadge status={effectiveStatus} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Select Target Transition</Label>
                <Select
                  value={selectedTransition}
                  onValueChange={setSelectedTransition}
                >
                  <SelectTrigger data-ocid="batch_orders.transition.select">
                    <SelectValue placeholder="Select transition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransitionOptions(effectiveStatus).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedTransition}
                onClick={doTestTransition}
                data-ocid="batch_orders.test_transition.button"
              >
                Test
              </Button>
              {transitionTestResult && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                  <CheckCircle2
                    size={14}
                    className="text-green-600 mt-0.5 shrink-0"
                  />
                  <span className="text-[12px] text-green-800">
                    {transitionTestResult}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeStatusOpen(false)}
              data-ocid="batch_orders.change_status.cancel_button"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedTransition || !transitionTestResult}
              onClick={() => {
                const needsSig = ["Annulled", "Canceled"].includes(
                  selectedTransition,
                );
                if (needsSig) {
                  setPendingTransition(selectedTransition as PharmaSuiteStatus);
                  setChangeStatusOpen(false);
                  setSignatureOpen(true);
                } else {
                  setPendingTransition(selectedTransition as PharmaSuiteStatus);
                  applyTransition();
                }
              }}
              data-ocid="batch_orders.change_status.confirm_button"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Dialog */}
      <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
        <DialogContent
          className="max-w-sm"
          data-ocid="batch_orders.signature.dialog"
        >
          <DialogHeader>
            <DialogTitle>Electronic Signature Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle
                size={14}
                className="text-amber-600 mt-0.5 shrink-0"
              />
              <p className="text-[12px] text-amber-800">
                Authorization required to perform:{" "}
                <strong>{pendingTransition}</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>User Name</Label>
              <Input
                data-ocid="batch_orders.signature.input"
                value={sigForm.username}
                onChange={(e) =>
                  setSigForm({ ...sigForm, username: e.target.value })
                }
                placeholder="Login name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={sigForm.password}
                onChange={(e) =>
                  setSigForm({ ...sigForm, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Comment{" "}
                <span className="text-muted-foreground text-[11px]">
                  (optional, max 255 chars)
                </span>
              </Label>
              <Textarea
                value={sigForm.comment}
                onChange={(e) =>
                  setSigForm({
                    ...sigForm,
                    comment: e.target.value.slice(0, 255),
                  })
                }
                placeholder="Reason for status change..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSignatureOpen(false);
                setSignatureOpen(false);
              }}
              data-ocid="batch_orders.signature.cancel_button"
            >
              Cancel
            </Button>
            <Button
              disabled={!sigForm.username || !sigForm.password}
              onClick={applyTransition}
              data-ocid="batch_orders.signature.confirm_button"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={statusHistoryOpen} onOpenChange={setStatusHistoryOpen}>
        <DialogContent
          className="max-w-2xl"
          data-ocid="batch_orders.status_history.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Status Transition History — {selectedOrder?.batchId}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Timestamp", "From", "To", "User", "Comment"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedOrder?.statusHistory.map((row) => (
                  <tr
                    key={row.timestamp + row.toStatus}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {row.fromStatus === "—" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <StatusBadge
                          status={row.fromStatus as PharmaSuiteStatus}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.toStatus} />
                    </td>
                    <td className="px-3 py-2 font-medium">{row.user}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.comment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusHistoryOpen(false)}
              data-ocid="batch_orders.status_history.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportOpen}
        onOpenChange={(v) => {
          if (!v) setExportOpen(false);
        }}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="batch_orders.export.dialog"
        >
          <DialogHeader>
            <DialogTitle>Export Order for Archive</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-muted/50 rounded px-3 py-2 text-[12px] text-muted-foreground font-mono">
              Export directory: /archive/batch_reports/
              {selectedOrder?.batchId ?? ""}/
            </div>
            <div className="space-y-1.5">
              {exportProgress.map((step, idx) => (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-2 text-[12px]",
                    idx === exportProgress.length - 1 && exportDone
                      ? "text-green-700 font-semibold"
                      : "text-foreground",
                  )}
                >
                  <CheckCircle2
                    size={13}
                    className={cn(
                      idx === exportProgress.length - 1 && exportDone
                        ? "text-green-600"
                        : "text-primary",
                    )}
                  />
                  {step}
                </div>
              ))}
              {!exportDone && exportProgress.length > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" />
                  Processing...
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant={exportDone ? "default" : "outline"}
              onClick={() => setExportOpen(false)}
              data-ocid="batch_orders.export.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Dialog */}
      <Dialog
        open={purgeOpen}
        onOpenChange={(v) => {
          if (!v) setPurgeOpen(false);
        }}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="batch_orders.purge.dialog"
        >
          <DialogHeader>
            <DialogTitle>Purge Order {selectedOrder?.batchId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {purgeProgress.length === 0 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-3 py-2.5">
                <AlertTriangle
                  size={14}
                  className="text-red-600 mt-0.5 shrink-0"
                />
                <p className="text-[12px] text-red-800">
                  <strong>Warning:</strong> Purging is an irreversible action.
                  All order data including reports and labels will be
                  permanently deleted from the system. This action cannot be
                  undone.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              {purgeProgress.map((step, idx) => (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-2 text-[12px]",
                    idx === purgeProgress.length - 1 && purgeDone
                      ? "text-green-700 font-semibold"
                      : "text-foreground",
                  )}
                >
                  <CheckCircle2
                    size={13}
                    className={cn(
                      idx === purgeProgress.length - 1 && purgeDone
                        ? "text-green-600"
                        : "text-destructive",
                    )}
                  />
                  {step}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPurgeOpen(false)}
              data-ocid="batch_orders.purge.cancel_button"
            >
              Cancel
            </Button>
            {!purgeDone && (
              <Button
                variant="destructive"
                onClick={doPurge}
                data-ocid="batch_orders.purge.confirm_button"
              >
                Apply Purge
              </Button>
            )}
            {purgeDone && (
              <Button
                onClick={() => setPurgeOpen(false)}
                data-ocid="batch_orders.purge.close_button"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GMP Validation Blocking Dialog */}
      <Dialog open={gmpBlockOpen} onOpenChange={setGmpBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle size={18} /> GMP Validation Failed — Release Blocked
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[13px] text-muted-foreground">
              Equipment{" "}
              <span className="font-mono font-semibold">{gmpBlockEquipId}</span>{" "}
              did not pass GMP validation. Resolve all errors before releasing
              this order.
            </p>
            {gmpBlockResult?.errors && gmpBlockResult.errors.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-red-700 mb-1">
                  Errors ({gmpBlockResult.errors.length})
                </p>
                <ul className="space-y-1">
                  {gmpBlockResult.errors.map((e) => (
                    <li
                      key={e}
                      className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 rounded px-2 py-1"
                    >
                      <XCircle size={13} className="mt-0.5 shrink-0" /> {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gmpBlockResult?.warnings && gmpBlockResult.warnings.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-amber-700 mb-1">
                  Warnings
                </p>
                <ul className="space-y-1">
                  {gmpBlockResult.warnings.map((w) => (
                    <li
                      key={w}
                      className="flex items-start gap-2 text-[12px] text-amber-700 bg-amber-50 rounded px-2 py-1"
                    >
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />{" "}
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGmpBlockOpen(false)}
              data-ocid="gmp_block.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Toolbar Button ────────────────────────────────────────────────────────────

function ToolbarBtn({
  icon,
  label,
  disabled,
  onClick,
  danger = false,
  ocid,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  danger?: boolean;
  ocid: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-ocid={ocid}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-[11.5px] font-medium transition-colors",
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-foreground hover:bg-accent",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  order,
  effectiveStatus,
}: { order: LocalOrder; effectiveStatus: PharmaSuiteStatus }) {
  const props: [string, string][] = [
    ["Identifier", order.batchId],
    ["Product Name", order.productName],
    ["Planned Quantity", `${order.batchSize.toLocaleString()} ${order.unit}`],
    [
      "Actual Quantity",
      effectiveStatus === "Finished" || effectiveStatus === "Reviewed"
        ? `${Math.floor(order.batchSize * 0.97).toLocaleString()} ${order.unit}`
        : "—",
    ],
    ["Unit", order.unit],
    ["Usage Type", "Production"],
    ["Master Recipe", order.masterRecipe],
    ["Target Batch", order.targetBatch],
    ["Status", effectiveStatus],
    ["ERP Start", order.erpStart],
    ["ERP End", order.erpEnd],
    ["Planned Start", order.plannedStart],
    ["Planned End", order.plannedEnd],
    ["Actual Start", order.actualStart || "—"],
    ["Actual End", order.actualEnd || "—"],
    ["Exported for Archive", order.exportedForArchive ? "Yes" : "No"],
    ["Current Stage", order.currentStage],
    ["Notes", order.notes || "—"],
  ];

  return (
    <div className="p-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Order Properties
          </h3>
        </div>
        <div className="grid grid-cols-2">
          {props.map(([key, val], i) => (
            <div
              key={key}
              className={cn(
                "flex border-b border-border/50 last:border-0",
                i % 2 === 0 ? "border-r border-border/50" : "",
              )}
            >
              <div className="w-[160px] shrink-0 px-3 py-2 bg-muted/20 text-[12px] font-medium text-muted-foreground">
                {key}
              </div>
              <div className="flex-1 px-3 py-2 text-[12px] text-foreground">
                {key === "Status" ? (
                  <StatusBadge status={val as PharmaSuiteStatus} />
                ) : (
                  val
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Order Steps Tab ───────────────────────────────────────────────────────────

function OrderStepsTab({
  order: _order,
  steps,
  selectedStepId,
  onSelectStep,
  onAbortStep,
  onReactivateStep,
}: {
  order: LocalOrder;
  steps: OrderStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onAbortStep: (id: string) => void;
  onReactivateStep: (id: string) => void;
}) {
  const selectedStep = steps.find((s) => s.id === selectedStepId);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Step list */}
      <div className="w-[220px] shrink-0 border-r border-border bg-card">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Order Steps ({steps.length})
          </p>
        </div>
        <ScrollArea className="flex-1 h-[calc(100%-36px)]">
          {steps.map((step) => (
            <button
              type="button"
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                selectedStepId === step.id
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : "hover:bg-accent/50",
              )}
              data-ocid="batch_orders.step.row"
            >
              <p className="text-[12px] font-semibold text-primary">
                {step.id.split("-").pop()}
              </p>
              <p className="text-[11.5px] text-foreground truncate">
                {step.description}
              </p>
              <div className="mt-1">
                <StepStatusBadge status={step.status} />
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Step detail */}
      {!selectedStep ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-[13px]">
          Select a step to view details
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Step header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-foreground">
                  {selectedStep.description}
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  {selectedStep.id}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAbortStep(selectedStep.id)}
                  disabled={
                    selectedStep.status !== "In Process" &&
                    selectedStep.status !== "Held"
                  }
                  className="px-2.5 py-1 text-[12px] rounded border border-border font-medium disabled:opacity-40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  data-ocid="batch_orders.step.abort.button"
                >
                  Abort
                </button>
                <button
                  type="button"
                  onClick={() => onReactivateStep(selectedStep.id)}
                  disabled={
                    selectedStep.status !== "Aborted" &&
                    selectedStep.status !== "Finished"
                  }
                  className="px-2.5 py-1 text-[12px] rounded border border-border font-medium disabled:opacity-40 hover:bg-primary/10 hover:text-primary transition-colors"
                  data-ocid="batch_orders.step.reactivate.button"
                >
                  Reactivate
                </button>
              </div>
            </div>

            {/* Step properties */}
            <div className="grid grid-cols-2 gap-2 bg-card border border-border rounded-lg p-3">
              {(
                [
                  ["Type", selectedStep.type],
                  ["Work Center", selectedStep.workCenter],
                  ["Status", selectedStep.status],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] text-muted-foreground">{k}</p>
                  <p className="text-[12.5px] font-medium text-foreground">
                    {k === "Status" ? (
                      <StepStatusBadge status={v as OrderStepStatus} />
                    ) : (
                      v
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Inputs */}
            <div>
              <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Material Inputs
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      {[
                        "Material",
                        "Qty Mode",
                        "Planned Qty (Orig)",
                        "Planned Qty (Exec)",
                        "Unit",
                        "Batch Allocations",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStep.inputs.map((inp) => (
                      <tr
                        key={inp.id}
                        className="border-b border-border/50 hover:bg-accent/20"
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          {inp.material}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {inp.plannedQtyMode}
                        </td>
                        <td className="px-3 py-2">
                          {inp.plannedQtyOriginal || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {inp.plannedQtyExecution || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {inp.unit}
                        </td>
                        <td className="px-3 py-2">
                          {inp.batchAllocations.length > 0 ? (
                            inp.batchAllocations.map((b) => (
                              <span
                                key={b}
                                className="inline-block bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[11px] mr-1"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Outputs */}
            <div>
              <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Material Outputs
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      {[
                        "Material",
                        "Qty Mode",
                        "Planned Qty (Orig)",
                        "Planned Qty (Exec)",
                        "Unit",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStep.outputs.map((out) => (
                      <tr
                        key={out.id}
                        className="border-b border-border/50 hover:bg-accent/20"
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          {out.material}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {out.plannedQtyMode}
                        </td>
                        <td className="px-3 py-2">
                          {out.plannedQtyOriginal || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {out.plannedQtyExecution || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {out.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ── Batch Report Tab ──────────────────────────────────────────────────────────

function BatchReportTab({
  order,
  steps,
  effectiveStatus,
}: {
  order: LocalOrder;
  steps: OrderStep[];
  effectiveStatus: PharmaSuiteStatus;
}) {
  const now = new Date().toLocaleString();
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          data-ocid="batch_orders.report.open_modal_button"
        >
          <FileText size={13} /> Open Batch Report
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          data-ocid="batch_orders.report.print_button"
        >
          <Printer size={13} /> Print Batch Report
        </Button>
      </div>

      {/* Report preview */}
      <div
        className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden"
        data-ocid="batch_orders.report.panel"
      >
        {/* Cover page */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-slate-700 to-slate-900 text-white">
          <div className="text-center space-y-2">
            <p className="text-[10px] uppercase tracking-widest opacity-70">
              PharmaExec MES — Batch Production Record
            </p>
            <h2 className="text-[22px] font-bold">BATCH REPORT</h2>
            <p className="text-[13px] opacity-80">{order.productName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 text-[12px]">
            <div className="space-y-1">
              <ReportField label="Order ID" value={order.batchId} />
              <ReportField label="Target Batch" value={order.targetBatch} />
              <ReportField label="Status" value={effectiveStatus} />
              <ReportField
                label="Master Recipe"
                value={order.masterRecipe.split(" ")[0]}
              />
            </div>
            <div className="space-y-1">
              <ReportField
                label="Planned Qty"
                value={`${order.batchSize.toLocaleString()} ${order.unit}`}
              />
              <ReportField label="ERP Start" value={order.erpStart} />
              <ReportField label="ERP End" value={order.erpEnd} />
              <ReportField label="Report Generated" value={now} />
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-2">
            Table of Contents
          </h3>
          <div className="space-y-0.5">
            {[
              "1. Cover Page & Order Summary",
              "2. Master Recipe Reference",
              ...steps.map((s, i) => `${i + 3}. ${s.description} (${s.id})`),
              `${steps.length + 3}. Quality Summary`,
            ].map((item) => (
              <div
                key={item}
                className="flex justify-between text-[12px] text-blue-700 hover:underline cursor-pointer"
              >
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Steps */}
        {steps.map((step, i) => (
          <div key={step.id} className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[13px] font-bold text-gray-900">
                  {i + 3}. {step.description}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {step.id} · {step.type} · {step.workCenter}
                </p>
              </div>
              <StepStatusBadge status={step.status} />
            </div>

            {/* Inputs table */}
            {step.inputs.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  Material Inputs
                </p>
                <table className="w-full text-[11.5px] border border-gray-200 rounded">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Material
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Planned
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Actual
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.inputs.map((inp) => (
                      <tr key={inp.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-800">
                          {inp.material}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">
                          {inp.plannedQtyOriginal || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">
                          {inp.plannedQtyExecution || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">
                          {inp.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Outputs table */}
            {step.outputs.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  Material Outputs
                </p>
                <table className="w-full text-[11.5px] border border-gray-200 rounded">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Material
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Planned
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Actual
                      </th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.outputs.map((out) => (
                      <tr key={out.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-800">
                          {out.material}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">
                          {out.plannedQtyOriginal || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">
                          {out.plannedQtyExecution || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">
                          {out.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            Batch Report · {order.batchId} · CONFIDENTIAL
          </p>
          <p className="text-[10px] text-gray-400">Generated: {now}</p>
        </div>
      </div>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="opacity-60 w-28 shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ── Status History Tab ────────────────────────────────────────────────────────

function StatusHistoryTab({
  history,
}: {
  history: StatusTransition[];
  statusOverrides?: Record<string, PharmaSuiteStatus>;
  batchId?: string;
  effectiveStatus?: PharmaSuiteStatus;
}) {
  return (
    <div className="p-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Status Transition History
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              {["Timestamp", "From Status", "To Status", "User", "Comment"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground text-[13px]"
                >
                  No status transitions recorded yet.
                </td>
              </tr>
            ) : (
              history.map((row) => (
                <tr
                  key={row.timestamp + row.toStatus}
                  className="border-b border-border/50 hover:bg-accent/20"
                >
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.fromStatus === "—" ? (
                      <span className="text-muted-foreground text-[12px]">
                        —
                      </span>
                    ) : (
                      <StatusBadge
                        status={row.fromStatus as PharmaSuiteStatus}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={row.toStatus} />
                  </td>
                  <td className="px-4 py-2.5 text-[12px] font-medium text-foreground">
                    {row.user}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                    {row.comment}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Help Tab ──────────────────────────────────────────────────────────────────

const HELP_SECTIONS = [
  {
    id: "what-is",
    title: "What Is a Batch Order?",
    content: `A batch order is an instruction concerning the manufacture or delivery of a product, which can be bulk material, semi-finished, or finished goods. It requires a target material, a production quantity, and a master recipe as basic information.

After its creation, an order must be prepared for the production process: based on its assigned master recipe, material, and quantity, the order is exploded to generate all order-related objects necessary for execution. The generated order steps must then be released for processing at the specified work centers.`,
  },
  {
    id: "statuses",
    title: "Order Statuses",
    content: "",
    items: [
      {
        label: "Defined",
        desc: "The first status after creation. The only status in which the order is editable. Must be linked to a master recipe before explosion.",
      },
      {
        label: "Exploded",
        desc: "Reached from Defined by running Explode. Generates order steps, material inputs, and outputs. Can be reset back to Defined.",
      },
      {
        label: "Released",
        desc: "Reached from Exploded. Makes the order selectable for processing in Production Execution. Can be unreleased back to Exploded.",
      },
      {
        label: "In Process",
        desc: "Automatically set when the first order step is started in Production Execution.",
      },
      {
        label: "Finished",
        desc: "Automatically set when the last order step has been completed.",
      },
      {
        label: "Production-reviewed",
        desc: "Reached from Finished via Production Responses module.",
      },
      {
        label: "Reviewed",
        desc: "Reached from Production-reviewed or Finished. All quality exceptions must be Closed and appended workflows finished.",
      },
      {
        label: "Annulled",
        desc: "Reached from Defined, Exploded, or Released. Indicates the order was never executed.",
      },
      {
        label: "Canceled",
        desc: "Reached from In Process. Terminates the order permanently. All In Process steps are also canceled.",
      },
    ],
  },
  {
    id: "actions",
    title: "Orders — Actions",
    content: "",
    items: [
      {
        label: "Explode",
        desc: "Generates order steps, material inputs, and outputs from the master recipe. Only for Defined orders with a Valid master recipe.",
      },
      {
        label: "Reset",
        desc: "Returns an Exploded order to Defined status, deleting all generated objects.",
      },
      {
        label: "Release",
        desc: "Makes an Exploded order available for processing. Sets status to Released.",
      },
      {
        label: "Unrelease",
        desc: "Returns a Released (not yet In Process) order to Exploded status.",
      },
      {
        label: "Open Batch Report",
        desc: "Opens the batch report in a preview window. Available from Exploded through Reviewed.",
      },
      {
        label: "Print Batch Report",
        desc: "Opens the batch report for printing. Cover page includes batch barcode for scan-starting.",
      },
      {
        label: "Change Status",
        desc: "Opens the Change Status dialog to perform a manual status transition such as Annul, Cancel, or Review.",
      },
      {
        label: "Export for Archive",
        desc: "Available for Canceled or Reviewed orders. Exports PDF report, XML batch record, labels, and XSD schema files to /archive/.",
      },
      {
        label: "Purge",
        desc: "Permanently deletes all order data including reports and labels. Irreversible. Requires prior export for Canceled/Reviewed orders.",
      },
    ],
  },
  {
    id: "steps",
    title: "Order Steps",
    content: `Order steps correspond to unit procedures in the master recipe. Each step has a work center assignment, inputs, and outputs. Steps progress through their own lifecycle: Generated → In Process → Finished (or Aborted/Held/Reactivated/Canceled).

Work center assignments can be modified as long as the step has not been started. Workflows can be appended to order steps after execution begins, to associate cleaning or auxiliary activities with the batch record.`,
  },
  {
    id: "inputs",
    title: "Order Step Inputs",
    content: `Each order step can have multiple material inputs. Three planned quantity modes are supported:

• As Defined — The system uses the quantity from the master recipe, possibly adjusted by a prorate factor during explosion.
• As Produced — The quantity is drawn from a preceding output quantity (ingoing transfers only).
• None — No planned quantity is expected. Used only for Auxiliary substance materials.

Batch allocations associate specific inventory batches with each input. They can be modified while the order is Exploded or Released and the step is Generated.`,
  },
  {
    id: "report",
    title: "Batch Report",
    content: `The batch report is a comprehensive documentation of the batch production process. It contains:

• Cover page with order ID, product, batch ID, status, and date range
• Table of contents with links to each phase
• Details for each order step including material inputs consumed and outputs produced
• Quality exception records and signature data
• Barcode on the cover page for scan-starting batch processing

The report can be opened in a preview window or sent to a printer. For archiving, use the Export for Archive action to save the report as a PDF along with the XML batch record.`,
  },
];

function HelpTab() {
  return (
    <div className="p-4 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={16} className="text-primary" />
        <h2 className="text-[14px] font-semibold text-foreground">
          Manage Batch Orders — User Guide
        </h2>
      </div>
      <p className="text-[13px] text-muted-foreground mb-4">
        This help section is based on the PharmaSuite® Production Management
        documentation. Use it as a reference while working with batch orders.
      </p>
      <Accordion type="multiple" className="space-y-2">
        {HELP_SECTIONS.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 text-[13px] font-semibold text-foreground hover:no-underline hover:bg-accent/30">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {section.content && (
                <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line mb-3">
                  {section.content}
                </p>
              )}
              {section.items && (
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <span className="text-[12px] font-semibold text-primary shrink-0 w-36">
                        {item.label}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">
          Reference: PharmaSuite® Production Management User Manual v8.1 ·
          Rockwell Software
        </p>
      </div>
    </div>
  );
}
