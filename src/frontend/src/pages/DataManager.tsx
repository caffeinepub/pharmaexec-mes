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
import { helpContent } from "../data/helpContent";
import {
  type ChangeEntry,
  type EntityType,
  type EquipmentNode,
  INITIAL_DATA,
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

  const filtered = useMemo(
    () =>
      nodes.filter(
        (n) =>
          (selectedEntityType === "all" ||
            n.entityType === selectedEntityType) &&
          (search.trim() === "" ||
            n.shortDescription.toLowerCase().includes(search.toLowerCase()) ||
            n.identifier.toLowerCase().includes(search.toLowerCase())),
      ),
    [nodes, selectedEntityType, search],
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
      }
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === draft.id
            ? {
                ...draft,
                updatedAt: now,
                changeHistory: [...draft.changeHistory, ...changes],
              }
            : n,
        ),
      );
      setEditMode(false);
      setDraft(null);
      setFormErrors({});
      setSaveConfirmOpen(false);
      toast.success("Changes saved successfully");
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
    try {
      const now = new Date().toISOString();
      setNodes((prev) => {
        return prev.map((n) => {
          if (n.id === selected.id) {
            return {
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
                  reason: "GMP Status Approval",
                },
              ],
            };
          }
          return n;
        });
      });
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
    if (
      !confirm(
        `Delete "${selected.shortDescription}"? This action cannot be undone.`,
      )
    )
      return;
    try {
      setNodes((prev) => prev.filter((n) => n.id !== selected.id));
      setSelectedId(null);
      toast.success("Item deleted successfully");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleCreate = () => {
    // Validate new record fields
    const validation = validateNewRecord({
      identifier: newNode.identifier,
      shortDescription: newNode.shortDescription,
    });
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
      setSelectedId(id);
      toast.success("New item created successfully");
    } catch (err) {
      toast.error("Something went wrong. Please try again");
      console.error(err);
    }
  };

  const handleEntityTypeChange = (type: EntityType | "all") => {
    setSelectedEntityType(type);
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
                      <div>
                        <Input
                          disabled={!editMode}
                          value={
                            editMode
                              ? (draft?.identifier ?? currentNode.identifier)
                              : currentNode.identifier
                          }
                          onChange={(e) => {
                            setDraft(
                              (d) => d && { ...d, identifier: e.target.value },
                            );
                            if (formErrors.identifier)
                              setFormErrors((fe) => ({
                                ...fe,
                                identifier: "",
                              }));
                          }}
                          className={cn(
                            "h-7 text-[12px]",
                            formErrors.identifier && "border-destructive",
                          )}
                          data-ocid="data_manager.identifier.input"
                        />
                        {formErrors.identifier && (
                          <p
                            className="text-[11px] text-destructive mt-0.5"
                            data-ocid="data_manager.identifier_error"
                          >
                            {formErrors.identifier}
                          </p>
                        )}
                      </div>
                    </FieldRow>
                    <FieldRow label="Short Description">
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
                onChange={(e) => {
                  setNewNode((n) => ({ ...n, identifier: e.target.value }));
                  if (newFormErrors.identifier)
                    setNewFormErrors((fe) => ({ ...fe, identifier: "" }));
                }}
                className={cn(
                  "h-8 text-[12px]",
                  newFormErrors.identifier && "border-destructive",
                )}
                placeholder="e.g. EE-COAT-XY"
                data-ocid="data_manager.new_identifier.input"
              />
              {newFormErrors.identifier && (
                <p
                  className="text-[11px] text-destructive"
                  data-ocid="data_manager.new_identifier_error"
                >
                  {newFormErrors.identifier}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Short Description *</Label>
              <Input
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
