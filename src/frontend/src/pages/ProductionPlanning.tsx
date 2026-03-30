import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import XLSX from "@/lib/xlsx-shim";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = "Planned" | "In Progress" | "Completed" | "On Hold";
type OrderPriority = "High" | "Medium" | "Low";
type ChangeType =
  | "Reschedule"
  | "Extend Duration"
  | "Change Equipment"
  | "Change Priority";
type FeasibilityVerdict =
  | "Feasible"
  | "Conditionally Feasible"
  | "Not Feasible";

interface ProductionOrder {
  id: string;
  product: string;
  batchSize: number;
  unit: string;
  equipment: string;
  workCenter: string;
  startDate: string;
  endDate: string;
  duration: number;
  processDuration: number;
  progressPct: number;
  forecastEnd: string;
  status: OrderStatus;
  priority: OrderPriority;
  recipe: string;
  operator: string;
  notes: string;
  createdAt: string;
  createdBy: string;
}

interface FeasibilityLogEntry {
  id: string;
  timestamp: string;
  orderId: string;
  changeType: ChangeType;
  oldValue: string;
  newValue: string;
  verdict: FeasibilityVerdict;
  applied: boolean;
}
// ─── Campaign & Constraint Types ─────────────────────────────────────────────

interface ScheduledTask {
  id: string;
  type: "production" | "cleaning" | "maintenance";
  label: string;
  equipment: string;
  startTime: string; // ISO
  endTime: string; // ISO
  campaignId?: string;
  batchNum?: number;
  holidayOverride?: boolean;
}

interface Campaign {
  id: string;
  product: string;
  equipment: string;
  numBatches: number;
  startDate: string; // ISO
  dirtyHoldTime: number; // hours
  processDuration: number; // hours per batch
  generatedTasks: ScheduledTask[];
  createdAt: string;
}

interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  type: "hard" | "soft"; // hard = blocked, soft = allow with override
}

interface PMWindow {
  id: string;
  equipment: string;
  startTime: string; // ISO
  endTime: string; // ISO
  description: string;
}

// ─── Simulation Types ─────────────────────────────────────────────────────────

interface SimulationChange {
  type:
    | "delay_1h"
    | "delay_2h"
    | "next_shift"
    | "alt_equipment"
    | "work_on_holiday";
  taskId: string;
  altEquipment?: string;
}

interface SimulationResult {
  tasks: ScheduledTask[];
  completionTime: Date;
  conflictCount: number;
  cleaningCount: number;
  utilization: number;
  newConflicts: string[];
  deadlineRisk: string[];
  extraCleaning: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EQUIPMENT_LIST = [
  { id: "R-101", name: "Reactor R-101", workCenter: "Synthesis" },
  { id: "G-202", name: "Granulator G-202", workCenter: "Granulation" },
  { id: "TP-303", name: "Tablet Press TP-303", workCenter: "Compression" },
  { id: "CP-404", name: "Coating Pan CP-404", workCenter: "Coating" },
  { id: "FL-505", name: "Filling Line FL-505", workCenter: "Packaging" },
];

const PRODUCTS = [
  "Amoxicillin 500mg",
  "Ibuprofen 200mg",
  "Metformin 850mg",
  "Paracetamol 500mg",
  "Lisinopril 10mg",
  "Atorvastatin 20mg",
  "Omeprazole 20mg",
];

const RECIPES = [
  "AMX-500-R1",
  "IBU-200-R2",
  "MET-850-R1",
  "PAR-500-R3",
  "LIS-010-R1",
  "ATO-020-R2",
  "OMP-020-R1",
];

const OPERATORS = [
  "Dr. Sarah Chen",
  "James Rodriguez",
  "Linda Park",
  "Michael Torres",
  "Priya Nair",
];

const STORAGE_KEY = "pharma_production_plan";
const FEASIBILITY_LOG_KEY = "pharma_feasibility_log";
const CAMPAIGNS_KEY = "pharma_campaigns";
const HOLIDAYS_KEY = "pharma_holidays";
const PM_WINDOWS_KEY = "pharma_pm_windows";
const SCHEDULED_TASKS_KEY = "pharma_scheduled_tasks";

const AVAILABLE_HOURS_PER_DAY = 24; // 3 shifts × 8 hrs = full 24-hr coverage
const PLANNING_DAYS = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcForecastEnd(
  startDate: string,
  processDuration: number,
  progressPct: number,
): string {
  const start = new Date(startDate).getTime();
  if (progressPct >= 100) {
    return new Date(start + processDuration * 3600000).toISOString();
  }
  if (progressPct <= 0) {
    return new Date(start + processDuration * 3600000).toISOString();
  }
  // If in progress: forecastEnd = startDate + processDuration / (progressPct/100)
  const totalForecastHours = processDuration / (progressPct / 100);
  return new Date(start + totalForecastHours * 3600000).toISOString();
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

function buildSeedOrders(): ProductionOrder[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const addDays = (base: Date, d: number) => {
    const dt = new Date(base);
    dt.setDate(dt.getDate() + d);
    return dt;
  };
  const fmt = (d: Date, h = 8) => {
    const dt = new Date(d);
    dt.setHours(h, 0, 0, 0);
    return dt.toISOString();
  };

  const makeOrder = (
    id: string,
    product: string,
    batchSize: number,
    unit: string,
    equipment: string,
    workCenter: string,
    startDate: string,
    endDate: string,
    duration: number,
    status: OrderStatus,
    priority: OrderPriority,
    recipe: string,
    operator: string,
    notes: string,
    createdAt: string,
    createdBy: string,
    processDuration: number,
    progressPct: number,
  ): ProductionOrder => ({
    id,
    product,
    batchSize,
    unit,
    equipment,
    workCenter,
    startDate,
    endDate,
    duration,
    status,
    priority,
    recipe,
    operator,
    notes,
    createdAt,
    createdBy,
    processDuration,
    progressPct,
    forecastEnd: calcForecastEnd(startDate, processDuration, progressPct),
  });

  return [
    makeOrder(
      "PO-001",
      "Amoxicillin 500mg",
      500,
      "kg",
      "Reactor R-101",
      "Synthesis",
      fmt(today, 7),
      fmt(today, 19),
      12,
      "In Progress",
      "High",
      "AMX-500-R1",
      "Dr. Sarah Chen",
      "Priority batch for export order.",
      fmt(addDays(today, -2)),
      "Dr. Sarah Chen",
      12,
      45,
    ),
    makeOrder(
      "PO-002",
      "Ibuprofen 200mg",
      300,
      "kg",
      "Granulator G-202",
      "Granulation",
      fmt(addDays(today, -1), 6),
      fmt(addDays(today, -1), 22),
      16,
      "Completed",
      "Medium",
      "IBU-200-R2",
      "James Rodriguez",
      "Standard batch.",
      fmt(addDays(today, -3)),
      "James Rodriguez",
      14,
      100,
    ),
    makeOrder(
      "PO-003",
      "Metformin 850mg",
      400,
      "kg",
      "Tablet Press TP-303",
      "Compression",
      fmt(today, 8),
      fmt(today, 20),
      12,
      "In Progress",
      "Medium",
      "MET-850-R1",
      "Linda Park",
      "Second shift continuation.",
      fmt(addDays(today, -1)),
      "Linda Park",
      14,
      30,
    ),
    makeOrder(
      "PO-004",
      "Paracetamol 500mg",
      600,
      "kg",
      "Coating Pan CP-404",
      "Coating",
      fmt(addDays(today, 1), 6),
      fmt(addDays(today, 1), 18),
      12,
      "Planned",
      "High",
      "PAR-500-R3",
      "Michael Torres",
      "Urgent — customer order.",
      fmt(today),
      "Michael Torres",
      12,
      0,
    ),
    makeOrder(
      "PO-005",
      "Lisinopril 10mg",
      200,
      "units",
      "Filling Line FL-505",
      "Packaging",
      fmt(addDays(today, 2), 6),
      fmt(addDays(today, 2), 18),
      12,
      "Planned",
      "Low",
      "LIS-010-R1",
      "Priya Nair",
      "Child-resistant packaging required.",
      fmt(today),
      "Priya Nair",
      12,
      0,
    ),
    makeOrder(
      "PO-006",
      "Atorvastatin 20mg",
      350,
      "kg",
      "Granulator G-202",
      "Granulation",
      fmt(addDays(today, 3), 6),
      fmt(addDays(today, 3), 22),
      16,
      "Planned",
      "Medium",
      "ATO-020-R2",
      "James Rodriguez",
      "",
      fmt(today),
      "James Rodriguez",
      18,
      0,
    ),
    makeOrder(
      "PO-007",
      "Omeprazole 20mg",
      280,
      "kg",
      "Reactor R-101",
      "Synthesis",
      fmt(addDays(today, 4), 8),
      fmt(addDays(today, 5), 0),
      16,
      "Planned",
      "Low",
      "OMP-020-R1",
      "Dr. Sarah Chen",
      "",
      fmt(today),
      "Dr. Sarah Chen",
      16,
      0,
    ),
    makeOrder(
      "PO-008",
      "Amoxicillin 500mg",
      500,
      "kg",
      "Tablet Press TP-303",
      "Compression",
      fmt(addDays(today, 5), 6),
      fmt(addDays(today, 6), 6),
      24,
      "On Hold",
      "High",
      "AMX-500-R1",
      "Linda Park",
      "On hold pending QA review of previous batch.",
      fmt(addDays(today, -1)),
      "Linda Park",
      20,
      0,
    ),
  ];
}

// ─── Status / Priority helpers ───────────────────────────────────────────────

function statusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "In Progress":
      return "bg-green-100 text-green-700 border-green-200";
    case "Planned":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Completed":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "On Hold":
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
}

function priorityBadgeClass(priority: OrderPriority) {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-700 border-red-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Low":
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOverlapHours(a: ProductionOrder, b: ProductionOrder): number {
  const aStart = new Date(a.startDate).getTime();
  const aEnd = new Date(a.endDate).getTime();
  const bStart = new Date(b.startDate).getTime();
  const bEnd = new Date(b.endDate).getTime();
  const overlapMs = Math.max(
    0,
    Math.min(aEnd, bEnd) - Math.max(aStart, bStart),
  );
  return overlapMs / (1000 * 3600);
}

// ─── New Order Dialog ─────────────────────────────────────────────────────────

interface NewOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (order: ProductionOrder) => void;
  existingIds: string[];
  initialOrder?: ProductionOrder | null;
}

function NewOrderDialog({
  open,
  onClose,
  onSave,
  existingIds,
  initialOrder,
}: NewOrderDialogProps) {
  const today = new Date();
  today.setHours(8, 0, 0, 0);

  const [product, setProduct] = useState(initialOrder?.product ?? PRODUCTS[0]);
  const [batchSize, setBatchSize] = useState(
    String(initialOrder?.batchSize ?? 300),
  );
  const [unit, setUnit] = useState(initialOrder?.unit ?? "kg");
  const [equipment, setEquipment] = useState(
    initialOrder?.equipment ?? EQUIPMENT_LIST[0].name,
  );
  const [startDate, setStartDate] = useState(
    initialOrder?.startDate
      ? initialOrder.startDate.slice(0, 16)
      : today.toISOString().slice(0, 16),
  );
  const [duration, setDuration] = useState(String(initialOrder?.duration ?? 8));
  const [status, setStatus] = useState<OrderStatus>(
    initialOrder?.status ?? "Planned",
  );
  const [priority, setPriority] = useState<OrderPriority>(
    initialOrder?.priority ?? "Medium",
  );
  const [recipe, setRecipe] = useState(initialOrder?.recipe ?? RECIPES[0]);
  const [operator, setOperator] = useState(
    initialOrder?.operator ?? OPERATORS[0],
  );
  const [notes, setNotes] = useState(initialOrder?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const now = new Date();
      now.setHours(8, 0, 0, 0);
      setProduct(initialOrder?.product ?? PRODUCTS[0]);
      setBatchSize(String(initialOrder?.batchSize ?? 300));
      setUnit(initialOrder?.unit ?? "kg");
      setEquipment(initialOrder?.equipment ?? EQUIPMENT_LIST[0].name);
      setStartDate(
        initialOrder?.startDate
          ? initialOrder.startDate.slice(0, 16)
          : now.toISOString().slice(0, 16),
      );
      setDuration(String(initialOrder?.duration ?? 8));
      setStatus(initialOrder?.status ?? "Planned");
      setPriority(initialOrder?.priority ?? "Medium");
      setRecipe(initialOrder?.recipe ?? RECIPES[0]);
      setOperator(initialOrder?.operator ?? OPERATORS[0]);
      setNotes(initialOrder?.notes ?? "");
      setErrors({});
    }
  }, [open, initialOrder]);

  const computedWorkCenter =
    EQUIPMENT_LIST.find((e) => e.name === equipment)?.workCenter ?? "";

  const computedEndDate = useMemo(() => {
    const d = Number.parseFloat(duration);
    if (!startDate || Number.isNaN(d)) return "";
    const end = new Date(startDate);
    end.setHours(end.getHours() + d);
    return end.toISOString();
  }, [startDate, duration]);

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!product) errs.product = "Product is required";
    if (!batchSize || Number.isNaN(Number(batchSize)) || Number(batchSize) <= 0)
      errs.batchSize = "Enter a valid batch size";
    if (!equipment) errs.equipment = "Equipment is required";
    if (!startDate) errs.startDate = "Start date is required";
    if (
      !duration ||
      Number.isNaN(Number.parseFloat(duration)) ||
      Number.parseFloat(duration) <= 0
    )
      errs.duration = "Enter a valid duration";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const nextId =
      initialOrder?.id ??
      `PO-${String(existingIds.length + 1).padStart(3, "0")}`;
    const durNum = Number.parseFloat(duration);
    const progPct = initialOrder?.progressPct ?? 0;
    const order: ProductionOrder = {
      id: nextId,
      product,
      batchSize: Number(batchSize),
      unit,
      equipment,
      workCenter: computedWorkCenter,
      startDate: new Date(startDate).toISOString(),
      endDate: computedEndDate,
      duration: durNum,
      processDuration: initialOrder?.processDuration ?? durNum,
      progressPct: progPct,
      forecastEnd: calcForecastEnd(
        new Date(startDate).toISOString(),
        initialOrder?.processDuration ?? durNum,
        progPct,
      ),
      status,
      priority,
      recipe,
      operator,
      notes,
      createdAt: initialOrder?.createdAt ?? new Date().toISOString(),
      createdBy: initialOrder?.createdBy ?? operator,
    };
    onSave(order);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="production_order.dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {initialOrder ? "Edit Production Order" : "New Production Order"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Product */}
          <div className="space-y-1">
            <Label>Product *</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger data-ocid="production_order.product.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product && (
              <p
                className="text-xs text-destructive"
                data-ocid="production_order.product.error_state"
              >
                {errors.product}
              </p>
            )}
          </div>

          {/* Batch size */}
          <div className="space-y-1">
            <Label>Batch Size *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                data-ocid="production_order.batch_size.input"
                className="flex-1"
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger
                  className="w-20"
                  data-ocid="production_order.unit.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="units">units</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.batchSize && (
              <p className="text-xs text-destructive">{errors.batchSize}</p>
            )}
          </div>

          {/* Equipment */}
          <div className="space-y-1">
            <Label>Equipment *</Label>
            <Select value={equipment} onValueChange={setEquipment}>
              <SelectTrigger data-ocid="production_order.equipment.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_LIST.map((e) => (
                  <SelectItem key={e.id} value={e.name}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipment && (
              <p className="text-xs text-destructive">{errors.equipment}</p>
            )}
          </div>

          {/* Work center (auto) */}
          <div className="space-y-1">
            <Label>Work Center</Label>
            <Input value={computedWorkCenter} readOnly className="bg-muted" />
          </div>

          {/* Start date */}
          <div className="space-y-1">
            <Label>Start Date & Time *</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-ocid="production_order.start_date.input"
            />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <Label>Duration (hours) *</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              data-ocid="production_order.duration.input"
            />
            {computedEndDate && (
              <p className="text-xs text-muted-foreground">
                Ends: {fmtDateTime(computedEndDate)}
              </p>
            )}
            {errors.duration && (
              <p className="text-xs text-destructive">{errors.duration}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrderStatus)}
            >
              <SelectTrigger data-ocid="production_order.status.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as OrderPriority)}
            >
              <SelectTrigger data-ocid="production_order.priority.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipe */}
          <div className="space-y-1">
            <Label>Recipe</Label>
            <Select value={recipe} onValueChange={setRecipe}>
              <SelectTrigger data-ocid="production_order.recipe.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECIPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          <div className="space-y-1">
            <Label>Operator</Label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger data-ocid="production_order.operator.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or special instructions"
              rows={3}
              data-ocid="production_order.notes.textarea"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="production_order.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            data-ocid="production_order.submit_button"
          >
            {initialOrder ? "Save Changes" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Scheduling Engine ───────────────────────────────────────────────────────

function isHoliday(
  date: Date,
  holidays: HolidayEntry[],
  hardOnly = false,
): boolean {
  const ymd = date.toISOString().slice(0, 10);
  return holidays.some(
    (h) => h.date === ymd && (!hardOnly || h.type === "hard"),
  );
}

function isSoftHoliday(date: Date, holidays: HolidayEntry[]): boolean {
  const ymd = date.toISOString().slice(0, 10);
  return holidays.some((h) => h.date === ymd && h.type === "soft");
}

function shiftStartHour(h: number): number {
  // Given current hour, return the start hour of the NEXT shift
  if (h >= 7 && h < 15) return 15; // in Shift A, next is B at 15
  if (h >= 15 && h < 23) return 23; // in Shift B, next is C at 23
  return 7; // in Shift C, next is A at 07
}

function pushToNextShift(d: Date): Date {
  const next = new Date(d);
  const h = next.getHours();
  const nextStart = shiftStartHour(h);
  if (nextStart <= h && h >= 23) {
    // Shift C end → next day 07:00
    next.setDate(next.getDate() + 1);
    next.setHours(7, 0, 0, 0);
  } else if (nextStart > h) {
    next.setHours(nextStart, 0, 0, 0);
  } else {
    // e.g. nextStart=7 and h<7 (late shift C), same day 07:00
    next.setHours(7, 0, 0, 0);
  }
  return next;
}

function advanceToNextWorkday(date: Date, holidays: HolidayEntry[]): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0); // Shift A starts at 07:00
  while (isHoliday(d, holidays, false)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function skipHolidaysAndShift(
  start: Date,
  holidays: HolidayEntry[],
  skipSoft = true,
): Date {
  let d = new Date(start);
  // If hard holiday, skip to next work day Shift A (07:00). Soft holidays are allowed with override.
  while (isHoliday(d, holidays, skipSoft)) {
    d = advanceToNextWorkday(d, holidays);
  }
  return d;
}

function skipPMOverlap(
  start: Date,
  durationH: number,
  equipment: string,
  pmWindows: PMWindow[],
): Date {
  let d = new Date(start);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pm of pmWindows) {
      if (pm.equipment !== equipment) continue;
      const pmStart = new Date(pm.startTime).getTime();
      const pmEnd = new Date(pm.endTime).getTime();
      const taskStart = d.getTime();
      const taskEnd = taskStart + durationH * 3600000;
      // overlap?
      if (taskStart < pmEnd && taskEnd > pmStart) {
        d = new Date(pmEnd);
        changed = true;
        break;
      }
    }
  }
  return d;
}

function generateSchedule(
  config: {
    product: string;
    equipment: string;
    numBatches: number;
    startDate: string;
    dirtyHoldTime: number;
    processDuration: number;
  },
  holidays: HolidayEntry[],
  pmWindows: PMWindow[],
  campaignId: string,
): ScheduledTask[] {
  const { product, equipment, numBatches, dirtyHoldTime, processDuration } =
    config;
  const cleaningDuration = 2;
  const tasks: ScheduledTask[] = [];
  let cursor = new Date(config.startDate);
  cursor.setHours(7, 0, 0, 0); // Start at Shift A (07:00)
  // Skip if start date is holiday
  while (isHoliday(cursor, holidays)) {
    cursor = advanceToNextWorkday(cursor, holidays);
  }

  let cumulativeDirtyTime = 0;

  // Helper: advance cursor until task fits within a single shift, respecting PM and holidays
  function fitInShift(cur: Date, durationH: number): Date {
    let d = new Date(cur);
    let maxIter = 100;
    while (maxIter-- > 0) {
      d = skipHolidaysAndShift(d, holidays);
      d = skipPMOverlap(d, durationH, equipment, pmWindows);
      // Re-check holiday after PM push
      d = skipHolidaysAndShift(d, holidays);
      const h = d.getHours();
      const fractMin = d.getMinutes() / 60;
      const startFrac = h + fractMin;
      // Determine shift end for the current shift
      let shiftEnd: number;
      if (startFrac >= 7 && startFrac < 15) shiftEnd = 15;
      else if (startFrac >= 15 && startFrac < 23) shiftEnd = 23;
      else shiftEnd = startFrac >= 23 ? 31 : 7; // Shift C: extends to 07 next day (23+8=31 relative)
      const availableInShift = shiftEnd - startFrac;
      if (durationH <= availableInShift) break; // fits!
      // Push to next shift start
      d = pushToNextShift(d);
    }
    return d;
  }

  for (let b = 1; b <= numBatches; b++) {
    cursor = fitInShift(cursor, processDuration);

    const batchStart = new Date(cursor);
    const batchEnd = new Date(cursor.getTime() + processDuration * 3600000);
    const onSoftHoliday = isSoftHoliday(batchStart, holidays);

    tasks.push({
      id: `${campaignId}-B${b}`,
      holidayOverride: onSoftHoliday,
      type: "production",
      label: `${product} Batch ${b}`,
      equipment,
      startTime: batchStart.toISOString(),
      endTime: batchEnd.toISOString(),
      campaignId,
      batchNum: b,
    });

    cumulativeDirtyTime += processDuration;
    cursor = new Date(batchEnd);

    // Insert cleaning if dirty hold exceeded and more batches remain
    if (cumulativeDirtyTime >= dirtyHoldTime && b < numBatches) {
      cursor = fitInShift(cursor, cleaningDuration);
      const cleanEnd = new Date(cursor.getTime() + cleaningDuration * 3600000);
      tasks.push({
        id: `${campaignId}-CL${b}`,
        type: "cleaning",
        label: `Cleaning after Batch ${b}`,
        equipment,
        startTime: cursor.toISOString(),
        endTime: cleanEnd.toISOString(),
        campaignId,
      });
      cursor = new Date(cleanEnd);
      cumulativeDirtyTime = 0;
    }
  }
  return tasks;
}

function optimizeSchedule(
  tasks: ScheduledTask[],
  dirtyHoldTime: number,
  config: {
    product: string;
    equipment: string;
    processDuration: number;
  },
  holidays: HolidayEntry[],
  pmWindows: PMWindow[],
  campaignId: string,
  numBatches: number,
): {
  optimizedTasks: ScheduledTask[];
  cleaningsSaved: number;
  durationSavedHours: number;
} {
  const origCleanings = tasks.filter((t) => t.type === "cleaning").length;
  // AI: use maximum dirty hold time by batching all batches together
  // Simulate with doubled dirty hold to minimize cleanings
  const relaxedDirtyHold = dirtyHoldTime * 2;
  const firstBatch = tasks.find((t) => t.type === "production");
  if (!firstBatch)
    return { optimizedTasks: tasks, cleaningsSaved: 0, durationSavedHours: 0 };

  const optimized = generateSchedule(
    {
      product: config.product,
      equipment: config.equipment,
      numBatches,
      startDate: firstBatch.startTime,
      dirtyHoldTime: relaxedDirtyHold,
      processDuration: config.processDuration,
    },
    holidays,
    pmWindows,
    `${campaignId}-opt`,
  );

  const newCleanings = optimized.filter((t) => t.type === "cleaning").length;
  const cleaningsSaved = Math.max(0, origCleanings - newCleanings);
  const durationSavedHours = cleaningsSaved * 2;

  // Re-id to original campaign
  const reId = optimized.map((t) => ({
    ...t,
    id: t.id.replace("-opt", ""),
    campaignId,
  }));
  return { optimizedTasks: reId, cleaningsSaved, durationSavedHours };
}

// ─── Gantt Chart (Hourly 24-hr Scale) ────────────────────────────────────────

interface GanttProps {
  orders: ProductionOrder[];
  viewDays: number;
  dayOffset: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scheduledTasks?: ScheduledTask[];
  holidays?: HolidayEntry[];
  pmWindows?: PMWindow[];
  simulatedResult?: SimulationResult | null;
  selectedSimTaskId?: string | null;
  onTaskClick?: (taskId: string) => void;
}

const HOUR_W = 40; // px per hour
const ROW_H = 52;
const LABEL_W = 160;

const SHIFT_DEFS = [
  {
    label: "A  07–15",
    name: "A",
    start: 7,
    end: 15,
    bg: "rgba(59,130,246,0.18)",
    fg: "#93c5fd",
  },
  {
    label: "B  15–23",
    name: "B",
    start: 15,
    end: 23,
    bg: "rgba(34,197,94,0.15)",
    fg: "#86efac",
  },
  {
    label: "C  23–07",
    name: "C",
    start: 23,
    end: 7,
    bg: "rgba(139,92,246,0.18)",
    fg: "#c4b5fd",
  },
];

const STATUS_COLOR: Record<string, string> = {
  Planned: "#3b82f6",
  "In Progress": "#22c55e",
  Completed: "#9ca3af",
  "On Hold": "#f59e0b",
};

function fmtHour(h: number) {
  return String(h).padStart(2, "0");
}

function GanttChart({
  orders,
  viewDays,
  dayOffset,
  scrollRef,
  scheduledTasks = [],
  holidays = [],
  pmWindows = [],
  simulatedResult = null,
  selectedSimTaskId = null,
  onTaskClick,
}: GanttProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const activeRef =
    (scrollRef as RefObject<HTMLDivElement | null>) ?? internalRef;

  const [tooltip, setTooltip] = useState<{
    order: ProductionOrder;
    x: number;
    y: number;
  } | null>(null);

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() + dayOffset);
  const startEpochMs = startDay.getTime();

  const totalHours = viewDays * 24;
  const totalWidth = totalHours * HOUR_W;
  const equipmentRows = EQUIPMENT_LIST.map((e) => e.name);

  // Current-time x offset
  const nowOffsetHours = (now.getTime() - startEpochMs) / 3600000;
  const nowX = nowOffsetHours * HOUR_W;
  const showNowLine = nowOffsetHours >= 0 && nowOffsetHours <= totalHours;

  // Detect conflicts
  const conflictOrderIds = new Set<string>();
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      if (
        orders[i].equipment === orders[j].equipment &&
        getOverlapHours(orders[i], orders[j]) > 0
      ) {
        conflictOrderIds.add(orders[i].id);
        conflictOrderIds.add(orders[j].id);
      }
    }
  }

  function orderToBar(order: ProductionOrder) {
    const oStart = new Date(order.startDate).getTime();
    const oEnd = new Date(order.endDate).getTime();
    const chartEnd = startEpochMs + totalHours * 3600000;
    if (oEnd <= startEpochMs || oStart >= chartEnd) return null;
    const xStart = Math.max(0, ((oStart - startEpochMs) / 3600000) * HOUR_W);
    const xEnd = Math.min(
      totalWidth,
      ((oEnd - startEpochMs) / 3600000) * HOUR_W,
    );
    const width = xEnd - xStart;
    if (width < 2) return null;
    return { xStart, width, isConflict: conflictOrderIds.has(order.id) };
  }

  function forecastToBar(order: ProductionOrder) {
    if (!order.forecastEnd) return null;
    const oEnd = new Date(order.endDate).getTime();
    const fEnd = new Date(order.forecastEnd).getTime();
    if (fEnd <= oEnd) return null; // no delay
    const chartEnd = startEpochMs + totalHours * 3600000;
    if (fEnd <= startEpochMs || oEnd >= chartEnd) return null;
    const xStart = Math.max(0, ((oEnd - startEpochMs) / 3600000) * HOUR_W);
    const xEnd = Math.min(
      totalWidth,
      ((fEnd - startEpochMs) / 3600000) * HOUR_W,
    );
    const width = xEnd - xStart;
    if (width < 2) return null;
    return { xStart, width };
  }

  // Build days array
  const days = Array.from({ length: viewDays }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return d;
  });

  const bodyHeight = ROW_H * equipmentRows.length;
  const DATE_ROW_H = 28;
  const SHIFT_ROW_H = 24;
  const HOUR_ROW_H = 24;
  const HEADER_H = DATE_ROW_H + SHIFT_ROW_H + HOUR_ROW_H;

  return (
    <div className="relative flex" style={{ fontFamily: "inherit" }}>
      {/* ── Fixed label column ─────────────────────── */}
      <div
        className="shrink-0 border-r border-border z-10 bg-card"
        style={{ width: LABEL_W }}
      >
        {/* Header spacer */}
        <div
          style={{ height: HEADER_H }}
          className="border-b border-border bg-slate-900"
        />
        {/* Equipment rows */}
        {equipmentRows.map((eq, i) => (
          <div
            key={eq}
            className={`flex items-center px-3 text-[11px] font-medium border-b border-border truncate ${
              i % 2 === 0
                ? "bg-slate-50 dark:bg-slate-800"
                : "bg-white dark:bg-slate-900"
            }`}
            style={{ height: ROW_H }}
            title={eq}
          >
            {eq}
          </div>
        ))}
      </div>

      {/* ── Scrollable area (header + body) ─────────── */}
      <div
        ref={activeRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ cursor: "default" }}
      >
        <div style={{ width: totalWidth, minWidth: totalWidth }}>
          {/* ── 3-row header ────────────────────────── */}
          <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-700 select-none">
            {/* Row 1: Dates */}
            <div className="flex" style={{ height: DATE_ROW_H }}>
              {days.map((day, _di) => {
                const isToday =
                  day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day.toISOString()}
                    className="flex items-center justify-center text-[11px] font-semibold border-r border-slate-700 shrink-0"
                    style={{
                      width: 24 * HOUR_W,
                      color: isToday ? "#60a5fa" : "#cbd5e1",
                      background: isToday ? "rgba(59,130,246,0.12)" : undefined,
                    }}
                  >
                    {day.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                );
              })}
            </div>

            {/* Row 2: Shifts — rendered as 4 segments per day: C(0-7), A(7-15), B(15-23), C(23-24) */}
            <div className="flex" style={{ height: SHIFT_ROW_H }}>
              {days.map((_, di) => {
                const shiftC = SHIFT_DEFS.find((s) => s.name === "C")!;
                const shiftA = SHIFT_DEFS.find((s) => s.name === "A")!;
                const shiftB = SHIFT_DEFS.find((s) => s.name === "B")!;
                return [
                  { sh: shiftC, hours: 7, key: `${di}-c0` },
                  { sh: shiftA, hours: 8, key: `${di}-a` },
                  { sh: shiftB, hours: 8, key: `${di}-b` },
                  { sh: shiftC, hours: 1, key: `${di}-c23` },
                ].map(({ sh, hours, key }) => (
                  <div
                    key={key}
                    className="flex items-center justify-center text-[10px] font-medium border-r border-slate-700 shrink-0 overflow-hidden"
                    style={{
                      width: hours * HOUR_W,
                      background: sh.bg,
                      color: sh.fg,
                    }}
                  >
                    {hours >= 7 ? sh.label : ""}
                  </div>
                ));
              })}
            </div>

            {/* Row 3: Hours */}
            <div className="flex" style={{ height: HOUR_ROW_H }}>
              {days.map((_, di) =>
                Array.from({ length: 24 }, (__, h) => {
                  const absHour = di * 24 + h;
                  const isCurrentHour =
                    showNowLine && Math.floor(nowOffsetHours) === absHour;
                  return (
                    <div
                      key={absHour}
                      className="flex items-center justify-center text-[9px] font-mono border-r border-slate-700 shrink-0"
                      style={{
                        width: HOUR_W,
                        color: isCurrentHour ? "#38bdf8" : "#64748b",
                        background: isCurrentHour
                          ? "rgba(56,189,248,0.15)"
                          : undefined,
                        fontWeight: isCurrentHour ? "700" : "400",
                      }}
                    >
                      {fmtHour(h)}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          {/* ── Body rows ───────────────────────────── */}
          <div className="relative" style={{ height: bodyHeight }}>
            {/* Background alternating rows */}
            {equipmentRows.map((eq, ri) => (
              <div
                key={eq}
                className="absolute w-full border-b border-border"
                style={{
                  top: ri * ROW_H,
                  height: ROW_H,
                  background: ri % 2 === 0 ? "#f8fafc" : "#ffffff",
                }}
              />
            ))}

            {/* Shift background bands: C(0-7) purple, A(7-15) blue, B(15-23) green, C(23-24) purple */}
            {days.map((_, di) => {
              const shiftC = SHIFT_DEFS.find((s) => s.name === "C")!;
              const shiftA = SHIFT_DEFS.find((s) => s.name === "A")!;
              const shiftB = SHIFT_DEFS.find((s) => s.name === "B")!;
              return [
                { sh: shiftC, offsetH: 0, hours: 7 },
                { sh: shiftA, offsetH: 7, hours: 8 },
                { sh: shiftB, offsetH: 15, hours: 8 },
                { sh: shiftC, offsetH: 23, hours: 1 },
              ].map(({ sh, offsetH, hours }) => (
                <div
                  key={`${di}-shband-${offsetH}`}
                  className="absolute top-0 pointer-events-none"
                  style={{
                    left: (di * 24 + offsetH) * HOUR_W,
                    width: hours * HOUR_W,
                    height: bodyHeight,
                    background: sh.bg,
                    zIndex: 0,
                  }}
                />
              ));
            })}

            {/* Vertical hour lines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${HOUR_W - 1}px, #e2e8f0 ${HOUR_W - 1}px, #e2e8f0 ${HOUR_W}px)`,
                backgroundSize: `${HOUR_W}px 100%`,
              }}
            />
            {/* Day separator lines */}
            {days.map((day, di) => (
              <div
                key={`${day.toISOString()}-sep`}
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: di * 24 * HOUR_W,
                  width: 1,
                  background: "#94a3b8",
                  opacity: 0.8,
                }}
              />
            ))}

            {/* Current time red line */}
            {showNowLine && (
              <div
                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{
                  left: nowX,
                  width: 2,
                  background: "#ef4444",
                  borderLeft: "2px dashed #ef4444",
                  opacity: 0.9,
                }}
              />
            )}

            {/* Forecast delay extension bars (behind order bars) */}
            {orders.map((order) => {
              const rowIndex = equipmentRows.indexOf(order.equipment);
              if (rowIndex === -1) return null;
              const fc = forecastToBar(order);
              if (!fc) return null;
              const barH = ROW_H - 14;
              const barY = rowIndex * ROW_H + 7;
              return (
                <div
                  key={`${order.id}-forecast`}
                  className="absolute pointer-events-none"
                  style={{
                    left: fc.xStart,
                    top: barY,
                    width: Math.max(fc.width, 4),
                    height: barH,
                    borderRadius: "0 4px 4px 0",
                    background: "rgba(147,197,253,0.35)",
                    border: "1.5px dashed #60a5fa",
                    borderLeft: "none",
                    zIndex: 3,
                  }}
                />
              );
            })}

            {/* Order bars */}
            {orders.map((order) => {
              const rowIndex = equipmentRows.indexOf(order.equipment);
              if (rowIndex === -1) return null;
              const bar = orderToBar(order);
              if (!bar) return null;
              const barColor = STATUS_COLOR[order.status] ?? "#3b82f6";
              const barH = ROW_H - 14;
              const barY = rowIndex * ROW_H + 7;
              const isDelayed =
                order.forecastEnd &&
                new Date(order.forecastEnd).getTime() >
                  new Date(order.endDate).getTime();
              const progressWidth =
                order.status === "In Progress" && order.progressPct > 0
                  ? Math.min(100, order.progressPct)
                  : 0;
              return (
                <div
                  key={order.id}
                  className="absolute flex items-center overflow-hidden"
                  style={{
                    left: bar.xStart + 2,
                    top: barY,
                    width: Math.max(bar.width - 4, 4),
                    height: barH,
                    borderRadius: 4,
                    background: barColor,
                    border: bar.isConflict ? "2px dashed #ef4444" : "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    zIndex: 5,
                  }}
                  onMouseEnter={(e) => {
                    const rect = (
                      e.currentTarget.closest(".relative") as HTMLElement
                    )?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        order,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Progress stripe */}
                  {progressWidth > 0 && (
                    <div
                      className="absolute top-0 left-0 h-full pointer-events-none"
                      style={{
                        width: `${progressWidth}%`,
                        background: "rgba(255,255,255,0.28)",
                        borderRight: "2px solid rgba(255,255,255,0.7)",
                        borderRadius: "4px 0 0 4px",
                      }}
                    />
                  )}
                  {bar.width > 60 && (
                    <span
                      className="px-1.5 text-white text-[9px] font-medium truncate z-10 relative"
                      style={{ maxWidth: bar.width - 8 }}
                    >
                      {order.id}{" "}
                      {order.product.length > 12
                        ? `${order.product.slice(0, 12)}…`
                        : order.product}
                      {isDelayed && " ⚠"}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Holiday overlays — hard=red stripes, soft=amber stripes */}
            {days.map((day, di) => {
              const ymd = day.toISOString().slice(0, 10);
              const hol = holidays.find((h) => h.date === ymd);
              if (!hol) return null;
              const isHard = hol.type === "hard";
              return (
                <div
                  key={`hol-${day.toISOString()}`}
                  className="absolute top-0 bottom-0 pointer-events-none z-2"
                  style={{
                    left: di * 24 * HOUR_W,
                    width: 24 * HOUR_W,
                    backgroundImage: isHard
                      ? "repeating-linear-gradient(45deg, rgba(239,68,68,0.1) 0px, rgba(239,68,68,0.1) 4px, transparent 4px, transparent 8px)"
                      : "repeating-linear-gradient(45deg, rgba(245,158,11,0.1) 0px, rgba(245,158,11,0.1) 4px, transparent 4px, transparent 8px)",
                    borderLeft: isHard
                      ? "2px solid rgba(239,68,68,0.4)"
                      : "2px solid rgba(245,158,11,0.4)",
                  }}
                />
              );
            })}

            {/* PM Window bars */}
            {pmWindows.map((pm) => {
              const rowIndex = equipmentRows.indexOf(pm.equipment);
              if (rowIndex === -1) return null;
              const pmS = new Date(pm.startTime).getTime();
              const pmE = new Date(pm.endTime).getTime();
              const chartEnd = startEpochMs + totalHours * 3600000;
              if (pmE <= startEpochMs || pmS >= chartEnd) return null;
              const xStart = Math.max(
                0,
                ((pmS - startEpochMs) / 3600000) * HOUR_W,
              );
              const xEnd = Math.min(
                totalWidth,
                ((pmE - startEpochMs) / 3600000) * HOUR_W,
              );
              const width = xEnd - xStart;
              if (width < 2) return null;
              const barH = ROW_H - 14;
              const barY = rowIndex * ROW_H + 7;
              return (
                <div
                  key={pm.id}
                  className="absolute flex items-center overflow-hidden"
                  style={{
                    left: xStart + 2,
                    top: barY,
                    width: Math.max(width - 4, 4),
                    height: barH,
                    borderRadius: 4,
                    background: "#374151",
                    border: "1px solid #1f2937",
                    zIndex: 6,
                  }}
                  title={`PM: ${pm.description} (${pm.equipment})`}
                >
                  {width > 40 && (
                    <span className="px-1.5 text-white text-[9px] font-medium truncate">
                      🔧 PM
                    </span>
                  )}
                </div>
              );
            })}

            {/* Ghost bars from simulation result */}
            {simulatedResult?.tasks.map((task) => {
              const rowIndex = equipmentRows.indexOf(task.equipment);
              if (rowIndex === -1) return null;
              const tS = new Date(task.startTime).getTime();
              const tE = new Date(task.endTime).getTime();
              const chartEnd = startEpochMs + totalHours * 3600000;
              if (tE <= startEpochMs || tS >= chartEnd) return null;
              const xStart = Math.max(
                0,
                ((tS - startEpochMs) / 3600000) * HOUR_W,
              );
              const xEnd = Math.min(
                totalWidth,
                ((tE - startEpochMs) / 3600000) * HOUR_W,
              );
              const width = xEnd - xStart;
              if (width < 2) return null;
              const barH = ROW_H - 14;
              const barY = rowIndex * ROW_H + 7 + 4; // offset by 4px
              const isNewConflict = simulatedResult.newConflicts.includes(
                task.id,
              );
              const isDeadlineRisk = simulatedResult.deadlineRisk.includes(
                task.id,
              );
              const ghostBg =
                task.type === "cleaning"
                  ? "rgba(249,115,22,0.3)"
                  : task.type === "maintenance"
                    ? "rgba(55,65,81,0.3)"
                    : "rgba(22,163,74,0.3)";
              const ghostBorder = isNewConflict
                ? "2px dashed #ef4444"
                : isDeadlineRisk
                  ? "2px dashed #eab308"
                  : "2px dashed rgba(255,255,255,0.4)";
              return (
                <div
                  key={`ghost-${task.id}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: xStart + 2,
                    top: barY,
                    width: Math.max(width - 4, 4),
                    height: barH,
                    borderRadius: 4,
                    background: ghostBg,
                    border: ghostBorder,
                    zIndex: 4,
                    opacity: 0.5,
                  }}
                  title={`[SIM] ${task.label}`}
                />
              );
            })}

            {/* Scheduled task bars (cleaning / production from campaigns) */}
            {scheduledTasks.map((task) => {
              const rowIndex = equipmentRows.indexOf(task.equipment);
              if (rowIndex === -1) return null;
              const tS = new Date(task.startTime).getTime();
              const tE = new Date(task.endTime).getTime();
              const chartEnd = startEpochMs + totalHours * 3600000;
              if (tE <= startEpochMs || tS >= chartEnd) return null;
              const xStart = Math.max(
                0,
                ((tS - startEpochMs) / 3600000) * HOUR_W,
              );
              const xEnd = Math.min(
                totalWidth,
                ((tE - startEpochMs) / 3600000) * HOUR_W,
              );
              const width = xEnd - xStart;
              if (width < 2) return null;
              const barH = ROW_H - 14;
              const barY = rowIndex * ROW_H + 7;
              const bg =
                task.type === "cleaning"
                  ? "#f97316"
                  : task.type === "maintenance"
                    ? "#374151"
                    : "#16a34a";
              const isSelected = task.id === selectedSimTaskId;
              return (
                <div
                  key={task.id}
                  className="absolute flex items-center overflow-hidden"
                  style={{
                    left: xStart + 2,
                    top: barY,
                    width: Math.max(width - 4, 4),
                    height: barH,
                    borderRadius: 4,
                    background: bg,
                    border: isSelected
                      ? "2px solid #a78bfa"
                      : task.holidayOverride
                        ? "2px solid #f59e0b"
                        : "1px solid rgba(0,0,0,0.15)",
                    zIndex: 5,
                    opacity: 0.9,
                    cursor: onTaskClick ? "pointer" : "default",
                    boxShadow: isSelected ? "0 0 0 2px #a78bfa44" : undefined,
                  }}
                  title={
                    task.holidayOverride
                      ? `⚠ Holiday Override: ${task.label}`
                      : task.label
                  }
                  onClick={() => onTaskClick?.(task.id)}
                  onKeyDown={(e) => e.key === "Enter" && onTaskClick?.(task.id)}
                >
                  {width > 50 && (
                    <span className="px-1.5 text-white text-[9px] font-medium truncate flex items-center gap-1">
                      {task.type === "cleaning"
                        ? "🧹 "
                        : task.type === "maintenance"
                          ? "🔧 "
                          : ""}
                      {task.label}
                      {task.holidayOverride && (
                        <span title="Holiday Override">⚠️</span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Tooltip */}
            {tooltip &&
              (() => {
                const order = tooltip.order;
                const delayMs =
                  order.forecastEnd && order.endDate
                    ? Math.max(
                        0,
                        new Date(order.forecastEnd).getTime() -
                          new Date(order.endDate).getTime(),
                      )
                    : 0;
                const delayH = Math.round(delayMs / 3600000);
                return (
                  <div
                    className="absolute z-30 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl p-3 min-w-[230px] pointer-events-none"
                    style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
                  >
                    <div className="font-semibold mb-1 text-blue-300">
                      {order.id}
                    </div>
                    <div className="text-slate-200 font-medium">
                      {order.product}
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-slate-400">
                      <div>
                        Equipment:{" "}
                        <span className="text-slate-300">
                          {order.equipment}
                        </span>
                      </div>
                      <div>
                        Start:{" "}
                        <span className="text-slate-300">
                          {fmtDateTime(order.startDate)}
                        </span>
                      </div>
                      <div>
                        End:{" "}
                        <span className="text-slate-300">
                          {fmtDateTime(order.endDate)}
                        </span>
                      </div>
                      <div>
                        Duration:{" "}
                        <span className="text-slate-300">
                          {order.duration}h
                        </span>
                      </div>
                      <div>
                        Process Duration:{" "}
                        <span className="text-slate-300">
                          {order.processDuration}h
                        </span>
                      </div>
                      <div>
                        Progress:{" "}
                        <span className="text-slate-300">
                          {order.progressPct}%
                        </span>
                      </div>
                      {order.forecastEnd && (
                        <div>
                          Forecast End:{" "}
                          <span className="text-slate-300">
                            {fmtDateTime(order.forecastEnd)}
                          </span>
                        </div>
                      )}
                      {delayH > 0 && (
                        <div className="text-amber-400 font-semibold">
                          ⚠ Delayed by {delayH}h
                        </div>
                      )}
                      <div>
                        Batch:{" "}
                        <span className="text-slate-300">
                          {order.batchSize} {order.unit}
                        </span>
                      </div>
                      <div>
                        Status:{" "}
                        <span className="text-white font-semibold">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export Excel Dialog ──────────────────────────────────────────────────────

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  feasibilityLog: FeasibilityLogEntry[];
}

function ExportDialog({
  open,
  onClose,
  orders,
  feasibilityLog,
}: ExportDialogProps) {
  const [incSchedule, setIncSchedule] = useState(true);
  const [incCapacity, setIncCapacity] = useState(true);
  const [incConflicts, setIncConflicts] = useState(true);
  const [incFeasibility, setIncFeasibility] = useState(true);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date();
    const todayMs = today.setHours(0, 0, 0, 0);
    const endDate = new Date(todayMs + PLANNING_DAYS * 24 * 3600000);
    const available = AVAILABLE_HOURS_PER_DAY * PLANNING_DAYS;

    if (incSchedule) {
      const rows = orders.map((o) => ({
        "Order ID": o.id,
        Product: o.product,
        "Batch Size": o.batchSize,
        Unit: o.unit,
        Equipment: o.equipment,
        "Work Center": o.workCenter,
        "Start Date": fmtDateTime(o.startDate),
        "End Date": fmtDateTime(o.endDate),
        "Duration (hrs)": o.duration,
        "Process Duration": o.processDuration,
        "Progress %": o.progressPct,
        "Forecast End": o.forecastEnd ? fmtDateTime(o.forecastEnd) : "",
        Status: o.status,
        Priority: o.priority,
        Recipe: o.recipe,
        Operator: o.operator,
        Notes: o.notes,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    }

    if (incCapacity) {
      const capRows = EQUIPMENT_LIST.map((eq) => {
        const eqOrders = orders.filter((o) => o.equipment === eq.name);
        let scheduled = 0;
        for (const o of eqOrders) {
          const oStart = new Date(o.startDate).getTime();
          const oEnd = new Date(o.endDate).getTime();
          const overlap =
            Math.max(
              0,
              Math.min(oEnd, endDate.getTime()) - Math.max(oStart, todayMs),
            ) / 3600000;
          scheduled += overlap;
        }
        const pct = Math.min(100, Math.round((scheduled / available) * 100));
        return {
          Equipment: eq.name,
          "Work Center": eq.workCenter,
          "Scheduled Hours": Math.round(scheduled),
          "Available Hours": available,
          "Utilization %": pct,
          Status: pct > 80 ? "Red" : pct > 60 ? "Amber" : "Green",
        };
      });
      const ws = XLSX.utils.json_to_sheet(capRows);
      XLSX.utils.book_append_sheet(wb, ws, "Capacity");
    }

    if (incConflicts) {
      const conflictRows: Record<string, string | number>[] = [];
      let ci = 1;
      for (let i = 0; i < orders.length; i++) {
        for (let j = i + 1; j < orders.length; j++) {
          const a = orders[i];
          const b = orders[j];
          if (a.equipment !== b.equipment) continue;
          const ov = getOverlapHours(a, b);
          if (ov <= 0) continue;
          conflictRows.push({
            "Conflict ID": `CF-${String(ci++).padStart(3, "0")}`,
            Equipment: a.equipment,
            "Order 1": a.id,
            "Order 2": b.id,
            "Overlap Hours": Math.round(ov * 10) / 10,
            Severity: ov >= 4 ? "High" : ov >= 2 ? "Medium" : "Low",
            "Suggested Action": `Reschedule ${b.id}`,
          });
        }
      }
      const ws = XLSX.utils.json_to_sheet(
        conflictRows.length > 0
          ? conflictRows
          : [{ Status: "No conflicts detected" }],
      );
      XLSX.utils.book_append_sheet(wb, ws, "Conflicts");
    }

    if (incFeasibility) {
      const logRows = feasibilityLog.map((l) => ({
        Timestamp: fmtDateTime(l.timestamp),
        "Order ID": l.orderId,
        "Change Type": l.changeType,
        "Old Value": l.oldValue,
        "New Value": l.newValue,
        Verdict: l.verdict,
        Applied: l.applied ? "Yes" : "No",
      }));
      const ws = XLSX.utils.json_to_sheet(
        logRows.length > 0
          ? logRows
          : [{ Status: "No feasibility checks yet" }],
      );
      XLSX.utils.book_append_sheet(wb, ws, "Feasibility Log");
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `ProductionSchedule_${dateStr}.xlsx`);
    toast.success("Excel file exported successfully");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-ocid="export.dialog">
        <DialogHeader>
          <DialogTitle>Export Production Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Select sheets to include in the Excel export:
          </p>
          {[
            {
              id: "schedule",
              label: "Schedule / All Orders",
              checked: incSchedule,
              onChange: setIncSchedule,
            },
            {
              id: "capacity",
              label: "Capacity Summary",
              checked: incCapacity,
              onChange: setIncCapacity,
            },
            {
              id: "conflicts",
              label: "Conflicts",
              checked: incConflicts,
              onChange: setIncConflicts,
            },
            {
              id: "feasibility",
              label: "Feasibility Log",
              checked: incFeasibility,
              onChange: setIncFeasibility,
            },
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={(v) => item.onChange(v === true)}
                data-ocid={`export.${item.id}.checkbox`}
              />
              <Label htmlFor={item.id} className="cursor-pointer">
                {item.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="export.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              !incSchedule && !incCapacity && !incConflicts && !incFeasibility
            }
            data-ocid="export.submit_button"
            className="gap-1"
          >
            <Download size={14} /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductionPlanning() {
  // Load/persist orders
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProductionOrder[];
        // Migrate old orders missing new fields
        return parsed.map((o) => ({
          ...o,
          processDuration: o.processDuration ?? o.duration,
          progressPct: o.progressPct ?? 0,
          forecastEnd:
            o.forecastEnd ??
            calcForecastEnd(
              o.startDate,
              o.processDuration ?? o.duration,
              o.progressPct ?? 0,
            ),
        }));
      }
    } catch {}
    return buildSeedOrders();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  // ─── Campaign / Holiday / PM state ─────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const r = localStorage.getItem(CAMPAIGNS_KEY);
      if (r) return JSON.parse(r);
    } catch {}
    return [];
  });
  useEffect(() => {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const [holidays, setHolidays] = useState<HolidayEntry[]>(() => {
    try {
      const r = localStorage.getItem(HOLIDAYS_KEY);
      if (r) {
        const parsed = JSON.parse(r) as HolidayEntry[];
        // Migrate old entries missing type field
        return parsed.map((h) => ({ ...h, type: h.type ?? "hard" }));
      }
    } catch {}
    return [];
  });
  useEffect(() => {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
  }, [holidays]);

  const [pmWindows, setPmWindows] = useState<PMWindow[]>(() => {
    try {
      const r = localStorage.getItem(PM_WINDOWS_KEY);
      if (r) return JSON.parse(r);
    } catch {}
    return [];
  });
  useEffect(() => {
    localStorage.setItem(PM_WINDOWS_KEY, JSON.stringify(pmWindows));
  }, [pmWindows]);

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(() => {
    try {
      const r = localStorage.getItem(SCHEDULED_TASKS_KEY);
      if (r) return JSON.parse(r);
    } catch {}
    return [];
  });
  useEffect(() => {
    localStorage.setItem(SCHEDULED_TASKS_KEY, JSON.stringify(scheduledTasks));
  }, [scheduledTasks]);

  // Campaign form state
  const [campProduct, setCampProduct] = useState(PRODUCTS[0]);
  const [campEquipment, setCampEquipment] = useState(EQUIPMENT_LIST[0].name);
  const [campNumBatches, setCampNumBatches] = useState("5");
  const [campStartDate, setCampStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [campDirtyHold, setCampDirtyHold] = useState("24");
  const [campProcDuration, setCampProcDuration] = useState("8");
  const [lastGeneratedTasks, setLastGeneratedTasks] = useState<ScheduledTask[]>(
    [],
  );
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);

  // Holiday form state
  const [holDate, setHolDate] = useState("");
  const [holLabel, setHolLabel] = useState("");
  const [holType, setHolType] = useState<"hard" | "soft">("hard");

  // PM form state
  const [pmEquipment, setPmEquipment] = useState(EQUIPMENT_LIST[0].name);
  const [pmStart, setPmStart] = useState("");
  const [pmEnd, setPmEnd] = useState("");
  const [pmDesc, setPmDesc] = useState("");

  // Feasibility log
  const [feasibilityLog, setFeasibilityLog] = useState<FeasibilityLogEntry[]>(
    () => {
      try {
        const raw = localStorage.getItem(FEASIBILITY_LOG_KEY);
        if (raw) return JSON.parse(raw) as FeasibilityLogEntry[];
      } catch {}
      return [];
    },
  );

  useEffect(() => {
    localStorage.setItem(FEASIBILITY_LOG_KEY, JSON.stringify(feasibilityLog));
  }, [feasibilityLog]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(
    null,
  );
  const [exportOpen, setExportOpen] = useState(false);

  const handleSaveOrder = (order: ProductionOrder) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = order;
        return next;
      }
      return [...prev, order];
    });
    setDialogOpen(false);
    setEditingOrder(null);
  };

  const openNew = () => {
    setEditingOrder(null);
    setDialogOpen(true);
  };

  const openEdit = (order: ProductionOrder) => {
    setEditingOrder(order);
    setDialogOpen(true);
  };

  // ─── Schedule tab state ───────────────────────────────────────────────────
  const [viewDays, setViewDays] = useState(7);
  const [dayOffset, setDayOffset] = useState(0);
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  const scrollToNow = () => {
    setDayOffset(0);
    setTimeout(() => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const hoursFromStart = (now.getTime() - today.getTime()) / 3600000;
      const targetX = hoursFromStart * HOUR_W - 200;
      ganttScrollRef.current?.scrollTo({
        left: Math.max(0, targetX),
        behavior: "smooth",
      });
    }, 50);
  };

  // ─── Orders tab state ─────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEquipment, setFilterEquipment] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterEquipment !== "all" && o.equipment !== filterEquipment)
        return false;
      if (filterPriority !== "all" && o.priority !== filterPriority)
        return false;
      if (
        searchTerm &&
        !o.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !o.product.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [orders, filterStatus, filterEquipment, filterPriority, searchTerm]);

  // ─── Capacity tab ─────────────────────────────────────────────────────────
  const capacityData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + PLANNING_DAYS);
    const available = AVAILABLE_HOURS_PER_DAY * PLANNING_DAYS;

    return EQUIPMENT_LIST.map((eq) => {
      const eqOrders = orders.filter((o) => o.equipment === eq.name);
      let scheduled = 0;
      for (const o of eqOrders) {
        const oStart = new Date(o.startDate).getTime();
        const oEnd = new Date(o.endDate).getTime();
        const windowStart = today.getTime();
        const windowEnd = endDate.getTime();
        const overlap =
          Math.max(
            0,
            Math.min(oEnd, windowEnd) - Math.max(oStart, windowStart),
          ) /
          (1000 * 3600);
        scheduled += overlap;
      }
      const pct = Math.min(100, Math.round((scheduled / available) * 100));
      return {
        equipment: eq.name,
        workCenter: eq.workCenter,
        scheduled: Math.round(scheduled),
        available,
        pct,
      };
    });
  }, [orders]);

  const maxCapacityPct = Math.max(...capacityData.map((c) => c.pct));

  // ─── Conflicts tab ────────────────────────────────────────────────────────
  const conflicts = useMemo(() => {
    const result: {
      id: string;
      equipment: string;
      order1: ProductionOrder;
      order2: ProductionOrder;
      overlapH: number;
      severity: "High" | "Medium" | "Low";
    }[] = [];

    for (let i = 0; i < orders.length; i++) {
      for (let j = i + 1; j < orders.length; j++) {
        const a = orders[i];
        const b = orders[j];
        if (a.equipment !== b.equipment) continue;
        const ov = getOverlapHours(a, b);
        if (ov <= 0) continue;
        result.push({
          id: `CF-${String(result.length + 1).padStart(3, "0")}`,
          equipment: a.equipment,
          order1: a,
          order2: b,
          overlapH: Math.round(ov * 10) / 10,
          severity: ov >= 4 ? "High" : ov >= 2 ? "Medium" : "Low",
        });
      }
    }
    return result;
  }, [orders]);

  // ─── Simulation state ─────────────────────────────────────────────────────
  const [selectedSimTaskId, setSelectedSimTaskId] = useState<string | null>(
    null,
  );
  const [simulatedResult, setSimulatedResult] =
    useState<SimulationResult | null>(null);
  const [simAltEquipment, setSimAltEquipment] = useState(
    EQUIPMENT_LIST[1].name,
  );

  const runSimulation = (change: SimulationChange): SimulationResult => {
    // Deep-clone current scheduled tasks
    const cloned: ScheduledTask[] = scheduledTasks.map((t) => ({ ...t }));
    const taskIdx = cloned.findIndex((t) => t.id === change.taskId);
    if (taskIdx === -1) {
      const empty: SimulationResult = {
        tasks: cloned,
        completionTime: new Date(),
        conflictCount: 0,
        cleaningCount: 0,
        utilization: 0,
        newConflicts: [],
        deadlineRisk: [],
        extraCleaning: false,
      };
      return empty;
    }
    const task = { ...cloned[taskIdx] };

    // Find campaign config for rescheduling
    const campaignForTask = campaigns.find((c) => c.id === task.campaignId);

    if (change.type === "delay_1h") {
      const newStart = new Date(new Date(task.startTime).getTime() + 3600000);
      const newEnd = new Date(new Date(task.endTime).getTime() + 3600000);
      task.startTime = newStart.toISOString();
      task.endTime = newEnd.toISOString();
    } else if (change.type === "delay_2h") {
      const newStart = new Date(new Date(task.startTime).getTime() + 7200000);
      const newEnd = new Date(new Date(task.endTime).getTime() + 7200000);
      task.startTime = newStart.toISOString();
      task.endTime = newEnd.toISOString();
    } else if (change.type === "next_shift") {
      const nextShiftStart = pushToNextShift(new Date(task.startTime));
      const dur =
        new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
      task.startTime = nextShiftStart.toISOString();
      task.endTime = new Date(nextShiftStart.getTime() + dur).toISOString();
    } else if (change.type === "alt_equipment") {
      task.equipment = change.altEquipment ?? EQUIPMENT_LIST[0].name;
    } else if (change.type === "work_on_holiday") {
      task.holidayOverride = true;
    }
    cloned[taskIdx] = task;

    // Compute metrics
    const completionTime = cloned.reduce((max, t) => {
      const e = new Date(t.endTime);
      return e > max ? e : max;
    }, new Date(0));

    // Detect new conflicts
    const originalConflicts = new Set<string>();
    for (let i = 0; i < scheduledTasks.length; i++) {
      for (let j = i + 1; j < scheduledTasks.length; j++) {
        const a = scheduledTasks[i];
        const b = scheduledTasks[j];
        if (a.equipment === b.equipment) {
          const aS = new Date(a.startTime).getTime();
          const aE = new Date(a.endTime).getTime();
          const bS = new Date(b.startTime).getTime();
          const bE = new Date(b.endTime).getTime();
          if (aS < bE && aE > bS) {
            originalConflicts.add(a.id);
            originalConflicts.add(b.id);
          }
        }
      }
    }
    const newConflictIds: string[] = [];
    for (let i = 0; i < cloned.length; i++) {
      for (let j = i + 1; j < cloned.length; j++) {
        const a = cloned[i];
        const b = cloned[j];
        if (a.equipment === b.equipment) {
          const aS = new Date(a.startTime).getTime();
          const aE = new Date(a.endTime).getTime();
          const bS = new Date(b.startTime).getTime();
          const bE = new Date(b.endTime).getTime();
          if (aS < bE && aE > bS) {
            if (!originalConflicts.has(a.id)) newConflictIds.push(a.id);
            if (!originalConflicts.has(b.id)) newConflictIds.push(b.id);
          }
        }
      }
    }

    const cleaningCount = cloned.filter((t) => t.type === "cleaning").length;
    const origCleaningCount = scheduledTasks.filter(
      (t) => t.type === "cleaning",
    ).length;
    const extraCleaning = cleaningCount > origCleaningCount;

    // Deadline risk: tasks pushed significantly beyond campaign end
    const deadlineRisk: string[] = [];
    if (campaignForTask) {
      const campTasks = cloned.filter(
        (t) => t.campaignId === campaignForTask.id,
      );
      const campOrigTasks = scheduledTasks.filter(
        (t) => t.campaignId === campaignForTask.id,
      );
      const origEnd = campOrigTasks.reduce(
        (max, t) => Math.max(max, new Date(t.endTime).getTime()),
        0,
      );
      const newEnd = campTasks.reduce(
        (max, t) => Math.max(max, new Date(t.endTime).getTime()),
        0,
      );
      if (newEnd > origEnd + 4 * 3600000) {
        deadlineRisk.push(task.id);
      }
    }

    // Utilization (scheduled hours / 14 days × 24 hrs per equipment)
    const totalAvailH = EQUIPMENT_LIST.length * 14 * 24;
    const totalSchedH = cloned.reduce(
      (sum, t) =>
        sum +
        (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) /
          3600000,
      0,
    );
    const utilization = Math.min(
      100,
      Math.round((totalSchedH / totalAvailH) * 100),
    );

    return {
      tasks: cloned,
      completionTime,
      conflictCount: Math.floor(newConflictIds.length / 2),
      cleaningCount,
      utilization,
      newConflicts: [...new Set(newConflictIds)],
      deadlineRisk,
      extraCleaning,
    };
  };

  // ─── Resolve conflict dialog ───────────────────────────────────────────────
  const [resolveConflict, setResolveConflict] = useState<
    (typeof conflicts)[0] | null
  >(null);
  const [resolveTarget, setResolveTarget] = useState<"order1" | "order2">(
    "order2",
  );
  const [resolveNewStart, setResolveNewStart] = useState("");

  const applyResolve = () => {
    if (!resolveConflict || !resolveNewStart) return;
    const targetOrder = resolveConflict[resolveTarget];
    const newStart = new Date(resolveNewStart);
    const newEnd = new Date(
      newStart.getTime() + targetOrder.duration * 3600000,
    );
    const updated: ProductionOrder = {
      ...targetOrder,
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      forecastEnd: calcForecastEnd(
        newStart.toISOString(),
        targetOrder.processDuration,
        targetOrder.progressPct,
      ),
    };
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setResolveConflict(null);
    toast.success(`Conflict resolved — ${updated.id} rescheduled`);
  };

  // ─── Feasibility tab state ────────────────────────────────────────────────
  const [feasOrderId, setFeasOrderId] = useState(orders[0]?.id ?? "");
  const [feasChangeType, setFeasChangeType] =
    useState<ChangeType>("Reschedule");
  const [feasNewStart, setFeasNewStart] = useState("");
  const [feasExtraHours, setFeasExtraHours] = useState("4");
  const [feasNewEquipment, setFeasNewEquipment] = useState(
    EQUIPMENT_LIST[0].name,
  );
  const [feasNewPriority, setFeasNewPriority] = useState<OrderPriority>("High");
  const [feasResult, setFeasResult] = useState<{
    verdict: FeasibilityVerdict;
    newStart: string;
    newEnd: string;
    shiftOverlaps: number;
    capBefore: number;
    capAfter: number;
    newConflicts: {
      orderId: string;
      equipment: string;
      overlapH: number;
      severity: string;
    }[];
    logEntry: FeasibilityLogEntry;
  } | null>(null);

  const selectedFeasOrder = useMemo(
    () => orders.find((o) => o.id === feasOrderId) ?? orders[0],
    [orders, feasOrderId],
  );

  const checkFeasibility = () => {
    if (!selectedFeasOrder) return;

    const order = selectedFeasOrder;
    let newStart = new Date(order.startDate);
    let newEnd = new Date(order.endDate);
    let oldValue = "";
    let newValue = "";
    let targetEquipment = order.equipment;

    if (feasChangeType === "Reschedule" && feasNewStart) {
      newStart = new Date(feasNewStart);
      newEnd = new Date(newStart.getTime() + order.duration * 3600000);
      oldValue = fmtDateTime(order.startDate);
      newValue = fmtDateTime(newStart.toISOString());
    } else if (feasChangeType === "Extend Duration") {
      const extra = Number.parseFloat(feasExtraHours) || 0;
      newEnd = new Date(newEnd.getTime() + extra * 3600000);
      oldValue = `${order.duration}h`;
      newValue = `${order.duration + extra}h`;
    } else if (feasChangeType === "Change Equipment") {
      targetEquipment = feasNewEquipment;
      oldValue = order.equipment;
      newValue = feasNewEquipment;
    } else if (feasChangeType === "Change Priority") {
      oldValue = order.priority;
      newValue = feasNewPriority;
    }

    // Build hypothetical order
    const hyp: ProductionOrder = {
      ...order,
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      equipment: targetEquipment,
    };

    // Check new conflicts against other orders
    const newConflicts: {
      orderId: string;
      equipment: string;
      overlapH: number;
      severity: string;
    }[] = [];
    for (const o of orders) {
      if (o.id === order.id) continue;
      if (o.equipment !== hyp.equipment) continue;
      const ov = getOverlapHours(hyp, o);
      if (ov <= 0) continue;
      newConflicts.push({
        orderId: o.id,
        equipment: o.equipment,
        overlapH: Math.round(ov * 10) / 10,
        severity: ov >= 4 ? "High" : ov >= 2 ? "Medium" : "Low",
      });
    }

    // Capacity impact
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const windowEnd = todayMs + PLANNING_DAYS * 24 * 3600000;
    const available = AVAILABLE_HOURS_PER_DAY * PLANNING_DAYS;
    const eqOrdersBefore = orders.filter(
      (o) => o.equipment === targetEquipment,
    );
    let schedBefore = 0;
    for (const o of eqOrdersBefore) {
      schedBefore +=
        Math.max(
          0,
          Math.min(new Date(o.endDate).getTime(), windowEnd) -
            Math.max(new Date(o.startDate).getTime(), todayMs),
        ) / 3600000;
    }
    const eqOrdersAfter = orders.filter(
      (o) => o.id !== order.id && o.equipment === targetEquipment,
    );
    eqOrdersAfter.push(hyp);
    let schedAfter = 0;
    for (const o of eqOrdersAfter) {
      schedAfter +=
        Math.max(
          0,
          Math.min(new Date(o.endDate).getTime(), windowEnd) -
            Math.max(new Date(o.startDate).getTime(), todayMs),
        ) / 3600000;
    }
    const capBefore = Math.min(
      100,
      Math.round((schedBefore / available) * 100),
    );
    const capAfter = Math.min(100, Math.round((schedAfter / available) * 100));

    // Count shifts affected (rough: count 8h shift blocks overlapping with order)
    const shiftOverlaps = Math.ceil(
      (newEnd.getTime() - newStart.getTime()) / (8 * 3600000),
    );

    // Verdict
    const totalOverlap = newConflicts.reduce((s, c) => s + c.overlapH, 0);
    let verdict: FeasibilityVerdict;
    if (newConflicts.length === 0 && capAfter <= 90) {
      verdict = "Feasible";
    } else if (totalOverlap <= 2 && capAfter <= 90) {
      verdict = "Conditionally Feasible";
    } else {
      verdict = "Not Feasible";
    }

    const logEntry: FeasibilityLogEntry = {
      id: `FL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      orderId: order.id,
      changeType: feasChangeType,
      oldValue,
      newValue,
      verdict,
      applied: false,
    };

    setFeasResult({
      verdict,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
      shiftOverlaps,
      capBefore,
      capAfter,
      newConflicts,
      logEntry,
    });

    setFeasibilityLog((prev) => [logEntry, ...prev]);
  };

  const applyFeasChange = () => {
    if (!feasResult || !selectedFeasOrder) return;
    const order = selectedFeasOrder;

    let updated: ProductionOrder = { ...order };
    if (feasChangeType === "Reschedule") {
      updated = {
        ...updated,
        startDate: feasResult.newStart,
        endDate: feasResult.newEnd,
        forecastEnd: calcForecastEnd(
          feasResult.newStart,
          order.processDuration,
          order.progressPct,
        ),
      };
    } else if (feasChangeType === "Extend Duration") {
      const extra = Number.parseFloat(feasExtraHours) || 0;
      updated = {
        ...updated,
        endDate: feasResult.newEnd,
        duration: order.duration + extra,
        processDuration: order.processDuration + extra,
        forecastEnd: calcForecastEnd(
          order.startDate,
          order.processDuration + extra,
          order.progressPct,
        ),
      };
    } else if (feasChangeType === "Change Equipment") {
      const eq = EQUIPMENT_LIST.find((e) => e.name === feasNewEquipment);
      updated = {
        ...updated,
        equipment: feasNewEquipment,
        workCenter: eq?.workCenter ?? order.workCenter,
      };
    } else if (feasChangeType === "Change Priority") {
      updated = { ...updated, priority: feasNewPriority };
    }

    setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));

    // Mark log entry as applied
    setFeasibilityLog((prev) =>
      prev.map((l) =>
        l.id === feasResult.logEntry.id ? { ...l, applied: true } : l,
      ),
    );

    setFeasResult(null);
    toast.success(`Change applied to ${order.id} successfully`);
  };

  // KPI counts
  const inProgressCount = orders.filter(
    (o) => o.status === "In Progress",
  ).length;
  const plannedCount = orders.filter((o) => o.status === "Planned").length;
  const completedCount = orders.filter((o) => o.status === "Completed").length;
  const onHoldCount = orders.filter((o) => o.status === "On Hold").length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Production Planning & Scheduling
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {PLANNING_DAYS}-day rolling schedule · {orders.length} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExportOpen(true)}
            data-ocid="production_planning.export.primary_button"
            className="gap-1"
          >
            <Download size={14} /> Export Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(FEASIBILITY_LOG_KEY);
              setOrders(buildSeedOrders());
              setFeasibilityLog([]);
            }}
            data-ocid="production_planning.reset.secondary_button"
            className="gap-1"
          >
            <RefreshCw size={13} /> Reset
          </Button>
          <Button
            size="sm"
            onClick={openNew}
            data-ocid="production_planning.header_new_order.primary_button"
            className="gap-1"
          >
            <Plus size={13} /> New Order
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "In Progress",
            value: inProgressCount,
            icon: Clock,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Planned",
            value: plannedCount,
            icon: CalendarDays,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Completed",
            value: completedCount,
            icon: CheckCircle2,
            color: "text-slate-500",
            bg: "bg-slate-50",
          },
          {
            label: "On Hold",
            value: onHoldCount,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {value}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="schedule">
        <TabsList className="mb-4">
          <TabsTrigger
            value="schedule"
            data-ocid="production_planning.schedule.tab"
          >
            Schedule
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            data-ocid="production_planning.orders.tab"
          >
            Orders
          </TabsTrigger>
          <TabsTrigger
            value="capacity"
            data-ocid="production_planning.capacity.tab"
          >
            Capacity
          </TabsTrigger>
          <TabsTrigger
            value="conflicts"
            data-ocid="production_planning.conflicts.tab"
          >
            Conflicts
            {conflicts.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-white text-[9px] font-bold">
                {conflicts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="feasibility"
            data-ocid="production_planning.feasibility.tab"
          >
            Feasibility
          </TabsTrigger>
          <TabsTrigger
            value="campaign"
            data-ocid="production_planning.campaign.tab"
          >
            Campaign
          </TabsTrigger>
          <TabsTrigger
            value="holidays"
            data-ocid="production_planning.holidays.tab"
          >
            Holidays
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            data-ocid="production_planning.maintenance.tab"
          >
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* ── Schedule Tab ── */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Gantt Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={scrollToNow}
                  data-ocid="production_planning.gantt_today.button"
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDayOffset(
                      (d) => d - Math.max(1, Math.floor(viewDays / 2)),
                    )
                  }
                  data-ocid="production_planning.gantt_prev.pagination_prev"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDayOffset(
                      (d) => d + Math.max(1, Math.floor(viewDays / 2)),
                    )
                  }
                  data-ocid="production_planning.gantt_next.pagination_next"
                >
                  <ChevronRight size={16} />
                </Button>
                <Select
                  value={String(viewDays)}
                  onValueChange={(v) => setViewDays(Number(v))}
                >
                  <SelectTrigger
                    className="w-32 h-8 text-xs"
                    data-ocid="production_planning.gantt_view.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="14">2 Weeks</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={openNew}
                  data-ocid="production_planning.gantt_new_order.primary_button"
                  className="gap-1"
                >
                  <Plus size={13} /> New Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="relative flex">
                <GanttChart
                  orders={orders}
                  viewDays={viewDays}
                  dayOffset={dayOffset}
                  scrollRef={ganttScrollRef}
                  scheduledTasks={scheduledTasks}
                  holidays={holidays}
                  pmWindows={pmWindows}
                  simulatedResult={simulatedResult}
                  selectedSimTaskId={selectedSimTaskId}
                  onTaskClick={(taskId) => {
                    setSelectedSimTaskId(
                      selectedSimTaskId === taskId ? null : taskId,
                    );
                    setSimulatedResult(null);
                  }}
                />
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border text-xs text-muted-foreground">
                {[
                  { label: "Planned", color: "bg-blue-500" },
                  { label: "In Progress", color: "bg-green-500" },
                  { label: "On Hold", color: "bg-amber-500" },
                  { label: "Completed", color: "bg-slate-400" },
                  {
                    label: "Conflict",
                    color: "border-2 border-red-500 bg-transparent",
                  },
                  {
                    label: "Forecast Delay",
                    color: "border-2 border-blue-400 bg-blue-100",
                  },
                  { label: "Campaign Batch", color: "bg-green-600" },
                  { label: "Cleaning", color: "bg-orange-500" },
                  { label: "Maintenance", color: "bg-gray-700" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                    {label}
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, rgba(239,68,68,0.3) 0px, rgba(239,68,68,0.3) 3px, transparent 3px, transparent 6px)",
                      border: "1px solid rgba(239,68,68,0.4)",
                    }}
                  />
                  Holiday (Hard)
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, rgba(245,158,11,0.3) 0px, rgba(245,158,11,0.3) 3px, transparent 3px, transparent 6px)",
                      border: "1px solid rgba(245,158,11,0.4)",
                    }}
                  />
                  Holiday (Soft)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm border-2 border-amber-400 bg-green-600" />
                  ⚠️ Holiday Override
                </div>
              </div>
              {/* Shift legend */}
              <div className="flex flex-wrap items-center gap-4 px-4 pb-3 text-xs text-muted-foreground border-t border-border pt-2">
                <span className="font-medium text-foreground">Shifts:</span>
                {[
                  {
                    label: "Shift A (07–15)",
                    bg: "rgba(59,130,246,0.35)",
                    border: "#93c5fd",
                  },
                  {
                    label: "Shift B (15–23)",
                    bg: "rgba(34,197,94,0.35)",
                    border: "#86efac",
                  },
                  {
                    label: "Shift C (23–07)",
                    bg: "rgba(139,92,246,0.35)",
                    border: "#c4b5fd",
                  },
                ].map(({ label, bg, border }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    />
                    {label}
                  </div>
                ))}
              </div>

              {/* Simulation Panel */}
              {selectedSimTaskId &&
                (() => {
                  const task = scheduledTasks.find(
                    (t) => t.id === selectedSimTaskId,
                  );
                  if (!task) return null;
                  const origCompletionTime =
                    scheduledTasks.length > 0
                      ? scheduledTasks.reduce((max, t) => {
                          const e = new Date(t.endTime);
                          return e > max ? e : max;
                        }, new Date(0))
                      : new Date();
                  const origCleaningCount = scheduledTasks.filter(
                    (t) => t.type === "cleaning",
                  ).length;
                  const totalAvailH = EQUIPMENT_LIST.length * 14 * 24;
                  const totalSchedH = scheduledTasks.reduce(
                    (sum, t) =>
                      sum +
                      (new Date(t.endTime).getTime() -
                        new Date(t.startTime).getTime()) /
                        3600000,
                    0,
                  );
                  const origUtil = Math.min(
                    100,
                    Math.round((totalSchedH / totalAvailH) * 100),
                  );
                  const origConflictCount = 0;
                  const taskOnSoftHoliday = holidays.some(
                    (h) =>
                      h.date === task.startTime.slice(0, 10) &&
                      h.type === "soft",
                  );

                  return (
                    <div
                      className="mx-4 mb-4 border border-border rounded-xl bg-card shadow-lg"
                      data-ocid="simulation.panel"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-900 rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            ⚡ What-if Simulation
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {task.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-white text-lg leading-none"
                          onClick={() => {
                            setSelectedSimTaskId(null);
                            setSimulatedResult(null);
                          }}
                          data-ocid="simulation.close_button"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Task Info */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Selected Task
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {task.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {task.equipment}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {new Date(task.startTime).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" → "}
                            {new Date(task.endTime).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {task.holidayOverride && (
                            <div className="text-xs text-amber-600 font-semibold">
                              ⚠ Running on holiday override
                            </div>
                          )}
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3">
                            Simulate
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              {
                                label: "Delay +1 hr",
                                type: "delay_1h" as const,
                              },
                              {
                                label: "Delay +2 hr",
                                type: "delay_2h" as const,
                              },
                              {
                                label: "Next Shift",
                                type: "next_shift" as const,
                              },
                            ].map(({ label, type }) => (
                              <button
                                key={type}
                                type="button"
                                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${simulatedResult ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-slate-50 border-border text-foreground hover:bg-slate-100"}`}
                                onClick={() =>
                                  setSimulatedResult(
                                    runSimulation({ type, taskId: task.id }),
                                  )
                                }
                                data-ocid={`simulation.${type}.button`}
                              >
                                {label}
                              </button>
                            ))}
                            {taskOnSoftHoliday && (
                              <button
                                type="button"
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                                onClick={() =>
                                  setSimulatedResult(
                                    runSimulation({
                                      type: "work_on_holiday",
                                      taskId: task.id,
                                    }),
                                  )
                                }
                                data-ocid="simulation.work_on_holiday.button"
                              >
                                Work on Holiday
                              </button>
                            )}
                          </div>
                          {/* Alt equipment */}
                          <div className="flex items-center gap-2 mt-1">
                            <Select
                              value={simAltEquipment}
                              onValueChange={setSimAltEquipment}
                            >
                              <SelectTrigger
                                className="h-7 text-xs flex-1"
                                data-ocid="simulation.alt_equipment.select"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_LIST.filter(
                                  (e) => e.name !== task.equipment,
                                ).map((e) => (
                                  <SelectItem key={e.id} value={e.name}>
                                    {e.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              type="button"
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-slate-50 text-foreground hover:bg-slate-100 transition-all whitespace-nowrap"
                              onClick={() =>
                                setSimulatedResult(
                                  runSimulation({
                                    type: "alt_equipment",
                                    taskId: task.id,
                                    altEquipment: simAltEquipment,
                                  }),
                                )
                              }
                              data-ocid="simulation.alt_equipment.button"
                            >
                              Move Equipment
                            </button>
                          </div>
                        </div>

                        {/* Impact Comparison */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Impact Comparison
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left py-1 font-medium">
                                  Metric
                                </th>
                                <th className="text-right py-1 font-medium">
                                  Current
                                </th>
                                <th className="text-right py-1 font-medium">
                                  Simulated
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              <tr>
                                <td className="py-1.5 text-muted-foreground">
                                  Completion
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                  {origCompletionTime.getTime() > 0
                                    ? origCompletionTime.toLocaleDateString(
                                        "en-GB",
                                        { day: "2-digit", month: "short" },
                                      )
                                    : "—"}
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                  {simulatedResult
                                    ? simulatedResult.completionTime.toLocaleDateString(
                                        "en-GB",
                                        { day: "2-digit", month: "short" },
                                      )
                                    : "—"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-muted-foreground">
                                  Conflicts
                                </td>
                                <td className="py-1.5 text-right">
                                  {origConflictCount}
                                </td>
                                <td
                                  className={`py-1.5 text-right font-semibold ${simulatedResult && simulatedResult.conflictCount > origConflictCount ? "text-red-600" : "text-green-600"}`}
                                >
                                  {simulatedResult
                                    ? simulatedResult.conflictCount
                                    : "—"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-muted-foreground">
                                  Cleanings
                                </td>
                                <td className="py-1.5 text-right">
                                  {origCleaningCount}
                                </td>
                                <td
                                  className={`py-1.5 text-right font-semibold ${simulatedResult && simulatedResult.cleaningCount > origCleaningCount ? "text-amber-600" : ""}`}
                                >
                                  {simulatedResult
                                    ? simulatedResult.cleaningCount
                                    : "—"}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-muted-foreground">
                                  Utilization
                                </td>
                                <td className="py-1.5 text-right">
                                  {origUtil}%
                                </td>
                                <td className="py-1.5 text-right">
                                  {simulatedResult
                                    ? `${simulatedResult.utilization}%`
                                    : "—"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Insights & Actions */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Insights
                          </div>
                          {!simulatedResult ? (
                            <div className="text-xs text-muted-foreground italic">
                              Run a simulation to see insights
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {simulatedResult.newConflicts.length > 0 && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <span className="text-red-600 mt-0.5">
                                    🔴
                                  </span>
                                  <div className="text-xs text-red-700">
                                    <div className="font-semibold">
                                      New conflicts introduced
                                    </div>
                                    <div className="text-red-600 font-mono">
                                      {simulatedResult.newConflicts
                                        .slice(0, 3)
                                        .join(", ")}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {simulatedResult.deadlineRisk.length > 0 && (
                                <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <span className="text-yellow-600 mt-0.5">
                                    🟡
                                  </span>
                                  <div className="text-xs text-yellow-700">
                                    <div className="font-semibold">
                                      Deadline risk detected
                                    </div>
                                    <div className="font-mono">
                                      {simulatedResult.deadlineRisk
                                        .slice(0, 3)
                                        .join(", ")}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {simulatedResult.extraCleaning && (
                                <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                  <span className="text-orange-600 mt-0.5">
                                    🟠
                                  </span>
                                  <div className="text-xs text-orange-700 font-semibold">
                                    Extra cleaning required
                                  </div>
                                </div>
                              )}
                              {simulatedResult.newConflicts.length === 0 &&
                                simulatedResult.deadlineRisk.length === 0 &&
                                !simulatedResult.extraCleaning && (
                                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-green-600">✅</span>
                                    <div className="text-xs text-green-700 font-semibold">
                                      No risks detected
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                          {simulatedResult && (
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                className="flex-1 text-xs py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors"
                                onClick={() => {
                                  setScheduledTasks(simulatedResult.tasks);
                                  setSimulatedResult(null);
                                  setSelectedSimTaskId(null);
                                  toast.success(
                                    "Simulation applied to schedule",
                                  );
                                }}
                                data-ocid="simulation.apply.primary_button"
                              >
                                Apply Simulation
                              </button>
                              <button
                                type="button"
                                className="flex-1 text-xs py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                                onClick={() => setSimulatedResult(null)}
                                data-ocid="simulation.discard.secondary_button"
                              >
                                Discard
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orders Tab ── */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search order ID or product…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-56 h-8 text-xs"
                  data-ocid="production_planning.orders.search_input"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    className="w-32 h-8 text-xs"
                    data-ocid="production_planning.orders_filter_status.select"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterEquipment}
                  onValueChange={setFilterEquipment}
                >
                  <SelectTrigger
                    className="w-40 h-8 text-xs"
                    data-ocid="production_planning.orders_filter_equip.select"
                  >
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {EQUIPMENT_LIST.map((e) => (
                      <SelectItem key={e.id} value={e.name}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterPriority}
                  onValueChange={setFilterPriority}
                >
                  <SelectTrigger
                    className="w-32 h-8 text-xs"
                    data-ocid="production_planning.orders_filter_priority.select"
                  >
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={openNew}
                    data-ocid="production_planning.orders_new.primary_button"
                    className="gap-1 h-8 text-xs"
                  >
                    <Plus size={13} /> New Order
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-16">Dur.</TableHead>
                    <TableHead className="w-16">Prog.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center text-muted-foreground py-10"
                        data-ocid="production_planning.orders.empty_state"
                      >
                        No orders match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <>
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === order.id ? null : order.id,
                            )
                          }
                          data-ocid={`production_planning.orders.item.${idx + 1}`}
                        >
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            {order.id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.product}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.batchSize} {order.unit}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.equipment}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.workCenter}
                          </TableCell>
                          <TableCell className="text-xs">
                            {fmtDate(order.startDate)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {fmtDate(order.endDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.duration}h
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.status === "In Progress" ? (
                              <span className="text-green-600 font-semibold">
                                {order.progressPct}%
                              </span>
                            ) : order.status === "Completed" ? (
                              <span className="text-slate-500">100%</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] ${statusBadgeClass(order.status)}`}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] ${priorityBadgeClass(order.priority)}`}
                            >
                              {order.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(order);
                              }}
                              data-ocid={`production_planning.orders.edit_button.${idx + 1}`}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === order.id && (
                          <TableRow key={`${order.id}-expanded`}>
                            <TableCell
                              colSpan={12}
                              className="bg-muted/30 text-sm p-4"
                            >
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <span className="text-muted-foreground text-xs">
                                    Recipe:
                                  </span>{" "}
                                  {order.recipe}
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">
                                    Operator:
                                  </span>{" "}
                                  {order.operator}
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">
                                    Created:
                                  </span>{" "}
                                  {fmtDate(order.createdAt)} by{" "}
                                  {order.createdBy}
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">
                                    Process Duration:
                                  </span>{" "}
                                  {order.processDuration}h
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">
                                    Forecast End:
                                  </span>{" "}
                                  {fmtDateTime(order.forecastEnd)}
                                </div>
                                {order.forecastEnd &&
                                  new Date(order.forecastEnd) >
                                    new Date(order.endDate) && (
                                    <div className="text-amber-600 font-semibold text-xs">
                                      ⚠ Delayed by{" "}
                                      {Math.round(
                                        (new Date(order.forecastEnd).getTime() -
                                          new Date(order.endDate).getTime()) /
                                          3600000,
                                      )}
                                      h
                                    </div>
                                  )}
                                {order.notes && (
                                  <div className="col-span-3">
                                    <span className="text-muted-foreground text-xs">
                                      Notes:
                                    </span>{" "}
                                    {order.notes}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Capacity Tab ── */}
        <TabsContent value="capacity">
          {maxCapacityPct > 85 && (
            <div
              className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
              data-ocid="production_planning.capacity_alert.error_state"
            >
              <AlertTriangle size={16} />
              <strong>Capacity Alert:</strong> One or more equipment lines are
              above 85% utilization for the next 14 days.
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Equipment Utilization (14-Day)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {capacityData.map((c) => {
                  const color =
                    c.pct > 80
                      ? "bg-red-500"
                      : c.pct > 60
                        ? "bg-amber-500"
                        : "bg-green-500";
                  return (
                    <div key={c.equipment}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{c.equipment}</span>
                        <span
                          className={`font-semibold ${c.pct > 80 ? "text-red-600" : c.pct > 60 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {c.pct}%
                        </span>
                      </div>
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Capacity Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Work Center</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Util %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacityData.map((c, idx) => (
                      <TableRow
                        key={c.equipment}
                        data-ocid={`production_planning.capacity.item.${idx + 1}`}
                      >
                        <TableCell className="text-xs font-medium">
                          {c.equipment}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.workCenter}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.scheduled}h
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.available}h
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {c.pct}%
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.pct > 80
                                ? "bg-red-50 text-red-700 border-red-200"
                                : c.pct > 60
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {c.pct > 80
                              ? "Over Utilized"
                              : c.pct > 60
                                ? "Near Capacity"
                                : "Available"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Conflicts Tab ── */}
        <TabsContent value="conflicts">
          {conflicts.length === 0 ? (
            <Card>
              <CardContent
                className="flex flex-col items-center justify-center py-16 gap-3"
                data-ocid="production_planning.conflicts.empty_state"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div className="text-base font-semibold text-foreground">
                  No scheduling conflicts detected
                </div>
                <div className="text-sm text-muted-foreground">
                  All production orders are scheduled without overlaps.
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Scheduling Conflicts ({conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conflict ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Order 1</TableHead>
                      <TableHead>Order 2</TableHead>
                      <TableHead>Overlap</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Suggested Action</TableHead>
                      <TableHead>Resolve</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map((c, idx) => (
                      <TableRow
                        key={c.id}
                        data-ocid={`production_planning.conflicts.item.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-red-600">
                          {c.id}
                        </TableCell>
                        <TableCell className="text-xs">{c.equipment}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {c.order1.id}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {c.order2.id}
                        </TableCell>
                        <TableCell className="text-xs">{c.overlapH}h</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.severity === "High"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : c.severity === "Medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {c.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          Reschedule {c.order2.id}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setResolveConflict(c);
                              setResolveTarget("order2");
                              setResolveNewStart(
                                c.order2.startDate.slice(0, 16),
                              );
                            }}
                            data-ocid={`production_planning.conflicts.edit_button.${idx + 1}`}
                          >
                            <Wrench size={12} /> Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Feasibility Tab ── */}
        <TabsContent value="feasibility">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Request Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Change Request Form</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Select Order</Label>
                  <Select value={feasOrderId} onValueChange={setFeasOrderId}>
                    <SelectTrigger data-ocid="feasibility.order.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.id} — {o.product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Change Type</Label>
                  <Select
                    value={feasChangeType}
                    onValueChange={(v) => {
                      setFeasChangeType(v as ChangeType);
                      setFeasResult(null);
                    }}
                  >
                    <SelectTrigger data-ocid="feasibility.change_type.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reschedule">Reschedule</SelectItem>
                      <SelectItem value="Extend Duration">
                        Extend Duration
                      </SelectItem>
                      <SelectItem value="Change Equipment">
                        Change Equipment
                      </SelectItem>
                      <SelectItem value="Change Priority">
                        Change Priority
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {feasChangeType === "Reschedule" && (
                  <div className="space-y-1">
                    <Label>New Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={feasNewStart}
                      onChange={(e) => setFeasNewStart(e.target.value)}
                      data-ocid="feasibility.new_start.input"
                    />
                  </div>
                )}

                {feasChangeType === "Extend Duration" && (
                  <div className="space-y-1">
                    <Label>Additional Hours</Label>
                    <Input
                      type="number"
                      min="1"
                      value={feasExtraHours}
                      onChange={(e) => setFeasExtraHours(e.target.value)}
                      data-ocid="feasibility.extra_hours.input"
                    />
                  </div>
                )}

                {feasChangeType === "Change Equipment" && (
                  <div className="space-y-1">
                    <Label>New Equipment</Label>
                    <Select
                      value={feasNewEquipment}
                      onValueChange={setFeasNewEquipment}
                    >
                      <SelectTrigger data-ocid="feasibility.new_equipment.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_LIST.map((e) => (
                          <SelectItem key={e.id} value={e.name}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {feasChangeType === "Change Priority" && (
                  <div className="space-y-1">
                    <Label>New Priority</Label>
                    <Select
                      value={feasNewPriority}
                      onValueChange={(v) =>
                        setFeasNewPriority(v as OrderPriority)
                      }
                    >
                      <SelectTrigger data-ocid="feasibility.new_priority.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Current order info */}
                {selectedFeasOrder && (
                  <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1 border">
                    <div className="font-semibold text-foreground mb-1">
                      Current Order Info
                    </div>
                    <div className="text-muted-foreground">
                      Status:{" "}
                      <span className="text-foreground">
                        {selectedFeasOrder.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Start:{" "}
                      <span className="text-foreground">
                        {fmtDateTime(selectedFeasOrder.startDate)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      End:{" "}
                      <span className="text-foreground">
                        {fmtDateTime(selectedFeasOrder.endDate)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Duration:{" "}
                      <span className="text-foreground">
                        {selectedFeasOrder.duration}h
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Equipment:{" "}
                      <span className="text-foreground">
                        {selectedFeasOrder.equipment}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={checkFeasibility}
                  data-ocid="feasibility.check.primary_button"
                >
                  Check Feasibility
                </Button>
              </CardContent>
            </Card>

            {/* Feasibility Analysis */}
            <div className="space-y-4">
              {feasResult ? (
                <>
                  {/* Verdict banner */}
                  <div
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      feasResult.verdict === "Feasible"
                        ? "bg-green-50 border-green-200 text-green-800"
                        : feasResult.verdict === "Conditionally Feasible"
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-red-50 border-red-200 text-red-800"
                    }`}
                    data-ocid="feasibility.verdict.panel"
                  >
                    <div className="text-xl">
                      {feasResult.verdict === "Feasible"
                        ? "✅"
                        : feasResult.verdict === "Conditionally Feasible"
                          ? "⚠️"
                          : "❌"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {feasResult.verdict}
                      </div>
                      <div className="text-xs mt-0.5">
                        {feasResult.verdict === "Feasible"
                          ? "No conflicts detected, capacity within limits."
                          : feasResult.verdict === "Conditionally Feasible"
                            ? "Minor conflicts detected. Review required before applying."
                            : "Critical conflicts detected or capacity exceeded."}
                      </div>
                    </div>
                  </div>

                  {/* Impact summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Impact Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">New Start</div>
                        <div className="font-medium">
                          {fmtDateTime(feasResult.newStart)}
                        </div>
                        <div className="text-muted-foreground">New End</div>
                        <div className="font-medium">
                          {fmtDateTime(feasResult.newEnd)}
                        </div>
                        <div className="text-muted-foreground">
                          Shifts Affected
                        </div>
                        <div className="font-medium">
                          {feasResult.shiftOverlaps}
                        </div>
                        <div className="text-muted-foreground">
                          Capacity Before
                        </div>
                        <div
                          className={`font-semibold ${feasResult.capBefore > 80 ? "text-red-600" : feasResult.capBefore > 60 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {feasResult.capBefore}%
                        </div>
                        <div className="text-muted-foreground">
                          Capacity After
                        </div>
                        <div
                          className={`font-semibold ${feasResult.capAfter > 80 ? "text-red-600" : feasResult.capAfter > 60 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {feasResult.capAfter}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conflict check */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Conflict Check</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {feasResult.newConflicts.length === 0 ? (
                        <div className="flex items-center gap-2 p-4 text-sm text-green-600">
                          <CheckCircle2 size={16} /> No new conflicts
                          introduced.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Conflicting Order</TableHead>
                              <TableHead>Equipment</TableHead>
                              <TableHead>Overlap Hours</TableHead>
                              <TableHead>Severity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {feasResult.newConflicts.map((c, idx) => (
                              <TableRow
                                key={c.orderId}
                                data-ocid={`feasibility.conflicts.item.${idx + 1}`}
                              >
                                <TableCell className="text-xs font-medium">
                                  {c.orderId}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {c.equipment}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {c.overlapH}h
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      c.severity === "High"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : c.severity === "Medium"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {c.severity}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Apply button */}
                  {feasResult.verdict !== "Not Feasible" && (
                    <Button
                      className="w-full"
                      onClick={applyFeasChange}
                      data-ocid="feasibility.apply.primary_button"
                    >
                      Apply Change
                    </Button>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent
                    className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
                    data-ocid="feasibility.analysis.empty_state"
                  >
                    <div className="text-4xl">🔍</div>
                    <div className="text-sm font-medium">No analysis yet</div>
                    <div className="text-xs text-center">
                      Fill in the change request form and click "Check
                      Feasibility" to see the analysis.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feasibility log */}
              {feasibilityLog.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Recent Feasibility Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Verdict</TableHead>
                          <TableHead>Applied</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feasibilityLog.slice(0, 5).map((l, idx) => (
                          <TableRow
                            key={l.id}
                            data-ocid={`feasibility.log.item.${idx + 1}`}
                          >
                            <TableCell className="text-xs font-medium">
                              {l.orderId}
                            </TableCell>
                            <TableCell className="text-xs">
                              {l.changeType}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  l.verdict === "Feasible"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : l.verdict === "Conditionally Feasible"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {l.verdict}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {l.applied ? "✅ Yes" : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Campaign Tab ── */}
        <TabsContent value="campaign">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Product</Label>
                    <Select value={campProduct} onValueChange={setCampProduct}>
                      <SelectTrigger data-ocid="campaign.product.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Equipment</Label>
                    <Select
                      value={campEquipment}
                      onValueChange={setCampEquipment}
                    >
                      <SelectTrigger data-ocid="campaign.equipment.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_LIST.map((e) => (
                          <SelectItem key={e.id} value={e.name}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Number of Batches</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={campNumBatches}
                      onChange={(e) => setCampNumBatches(e.target.value)}
                      data-ocid="campaign.num_batches.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={campStartDate}
                      onChange={(e) => setCampStartDate(e.target.value)}
                      data-ocid="campaign.start_date.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Dirty Hold Time (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={campDirtyHold}
                      onChange={(e) => setCampDirtyHold(e.target.value)}
                      data-ocid="campaign.dirty_hold.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Process Duration per Batch (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={campProcDuration}
                      onChange={(e) => setCampProcDuration(e.target.value)}
                      data-ocid="campaign.proc_duration.input"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const nb = Math.max(
                        1,
                        Number.parseInt(campNumBatches) || 1,
                      );
                      const dht = Math.max(
                        1,
                        Number.parseFloat(campDirtyHold) || 24,
                      );
                      const pd = Math.max(
                        1,
                        Number.parseFloat(campProcDuration) || 8,
                      );
                      const campId = `CAMP-${Date.now()}`;
                      const tasks = generateSchedule(
                        {
                          product: campProduct,
                          equipment: campEquipment,
                          numBatches: nb,
                          startDate: campStartDate,
                          dirtyHoldTime: dht,
                          processDuration: pd,
                        },
                        holidays,
                        pmWindows,
                        campId,
                      );
                      const campaign: Campaign = {
                        id: campId,
                        product: campProduct,
                        equipment: campEquipment,
                        numBatches: nb,
                        startDate: campStartDate,
                        dirtyHoldTime: dht,
                        processDuration: pd,
                        generatedTasks: tasks,
                        createdAt: new Date().toISOString(),
                      };
                      setCampaigns((prev) => [...prev, campaign]);
                      setScheduledTasks((prev) => [
                        ...prev.filter((t) => t.campaignId !== campId),
                        ...tasks,
                      ]);
                      setLastGeneratedTasks(tasks);
                      setLastCampaignId(campId);
                      toast.success(
                        `Campaign generated: ${tasks.length} tasks scheduled`,
                      );
                    }}
                    data-ocid="campaign.generate.primary_button"
                  >
                    Generate Schedule
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !lastCampaignId || lastGeneratedTasks.length === 0
                    }
                    onClick={() => {
                      if (!lastCampaignId) return;
                      const camp = campaigns.find(
                        (c) => c.id === lastCampaignId,
                      );
                      if (!camp) return;
                      const {
                        optimizedTasks,
                        cleaningsSaved,
                        durationSavedHours,
                      } = optimizeSchedule(
                        lastGeneratedTasks,
                        camp.dirtyHoldTime,
                        {
                          product: camp.product,
                          equipment: camp.equipment,
                          processDuration: camp.processDuration,
                        },
                        holidays,
                        pmWindows,
                        lastCampaignId,
                        camp.numBatches,
                      );
                      setScheduledTasks((prev) => [
                        ...prev.filter((t) => t.campaignId !== lastCampaignId),
                        ...optimizedTasks,
                      ]);
                      setLastGeneratedTasks(optimizedTasks);
                      toast.success(
                        cleaningsSaved > 0
                          ? `AI Optimized: ${cleaningsSaved} cleaning(s) removed, saved ${durationSavedHours}h`
                          : "AI Optimized: Schedule is already optimal",
                      );
                    }}
                    data-ocid="campaign.ai_optimize.secondary_button"
                  >
                    ✨ AI Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated tasks table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Generated Tasks ({lastGeneratedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lastGeneratedTasks.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-40 text-sm text-muted-foreground"
                    data-ocid="campaign.tasks.empty_state"
                  >
                    Generate a schedule to see tasks here
                  </div>
                ) : (
                  <div className="overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Dur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lastGeneratedTasks.map((task, i) => {
                          const dur = Math.round(
                            (new Date(task.endTime).getTime() -
                              new Date(task.startTime).getTime()) /
                              3600000,
                          );
                          return (
                            <TableRow
                              key={task.id}
                              data-ocid={`campaign.tasks.item.${i + 1}`}
                            >
                              <TableCell className="text-xs text-muted-foreground">
                                {i + 1}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  style={{
                                    background:
                                      task.type === "cleaning"
                                        ? "#fed7aa"
                                        : task.type === "maintenance"
                                          ? "#d1d5db"
                                          : "#bbf7d0",
                                    color:
                                      task.type === "cleaning"
                                        ? "#9a3412"
                                        : task.type === "maintenance"
                                          ? "#374151"
                                          : "#166534",
                                    border: "none",
                                  }}
                                >
                                  {task.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate">
                                {task.label}
                              </TableCell>
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {new Date(task.startTime).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "short" },
                                )}{" "}
                                {new Date(task.startTime).toLocaleTimeString(
                                  "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {new Date(task.endTime).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "short" },
                                )}{" "}
                                {new Date(task.endTime).toLocaleTimeString(
                                  "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{dur}h</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaign history */}
            {campaigns.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">
                    Campaign History ({campaigns.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Batches</TableHead>
                        <TableHead>Dirty Hold</TableHead>
                        <TableHead>Tasks</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c, i) => (
                        <TableRow
                          key={c.id}
                          data-ocid={`campaign.history.item.${i + 1}`}
                        >
                          <TableCell className="text-xs font-mono">
                            {c.id}
                          </TableCell>
                          <TableCell className="text-xs">{c.product}</TableCell>
                          <TableCell className="text-xs">
                            {c.equipment}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.numBatches}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.dirtyHoldTime}h
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.generatedTasks.length}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-7 px-2 text-xs"
                              onClick={() => {
                                setCampaigns((prev) =>
                                  prev.filter((x) => x.id !== c.id),
                                );
                                setScheduledTasks((prev) =>
                                  prev.filter((t) => t.campaignId !== c.id),
                                );
                                if (lastCampaignId === c.id) {
                                  setLastCampaignId(null);
                                  setLastGeneratedTasks([]);
                                }
                                toast.success("Campaign deleted");
                              }}
                              data-ocid={`campaign.delete_button.${i + 1}`}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Holidays Tab ── */}
        <TabsContent value="holidays">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Add Holiday / Non-Working Day
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={holDate}
                    onChange={(e) => setHolDate(e.target.value)}
                    data-ocid="holidays.date.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Label</Label>
                  <Input
                    placeholder="e.g. Christmas Day"
                    value={holLabel}
                    onChange={(e) => setHolLabel(e.target.value)}
                    data-ocid="holidays.label.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Holiday Type</Label>
                  <Select
                    value={holType}
                    onValueChange={(v) => setHolType(v as "hard" | "soft")}
                  >
                    <SelectTrigger data-ocid="holidays.type.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard">
                        Hard (No work allowed)
                      </SelectItem>
                      <SelectItem value="soft">
                        Soft (Work with approval)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={!holDate || !holLabel}
                  onClick={() => {
                    if (!holDate || !holLabel) return;
                    setHolidays((prev) => [
                      ...prev,
                      {
                        id: `HOL-${Date.now()}`,
                        date: holDate,
                        label: holLabel,
                        type: holType,
                      },
                    ]);
                    setHolDate("");
                    setHolLabel("");
                    toast.success("Holiday added");
                  }}
                  data-ocid="holidays.add.primary_button"
                >
                  Add Holiday
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  Non-Working Days ({holidays.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {holidays.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-32 text-sm text-muted-foreground"
                    data-ocid="holidays.list.empty_state"
                  >
                    No holidays defined
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((h, i) => (
                          <TableRow
                            key={h.id}
                            data-ocid={`holidays.item.${i + 1}`}
                          >
                            <TableCell className="text-xs font-mono">
                              {h.date}
                            </TableCell>
                            <TableCell className="text-xs">{h.label}</TableCell>
                            <TableCell>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${(h.type ?? "hard") === "hard" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {(h.type ?? "hard").toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive h-7 px-2 text-xs"
                                onClick={() => {
                                  setHolidays((prev) =>
                                    prev.filter((x) => x.id !== h.id),
                                  );
                                  toast.success("Holiday removed");
                                }}
                                data-ocid={`holidays.delete_button.${i + 1}`}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Maintenance Tab ── */}
        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add PM Window</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Equipment</Label>
                  <Select value={pmEquipment} onValueChange={setPmEquipment}>
                    <SelectTrigger data-ocid="maintenance.equipment.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_LIST.map((e) => (
                        <SelectItem key={e.id} value={e.name}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={pmStart}
                      onChange={(e) => setPmStart(e.target.value)}
                      data-ocid="maintenance.start.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={pmEnd}
                      onChange={(e) => setPmEnd(e.target.value)}
                      data-ocid="maintenance.end.input"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g. Annual calibration"
                    value={pmDesc}
                    onChange={(e) => setPmDesc(e.target.value)}
                    data-ocid="maintenance.description.input"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!pmStart || !pmEnd || !pmDesc}
                  onClick={() => {
                    if (!pmStart || !pmEnd || !pmDesc) return;
                    if (new Date(pmStart) >= new Date(pmEnd)) {
                      toast.error("End time must be after start time");
                      return;
                    }
                    setPmWindows((prev) => [
                      ...prev,
                      {
                        id: `PM-${Date.now()}`,
                        equipment: pmEquipment,
                        startTime: new Date(pmStart).toISOString(),
                        endTime: new Date(pmEnd).toISOString(),
                        description: pmDesc,
                      },
                    ]);
                    setPmStart("");
                    setPmEnd("");
                    setPmDesc("");
                    toast.success("PM window added");
                  }}
                  data-ocid="maintenance.add.primary_button"
                >
                  Add PM Window
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  PM Schedule ({pmWindows.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pmWindows.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-32 text-sm text-muted-foreground"
                    data-ocid="maintenance.list.empty_state"
                  >
                    No PM windows defined
                  </div>
                ) : (
                  <div className="overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pmWindows.map((pm, i) => {
                          const dur = Math.round(
                            (new Date(pm.endTime).getTime() -
                              new Date(pm.startTime).getTime()) /
                              3600000,
                          );
                          const overlapsOrders = orders.some(
                            (o) =>
                              o.equipment === pm.equipment &&
                              new Date(o.startDate).getTime() <
                                new Date(pm.endTime).getTime() &&
                              new Date(o.endDate).getTime() >
                                new Date(pm.startTime).getTime(),
                          );
                          return (
                            <TableRow
                              key={pm.id}
                              data-ocid={`maintenance.item.${i + 1}`}
                            >
                              <TableCell className="text-xs">
                                {pm.equipment}
                              </TableCell>
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {new Date(pm.startTime).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "short" },
                                )}{" "}
                                {new Date(pm.startTime).toLocaleTimeString(
                                  "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {new Date(pm.endTime).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "short" },
                                )}{" "}
                                {new Date(pm.endTime).toLocaleTimeString(
                                  "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{dur}h</TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate">
                                {pm.description}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {overlapsOrders && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] px-1 py-0"
                                    >
                                      ⚠ Overlap
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive h-7 px-2 text-xs"
                                    onClick={() => {
                                      setPmWindows((prev) =>
                                        prev.filter((x) => x.id !== pm.id),
                                      );
                                      setScheduledTasks((prev) =>
                                        prev.filter((t) => t.id !== pm.id),
                                      );
                                      toast.success("PM window deleted");
                                    }}
                                    data-ocid={`maintenance.delete_button.${i + 1}`}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <NewOrderDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        existingIds={orders.map((o) => o.id)}
        initialOrder={editingOrder}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        orders={orders}
        feasibilityLog={feasibilityLog}
      />

      {/* Resolve conflict dialog */}
      <Dialog
        open={!!resolveConflict}
        onOpenChange={(o) => !o && setResolveConflict(null)}
      >
        <DialogContent data-ocid="resolve_conflict.dialog">
          <DialogHeader>
            <DialogTitle>Resolve Conflict — {resolveConflict?.id}</DialogTitle>
          </DialogHeader>
          {resolveConflict && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <strong>{resolveConflict.order1.id}</strong> and{" "}
                <strong>{resolveConflict.order2.id}</strong> overlap by{" "}
                {resolveConflict.overlapH}h on{" "}
                <strong>{resolveConflict.equipment}</strong>. Reschedule one to
                resolve the conflict.
              </p>
              {/* Work on holiday option — shown when conflict involves a soft holiday */}
              {holidays.some(
                (h) =>
                  h.type === "soft" &&
                  (h.date === resolveConflict.order1.startDate.slice(0, 10) ||
                    h.date === resolveConflict.order2.startDate.slice(0, 10)),
              ) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-semibold text-sm">
                      ☀ Work on Soft Holiday
                    </span>
                    <span className="text-xs bg-amber-200 text-amber-800 rounded px-1.5 py-0.5 font-semibold">
                      Approval Required
                    </span>
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    <div>
                      ✓ <strong>Delay avoided:</strong> ~
                      {resolveConflict.overlapH}h by utilizing the soft holiday
                    </div>
                    <div>
                      ⚠ <strong>Approval required:</strong> Supervisor sign-off
                      needed before executing
                    </div>
                    <div>
                      ⚠ Tasks will be marked with holiday override flag (⚠️) on
                      Gantt
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                    onClick={() => {
                      const targetOrder = resolveConflict[resolveTarget];
                      const updated = { ...targetOrder };
                      setOrders((prev) =>
                        prev.map((o) => (o.id === updated.id ? updated : o)),
                      );
                      setScheduledTasks((prev) =>
                        prev.map((t) =>
                          t.id.startsWith(updated.id)
                            ? { ...t, holidayOverride: true }
                            : t,
                        ),
                      );
                      setResolveConflict(null);
                      toast.success(
                        "Holiday override applied — approval required",
                      );
                    }}
                    data-ocid="resolve_conflict.work_on_holiday.button"
                  >
                    Apply Holiday Override
                  </button>
                </div>
              )}
              <div className="space-y-1">
                <Label>Order to Reschedule</Label>
                <Select
                  value={resolveTarget}
                  onValueChange={(v) =>
                    setResolveTarget(v as "order1" | "order2")
                  }
                >
                  <SelectTrigger data-ocid="resolve_conflict.order.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order1">
                      {resolveConflict.order1.id} —{" "}
                      {resolveConflict.order1.product}
                    </SelectItem>
                    <SelectItem value="order2">
                      {resolveConflict.order2.id} —{" "}
                      {resolveConflict.order2.product}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>New Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={resolveNewStart}
                  onChange={(e) => setResolveNewStart(e.target.value)}
                  data-ocid="resolve_conflict.new_start.input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveConflict(null)}
              data-ocid="resolve_conflict.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={applyResolve}
              data-ocid="resolve_conflict.submit_button"
            >
              Apply Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
