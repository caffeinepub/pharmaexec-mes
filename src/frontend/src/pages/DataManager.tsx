import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Edit2,
  FileDown,
  HelpCircle,
  History,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  ClipboardList,
  Copy,
  Lock,
  PauseCircle,
  PlayCircle,
  Sparkles,
  StopCircle,
  Unlink,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { HelpPanel } from "../components/HelpPanel";
import { ReportDialog } from "../components/ReportDialog";
import RequiredLabel from "../components/RequiredLabel";
import { helpContent } from "../data/helpContent";
import {
  type ChangeEntry,
  type EntityType,
  type EquipmentLogbookAction,
  type EquipmentNode,
  INITIAL_DATA,
  type LogbookAction,
  type LogbookEntry,
  type RoomLogbookAction,
  type StatusHistoryEntry,
} from "../lib/equipmentNodes";
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
import { getAllRooms } from "../lib/locationHierarchy";
import {
  type ProductMaster,
  approveProduct,
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductByCode,
  updateProduct,
} from "../lib/productMaster";
import { logCleaningEvent } from "../services/cleaningEventLog";
import {
  type CleaningBadge,
  computeCleaningBadge,
  computeCleaningValidTill,
  getCleaningBadgeStyle,
} from "../services/cleaningValidationService";
import { validateExecution as validateExecutionOrchestrator } from "../services/executionService";
import type { ExecutionValidationResult } from "../services/executionService";
import {
  IDENTIFIER_HINTS,
  generateIdentifier,
  sanitizeIdentifier,
  validateIdentifierFormat,
  validateIdentifierUniqueness,
} from "../services/identifierService";
import { isBatchActive, unbindFromBatch } from "../services/unbindService";
import {
  canApprove,
  canDelete,
  canEdit,
  canExecute,
  canMakeDraft,
  getDeleteTooltip,
  getEditTooltip,
  getStatusBadgeClass,
} from "../utils/dmRules";
import { validateNewRecord, validateRecord } from "../utils/dmValidation";
import {
  isFieldRequired,
  validateRequiredFields,
} from "../utils/entityRequiredFields";

const PAGE_SIZE = 15;
const CURRENT_USER = "Dr. Sarah Chen";

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

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  WorkCenter: "Work Center",
  Room: "Room",
  Station: "Station",
  SubStation: "Sub-Station",
  EquipmentClass: "Equipment Class",
  EquipmentEntity: "Equipment Entity",
  PropertyType: "Property Type",
  ProductMaster: "Product Master",
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
  Room: {
    bg: "bg-sky-50",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    border: "border-l-sky-400",
  },
  Station: {
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-l-amber-400",
  },
  SubStation: {
    bg: "bg-orange-50",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    border: "border-l-orange-400",
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
  ProductMaster: {
    bg: "bg-violet-50",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    border: "border-l-violet-400",
  },
};

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
  versionNumber: 1,
  originalId: null,
  revisedById: null,
  changeControlReason: "",
  roomId: undefined as string | undefined,
  stationId: undefined as string | undefined,
  subStationId: undefined as string | undefined,
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
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidationResult | null>(
    null,
  );
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  // Execute confirmation dialog
  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false);
  // Form validation errors (inline display)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // New record form errors
  const [newFormErrors, setNewFormErrors] = useState<Record<string, string>>(
    {},
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

  // ── New feature states ────────────────────────────────────────────────
  // Approve reason dialog
  const [approveReasonDialogOpen, setApproveReasonDialogOpen] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  // Delete reason dialog
  const [deleteReasonDialogOpen, setDeleteReasonDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  // Copy as Draft dialog
  const [copyDraftDialogOpen, setCopyDraftDialogOpen] = useState(false);
  const [copyDraftReason, setCopyDraftReason] = useState("");
  // Interlock validation result (from orchestrator)
  const [interlockValidationResult, setInterlockValidationResult] =
    useState<ExecutionValidationResult | null>(null);
  // Override interlock dialog
  const [overrideReasonDialogOpen, setOverrideReasonDialogOpen] =
    useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  // Log cleaning event dialog
  const [cleaningEventDialogOpen, setCleaningEventDialogOpen] = useState(false);
  const [cleaningEventForm, setCleaningEventForm] = useState({
    cleanedBy: "",
    cleaningReason: "",
    productCode: "",
    validTill: "",
  });
  // Identifier format error for new dialog
  const [identifierFormatError, setIdentifierFormatError] = useState("");

  // Unbind from batch dialog
  const [unbindDialogOpen, setUnbindDialogOpen] = useState(false);
  const [unbindReason, setUnbindReason] = useState("");
  const [unbindOverride, setUnbindOverride] = useState(false);
  // Perform Cleaning dialog
  const [performCleaningDialogOpen, setPerformCleaningDialogOpen] =
    useState(false);
  const [performCleaningReason, setPerformCleaningReason] = useState("");

  // Auto-generate identifier when new dialog opens or entity type changes
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  useEffect(() => {
    if (newDialogOpen) {
      const entityType = newNode.entityType as EntityType;
      const generated = generateIdentifier(entityType, nodesRef.current);
      setNewNode((prev) => ({ ...prev, identifier: generated }));
      setIdentifierFormatError("");
    }
  }, [newDialogOpen, newNode.entityType]);

  const filtered = useMemo(
    () =>
      nodes.filter((n) => {
        // Entity type filter
        if (selectedEntityType !== "all" && n.entityType !== selectedEntityType)
          return false;
        // Equipment-specific sub-filters (only apply when viewing EquipmentEntity)
        if (selectedEntityType === "EquipmentEntity") {
          if (filterClass !== "all" && n.parentId !== filterClass) return false;
          if (filterRoom !== "all" && n.roomId !== filterRoom) return false;
        }
        // Search text
        if (
          search.trim() !== "" &&
          !n.shortDescription.toLowerCase().includes(search.toLowerCase()) &&
          !n.identifier.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [nodes, selectedEntityType, filterClass, filterRoom, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const handleSelect = useCallback(
    (id: string) => {
      if (selectedId === id) {
        if (editMode) {
          if (!confirm("Discard unsaved changes?")) return;
        }
        setSelectedId(null);
        setEditMode(false);
        setDraft(null);
        setFormErrors({});
        return;
      }
      if (editMode) {
        if (!confirm("Discard unsaved changes?")) return;
        setEditMode(false);
        setDraft(null);
        setFormErrors({});
      }
      setSelectedId(id);
    },
    [selectedId, editMode],
  );

  const handleEdit = () => {
    if (!selected) return;
    // Batch safety check
    if (selected.isUsedInBatch) {
      toast.error(
        "This record is used in an active batch and cannot be modified",
      );
      return;
    }
    if (
      !canEdit({
        status: (selected.status ?? "Draft") as
          | "Draft"
          | "Approved"
          | "Executed",
        isUsedInBatch: selected.isUsedInBatch,
      })
    ) {
      toast.error(
        getEditTooltip({
          status: (selected.status ?? "Draft") as
            | "Draft"
            | "Approved"
            | "Executed",
          isUsedInBatch: selected.isUsedInBatch,
        }),
      );
      return;
    }
    setFormErrors({});
    setDraft({ ...selected });
    setEditMode(true);
  };

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saveConfirmReason, setSaveConfirmReason] = useState("");
  const [makeDraftConfirmOpen, setMakeDraftConfirmOpen] = useState(false);

  // ── Product Master state ──────────────────────────────────────────────
  const [products, setProducts] = useState<ProductMaster[]>(() =>
    getAllProducts(),
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [productEditMode, setProductEditMode] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductMaster | null>(null);
  const [productSaveConfirmOpen, setProductSaveConfirmOpen] = useState(false);
  const [productSaveReason, setProductSaveReason] = useState("");
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productCode: "",
    productName: "",
    description: "",
    campaignLength: 5,
    dethTime: 48,
    status: "Draft" as "Draft" | "Approved" | "Executed",
    updatedAt: new Date().toISOString(),
    isUsedInBatch: false,
    createdBy: CURRENT_USER,
  });

  const handleSave = () => {
    if (!draft) return;
    // Run field-level validation before confirm
    const validation = validateRecord({
      shortDescription: draft.shortDescription,
      identifier: draft.identifier,
    });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      toast.error("Please fix the validation errors before saving");
      return;
    }
    setFormErrors({});
    setSaveConfirmReason("");
    setSaveConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    if (!draft) return;
    try {
      const now = new Date().toISOString();
      const prev = nodes.find((n) => n.id === draft.id);
      const changes: ChangeEntry[] = [];
      // Campaign reset on product code change
      let campaignResetEntry: ChangeEntry | null = null;
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
              changedBy: CURRENT_USER,
              reason: saveConfirmReason,
            });
          }
        }
        // Campaign reset logic: if lastProductUsed changed, reset currentCampaignBatches
        if (
          draft.lastProductUsed !== prev.lastProductUsed &&
          draft.lastProductUsed !== undefined &&
          draft.lastProductUsed !== ""
        ) {
          campaignResetEntry = {
            timestamp: now,
            field: "currentCampaignBatches",
            oldValue: String(prev.currentCampaignBatches ?? 0),
            newValue: "0",
            changedBy: CURRENT_USER,
            action: "Update" as const,
            reason: "Product code changed — campaign reset",
          };
        }
      }
      const savedDraft = campaignResetEntry
        ? { ...draft, currentCampaignBatches: 0 }
        : draft;
      // ── Cleaning status recalculation on save ──────────────────────────────
      const cleaningTriggerFields: (keyof EquipmentNode)[] = [
        "lastProductUsed",
        "cleaningReason",
        "currentCampaignBatches",
        "lastCleanedAt",
      ];
      const cleaningTriggerChanged = prev
        ? cleaningTriggerFields.some(
            (f) => String(prev[f] ?? "") !== String(savedDraft[f] ?? ""),
          )
        : false;

      let finalDraft = savedDraft;
      const cleaningRecalcEntries: ChangeEntry[] = [];

      if (cleaningTriggerChanged && isEquipmentNode(savedDraft)) {
        const newBadge = computeCleaningBadge({
          equipmentId: savedDraft.id,
          equipmentType: savedDraft.equipmentType,
          lastCleanedAt: savedDraft.lastCleanedAt,
          cleaningValidTill: savedDraft.cleaningValidTill,
          lastProductUsed: savedDraft.lastProductUsed,
          cleaningReason: savedDraft.cleaningReason,
          currentCampaignBatches: savedDraft.currentCampaignBatches,
        });
        let newValidTill = savedDraft.cleaningValidTill;
        if (savedDraft.lastCleanedAt && savedDraft.lastProductUsed) {
          newValidTill = computeCleaningValidTill(
            savedDraft.lastCleanedAt,
            savedDraft.lastProductUsed,
          );
        }
        if (newBadge !== (savedDraft.cleaningStatus ?? "Due")) {
          cleaningRecalcEntries.push({
            timestamp: now,
            field: "cleaningStatus",
            oldValue: savedDraft.cleaningStatus ?? "Due",
            newValue: newBadge,
            changedBy: CURRENT_USER,
            reason: "Auto-recalculated on save",
          });
        }
        if (newValidTill !== savedDraft.cleaningValidTill) {
          cleaningRecalcEntries.push({
            timestamp: now,
            field: "cleaningValidTill",
            oldValue: savedDraft.cleaningValidTill ?? "",
            newValue: newValidTill ?? "",
            changedBy: CURRENT_USER,
            reason: "Auto-recalculated on save",
          });
        }
        finalDraft = {
          ...savedDraft,
          cleaningStatus: newBadge,
          cleaningValidTill: newValidTill,
        };
      }

      const allChanges = [
        ...(campaignResetEntry ? [...changes, campaignResetEntry] : changes),
        ...cleaningRecalcEntries,
      ];
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === draft.id
            ? {
                ...finalDraft,
                updatedAt: now,
                changeHistory: [...draft.changeHistory, ...allChanges],
              }
            : n,
        ),
      );
      setEditMode(false);
      setDraft(null);
      setFormErrors({});
      setSaveConfirmOpen(false);
      if (campaignResetEntry) {
        toast.success(
          "Changes saved. Campaign batches reset due to product change.",
        );
      } else {
        toast.success("Changes saved successfully");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleApprove = () => {
    if (!selected) return;
    if (
      !canApprove({
        status: (selected.status ?? "Draft") as
          | "Draft"
          | "Approved"
          | "Executed",
      })
    ) {
      toast.error("Only Draft records can be approved");
      return;
    }
    // Open mandatory reason dialog
    setApproveReason("");
    setApproveReasonDialogOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selected) return;
    if (!approveReason.trim()) {
      toast.error("Approval reason is required");
      return;
    }
    try {
      const now = new Date().toISOString();
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? {
                ...n,
                status: "Approved" as GmpStatus,
                updatedAt: now,
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "status",
                    oldValue: n.status ?? "Draft",
                    newValue: "Approved",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: approveReason,
                  },
                ],
              }
            : n,
        ),
      );
      setApproveReasonDialogOpen(false);
      setApproveReason("");
      toast.success("Record approved successfully");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleMakeDraft = () => {
    if (!selected) return;
    setMakeDraftConfirmOpen(true);
  };

  const handleConfirmMakeDraft = () => {
    if (!selected) return;
    if (
      !canMakeDraft({
        status: (selected.status ?? "Draft") as
          | "Draft"
          | "Approved"
          | "Executed",
      })
    ) {
      toast.error(
        "Only Approved records can be converted to Draft. Executed records are permanently locked.",
      );
      setMakeDraftConfirmOpen(false);
      return;
    }
    try {
      const now = new Date().toISOString();
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? {
                ...n,
                status: "Draft" as GmpStatus,
                updatedAt: now,
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "status",
                    oldValue: "Approved",
                    newValue: "Draft",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: "Converted to Draft for modification",
                  },
                ],
              }
            : n,
        ),
      );
      setMakeDraftConfirmOpen(false);
      toast.success("Record converted to Draft. You can now edit.");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    const ruleRecord = {
      status: (selected.status ?? "Draft") as "Draft" | "Approved" | "Executed",
      isUsedInBatch: selected.isUsedInBatch,
    };
    if (!canDelete(ruleRecord)) {
      toast.error(getDeleteTooltip(ruleRecord));
      return;
    }
    // Open mandatory reason dialog
    setDeleteReason("");
    setDeleteReasonDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selected) return;
    if (!deleteReason.trim()) {
      toast.error("Deletion reason is required");
      return;
    }
    try {
      // Log deletion with reason in change history before removing
      setNodes((prev) => prev.filter((n) => n.id !== selected.id));
      setSelectedId(null);
      setDeleteReasonDialogOpen(false);
      setDeleteReason("");
      toast.success("Item deleted successfully");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleCreate = () => {
    // Validate new record fields with entity-type-specific required fields
    const effectiveEntityType = newNode.entityType as EntityType;
    const validation = validateNewRecord(
      {
        identifier: newNode.identifier,
        shortDescription: newNode.shortDescription,
        parentId: newNode.parentId ?? "",
        manufacturer: newNode.manufacturer ?? "",
        serialNumber: newNode.serialNumber ?? "",
        stationId: newNode.stationId ?? "",
        roomId: newNode.roomId ?? "",
      },
      effectiveEntityType,
    );
    // Also check identifier format
    const fmtCheck = validateIdentifierFormat(newNode.identifier);
    if (!fmtCheck.valid) {
      setNewFormErrors((fe) => ({ ...fe, identifier: fmtCheck.message }));
      return;
    }
    // Check identifier uniqueness
    const uniqCheck = validateIdentifierUniqueness(
      newNode.identifier,
      effectiveEntityType,
      nodes,
    );
    if (!uniqCheck.unique) {
      setNewFormErrors((fe) => ({ ...fe, identifier: uniqCheck.message }));
      return;
    }
    if (!validation.valid) {
      setNewFormErrors(validation.errors);
      return;
    }
    try {
      const now = new Date().toISOString();
      const id = `node_${Date.now()}`;
      const node: EquipmentNode = {
        ...newNode,
        id,
        createdAt: now,
        createdBy: CURRENT_USER,
        updatedAt: now,
        isUsedInBatch: false,
        changeHistory: [
          {
            timestamp: now,
            field: "*",
            oldValue: "",
            newValue: "Created",
            changedBy: CURRENT_USER,
            action: "Create",
            reason: "Record created",
          },
        ],
      };
      setNodes((prev) => [...prev, node]);
      setNewDialogOpen(false);
      setNewNode({ ...EMPTY_NODE });
      setNewFormErrors({});
      setIdentifierFormatError("");
      setSelectedId(id);
      toast.success("New item created successfully");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  // ── Copy as Draft ──────────────────────────────────────────────────────────
  const handleCopyAsDraft = () => {
    if (!selected) return;
    setCopyDraftReason("");
    setCopyDraftDialogOpen(true);
  };

  const handleConfirmCopyAsDraft = () => {
    if (!selected) return;
    if (!copyDraftReason.trim()) {
      toast.error("Reason is required for Copy as Draft");
      return;
    }
    try {
      const now = new Date().toISOString();
      const originalIdentifier = selected.identifier;
      const newIdentifier = generateIdentifier(selected.entityType, nodes);
      const newId = `node_${Date.now()}_copy`;
      const copiedNode: EquipmentNode = {
        ...selected,
        id: newId,
        identifier: newIdentifier,
        status: "Draft" as GmpStatus,
        cleaningStatus: "Due",
        currentCampaignBatches: 0,
        lastCleanedAt: undefined,
        cleaningValidTill: undefined,
        versionNumber: 1,
        originalId: null,
        revisedById: null,
        createdAt: now,
        updatedAt: now,
        createdBy: CURRENT_USER,
        isUsedInBatch: false,
        changeHistory: [
          {
            timestamp: now,
            field: "*",
            oldValue: "",
            newValue: `Copied from ${originalIdentifier}`,
            changedBy: CURRENT_USER,
            action: "Create" as const,
            reason: copyDraftReason,
          },
        ],
      };
      setNodes((prev) => [...prev, copiedNode]);
      setSelectedId(newId);
      setCopyDraftDialogOpen(false);
      setCopyDraftReason("");
      toast.success(`Record copied as Draft: ${newIdentifier}`);
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  // ── Unbind from Batch ──────────────────────────────────────────────────────
  const handleUnbind = () => {
    setUnbindReason("");
    setUnbindOverride(false);
    setUnbindDialogOpen(true);
  };

  const handleConfirmUnbind = () => {
    if (!currentNode || !currentNode.currentBatchId) return;
    try {
      const result = unbindFromBatch({
        node: currentNode,
        batchId: currentNode.currentBatchId,
        reason: unbindReason,
        user: "MES Operator",
        isActiveBatch: isBatchActive(currentNode.currentBatchStatus),
        override: unbindOverride,
      });
      if (!result.success) {
        toast.error(result.error ?? "Unbind failed.");
        return;
      }
      setNodes((prev) =>
        prev.map((n) =>
          n.id === result.updatedNode.id ? result.updatedNode : n,
        ),
      );
      setUnbindDialogOpen(false);
      setUnbindReason("");
      setUnbindOverride(false);
      toast.success(
        `${currentNode.identifier} unbound from batch ${currentNode.currentBatchId}.`,
      );
    } catch (_err) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  // ── Product Master CRUD handlers ─────────────────────────────────────
  const handleProductSelect = (id: string) => {
    if (selectedProductId === id) {
      if (productEditMode && !confirm("Discard unsaved changes?")) return;
      setSelectedProductId(null);
      setProductEditMode(false);
      setProductDraft(null);
      return;
    }
    if (productEditMode && !confirm("Discard unsaved changes?")) return;
    setSelectedProductId(id);
    setProductEditMode(false);
    setProductDraft(null);
  };

  const handleProductEdit = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || prod.status !== "Draft") {
      toast.error("Only Draft products can be edited");
      return;
    }
    setProductDraft({ ...prod });
    setProductEditMode(true);
  };

  const handleProductSave = () => {
    if (!productDraft) return;
    if (!productDraft.productCode.trim() || !productDraft.productName.trim()) {
      toast.error("Product Code and Name are required");
      return;
    }
    setProductSaveReason("");
    setProductSaveConfirmOpen(true);
  };

  const handleConfirmProductSave = () => {
    if (!productDraft) return;
    try {
      updateProduct(
        productDraft.id,
        productDraft,
        CURRENT_USER,
        productSaveReason,
      );
      setProducts(getAllProducts());
      setProductEditMode(false);
      setProductDraft(null);
      setProductSaveConfirmOpen(false);
      toast.success("Product saved successfully");
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleProductApprove = () => {
    if (!selectedProductId) return;
    try {
      approveProduct(selectedProductId, CURRENT_USER);
      setProducts(getAllProducts());
      toast.success("Product approved");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleProductDelete = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || prod.status !== "Draft") {
      toast.error("Only Draft products can be deleted");
      return;
    }
    if (!confirm(`Delete product "${prod.productName}"?`)) return;
    try {
      deleteProduct(selectedProductId);
      setProducts(getAllProducts());
      setSelectedProductId(null);
      toast.success("Product deleted");
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleCreateProduct = () => {
    if (!newProduct.productCode.trim() || !newProduct.productName.trim()) {
      toast.error("Product Code and Name are required");
      return;
    }
    try {
      createProduct(newProduct, CURRENT_USER);
      setProducts(getAllProducts());
      setNewProductDialogOpen(false);
      setNewProduct({
        productCode: "",
        productName: "",
        description: "",
        campaignLength: 5,
        dethTime: 48,
        status: "Draft",
        updatedAt: new Date().toISOString(),
        isUsedInBatch: false,
        createdBy: CURRENT_USER,
      });
      toast.success("Product created");
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleEntityTypeChange = (type: EntityType | "all") => {
    setSelectedEntityType(type);
    setFilterClass("all");
    setFilterRoom("all");
    setSelectedId(null);
    setEditMode(false);
    setDraft(null);
    setFormErrors({});
    setCurrentPage(1);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleExecute = () => {
    if (!selected) return;
    if (
      !canExecute({
        status: (selected.status ?? "Draft") as
          | "Draft"
          | "Approved"
          | "Executed",
      })
    ) {
      toast.error("Only Approved records can be executed");
      return;
    }
    setExecuteConfirmOpen(true);
  };

  const handleConfirmExecute = () => {
    if (!selected) return;
    try {
      const now = new Date().toISOString();
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? {
                ...n,
                status: "Executed" as GmpStatus,
                updatedAt: now,
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "status",
                    oldValue: "Approved",
                    newValue: "Executed",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: "Batch Execution confirmed — terminal state",
                  },
                ],
              }
            : n,
        ),
      );
      setExecuteConfirmOpen(false);
      toast.success(
        "Record executed successfully. This record is now permanently locked.",
      );
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
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
    // Also run the interlock orchestrator for richer interlock details
    if (
      selected.entityType === "EquipmentEntity" ||
      selected.entityType === "EquipmentClass"
    ) {
      const orchestratorResult = validateExecutionOrchestrator({
        equipment: selected,
        equipmentId: selected.id,
        targetProductCode: selected.lastProductUsed,
      });
      setInterlockValidationResult(orchestratorResult);
    } else {
      setInterlockValidationResult(null);
    }
    setValidateDialogOpen(true);
  };

  const handleConfirmOverride = () => {
    if (!selected) return;
    if (!overrideReason.trim()) {
      toast.error("Override reason is mandatory");
      return;
    }
    try {
      // Log override in audit trail
      const now = new Date().toISOString();
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? {
                ...n,
                updatedAt: now,
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "interlock_override",
                    oldValue: "BLOCKED",
                    newValue: "OVERRIDDEN",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: `Soft interlock override: ${overrideReason}`,
                  },
                ],
              }
            : n,
        ),
      );
      setOverrideReasonDialogOpen(false);
      setOverrideReason("");
      toast.warning("Override logged. Proceed with caution.");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const _handleOpenCleaningEventDialog = () => {
    const cNode = editMode ? draft : selected;
    if (!cNode) return;
    setCleaningEventForm({
      cleanedBy: CURRENT_USER,
      cleaningReason: "",
      productCode: cNode.lastProductUsed ?? "",
      validTill: cNode.cleaningValidTill
        ? cNode.cleaningValidTill.split("T")[0]
        : "",
    });
    setCleaningEventDialogOpen(true);
  };

  const handleConfirmCleaningEvent = () => {
    const cNode = editMode ? draft : selected;
    if (!cNode) return;
    if (!cleaningEventForm.cleaningReason.trim()) {
      toast.error("Cleaning reason is required");
      return;
    }
    try {
      logCleaningEvent({
        equipmentId: cNode.id,
        equipmentIdentifier: cNode.identifier,
        cleanedBy: cleaningEventForm.cleanedBy,
        cleaningReason: cleaningEventForm.cleaningReason,
        productCode: cleaningEventForm.productCode,
        cleanedAt: new Date().toISOString(),
        validTill: cleaningEventForm.validTill
          ? new Date(cleaningEventForm.validTill).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      // Update node cleaning status to Clean
      const now = new Date().toISOString();
      setNodes((prev) =>
        prev.map((n) =>
          n.id === cNode.id
            ? {
                ...n,
                cleaningStatus: "Clean",
                lastCleanedAt: now,
                cleaningValidTill: cleaningEventForm.validTill
                  ? new Date(cleaningEventForm.validTill).toISOString()
                  : new Date(
                      Date.now() + 30 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                updatedAt: now,
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "cleaningStatus",
                    oldValue: n.cleaningStatus ?? "Due",
                    newValue: "Clean",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: `Cleaning event logged: ${cleaningEventForm.cleaningReason}`,
                  },
                ],
              }
            : n,
        ),
      );
      setCleaningEventDialogOpen(false);
      toast.success("Cleaning event logged");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handlePerformCleaning = () => {
    const node = selected;
    if (!node) return;
    if (!performCleaningReason.trim()) {
      toast.error("Cleaning reason is required");
      return;
    }
    try {
      const now = new Date().toISOString();
      const newLastCleanedAt = now;
      const newCampaignBatches = 0;
      const newValidTill = node.lastProductUsed
        ? computeCleaningValidTill(newLastCleanedAt, node.lastProductUsed)
        : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const newBadge = computeCleaningBadge({
        equipmentId: node.id,
        equipmentType: node.equipmentType,
        lastCleanedAt: newLastCleanedAt,
        cleaningValidTill: newValidTill,
        lastProductUsed: node.lastProductUsed,
        cleaningReason: performCleaningReason,
        currentCampaignBatches: newCampaignBatches,
      });
      logCleaningEvent({
        equipmentId: node.id,
        equipmentIdentifier: node.identifier,
        cleanedBy: CURRENT_USER,
        cleaningReason: performCleaningReason,
        productCode: node.lastProductUsed ?? "",
        cleanedAt: now,
        validTill: newValidTill,
      });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id
            ? {
                ...n,
                lastCleanedAt: newLastCleanedAt,
                currentCampaignBatches: newCampaignBatches,
                cleaningStatus: newBadge,
                cleaningValidTill: newValidTill,
                cleaningReason: performCleaningReason,
                updatedAt: now,
                logbookEntries: [
                  ...(n.logbookEntries ?? []),
                  {
                    id: `lb-clean-${Date.now()}`,
                    entityType: "Equipment" as const,
                    entityIdentifier: n.identifier,
                    action: "Cleaning" as const,
                    timestamp: now,
                    user: CURRENT_USER,
                    reason: performCleaningReason,
                    statusChange: `${n.cleaningStatus ?? "Due"} → ${newBadge}`,
                  },
                ],
                changeHistory: [
                  ...n.changeHistory,
                  {
                    timestamp: now,
                    field: "cleaningStatus",
                    oldValue: n.cleaningStatus ?? "Due",
                    newValue: newBadge,
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: `Perform Cleaning: ${performCleaningReason}`,
                  },
                  {
                    timestamp: now,
                    field: "lastCleanedAt",
                    oldValue: n.lastCleanedAt ?? "—",
                    newValue: newLastCleanedAt,
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: `Perform Cleaning: ${performCleaningReason}`,
                  },
                  {
                    timestamp: now,
                    field: "currentCampaignBatches",
                    oldValue: String(n.currentCampaignBatches ?? 0),
                    newValue: "0",
                    changedBy: CURRENT_USER,
                    action: "Update" as const,
                    reason: `Perform Cleaning: ${performCleaningReason}`,
                  },
                ],
              }
            : n,
        ),
      );
      setPerformCleaningDialogOpen(false);
      setPerformCleaningReason("");
      toast.success(`Cleaning performed. Status updated to ${newBadge}.`);
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
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

  const isRoomNode = (n: EquipmentNode) => n.entityType === "Room";

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
            {selectedEntityType === "ProductMaster" ? (
              <Button
                size="sm"
                className="h-7 gap-1 text-[12px] px-3"
                onClick={() => setNewProductDialogOpen(true)}
                data-ocid="data_manager.new_product_button"
              >
                <Plus size={13} /> New Product
              </Button>
            ) : (
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
                  {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[])
                    .filter((t) => t !== "ProductMaster")
                    .map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => {
                          setNewNode({ ...EMPTY_NODE, entityType: type });
                          setNewDialogOpen(true);
                        }}
                      >
                        {ENTITY_TYPE_LABELS[type]}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[12px] px-3"
                      onClick={editMode ? handleSave : handleEdit}
                      disabled={
                        !selected ||
                        (!editMode &&
                          !canEdit({
                            status: (selected.status ?? "Draft") as
                              | "Draft"
                              | "Approved"
                              | "Executed",
                            isUsedInBatch: selected.isUsedInBatch,
                          }))
                      }
                      data-ocid="data_manager.save_button"
                    >
                      {editMode ? (
                        <>
                          <Save size={13} /> Save
                        </>
                      ) : (
                        <>
                          <Edit2 size={13} /> Edit
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!editMode &&
                  selected &&
                  !canEdit({
                    status: (selected.status ?? "Draft") as
                      | "Draft"
                      | "Approved"
                      | "Executed",
                    isUsedInBatch: selected.isUsedInBatch,
                  }) && (
                    <TooltipContent
                      side="bottom"
                      className="max-w-[220px] text-center"
                    >
                      <p>
                        {getEditTooltip({
                          status: (selected.status ?? "Draft") as
                            | "Draft"
                            | "Approved"
                            | "Executed",
                          isUsedInBatch: selected.isUsedInBatch,
                        })}
                      </p>
                    </TooltipContent>
                  )}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[12px] px-3 text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      disabled={
                        !selected ||
                        !canDelete({
                          status: (selected.status ?? "Draft") as
                            | "Draft"
                            | "Approved"
                            | "Executed",
                          isUsedInBatch: selected.isUsedInBatch,
                        })
                      }
                      data-ocid="data_manager.delete_button"
                    >
                      <Trash2 size={13} /> Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                {selected &&
                  !canDelete({
                    status: (selected.status ?? "Draft") as
                      | "Draft"
                      | "Approved"
                      | "Executed",
                    isUsedInBatch: selected.isUsedInBatch,
                  }) && (
                    <TooltipContent
                      side="bottom"
                      className="max-w-[220px] text-center"
                    >
                      <p>
                        {getDeleteTooltip({
                          status: (selected.status ?? "Draft") as
                            | "Draft"
                            | "Approved"
                            | "Executed",
                          isUsedInBatch: selected.isUsedInBatch,
                        })}
                      </p>
                    </TooltipContent>
                  )}
              </Tooltip>
            </TooltipProvider>

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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search items…"
                className="h-7 pl-8 text-[12px] bg-white"
                data-ocid="data_manager.search_input"
              />
            </div>
          </div>

          {/* Secondary filters — Equipment Entity only */}
          {selectedEntityType === "EquipmentEntity" && (
            <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Filter:
              </span>
              {/* Equipment Class filter */}
              <Select
                value={filterClass}
                onValueChange={(v) => {
                  setFilterClass(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="h-7 w-44 text-[12px] bg-white"
                  data-ocid="data_manager.filter_class.select"
                >
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">
                    All Classes
                  </SelectItem>
                  {nodes
                    .filter((n) => n.entityType === "EquipmentClass")
                    .map((ec) => (
                      <SelectItem
                        key={ec.id}
                        value={ec.id}
                        className="text-[12px]"
                      >
                        {ec.shortDescription}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {/* Room filter */}
              <Select
                value={filterRoom}
                onValueChange={(v) => {
                  setFilterRoom(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="h-7 w-44 text-[12px] bg-white"
                  data-ocid="data_manager.filter_room.select"
                >
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">
                    All Rooms
                  </SelectItem>
                  {nodes
                    .filter((n) => n.entityType === "Room")
                    .map((rm) => (
                      <SelectItem
                        key={rm.id}
                        value={rm.id}
                        className="text-[12px]"
                      >
                        {rm.shortDescription}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {/* Active filter chips */}
              {filterClass !== "all" && (
                <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-medium px-2 py-0.5 rounded-full border border-blue-200">
                  Class:{" "}
                  {nodes.find((n) => n.id === filterClass)?.shortDescription}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterClass("all");
                      setCurrentPage(1);
                    }}
                    className="ml-1 hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterRoom !== "all" && (
                <span className="flex items-center gap-1 bg-green-100 text-green-800 text-[11px] font-medium px-2 py-0.5 rounded-full border border-green-200">
                  Room:{" "}
                  {nodes.find((n) => n.id === filterRoom)?.shortDescription}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRoom("all");
                      setCurrentPage(1);
                    }}
                    className="ml-1 hover:text-green-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {(filterClass !== "all" || filterRoom !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterClass("all");
                    setFilterRoom("all");
                    setCurrentPage(1);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

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
            ) : selectedEntityType === "ProductMaster" ? (
              /* ── Product Master Cards ── */
              <div
                className="p-4 grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
              >
                {products.length === 0 && (
                  <div
                    className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground"
                    data-ocid="data_manager.empty_state"
                  >
                    <Database size={32} className="mb-3 opacity-25" />
                    <p className="text-[13px]">No products defined</p>
                  </div>
                )}
                {products
                  .filter(
                    (p) =>
                      search.trim() === "" ||
                      p.productCode
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                      p.productName
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((prod, idx) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleProductSelect(prod.id)}
                      data-ocid={`data_manager.item.${idx + 1}`}
                      className={cn(
                        "text-left rounded-lg border-l-4 border border-border p-3 cursor-pointer transition-all bg-violet-50 border-l-violet-400",
                        selectedProductId === prod.id
                          ? "ring-2 ring-primary ring-offset-1 shadow-md"
                          : "hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[12.5px] font-semibold text-foreground leading-tight truncate">
                          {prod.productName}
                        </span>
                        <span
                          className={cn(
                            "text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0",
                            prod.status === "Approved"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : prod.status === "Executed"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-600 border-gray-200",
                          )}
                        >
                          {prod.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {prod.productCode}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded border bg-violet-100 text-violet-700 border-violet-200 font-semibold">
                          Campaign: {prod.campaignLength}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-200 font-semibold">
                          DETH: {prod.dethTime}h
                        </span>
                        {prod.isUsedInBatch && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                            In Batch
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
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
                {paginated.map((node, idx) => {
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
                        node.status === "Superseded" && "opacity-50",
                        node.status === "Executed" && "border-l-blue-400",
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
                      {node.createdAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          Created:{" "}
                          {new Date(node.createdAt).toLocaleDateString()}
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
                              getStatusBadgeClass(node.status ?? "Draft"),
                            )}
                          >
                            {node.status ?? "Draft"}
                          </span>
                          {/* Usability Badge */}
                          <span
                            className={cn(
                              "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border",
                              {
                                "bg-green-100 text-green-800 border-green-300":
                                  node.status === "Approved",
                                "bg-blue-100 text-blue-800 border-blue-300":
                                  node.status === "Executed",
                                "bg-red-100 text-red-800 border-red-300":
                                  node.status !== "Approved" &&
                                  node.status !== "Executed",
                              },
                            )}
                          >
                            {node.status === "Approved"
                              ? "✓ Usable"
                              : node.status === "Executed"
                                ? "⊘ Executed"
                                : "✗ Not Usable"}
                          </span>
                          {/* Cleaning Badge */}
                          {(() => {
                            const cb = computeCleaningBadge({
                              equipmentId: node.id,
                              equipmentType: node.equipmentType,
                              cleaningStatus: node.cleaningStatus,
                              lastCleanedAt: node.lastCleanedAt,
                              cleaningValidTill: node.cleaningValidTill,
                              lastProductUsed: node.lastProductUsed,
                              cleaningReason: node.cleaningReason,
                              currentCampaignBatches:
                                node.currentCampaignBatches,
                            });
                            return (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                                  getCleaningBadgeStyle(cb),
                                )}
                              >
                                {cb === "Clean"
                                  ? "✓"
                                  : cb === "Due"
                                    ? "⚠"
                                    : "✗"}{" "}
                                {cb}
                              </span>
                            );
                          })()}
                          {/* Equipment Type badge */}
                          {node.equipmentType && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                              {node.equipmentType}
                            </span>
                          )}
                          {/* In Batch badge */}
                          {node.isUsedInBatch && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                              In Batch
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-[oklch(0.975_0.004_240)] shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        data-ocid="data_manager.pagination_prev"
                      >
                        ‹ Prev
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {currentPage === 1 && (
                    <TooltipContent>First page</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <span className="text-[11px] text-muted-foreground font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        data-ocid="data_manager.pagination_next"
                      >
                        Next ›
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {currentPage === totalPages && (
                    <TooltipContent>Last page</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

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
          {selectedEntityType === "ProductMaster" ? (
            /* ── Product Master Detail Panel ── */
            (() => {
              const selProd =
                products.find((p) => p.id === selectedProductId) ?? null;
              const pdNode =
                productEditMode && productDraft ? productDraft : selProd;
              return selProd ? (
                <>
                  <div className="flex items-start justify-between px-5 py-3 border-b border-border bg-[oklch(0.975_0.004_240)] shrink-0">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">
                        {pdNode?.productName}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {pdNode?.productCode}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            getStatusBadgeClass(pdNode?.status ?? "Draft"),
                          )}
                        >
                          {pdNode?.status === "Approved"
                            ? "✓ Approved"
                            : pdNode?.status === "Executed"
                              ? "⊘ Executed"
                              : "Draft"}
                        </span>
                        {pdNode?.isUsedInBatch && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                            In Batch
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end ml-2">
                      {productEditMode ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 gap-1 text-[12px] px-3"
                            onClick={handleProductSave}
                            data-ocid="data_manager.product.save_button"
                          >
                            <Save size={12} /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[12px] px-3"
                            onClick={() => {
                              setProductEditMode(false);
                              setProductDraft(null);
                            }}
                            data-ocid="data_manager.product.cancel_button"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {pdNode?.status === "Draft" &&
                            !pdNode?.isUsedInBatch && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-[12px] px-3"
                                onClick={handleProductEdit}
                                data-ocid="data_manager.product.edit_button"
                              >
                                <Edit2 size={12} /> Edit
                              </Button>
                            )}
                          {pdNode?.status === "Draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-[12px] px-3 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={handleProductApprove}
                              data-ocid="data_manager.product.approve_button"
                            >
                              <Shield size={12} /> Approve
                            </Button>
                          )}
                          {pdNode?.status === "Draft" &&
                            !pdNode?.isUsedInBatch && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-[12px] px-3 text-destructive border-destructive/30 hover:bg-red-50"
                                onClick={handleProductDelete}
                                data-ocid="data_manager.product.delete_button"
                              >
                                <Trash2 size={12} /> Delete
                              </Button>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto px-5 pb-5 mt-3">
                    <SectionHeader title="Product Information" />
                    <FieldRow label="Product Code">
                      <Input
                        disabled={!productEditMode}
                        value={pdNode?.productCode ?? ""}
                        onChange={(e) =>
                          setProductDraft(
                            (d) => d && { ...d, productCode: e.target.value },
                          )
                        }
                        className="h-7 text-[12px] font-mono"
                        placeholder="e.g. PRD-AMX-001"
                      />
                    </FieldRow>
                    <FieldRow label="Product Name">
                      <Input
                        disabled={!productEditMode}
                        value={pdNode?.productName ?? ""}
                        onChange={(e) =>
                          setProductDraft(
                            (d) => d && { ...d, productName: e.target.value },
                          )
                        }
                        className="h-7 text-[12px]"
                        placeholder="Full product name"
                      />
                    </FieldRow>
                    <FieldRow label="Description">
                      <Textarea
                        disabled={!productEditMode}
                        value={pdNode?.description ?? ""}
                        onChange={(e) =>
                          setProductDraft(
                            (d) => d && { ...d, description: e.target.value },
                          )
                        }
                        className="text-[12px] min-h-[60px] resize-none"
                      />
                    </FieldRow>
                    <SectionHeader title="Campaign & Cleaning Parameters" />
                    <FieldRow label="Campaign Length">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          disabled={!productEditMode}
                          value={pdNode?.campaignLength ?? 5}
                          onChange={(e) =>
                            setProductDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  campaignLength: Number(e.target.value),
                                },
                            )
                          }
                          className="h-7 text-[12px] w-24"
                          min={1}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          batches max per campaign
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow label="DETH (hours)">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          disabled={!productEditMode}
                          value={pdNode?.dethTime ?? 48}
                          onChange={(e) =>
                            setProductDraft(
                              (d) =>
                                d && { ...d, dethTime: Number(e.target.value) },
                            )
                          }
                          className="h-7 text-[12px] w-24"
                          min={1}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          Dirty Equipment Hold Time
                        </span>
                      </div>
                    </FieldRow>
                    <div className="mt-3 p-3 rounded-lg bg-violet-50 border border-violet-200 text-[11px] text-violet-700">
                      <p className="font-semibold mb-1">Cleaning Logic:</p>
                      <p>
                        <strong>Fixed Equipment:</strong> Validity depends on
                        Cleaning Reason + Product Code.
                      </p>
                      <p className="mt-0.5">
                        <strong>Moveable Equipment:</strong> Validity depends
                        ONLY on Product Code.
                      </p>
                      <p className="mt-1">
                        Equipment must be re-cleaned when DETH is exceeded or
                        campaign length is reached.
                      </p>
                    </div>
                    <SectionHeader title="Lifecycle" />
                    <FieldRow label="Created By">
                      <Input
                        readOnly
                        value={pdNode?.createdBy ?? ""}
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Created At">
                      <Input
                        readOnly
                        value={
                          pdNode?.createdAt
                            ? new Date(pdNode.createdAt).toLocaleDateString()
                            : ""
                        }
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <FieldRow label="Updated At">
                      <Input
                        readOnly
                        value={
                          pdNode?.updatedAt
                            ? new Date(pdNode.updatedAt).toLocaleDateString()
                            : ""
                        }
                        className="h-7 text-[12px] bg-muted/50"
                      />
                    </FieldRow>
                    <SectionHeader title="Change History" />
                    {(pdNode?.changeHistory ?? []).length === 0 ? (
                      <p className="text-[12px] text-muted-foreground py-4 text-center">
                        No changes recorded.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {[...(pdNode?.changeHistory ?? [])]
                          .reverse()
                          .map((entry) => (
                            <div
                              key={entry.timestamp + entry.field}
                              className="flex gap-3 p-2.5 rounded-lg bg-muted/30 border border-border"
                            >
                              <Clock
                                size={12}
                                className="text-muted-foreground mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground">
                                  <span className="font-semibold">
                                    {entry.field}
                                  </span>{" "}
                                  changed by {entry.changedBy}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </p>
                                {entry.reason && (
                                  <p className="text-[10px] text-muted-foreground italic">
                                    {entry.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="flex flex-1 flex-col items-center justify-center text-muted-foreground"
                  data-ocid="data_manager.product.empty_state"
                >
                  <Database size={40} className="mb-3 opacity-20" />
                  <p className="text-[13px]">
                    Select a product to view details
                  </p>
                </div>
              );
            })()
          ) : currentNode ? (
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
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        getStatusBadgeClass(currentNode.status ?? "Draft"),
                      )}
                    >
                      {currentNode.status === "Approved"
                        ? "✓ Approved"
                        : currentNode.status === "Executed"
                          ? "⊘ Executed"
                          : currentNode.status === "Superseded"
                            ? "⊘ Superseded"
                            : "Draft"}
                    </span>
                    {currentNode.isUsedInBatch && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                        In Batch
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
                          setFormErrors({});
                        }}
                        data-ocid="data_manager.cancel_button"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : currentNode.status === "Executed" ? (
                    /* Executed: strictly locked — only Validate remains */
                    <>
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
                    </>
                  ) : (
                    <>
                      {/* Edit button — only enabled for Draft, not in batch */}
                      {(() => {
                        const rr = {
                          status: (currentNode.status ?? "Draft") as
                            | "Draft"
                            | "Approved"
                            | "Executed",
                          isUsedInBatch: currentNode.isUsedInBatch,
                        };
                        const editable = canEdit(rr);
                        const tooltip = getEditTooltip(rr);
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 text-[12px] px-3"
                                    onClick={handleEdit}
                                    disabled={!editable}
                                    data-ocid="data_manager.edit_button"
                                  >
                                    <Edit2 size={12} /> Edit
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!editable && (
                                <TooltipContent
                                  side="bottom"
                                  className="max-w-[220px] text-center"
                                >
                                  <p>{tooltip}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                      {/* Approve — Draft only */}
                      {canApprove({
                        status: (currentNode.status ?? "Draft") as
                          | "Draft"
                          | "Approved"
                          | "Executed",
                      }) && (
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
                      {/* Make Draft — Approved only */}
                      {canMakeDraft({
                        status: (currentNode.status ?? "Draft") as
                          | "Draft"
                          | "Approved"
                          | "Executed",
                      }) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3 text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={handleMakeDraft}
                          data-ocid="data_manager.make_draft_button"
                        >
                          <RotateCcw size={12} /> Make Draft
                        </Button>
                      )}
                      {/* Execute — Approved only */}
                      {canExecute({
                        status: (currentNode.status ?? "Draft") as
                          | "Draft"
                          | "Approved"
                          | "Executed",
                      }) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3 text-blue-700 border-blue-300 hover:bg-blue-50"
                          onClick={handleExecute}
                          data-ocid="data_manager.execute_button"
                        >
                          <CheckCircle2 size={12} /> Execute
                        </Button>
                      )}
                      {/* Validate — equipment only */}
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
                      {/* Copy as Draft — available for Draft and Approved records */}
                      {(currentNode.status === "Draft" ||
                        currentNode.status === "Approved") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                          onClick={handleCopyAsDraft}
                          data-ocid="data_manager.copy_draft_button"
                        >
                          <Copy size={12} /> Copy as Draft
                        </Button>
                      )}
                      {/* Unbind from Batch — visible when entity is bound to a batch */}
                      {currentNode.currentBatchId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] px-3 text-orange-700 border-orange-300 hover:bg-orange-50"
                          onClick={handleUnbind}
                          data-ocid="data_manager.unbind_button"
                        >
                          <Unlink size={12} /> Unbind from Batch
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <DetailErrorBoundary key={selectedId ?? "none"}>
                {/* Executed lock banner */}
                {currentNode.status === "Executed" && (
                  <div className="mx-4 mt-3 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-800 shrink-0">
                    <Shield
                      size={14}
                      className="shrink-0 mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="font-semibold">
                        This record has been Executed and is strictly locked.
                      </p>
                      <p className="font-normal mt-0.5 text-blue-700">
                        No modifications are permitted. This is a terminal
                        state.
                      </p>
                    </div>
                  </div>
                )}
                {/* Approved read-only warning banner */}
                {currentNode.status === "Approved" && !editMode && (
                  <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800 shrink-0">
                    <AlertTriangle
                      size={13}
                      className="shrink-0 text-amber-600"
                    />
                    <span>
                      This record is <strong>Approved</strong> and read-only.
                      Use &apos;Make Draft&apos; to modify.
                    </span>
                  </div>
                )}
                {/* In Batch safety warning */}
                {currentNode.isUsedInBatch && (
                  <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-[12px] text-orange-800 shrink-0">
                    <AlertTriangle
                      size={13}
                      className="shrink-0 text-orange-600"
                    />
                    <span>
                      This record is used in an <strong>active batch</strong>{" "}
                      and cannot be modified.
                    </span>
                  </div>
                )}
                {/* Cleaning warning banner — Due or Expired */}
                {isEquipmentNode(currentNode) &&
                  (() => {
                    const cb = computeCleaningBadge({
                      equipmentId: currentNode.id,
                      equipmentType: editMode
                        ? draft?.equipmentType
                        : currentNode.equipmentType,
                      lastCleanedAt: editMode
                        ? draft?.lastCleanedAt
                        : currentNode.lastCleanedAt,
                      cleaningValidTill: editMode
                        ? draft?.cleaningValidTill
                        : currentNode.cleaningValidTill,
                      lastProductUsed: editMode
                        ? draft?.lastProductUsed
                        : currentNode.lastProductUsed,
                      cleaningReason: editMode
                        ? draft?.cleaningReason
                        : currentNode.cleaningReason,
                      currentCampaignBatches: editMode
                        ? draft?.currentCampaignBatches
                        : currentNode.currentCampaignBatches,
                    });
                    if (cb === "Clean") return null;
                    return (
                      <div
                        className={cn(
                          "mx-4 mt-3 flex items-start gap-2 flex-wrap px-3 py-2 rounded-lg text-[12px] shrink-0 border",
                          cb === "Expired"
                            ? "bg-red-50 border-red-200 text-red-800"
                            : "bg-amber-50 border-amber-200 text-amber-800",
                        )}
                      >
                        <AlertTriangle
                          size={13}
                          className={cn(
                            "shrink-0 mt-0.5",
                            cb === "Expired"
                              ? "text-red-600"
                              : "text-amber-600",
                          )}
                        />
                        <span>
                          <strong>
                            Cleaning {cb === "Expired" ? "Expired" : "Due"}:
                          </strong>{" "}
                          {cb === "Expired"
                            ? "Cleaning validity has expired. Cleaning required before execution."
                            : "Cleaning validity expires soon. Schedule cleaning before next execution."}
                        </span>
                        {!editMode && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 ml-auto gap-1 text-[11px] shrink-0 border-current text-inherit hover:bg-white/40"
                            onClick={() => {
                              setPerformCleaningReason("");
                              setPerformCleaningDialogOpen(true);
                            }}
                            data-ocid="data_manager.perform_cleaning_banner_button"
                          >
                            <Sparkles size={11} /> Perform Cleaning
                          </Button>
                        )}
                      </div>
                    );
                  })()}
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
                        value="engineering"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.engineering.tab"
                      >
                        Engineering
                      </TabsTrigger>
                      {isEquipmentNode(currentNode) && (
                        <TabsTrigger
                          value="context"
                          className="h-6 px-3 text-[11.5px]"
                          data-ocid="data_manager.context.tab"
                        >
                          Context
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
                        value="status_history"
                        className="h-6 px-3 text-[11.5px]"
                        data-ocid="data_manager.status_history.tab"
                      >
                        Status History
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
                    <div className="grid grid-cols-[160px_1fr] items-start gap-2 py-1.5">
                      <RequiredLabel
                        label="Identifier"
                        required={isFieldRequired(
                          currentNode.entityType as EntityType,
                          "identifier",
                        )}
                        className="text-[11.5px] font-medium text-muted-foreground pt-2 leading-tight"
                      />
                      <div>
                        <div className="relative">
                          <Input
                            readOnly={editMode}
                            disabled={!editMode}
                            value={
                              editMode
                                ? (draft?.identifier ?? currentNode.identifier)
                                : currentNode.identifier
                            }
                            className={cn(
                              "h-7 text-[12px]",
                              editMode &&
                                "bg-gray-100 cursor-not-allowed opacity-70 pr-8",
                              formErrors.identifier && "border-destructive",
                            )}
                            data-ocid="data_manager.identifier.input"
                          />
                          {editMode && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock
                                    size={12}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Identifier is locked after creation
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {formErrors.identifier && (
                          <p
                            className="text-[11px] text-destructive mt-0.5"
                            data-ocid="data_manager.identifier_error"
                          >
                            {formErrors.identifier}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-start gap-2 py-1.5">
                      <RequiredLabel
                        label="Short Description"
                        required={isFieldRequired(
                          currentNode.entityType as EntityType,
                          "shortDescription",
                        )}
                        className="text-[11.5px] font-medium text-muted-foreground pt-2 leading-tight"
                      />
                      <div>
                        <Input
                          disabled={!editMode}
                          value={
                            editMode
                              ? draft?.shortDescription
                              : currentNode.shortDescription
                          }
                          onChange={(e) => {
                            setDraft(
                              (d) =>
                                d && { ...d, shortDescription: e.target.value },
                            );
                            if (formErrors.shortDescription)
                              setFormErrors((fe) => ({
                                ...fe,
                                shortDescription: "",
                              }));
                          }}
                          className={cn(
                            "h-7 text-[12px]",
                            formErrors.shortDescription && "border-destructive",
                          )}
                          data-ocid="data_manager.short_description.input"
                        />
                        {formErrors.shortDescription && (
                          <p
                            className="text-[11px] text-destructive mt-0.5"
                            data-ocid="data_manager.name_error"
                          >
                            {formErrors.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
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

                    {/* Location Hierarchy — Equipment Entity & Class only */}
                    {isEquipmentNode(currentNode) && (
                      <>
                        <SectionHeader title="Location" />
                        <FieldRow label="Room">
                          <Input
                            readOnly
                            value={(() => {
                              const rid = editMode
                                ? draft?.roomId
                                : currentNode.roomId;
                              if (!rid) return "— Not Set —";
                              const room = getAllRooms().find(
                                (r) => r.id === rid,
                              );
                              return room
                                ? `${room.name} (${room.identifier})`
                                : rid;
                            })()}
                            className="h-7 text-[12px] bg-muted/30"
                          />
                        </FieldRow>
                        <FieldRow label="Station">
                          <Input
                            readOnly
                            value={(() => {
                              const sid = editMode
                                ? draft?.stationId
                                : currentNode.stationId;
                              if (!sid) return "— Not Set —";
                              const sta = nodes.find((n) => n.id === sid);
                              return sta
                                ? `${sta.shortDescription} (${sta.identifier})`
                                : sid;
                            })()}
                            className="h-7 text-[12px] bg-muted/30"
                          />
                        </FieldRow>
                        <FieldRow label="Sub-Station">
                          <Input
                            readOnly
                            value={(() => {
                              const ssid = editMode
                                ? draft?.subStationId
                                : currentNode.subStationId;
                              if (!ssid) return "— Not Set —";
                              const ss = nodes.find((n) => n.id === ssid);
                              return ss
                                ? `${ss.shortDescription} (${ss.identifier})`
                                : ssid;
                            })()}
                            className="h-7 text-[12px] bg-muted/30"
                          />
                        </FieldRow>
                      </>
                    )}

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
                    {isEquipmentNode(currentNode) ? (
                      <>
                        <SectionHeader title="Equipment Specification" />
                        {/* Equipment Type — read-only badge */}
                        <FieldRow label="Equipment Type">
                          <div className="flex items-center gap-2 h-7">
                            {(() => {
                              const et = currentNode.equipmentType;
                              if (!et)
                                return (
                                  <span className="text-[12px] text-muted-foreground px-2 py-0.5 rounded border bg-gray-50 border-gray-200">
                                    Not Set
                                  </span>
                                );
                              return (
                                <span
                                  className={cn(
                                    "text-[12px] font-semibold px-2.5 py-0.5 rounded border",
                                    et === "Fixed"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-teal-50 text-teal-700 border-teal-200",
                                  )}
                                >
                                  {et}
                                </span>
                              );
                            })()}
                          </div>
                        </FieldRow>
                        {/* Cleaning Type — editable */}
                        <FieldRow label="Cleaning Type">
                          {editMode ? (
                            <Select
                              value={draft?.cleaningType ?? "none"}
                              onValueChange={(v) =>
                                setDraft(
                                  (d) =>
                                    d && {
                                      ...d,
                                      cleaningType:
                                        v === "none"
                                          ? undefined
                                          : (v as "CIP" | "Manual" | "None"),
                                    },
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-[12px]">
                                <SelectValue placeholder="— Not Set —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="none"
                                  className="text-[12px]"
                                >
                                  — Not Set —
                                </SelectItem>
                                <SelectItem value="CIP" className="text-[12px]">
                                  CIP (Clean-In-Place)
                                </SelectItem>
                                <SelectItem
                                  value="Manual"
                                  className="text-[12px]"
                                >
                                  Manual
                                </SelectItem>
                                <SelectItem
                                  value="None"
                                  className="text-[12px]"
                                >
                                  None
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-7 flex items-center">
                              <span className="text-[12px] text-foreground">
                                {currentNode.cleaningType ?? "—"}
                              </span>
                            </div>
                          )}
                        </FieldRow>
                        {/* Requires Cleaning — read-only badge */}
                        <FieldRow label="Requires Cleaning">
                          <div className="flex items-center gap-2 h-7">
                            {currentNode.requiresCleaning === true ? (
                              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                                Required
                              </span>
                            ) : currentNode.requiresCleaning === false ? (
                              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200">
                                Not Required
                              </span>
                            ) : (
                              <span className="text-[12px] text-muted-foreground">
                                Not Set
                              </span>
                            )}
                          </div>
                        </FieldRow>
                      </>
                    ) : currentNode.entityType === "PropertyType" ? (
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
                    ) : isRoomNode(currentNode) ? (
                      <>
                        {/* ── Room Specification ────────────────────────── */}
                        <SectionHeader title="Room Specification" />
                        <FieldRow label="Room Type">
                          {editMode ? (
                            <Input
                              value={draft?.roomType ?? ""}
                              onChange={(e) =>
                                setDraft(
                                  (d) =>
                                    d && { ...d, roomType: e.target.value },
                                )
                              }
                              className="h-7 text-[12px]"
                              placeholder="e.g. Solid Dosage, Coating"
                            />
                          ) : (
                            <div className="h-7 flex items-center">
                              <span className="text-[12px] text-foreground">
                                {currentNode.roomType ?? "—"}
                              </span>
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow label="Clean Room Class">
                          {editMode ? (
                            <Input
                              value={draft?.roomCleanRoomClass ?? ""}
                              onChange={(e) =>
                                setDraft(
                                  (d) =>
                                    d && {
                                      ...d,
                                      roomCleanRoomClass: e.target.value,
                                    },
                                )
                              }
                              className="h-7 text-[12px]"
                              placeholder="e.g. ISO 7, ISO 8, Grade B"
                            />
                          ) : (
                            <div className="h-7 flex items-center">
                              <span className="text-[12px] text-foreground">
                                {currentNode.roomCleanRoomClass ?? "—"}
                              </span>
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow label="Cleaning Type">
                          {editMode ? (
                            <Select
                              value={draft?.roomCleaningType ?? "none"}
                              onValueChange={(v) =>
                                setDraft(
                                  (d) =>
                                    d && {
                                      ...d,
                                      roomCleaningType:
                                        v === "none"
                                          ? undefined
                                          : (v as
                                              | "CIP"
                                              | "Manual"
                                              | "Fogging"
                                              | "None"),
                                    },
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-[12px]">
                                <SelectValue placeholder="— Not Set —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="none"
                                  className="text-[12px]"
                                >
                                  — Not Set —
                                </SelectItem>
                                <SelectItem value="CIP" className="text-[12px]">
                                  CIP (Clean-In-Place)
                                </SelectItem>
                                <SelectItem
                                  value="Manual"
                                  className="text-[12px]"
                                >
                                  Manual
                                </SelectItem>
                                <SelectItem
                                  value="Fogging"
                                  className="text-[12px]"
                                >
                                  Fogging (H₂O₂ / VHP)
                                </SelectItem>
                                <SelectItem
                                  value="None"
                                  className="text-[12px]"
                                >
                                  None
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-7 flex items-center">
                              <span className="text-[12px] text-foreground">
                                {currentNode.roomCleaningType ?? "—"}
                              </span>
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow label="Requires Cleaning">
                          {editMode ? (
                            <Select
                              value={
                                draft?.roomRequiresCleaning === true
                                  ? "yes"
                                  : draft?.roomRequiresCleaning === false
                                    ? "no"
                                    : "unset"
                              }
                              onValueChange={(v) =>
                                setDraft(
                                  (d) =>
                                    d && {
                                      ...d,
                                      roomRequiresCleaning:
                                        v === "yes"
                                          ? true
                                          : v === "no"
                                            ? false
                                            : undefined,
                                    },
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-[12px]">
                                <SelectValue placeholder="— Not Set —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="unset"
                                  className="text-[12px]"
                                >
                                  — Not Set —
                                </SelectItem>
                                <SelectItem value="yes" className="text-[12px]">
                                  Yes
                                </SelectItem>
                                <SelectItem value="no" className="text-[12px]">
                                  No
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-7 flex items-center">
                              {currentNode.roomRequiresCleaning === true ? (
                                <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                                  Required
                                </span>
                              ) : currentNode.roomRequiresCleaning === false ? (
                                <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200">
                                  Not Required
                                </span>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">
                                  Not Set
                                </span>
                              )}
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow label="Cleaning Frequency">
                          {editMode ? (
                            <Input
                              value={draft?.roomCleaningFrequency ?? ""}
                              onChange={(e) =>
                                setDraft(
                                  (d) =>
                                    d && {
                                      ...d,
                                      roomCleaningFrequency: e.target.value,
                                    },
                                )
                              }
                              className="h-7 text-[12px]"
                              placeholder="e.g. After each batch, Weekly"
                            />
                          ) : (
                            <div className="h-7 flex items-center">
                              <span className="text-[12px] text-foreground">
                                {currentNode.roomCleaningFrequency ?? "—"}
                              </span>
                            </div>
                          )}
                        </FieldRow>

                        {/* ── Room Cleaning Check ───────────────────────── */}
                        <div className="mt-5">
                          <SectionHeader title="Cleaning Check" />
                        </div>
                        {/* Cleaning Status Badge */}
                        <FieldRow label="Cleaning Status">
                          <div className="h-7 flex items-center gap-2">
                            {(() => {
                              const cs = currentNode.roomCleaningStatus;
                              if (!cs)
                                return (
                                  <span className="text-[12px] text-muted-foreground">
                                    Not Set
                                  </span>
                                );
                              const styles: Record<string, string> = {
                                Clean:
                                  "bg-green-50 text-green-700 border-green-200",
                                Required:
                                  "bg-amber-50 text-amber-700 border-amber-200",
                                Overdue:
                                  "bg-red-50 text-red-700 border-red-200",
                              };
                              const icons: Record<string, string> = {
                                Clean: "✓",
                                Required: "⚠",
                                Overdue: "✗",
                              };
                              return (
                                <span
                                  className={cn(
                                    "text-[12px] font-semibold px-2.5 py-0.5 rounded border",
                                    styles[cs] ??
                                      "bg-muted text-muted-foreground border-border",
                                  )}
                                >
                                  {icons[cs] ?? ""} {cs}
                                </span>
                              );
                            })()}
                          </div>
                        </FieldRow>
                        <FieldRow label="Last Cleaned At">
                          <div className="h-7 flex items-center">
                            <span className="text-[12px] text-foreground font-mono">
                              {currentNode.roomLastCleanedAt
                                ? new Date(
                                    currentNode.roomLastCleanedAt,
                                  ).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </FieldRow>
                        <FieldRow label="Cleaning Valid Till">
                          <div className="h-7 flex items-center gap-2">
                            <span className="text-[12px] text-foreground font-mono">
                              {currentNode.roomCleaningValidTill
                                ? new Date(
                                    currentNode.roomCleaningValidTill,
                                  ).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </span>
                            {currentNode.roomCleaningValidTill &&
                              (() => {
                                const now = new Date();
                                const validTill = new Date(
                                  currentNode.roomCleaningValidTill!,
                                );
                                const daysLeft = Math.ceil(
                                  (validTill.getTime() - now.getTime()) /
                                    (1000 * 60 * 60 * 24),
                                );
                                if (daysLeft < 0)
                                  return (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                                      EXPIRED
                                    </span>
                                  );
                                if (daysLeft <= 7)
                                  return (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                                      {daysLeft}d left
                                    </span>
                                  );
                                return (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                                    {daysLeft}d left
                                  </span>
                                );
                              })()}
                          </div>
                        </FieldRow>
                        <FieldRow label="Last Product Used">
                          <div className="h-7 flex items-center">
                            <span className="text-[12px] text-foreground">
                              {currentNode.roomLastProduct ?? "—"}
                            </span>
                          </div>
                        </FieldRow>
                        <FieldRow label="Cleaning Level">
                          <div className="h-7 flex items-center">
                            {(() => {
                              const cl = currentNode.roomCleaningLevel;
                              if (!cl)
                                return (
                                  <span className="text-[12px] text-muted-foreground">
                                    Not Set
                                  </span>
                                );
                              const styles: Record<string, string> = {
                                None: "bg-gray-50 text-gray-500 border-gray-200",
                                Minor:
                                  "bg-blue-50 text-blue-700 border-blue-200",
                                Major:
                                  "bg-purple-50 text-purple-700 border-purple-200",
                              };
                              return (
                                <span
                                  className={cn(
                                    "text-[12px] font-semibold px-2.5 py-0.5 rounded border",
                                    styles[cl] ??
                                      "bg-muted text-muted-foreground border-border",
                                  )}
                                >
                                  {cl}
                                </span>
                              );
                            })()}
                          </div>
                        </FieldRow>
                        {/* Cleaning Required banner if status is not Clean */}
                        {currentNode.roomCleaningStatus &&
                          currentNode.roomCleaningStatus !== "Clean" && (
                            <div
                              className={cn(
                                "mt-4 flex items-start gap-2 p-3 rounded-lg border text-[12px]",
                                currentNode.roomCleaningStatus === "Overdue"
                                  ? "bg-red-50 border-red-200 text-red-800"
                                  : "bg-amber-50 border-amber-200 text-amber-800",
                              )}
                            >
                              <AlertTriangle
                                size={14}
                                className="shrink-0 mt-0.5"
                              />
                              <span>
                                {currentNode.roomCleaningStatus === "Overdue"
                                  ? "Room cleaning is overdue. Execution is blocked until cleaning is completed and status is updated."
                                  : "Room cleaning is required before the next batch execution. Schedule cleaning with the facility team."}
                              </span>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <span className="text-[11px] uppercase tracking-widest font-semibold mb-2">
                          {ENTITY_TYPE_LABELS[currentNode.entityType]}
                        </span>
                        <p className="text-[12px]">
                          No simplified specification data for this entity type.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ENGINEERING TAB */}
                  <TabsContent
                    value="engineering"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    {isEquipmentNode(currentNode) ? (
                      <>
                        <SectionHeader title="Equipment Hierarchy & Type" />
                        <FieldRow label="Equipment Type">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.equipmentType
                                : currentNode.equipmentType) ?? "none"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    equipmentType:
                                      v === "none"
                                        ? undefined
                                        : (v as "Fixed" | "Moveable"),
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue placeholder="— Not Set —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-[12px]">
                                — Not Set —
                              </SelectItem>
                              <SelectItem value="Fixed" className="text-[12px]">
                                Fixed
                              </SelectItem>
                              <SelectItem
                                value="Moveable"
                                className="text-[12px]"
                              >
                                Moveable
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Room">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode ? draft?.roomId : currentNode.roomId) ??
                              "none"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    roomId: v === "none" ? undefined : v,
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue placeholder="— Not Set —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-[12px]">
                                — Not Set —
                              </SelectItem>
                              {getAllRooms().map((room) => (
                                <SelectItem
                                  key={room.id}
                                  value={room.id}
                                  className="text-[12px]"
                                >
                                  {room.name} ({room.identifier})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Station">
                          <Select
                            disabled={!editMode}
                            value={
                              (editMode
                                ? draft?.stationId
                                : currentNode.stationId) ?? "none"
                            }
                            onValueChange={(v) =>
                              setDraft(
                                (d) =>
                                  d && {
                                    ...d,
                                    stationId: v === "none" ? undefined : v,
                                    subStationId: undefined,
                                  },
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-[12px]">
                              <SelectValue placeholder="— Not Set —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-[12px]">
                                — Not Set —
                              </SelectItem>
                              {nodes
                                .filter((n) => n.entityType === "Station")
                                .map((sta) => (
                                  <SelectItem
                                    key={sta.id}
                                    value={sta.id}
                                    className="text-[12px]"
                                  >
                                    {sta.shortDescription} ({sta.identifier})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        {(() => {
                          const currentStationId = editMode
                            ? draft?.stationId
                            : currentNode.stationId;
                          const subStations = nodes.filter(
                            (n) =>
                              n.entityType === "SubStation" &&
                              n.parentId === currentStationId,
                          );
                          return (
                            <FieldRow label="Sub-Station">
                              <Select
                                disabled={!editMode || !currentStationId}
                                value={
                                  (editMode
                                    ? draft?.subStationId
                                    : currentNode.subStationId) ?? "none"
                                }
                                onValueChange={(v) =>
                                  setDraft(
                                    (d) =>
                                      d && {
                                        ...d,
                                        subStationId:
                                          v === "none" ? undefined : v,
                                      },
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-[12px]">
                                  <SelectValue
                                    placeholder={
                                      currentStationId
                                        ? "— Not Set —"
                                        : "Select Station first"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="none"
                                    className="text-[12px]"
                                  >
                                    — Not Set —
                                  </SelectItem>
                                  {subStations.map((ss) => (
                                    <SelectItem
                                      key={ss.id}
                                      value={ss.id}
                                      className="text-[12px]"
                                    >
                                      {ss.shortDescription} ({ss.identifier})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FieldRow>
                          );
                        })()}
                        {/* Hierarchy path display */}
                        {(() => {
                          const roomId = editMode
                            ? draft?.roomId
                            : currentNode.roomId;
                          const stationId = editMode
                            ? draft?.stationId
                            : currentNode.stationId;
                          const subStId = editMode
                            ? draft?.subStationId
                            : currentNode.subStationId;
                          const roomName = roomId
                            ? getAllRooms().find((r) => r.id === roomId)?.name
                            : null;
                          const stationName = stationId
                            ? nodes.find((n) => n.id === stationId)
                                ?.shortDescription
                            : null;
                          const subStName = subStId
                            ? nodes.find((n) => n.id === subStId)
                                ?.shortDescription
                            : null;
                          const parts = [
                            roomName,
                            stationName,
                            subStName,
                          ].filter(Boolean);
                          if (!parts.length) return null;
                          return (
                            <div className="mt-1 mb-2 px-2 py-1.5 bg-muted/40 rounded text-[11px] text-muted-foreground font-mono">
                              📍 {parts.join(" → ")}
                            </div>
                          );
                        })()}

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
                        {!editMode && isEquipmentNode(currentNode) && (
                          <div className="mt-3 flex">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-[12px] text-teal-700 border-teal-300 hover:bg-teal-50"
                              onClick={() => {
                                setPerformCleaningReason("");
                                setPerformCleaningDialogOpen(true);
                              }}
                              data-ocid="data_manager.spec_perform_cleaning_button"
                            >
                              <Sparkles size={13} /> Perform Cleaning
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <p className="text-[12px]">
                          No engineering data for this entity type.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* CONTEXT TAB — Equipment only */}
                  {isEquipmentNode(currentNode) && (
                    <TabsContent
                      value="context"
                      className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                    >
                      {(() => {
                        const hasCurrentBatch = !!currentNode.currentBatchId;
                        const hasPreviousData = !!(
                          currentNode.lastBatch ||
                          currentNode.lastExecutionDate ||
                          currentNode.lastProductUsed
                        );
                        return (
                          <div className="space-y-4">
                            {/* Current Execution */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <span
                                  className={cn(
                                    "inline-block w-2 h-2 rounded-full",
                                    hasCurrentBatch
                                      ? "bg-green-500 animate-pulse"
                                      : "bg-gray-300",
                                  )}
                                />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Current Execution
                                </span>
                              </div>
                              {hasCurrentBatch ? (
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="p-3 rounded-lg border border-border bg-teal-50/60">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Product Code
                                    </p>
                                    <p className="text-[13px] font-semibold text-foreground font-mono">
                                      {currentNode.lastProductUsed ?? "—"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg border border-border bg-teal-50/60">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Batch ID
                                    </p>
                                    <p className="text-[13px] font-semibold text-foreground font-mono">
                                      {currentNode.currentBatchId}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg border border-border bg-teal-50/60">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Status
                                    </p>
                                    <span
                                      className={cn(
                                        "text-[12px] font-semibold px-2.5 py-0.5 rounded border",
                                        currentNode.currentBatchStatus ===
                                          "In Process" &&
                                          "bg-blue-50 text-blue-700 border-blue-200",
                                        currentNode.currentBatchStatus ===
                                          "Released" &&
                                          "bg-amber-50 text-amber-700 border-amber-200",
                                        currentNode.currentBatchStatus ===
                                          "Completed" &&
                                          "bg-green-50 text-green-700 border-green-200",
                                        ![
                                          "In Process",
                                          "Released",
                                          "Completed",
                                        ].includes(
                                          currentNode.currentBatchStatus ?? "",
                                        ) &&
                                          "bg-gray-50 text-gray-600 border-gray-200",
                                      )}
                                    >
                                      {currentNode.currentBatchStatus}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-[12px] text-muted-foreground bg-muted/30 rounded-lg border border-border">
                                  No active execution
                                </div>
                              )}
                            </div>

                            {/* Previous Execution */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Previous Execution
                                </span>
                              </div>
                              {hasPreviousData ? (
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Last Product
                                    </p>
                                    <p className="text-[13px] font-semibold text-foreground font-mono">
                                      {currentNode.lastProductUsed ?? "—"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Last Batch
                                    </p>
                                    <p className="text-[13px] font-semibold text-foreground font-mono">
                                      {currentNode.lastBatch ?? "—"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Last Execution Date
                                    </p>
                                    <p className="text-[13px] font-semibold text-foreground">
                                      {currentNode.lastExecutionDate
                                        ? new Date(
                                            currentNode.lastExecutionDate,
                                          ).toLocaleDateString("en-GB", {
                                            year: "numeric",
                                            month: "short",
                                            day: "2-digit",
                                          })
                                        : "—"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-[12px] text-muted-foreground bg-muted/30 rounded-lg border border-border">
                                  No previous execution data
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </TabsContent>
                  )}

                  {/* LOGBOOK TAB */}
                  <TabsContent
                    value="logbook"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    {isEquipmentNode(currentNode) ? (
                      <>
                        {/* Equipment logbook — MES action timeline */}
                        <SectionHeader title="Equipment Logbook" />
                        {/* Entry count summary */}
                        {currentNode.logbookEntries &&
                          currentNode.logbookEntries.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-3 mt-1">
                              {(
                                [
                                  "Execution Start",
                                  "Execution Stop",
                                  "Cleaning",
                                  "Pause",
                                  "Resume",
                                  "Status Change",
                                  "Unbind",
                                ] as EquipmentLogbookAction[]
                              ).map((action) => {
                                const count =
                                  currentNode.logbookEntries!.filter(
                                    (e) => e.action === action,
                                  ).length;
                                if (count === 0) return null;
                                return (
                                  <span
                                    key={action}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground"
                                  >
                                    {action}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        {!currentNode.logbookEntries ||
                        currentNode.logbookEntries.length === 0 ? (
                          <div
                            className="text-[12px] text-muted-foreground py-6 text-center"
                            data-ocid="data_manager.logbook.empty_state"
                          >
                            No logbook entries recorded.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...currentNode.logbookEntries]
                              .reverse()
                              .map((entry: LogbookEntry, idx: number) => {
                                const actionConfig: Record<
                                  EquipmentLogbookAction,
                                  {
                                    bg: string;
                                    border: string;
                                    badge: string;
                                    icon: React.ReactNode;
                                  }
                                > = {
                                  "Execution Start": {
                                    bg: "bg-teal-50",
                                    border: "border-l-teal-500",
                                    badge:
                                      "bg-teal-100 text-teal-700 border-teal-200",
                                    icon: (
                                      <PlayCircle
                                        size={14}
                                        className="text-teal-600 shrink-0"
                                      />
                                    ),
                                  },
                                  "Execution Stop": {
                                    bg: "bg-violet-50",
                                    border: "border-l-violet-400",
                                    badge:
                                      "bg-violet-100 text-violet-700 border-violet-200",
                                    icon: (
                                      <StopCircle
                                        size={14}
                                        className="text-violet-600 shrink-0"
                                      />
                                    ),
                                  },
                                  Cleaning: {
                                    bg: "bg-blue-50",
                                    border: "border-l-blue-400",
                                    badge:
                                      "bg-blue-100 text-blue-700 border-blue-200",
                                    icon: (
                                      <Sparkles
                                        size={14}
                                        className="text-blue-600 shrink-0"
                                      />
                                    ),
                                  },
                                  Pause: {
                                    bg: "bg-amber-50",
                                    border: "border-l-amber-400",
                                    badge:
                                      "bg-amber-100 text-amber-700 border-amber-200",
                                    icon: (
                                      <PauseCircle
                                        size={14}
                                        className="text-amber-600 shrink-0"
                                      />
                                    ),
                                  },
                                  Resume: {
                                    bg: "bg-green-50",
                                    border: "border-l-green-400",
                                    badge:
                                      "bg-green-100 text-green-700 border-green-200",
                                    icon: (
                                      <PlayCircle
                                        size={14}
                                        className="text-green-600 shrink-0"
                                      />
                                    ),
                                  },
                                  "Status Change": {
                                    bg: "bg-slate-50",
                                    border: "border-l-slate-400",
                                    badge:
                                      "bg-slate-100 text-slate-700 border-slate-200",
                                    icon: (
                                      <History
                                        size={14}
                                        className="text-slate-600 shrink-0"
                                      />
                                    ),
                                  },
                                  Unbind: {
                                    bg: "bg-orange-50",
                                    border: "border-l-orange-500",
                                    badge:
                                      "bg-orange-100 text-orange-700 border-orange-200",
                                    icon: (
                                      <Unlink
                                        size={14}
                                        className="text-orange-600 shrink-0"
                                      />
                                    ),
                                  },
                                };
                                const config = actionConfig[
                                  entry.action as EquipmentLogbookAction
                                ] ?? {
                                  bg: "bg-muted/30",
                                  border: "border-l-border",
                                  badge:
                                    "bg-muted text-muted-foreground border-border",
                                  icon: (
                                    <Clock
                                      size={14}
                                      className="text-muted-foreground shrink-0"
                                    />
                                  ),
                                };
                                return (
                                  <div
                                    key={entry.id}
                                    className={cn(
                                      "border-l-4 rounded-r-lg p-3",
                                      config.bg,
                                      config.border,
                                    )}
                                    data-ocid={`data_manager.logbook.item.${idx + 1}`}
                                  >
                                    {/* Row 1: icon + action badge + timestamp + user */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {config.icon}
                                      <span
                                        className={cn(
                                          "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border",
                                          config.badge,
                                        )}
                                      >
                                        {entry.action}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-mono">
                                        {new Date(
                                          entry.timestamp,
                                        ).toLocaleString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                                        {entry.user}
                                      </span>
                                    </div>
                                    {/* Row 2: reason */}
                                    <p className="text-[12px] text-foreground mt-1.5">
                                      {entry.reason}
                                    </p>
                                    {/* Row 3: statusChange (if present) */}
                                    {entry.statusChange && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          Status:
                                        </span>
                                        <span className="text-[11px] font-mono font-medium text-foreground">
                                          {entry.statusChange}
                                        </span>
                                      </div>
                                    )}
                                    {/* Row 4: details (if present) */}
                                    {entry.details && (
                                      <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                        {entry.details}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    ) : isRoomNode(currentNode) ? (
                      <>
                        {/* Room logbook — same rich timeline as Equipment */}
                        <SectionHeader title="Room Logbook" />
                        {/* Entry count summary */}
                        {currentNode.logbookEntries &&
                          currentNode.logbookEntries.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-3 mt-1">
                              {(
                                [
                                  "Room Cleaning",
                                  "Line Clearance",
                                  "Area Status Change",
                                  "Unbind",
                                ] as RoomLogbookAction[]
                              ).map((action) => {
                                const count =
                                  currentNode.logbookEntries!.filter(
                                    (e) => e.action === action,
                                  ).length;
                                if (count === 0) return null;
                                return (
                                  <span
                                    key={action}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground"
                                  >
                                    {action}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        {!currentNode.logbookEntries ||
                        currentNode.logbookEntries.length === 0 ? (
                          <div
                            className="text-[12px] text-muted-foreground py-6 text-center"
                            data-ocid="data_manager.logbook.empty_state"
                          >
                            No logbook entries recorded.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...currentNode.logbookEntries]
                              .reverse()
                              .map((entry: LogbookEntry, idx: number) => {
                                const roomActionConfig: Record<
                                  RoomLogbookAction,
                                  {
                                    bg: string;
                                    border: string;
                                    badge: string;
                                    icon: React.ReactNode;
                                  }
                                > = {
                                  "Room Cleaning": {
                                    bg: "bg-blue-50",
                                    border: "border-l-blue-400",
                                    badge:
                                      "bg-blue-100 text-blue-700 border-blue-200",
                                    icon: (
                                      <Sparkles
                                        size={14}
                                        className="text-blue-600 shrink-0"
                                      />
                                    ),
                                  },
                                  "Line Clearance": {
                                    bg: "bg-teal-50",
                                    border: "border-l-teal-500",
                                    badge:
                                      "bg-teal-100 text-teal-700 border-teal-200",
                                    icon: (
                                      <ClipboardList
                                        size={14}
                                        className="text-teal-600 shrink-0"
                                      />
                                    ),
                                  },
                                  "Area Status Change": {
                                    bg: "bg-amber-50",
                                    border: "border-l-amber-400",
                                    badge:
                                      "bg-amber-100 text-amber-700 border-amber-200",
                                    icon: (
                                      <History
                                        size={14}
                                        className="text-amber-600 shrink-0"
                                      />
                                    ),
                                  },
                                  Unbind: {
                                    bg: "bg-orange-50",
                                    border: "border-l-orange-500",
                                    badge:
                                      "bg-orange-100 text-orange-700 border-orange-200",
                                    icon: (
                                      <Unlink
                                        size={14}
                                        className="text-orange-600 shrink-0"
                                      />
                                    ),
                                  },
                                };
                                const config = roomActionConfig[
                                  entry.action as RoomLogbookAction
                                ] ?? {
                                  bg: "bg-muted/30",
                                  border: "border-l-border",
                                  badge:
                                    "bg-muted text-muted-foreground border-border",
                                  icon: (
                                    <Clock
                                      size={14}
                                      className="text-muted-foreground shrink-0"
                                    />
                                  ),
                                };
                                return (
                                  <div
                                    key={entry.id}
                                    className={cn(
                                      "border-l-4 rounded-r-lg p-3",
                                      config.bg,
                                      config.border,
                                    )}
                                    data-ocid={`data_manager.logbook.item.${idx + 1}`}
                                  >
                                    {/* Row 1: icon + action badge + timestamp + user */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {config.icon}
                                      <span
                                        className={cn(
                                          "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border",
                                          config.badge,
                                        )}
                                      >
                                        {entry.action}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-mono">
                                        {new Date(
                                          entry.timestamp,
                                        ).toLocaleString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                                        {entry.user}
                                      </span>
                                    </div>
                                    {/* Row 2: reason */}
                                    <p className="text-[12px] text-foreground mt-1.5">
                                      {entry.reason}
                                    </p>
                                    {/* Row 3: statusChange (if present) */}
                                    {entry.statusChange && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          Status:
                                        </span>
                                        <span className="text-[11px] font-mono font-medium text-foreground">
                                          {entry.statusChange}
                                        </span>
                                      </div>
                                    )}
                                    {/* Row 4: entityIdentifier (if present) */}
                                    {entry.entityIdentifier && (
                                      <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                        {entry.entityType}:{" "}
                                        {entry.entityIdentifier}
                                      </p>
                                    )}
                                    {/* Row 5: details (if present) */}
                                    {entry.details && (
                                      <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                        {entry.details}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Other entity types: show change history */
                      <>
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
                                      {new Date(
                                        entry.timestamp,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* STATUS HISTORY TAB */}
                  <TabsContent
                    value="status_history"
                    className="flex-1 overflow-auto px-5 pb-5 mt-3 max-h-[calc(100vh-220px)]"
                  >
                    <SectionHeader title="Status History" />
                    {!currentNode.statusHistory ||
                    currentNode.statusHistory.length === 0 ? (
                      <div
                        className="text-[12px] text-muted-foreground py-6 text-center"
                        data-ocid="data_manager.status_history.empty_state"
                      >
                        No status changes recorded.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px] h-7">
                              Timestamp
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              From
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              To
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              Changed By
                            </TableHead>
                            <TableHead className="text-[11px] h-7">
                              Reason
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...(currentNode.statusHistory ?? [])]
                            .reverse()
                            .map((entry: StatusHistoryEntry, idx: number) => (
                              <TableRow
                                key={entry.timestamp + entry.fromStatus}
                                data-ocid={`data_manager.status_history.item.${idx + 1}`}
                              >
                                <TableCell className="text-[11px] py-1.5 font-mono">
                                  {new Date(entry.timestamp).toLocaleString(
                                    "en-GB",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5">
                                  <span
                                    className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                                      entry.fromStatus === "Approved"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : entry.fromStatus === "Executed"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-gray-50 text-gray-600 border-gray-200",
                                    )}
                                  >
                                    {entry.fromStatus}
                                  </span>
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5">
                                  <span
                                    className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                                      entry.toStatus === "Approved"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : entry.toStatus === "Executed"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-gray-50 text-gray-600 border-gray-200",
                                    )}
                                  >
                                    {entry.toStatus}
                                  </span>
                                </TableCell>
                                <TableCell className="text-[11px] py-1.5">
                                  {entry.user}
                                </TableCell>
                                <TableCell
                                  className="text-[11px] py-1.5 text-muted-foreground italic max-w-[140px] truncate"
                                  title={entry.reason}
                                >
                                  {entry.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
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
                            <TableHead className="text-[11px] h-7">
                              Reason
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
                                <TableCell className="text-[11px] py-1.5 text-muted-foreground italic">
                                  {entry.reason ?? "—"}
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
      <Dialog
        open={newDialogOpen}
        onOpenChange={(open) => {
          setNewDialogOpen(open);
          if (!open) setNewFormErrors({});
        }}
      >
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
                <RequiredLabel
                  label="Parent"
                  required={isFieldRequired(
                    newNode.entityType as EntityType,
                    "parentId",
                  )}
                  className="text-[11.5px]"
                />
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
              <RequiredLabel
                label="Identifier"
                required={isFieldRequired(
                  newNode.entityType as EntityType,
                  "identifier",
                )}
                htmlFor="new-identifier"
                className="text-[11.5px]"
              />
              <Input
                id="new-identifier"
                value={newNode.identifier}
                onChange={(e) => {
                  const sanitized = sanitizeIdentifier(e.target.value);
                  setNewNode((n) => ({ ...n, identifier: sanitized }));
                  if (newFormErrors.identifier)
                    setNewFormErrors((fe) => ({ ...fe, identifier: "" }));
                  const fmtCheck = validateIdentifierFormat(sanitized);
                  setIdentifierFormatError(
                    fmtCheck.valid ? "" : fmtCheck.message,
                  );
                }}
                onBlur={() => {
                  const uniqCheck = validateIdentifierUniqueness(
                    newNode.identifier,
                    newNode.entityType as EntityType,
                    nodes,
                  );
                  if (!uniqCheck.unique) {
                    setNewFormErrors((fe) => ({
                      ...fe,
                      identifier: uniqCheck.message,
                    }));
                  }
                }}
                className={cn(
                  "h-8 text-[12px] font-mono",
                  (newFormErrors.identifier || identifierFormatError) &&
                    "border-destructive",
                )}
                placeholder={
                  IDENTIFIER_HINTS[newNode.entityType as EntityType]?.split(
                    ": ",
                  )[1] ?? "e.g. EQ-COAT-01"
                }
                data-ocid="data_manager.new_identifier.input"
              />
              {(newFormErrors.identifier || identifierFormatError) && (
                <p className="text-[11px] text-destructive mt-0.5">
                  {newFormErrors.identifier || identifierFormatError}
                </p>
              )}
              <p className="text-[10.5px] text-muted-foreground">
                {IDENTIFIER_HINTS[newNode.entityType as EntityType] ?? ""}
              </p>
            </div>
            <div className="space-y-1">
              <RequiredLabel
                label="Short Description"
                required={isFieldRequired(
                  newNode.entityType as EntityType,
                  "shortDescription",
                )}
                htmlFor="new-short-description"
                className="text-[11.5px]"
              />
              <Input
                id="new-short-description"
                value={newNode.shortDescription}
                onChange={(e) => {
                  setNewNode((n) => ({
                    ...n,
                    shortDescription: e.target.value,
                  }));
                  if (newFormErrors.shortDescription)
                    setNewFormErrors((fe) => ({ ...fe, shortDescription: "" }));
                }}
                className={cn(
                  "h-8 text-[12px]",
                  newFormErrors.shortDescription && "border-destructive",
                )}
                placeholder="e.g. Coater_XY"
                data-ocid="data_manager.new_short_description.input"
              />
              {newFormErrors.shortDescription && (
                <p
                  className="text-[11px] text-destructive"
                  data-ocid="data_manager.new_name_error"
                >
                  {newFormErrors.shortDescription}
                </p>
              )}
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
                <RequiredLabel
                  label="Manufacturer"
                  required={isFieldRequired(
                    newNode.entityType as EntityType,
                    "manufacturer",
                  )}
                  className="text-[11.5px]"
                />
                <Input
                  value={newNode.manufacturer}
                  onChange={(e) =>
                    setNewNode((n) => ({ ...n, manufacturer: e.target.value }))
                  }
                  className={cn(
                    "h-8 text-[12px]",
                    newFormErrors.manufacturer && "border-destructive",
                  )}
                />
                {newFormErrors.manufacturer && (
                  <p className="text-[11px] text-destructive mt-0.5">
                    {newFormErrors.manufacturer}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <RequiredLabel
                  label="Serial Number"
                  required={isFieldRequired(
                    newNode.entityType as EntityType,
                    "serialNumber",
                  )}
                  className="text-[11.5px]"
                />
                <Input
                  value={newNode.serialNumber}
                  onChange={(e) =>
                    setNewNode((n) => ({ ...n, serialNumber: e.target.value }))
                  }
                  className={cn(
                    "h-8 text-[12px]",
                    newFormErrors.serialNumber && "border-destructive",
                  )}
                />
                {newFormErrors.serialNumber && (
                  <p className="text-[11px] text-destructive mt-0.5">
                    {newFormErrors.serialNumber}
                  </p>
                )}
              </div>
            </div>
            {/* Hierarchy selectors — Equipment Entity & Class only */}
            {(newNode.entityType === "EquipmentEntity" ||
              newNode.entityType === "EquipmentClass") && (
              <div className="space-y-3 border-t pt-3 mt-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Location Hierarchy
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <RequiredLabel
                      label="Room"
                      required={isFieldRequired(
                        newNode.entityType as EntityType,
                        "roomId",
                      )}
                      className="text-[11.5px]"
                    />
                    <Select
                      value={newNode.roomId ?? "none"}
                      onValueChange={(v) =>
                        setNewNode((n) => ({
                          ...n,
                          roomId: v === "none" ? undefined : v,
                          stationId: undefined,
                          subStationId: undefined,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder="— Select Room —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[12px]">
                          — Not Set —
                        </SelectItem>
                        {getAllRooms().map((room) => (
                          <SelectItem
                            key={room.id}
                            value={room.id}
                            className="text-[12px]"
                          >
                            {room.name} ({room.identifier})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newFormErrors.roomId && (
                      <p className="text-[11px] text-destructive mt-0.5">
                        {newFormErrors.roomId}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <RequiredLabel
                      label="Station"
                      required={isFieldRequired(
                        newNode.entityType as EntityType,
                        "stationId",
                      )}
                      className="text-[11.5px]"
                    />
                    <Select
                      value={newNode.stationId ?? "none"}
                      onValueChange={(v) =>
                        setNewNode((n) => ({
                          ...n,
                          stationId: v === "none" ? undefined : v,
                          subStationId: undefined,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder="— Select Station —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[12px]">
                          — Not Set —
                        </SelectItem>
                        {nodes
                          .filter((n) => n.entityType === "Station")
                          .map((sta) => (
                            <SelectItem
                              key={sta.id}
                              value={sta.id}
                              className="text-[12px]"
                            >
                              {sta.shortDescription} ({sta.identifier})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newFormErrors.stationId && (
                      <p className="text-[11px] text-destructive mt-0.5">
                        {newFormErrors.stationId}
                      </p>
                    )}
                  </div>
                </div>
                {/* Sub-Station — filtered by selected station */}
                <div className="space-y-1">
                  <Label className="text-[11.5px]">
                    Sub-Station{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={newNode.subStationId ?? "none"}
                    disabled={!newNode.stationId}
                    onValueChange={(v) =>
                      setNewNode((n) => ({
                        ...n,
                        subStationId: v === "none" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue
                        placeholder={
                          newNode.stationId
                            ? "— Not Set —"
                            : "Select Station first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-[12px]">
                        — Not Set —
                      </SelectItem>
                      {nodes
                        .filter(
                          (n) =>
                            n.entityType === "SubStation" &&
                            n.parentId === newNode.stationId,
                        )
                        .map((ss) => (
                          <SelectItem
                            key={ss.id}
                            value={ss.id}
                            className="text-[12px]"
                          >
                            {ss.shortDescription} ({ss.identifier})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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

      {/* Save Confirmation Dialog */}
      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Save size={16} className="text-primary" /> Confirm Changes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
              <AlertTriangle
                size={14}
                className="shrink-0 mt-0.5 text-amber-600"
              />
              <span>Are you sure you want to modify this record?</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">
                Reason for Change{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                value={saveConfirmReason}
                onChange={(e) => setSaveConfirmReason(e.target.value)}
                placeholder="Reason for change (optional)"
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.save_reason.textarea"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveConfirmOpen(false)}
              data-ocid="data_manager.save_cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSave}
              className="gap-1"
              data-ocid="data_manager.save_confirm_button"
            >
              <Save size={13} /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GMP Validation Result Dialog */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Shield size={16} className="text-primary" /> GMP Validation
              Result
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto">
            {validateResult && (
              <>
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
              </>
            )}
            {/* Interlock engine results */}
            {interlockValidationResult && (
              <>
                <div className="h-px bg-border my-2" />
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <ClipboardList size={13} /> Interlock Engine Result
                </p>
                {interlockValidationResult.interlockResult.status ===
                  "BLOCKED" && (
                  <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
                    <p className="font-semibold mb-1.5">
                      Execution blocked due to:
                    </p>
                    <ul className="space-y-1">
                      {interlockValidationResult.interlockResult.interlocks
                        .filter((i) => i.type === "HARD")
                        .map((il) => (
                          <li
                            key={il.message}
                            className="flex items-start gap-2"
                          >
                            <XCircle
                              size={12}
                              className="shrink-0 mt-0.5 text-red-600"
                            />
                            <span>{il.message}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {interlockValidationResult.interlockResult.interlocks.filter(
                  (i) => i.type === "SOFT",
                ).length > 0 && (
                  <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                    <p className="font-semibold mb-1.5">
                      Soft interlocks (warnings):
                    </p>
                    <ul className="space-y-1">
                      {interlockValidationResult.interlockResult.interlocks
                        .filter((i) => i.type === "SOFT")
                        .map((il) => (
                          <li
                            key={il.message}
                            className="flex items-start gap-2"
                          >
                            <AlertTriangle
                              size={12}
                              className="shrink-0 mt-0.5 text-amber-600"
                            />
                            <span>{il.message}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {interlockValidationResult.interlockResult.status === "OK" && (
                  <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-[12px] text-green-700 font-medium">
                    <CheckCircle2 size={13} className="inline mr-1.5" />
                    All interlocks cleared
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            {/* Perform Cleaning button — shown when cleaning interlock present */}
            {interlockValidationResult?.interlockResult.interlocks.some(
              (i) => i.category === "CLEANING",
            ) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[12px] text-teal-700 border-teal-300 hover:bg-teal-50"
                onClick={() => {
                  setValidateDialogOpen(false);
                  toast.info(
                    "Navigate to the Cleaning tab to log a cleaning event",
                  );
                }}
                data-ocid="data_manager.perform_cleaning_button"
              >
                <ClipboardList size={13} /> Perform Cleaning
              </Button>
            )}
            {/* Override soft interlocks button */}
            {interlockValidationResult &&
              !interlockValidationResult.blocked &&
              interlockValidationResult.interlockResult.interlocks.some(
                (i) => i.type === "SOFT" && i.allowOverride,
              ) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[12px] text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => {
                    setOverrideReason("");
                    setOverrideReasonDialogOpen(true);
                  }}
                  data-ocid="data_manager.override_soft_interlocks_button"
                >
                  <AlertTriangle size={13} /> Override Soft Interlocks
                </Button>
              )}
            <Button
              size="sm"
              onClick={() => setValidateDialogOpen(false)}
              data-ocid="data_manager.validate_dialog.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make Draft Confirmation Dialog */}
      <Dialog
        open={makeDraftConfirmOpen}
        onOpenChange={setMakeDraftConfirmOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Convert to Draft?</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to convert this Approved record to Draft?
              This action will be logged in Change History.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMakeDraftConfirmOpen(false)}
              data-ocid="data_manager.make_draft_dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmMakeDraft}
              data-ocid="data_manager.make_draft_dialog.confirm_button"
            >
              <RotateCcw size={13} className="mr-1" /> Convert to Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Product Dialog */}
      <Dialog
        open={newProductDialogOpen}
        onOpenChange={setNewProductDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.new_product.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              New Product Master
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11.5px]">Product Code *</Label>
                <Input
                  value={newProduct.productCode}
                  onChange={(e) =>
                    setNewProduct((n) => ({
                      ...n,
                      productCode: e.target.value,
                    }))
                  }
                  placeholder="e.g. PRD-ABC-001"
                  className="h-8 text-[12px] font-mono"
                  data-ocid="data_manager.new_product_code.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px]">Status</Label>
                <Select
                  value={newProduct.status}
                  onValueChange={(v) =>
                    setNewProduct((n) => ({
                      ...n,
                      status: v as "Draft" | "Approved" | "Executed",
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft" className="text-[12px]">
                      Draft
                    </SelectItem>
                    <SelectItem value="Approved" className="text-[12px]">
                      Approved
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Product Name *</Label>
              <Input
                value={newProduct.productName}
                onChange={(e) =>
                  setNewProduct((n) => ({ ...n, productName: e.target.value }))
                }
                placeholder="Full product name"
                className="h-8 text-[12px]"
                data-ocid="data_manager.new_product_name.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Description</Label>
              <Textarea
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct((n) => ({ ...n, description: e.target.value }))
                }
                className="text-[12px] min-h-[60px] resize-none"
                data-ocid="data_manager.new_product_description.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11.5px]">
                  Campaign Length (batches)
                </Label>
                <Input
                  type="number"
                  value={newProduct.campaignLength}
                  onChange={(e) =>
                    setNewProduct((n) => ({
                      ...n,
                      campaignLength: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-[12px]"
                  min={1}
                  data-ocid="data_manager.new_product_campaign.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px]">DETH (hours)</Label>
                <Input
                  type="number"
                  value={newProduct.dethTime}
                  onChange={(e) =>
                    setNewProduct((n) => ({
                      ...n,
                      dethTime: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-[12px]"
                  min={1}
                  data-ocid="data_manager.new_product_deth.input"
                />
              </div>
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewProductDialogOpen(false)}
              data-ocid="data_manager.new_product.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProduct}
              disabled={!newProduct.productCode || !newProduct.productName}
              data-ocid="data_manager.new_product.submit_button"
            >
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Save Confirm Dialog */}
      <Dialog
        open={productSaveConfirmOpen}
        onOpenChange={setProductSaveConfirmOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Save size={16} className="text-primary" /> Confirm Product
              Changes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
              <AlertTriangle
                size={14}
                className="shrink-0 mt-0.5 text-amber-600"
              />
              <span>Are you sure you want to modify this product record?</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">
                Reason for Change{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                value={productSaveReason}
                onChange={(e) => setProductSaveReason(e.target.value)}
                placeholder="Reason for change (optional)"
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.product_save_reason.textarea"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProductSaveConfirmOpen(false)}
              data-ocid="data_manager.product_save.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmProductSave}
              className="gap-1"
              data-ocid="data_manager.product_save.confirm_button"
            >
              <Save size={13} /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Confirmation Dialog */}
      <Dialog open={executeConfirmOpen} onOpenChange={setExecuteConfirmOpen}>
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.execute.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-blue-700">
              <CheckCircle2 size={16} className="text-blue-600" /> Confirm
              Execution
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to execute this record? This will transition
              it to
              <strong> Executed</strong> status — a permanent, terminal state.
              No further modifications will be permitted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-800 my-2">
            <Shield size={14} className="shrink-0 mt-0.5 text-blue-600" />
            <span>
              <strong>GMP Notice:</strong> Executed records are permanently
              locked per 21 CFR Part 11 compliance. This action is logged in the
              Change History audit trail.
            </span>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExecuteConfirmOpen(false)}
              data-ocid="data_manager.execute.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              onClick={handleConfirmExecute}
              data-ocid="data_manager.execute.confirm_button"
            >
              <CheckCircle2 size={13} /> Confirm Execution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Reason Dialog */}
      <Dialog
        open={approveReasonDialogOpen}
        onOpenChange={setApproveReasonDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.approve_reason.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Shield size={15} className="text-green-600" /> Approve Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-800">
              <CheckCircle2
                size={13}
                className="shrink-0 mt-0.5 text-green-600"
              />
              <span>
                Approving this record will make it <strong>read-only</strong>{" "}
                and eligible for batch execution.
              </span>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel
                label="Reason for Approval"
                required
                htmlFor="approve-reason"
                className="text-[12px]"
              />
              <Textarea
                id="approve-reason"
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="Enter reason for approving this record..."
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.approve_reason.textarea"
              />
              {approveReason.trim() === "" && (
                <p className="text-[11px] text-muted-foreground">
                  Reason is mandatory for GMP compliance.
                </p>
              )}
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveReasonDialogOpen(false)}
              data-ocid="data_manager.approve_reason.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmApprove}
              disabled={!approveReason.trim()}
              data-ocid="data_manager.approve_reason.confirm_button"
            >
              <CheckCircle2 size={13} /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reason Dialog */}
      <Dialog
        open={deleteReasonDialogOpen}
        onOpenChange={setDeleteReasonDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.delete_reason.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-destructive">
              <Trash2 size={15} className="text-destructive" /> Delete Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">
              <AlertTriangle
                size={13}
                className="shrink-0 mt-0.5 text-red-600"
              />
              <span>
                This action <strong>cannot be undone</strong>. The record will
                be permanently removed.
              </span>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel
                label="Reason for Deletion"
                required
                htmlFor="delete-reason"
                className="text-[12px]"
              />
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deleting this record..."
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.delete_reason.textarea"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteReasonDialogOpen(false)}
              data-ocid="data_manager.delete_reason.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              onClick={handleConfirmDelete}
              disabled={!deleteReason.trim()}
              data-ocid="data_manager.delete_reason.confirm_button"
            >
              <Trash2 size={13} /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy as Draft Dialog */}
      <Dialog open={copyDraftDialogOpen} onOpenChange={setCopyDraftDialogOpen}>
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.copy_draft.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Copy size={15} className="text-indigo-600" /> Copy as Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[12px] text-indigo-800">
              <Copy size={13} className="shrink-0 mt-0.5 text-indigo-600" />
              <span>
                A new <strong>Draft</strong> record will be created with a new
                identifier. Configuration fields will be copied. Approval and
                cleaning data will be reset.
              </span>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel
                label="Reason for Copy"
                required
                htmlFor="copy-draft-reason"
                className="text-[12px]"
              />
              <Textarea
                id="copy-draft-reason"
                value={copyDraftReason}
                onChange={(e) => setCopyDraftReason(e.target.value)}
                placeholder="e.g. Creating variant for new product campaign..."
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.copy_draft_reason.textarea"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCopyDraftDialogOpen(false)}
              data-ocid="data_manager.copy_draft.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleConfirmCopyAsDraft}
              disabled={!copyDraftReason.trim()}
              data-ocid="data_manager.copy_draft.confirm_button"
            >
              <Copy size={13} /> Create Draft Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unbind from Batch Dialog */}
      <Dialog open={unbindDialogOpen} onOpenChange={setUnbindDialogOpen}>
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.unbind.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Unlink size={15} className="text-orange-600" /> Unbind from Batch
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Release this entity from its current batch assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Batch info */}
            {currentNode?.currentBatchId && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-[12px] text-orange-800">
                <AlertTriangle
                  size={13}
                  className="shrink-0 mt-0.5 text-orange-600"
                />
                <span>
                  This entity is currently bound to batch{" "}
                  <strong>{currentNode.currentBatchId}</strong> (
                  {currentNode.currentBatchStatus ?? "Unknown status"}).
                </span>
              </div>
            )}
            {/* Active batch warning */}
            {currentNode?.currentBatchId &&
              isBatchActive(currentNode.currentBatchStatus) && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">
                  <AlertTriangle
                    size={13}
                    className="shrink-0 mt-0.5 text-red-600"
                  />
                  <span>
                    <strong>Batch is active.</strong> Supervisor override is
                    required to unbind during active execution.
                  </span>
                </div>
              )}
            {/* Reason input */}
            <div className="space-y-1.5">
              <RequiredLabel
                label="Reason for Unbind"
                required
                htmlFor="unbind-reason"
                className="text-[12px]"
              />
              <Textarea
                id="unbind-reason"
                value={unbindReason}
                onChange={(e) => setUnbindReason(e.target.value)}
                placeholder="e.g. Batch completed, releasing equipment for next campaign..."
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.unbind.reason_textarea"
              />
            </div>
            {/* Override checkbox — only shown when batch is active */}
            {currentNode?.currentBatchId &&
              isBatchActive(currentNode.currentBatchStatus) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <Checkbox
                    id="unbind-override"
                    checked={unbindOverride}
                    onCheckedChange={(v) => setUnbindOverride(v === true)}
                    data-ocid="data_manager.unbind.override_checkbox"
                  />
                  <label
                    htmlFor="unbind-override"
                    className="text-[12px] text-amber-800 font-medium cursor-pointer"
                  >
                    Supervisor Override — I acknowledge this batch is active
                  </label>
                </div>
              )}
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnbindDialogOpen(false)}
              data-ocid="data_manager.unbind.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleConfirmUnbind}
              disabled={
                !unbindReason.trim() ||
                (isBatchActive(currentNode?.currentBatchStatus) &&
                  !unbindOverride)
              }
              data-ocid="data_manager.unbind.confirm_button"
            >
              <Unlink size={13} /> Unbind from Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Interlock Reason Dialog */}
      <Dialog
        open={overrideReasonDialogOpen}
        onOpenChange={setOverrideReasonDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.override_reason.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-amber-700">
              <AlertTriangle size={15} className="text-amber-600" /> Override
              Soft Interlocks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
              <AlertTriangle
                size={13}
                className="shrink-0 mt-0.5 text-amber-600"
              />
              <span>
                This override will be <strong>logged in the audit trail</strong>
                . Proceed only if you have authorization.
              </span>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel
                label="Override Reason"
                required
                htmlFor="override-reason"
                className="text-[12px]"
              />
              <Textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter mandatory reason for overriding soft interlocks..."
                className="text-[12px] min-h-[80px] resize-none"
                data-ocid="data_manager.override_reason.textarea"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideReasonDialogOpen(false)}
              data-ocid="data_manager.override_reason.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmOverride}
              disabled={!overrideReason.trim()}
              data-ocid="data_manager.override_reason.confirm_button"
            >
              <AlertTriangle size={13} /> Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Cleaning Event Dialog */}
      <Dialog
        open={cleaningEventDialogOpen}
        onOpenChange={setCleaningEventDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="data_manager.cleaning_event.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-teal-700">
              <ClipboardList size={15} className="text-teal-600" /> Log Cleaning
              Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <RequiredLabel
                  label="Cleaned By"
                  required
                  htmlFor="ce-cleaned-by"
                  className="text-[11.5px]"
                />
                <Input
                  id="ce-cleaned-by"
                  value={cleaningEventForm.cleanedBy}
                  onChange={(e) =>
                    setCleaningEventForm((f) => ({
                      ...f,
                      cleanedBy: e.target.value,
                    }))
                  }
                  className="h-8 text-[12px]"
                  data-ocid="data_manager.cleaning_event_cleaned_by.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px]">Product Code</Label>
                <Input
                  value={cleaningEventForm.productCode}
                  onChange={(e) =>
                    setCleaningEventForm((f) => ({
                      ...f,
                      productCode: e.target.value,
                    }))
                  }
                  className="h-8 text-[12px] font-mono"
                  placeholder="e.g. PRD-AMX-001"
                  data-ocid="data_manager.cleaning_event_product.input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <RequiredLabel
                label="Cleaning Reason"
                required
                htmlFor="ce-reason"
                className="text-[11.5px]"
              />
              <Textarea
                id="ce-reason"
                value={cleaningEventForm.cleaningReason}
                onChange={(e) =>
                  setCleaningEventForm((f) => ({
                    ...f,
                    cleaningReason: e.target.value,
                  }))
                }
                placeholder="e.g. Product changeover, campaign complete..."
                className="text-[12px] min-h-[70px] resize-none"
                data-ocid="data_manager.cleaning_event_reason.textarea"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Valid Till</Label>
              <Input
                type="date"
                value={cleaningEventForm.validTill}
                onChange={(e) =>
                  setCleaningEventForm((f) => ({
                    ...f,
                    validTill: e.target.value,
                  }))
                }
                className="h-8 text-[12px]"
                data-ocid="data_manager.cleaning_event_valid_till.input"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCleaningEventDialogOpen(false)}
              data-ocid="data_manager.cleaning_event.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleConfirmCleaningEvent}
              disabled={!cleaningEventForm.cleaningReason.trim()}
              data-ocid="data_manager.cleaning_event.confirm_button"
            >
              <ClipboardList size={13} /> Log Cleaning Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Perform Cleaning Dialog */}
      <Dialog
        open={performCleaningDialogOpen}
        onOpenChange={setPerformCleaningDialogOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] flex items-center gap-2">
              <Sparkles size={15} className="text-teal-600" />
              Perform Cleaning
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              This will reset Last Cleaned At to now and Current Campaign
              Batches to 0, then recalculate cleaning status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label
              htmlFor="pc-reason"
              className="text-[12px] font-medium text-foreground mb-1.5 block"
            >
              Cleaning Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="pc-reason"
              className="text-[12px] min-h-[70px]"
              placeholder="e.g. Post-batch cleaning, Product changeover..."
              value={performCleaningReason}
              onChange={(e) => setPerformCleaningReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[12px]"
              onClick={() => setPerformCleaningDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[12px] bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handlePerformCleaning}
              disabled={!performCleaningReason.trim()}
              data-ocid="data_manager.perform_cleaning_confirm_button"
            >
              <Sparkles size={12} /> Confirm Cleaning
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
