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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Circle,
  Clock,
  Database,
  HelpCircle,
  History,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  Sparkles,
  StopCircle,
  Wrench,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EquipmentStatus } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { EquipmentStatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAddEquipment, useAllEquipment } from "../hooks/useQueries";
import { type EquipmentNode, INITIAL_DATA } from "../lib/equipmentNodes";
import { getAllRooms } from "../lib/locationHierarchy";
import {
  type CleaningBadge,
  computeCleaningBadge,
  getCleaningBadgeDot,
  getCleaningBadgeStyle,
} from "../services/cleaningValidationService";

type EquipmentLogbookAction =
  | "Execution Start"
  | "Execution Stop"
  | "Cleaning"
  | "Pause"
  | "Resume"
  | "Status Change";

const statusDotColor: Record<EquipmentStatus, string> = {
  [EquipmentStatus.available]: "text-green-500 fill-green-500",
  [EquipmentStatus.inUse]: "text-blue-500 fill-blue-500",
  [EquipmentStatus.cleaning]: "text-amber-500 fill-amber-500",
  [EquipmentStatus.maintenance]: "text-amber-500 fill-amber-500",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 items-start py-1">
      <span className="text-[12px] text-muted-foreground pt-1.5">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default function EquipmentPage() {
  const navigate = useNavigate();
  const { data: equipment = [], isLoading } = useAllEquipment();
  const addEquipment = useAddEquipment();
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState<EquipmentNode | null>(null);
  const [detailTab, setDetailTab] = useState("specification");
  const [form, setForm] = useState({
    name: "",
    equipmentType: "",
    location: "",
    notes: "",
  });

  const mesEquipment = useMemo(() => {
    return INITIAL_DATA.filter(
      (n) =>
        n.entityType === "EquipmentEntity" || n.entityType === "EquipmentClass",
    );
  }, []);

  const rooms = useMemo(() => getAllRooms(), []);

  const getRoomName = (roomId?: string) =>
    roomId ? (rooms.find((r) => r.id === roomId)?.name ?? roomId) : null;

  const getStationName = (stationId?: string) =>
    stationId
      ? (INITIAL_DATA.find((n) => n.id === stationId)?.shortDescription ??
        stationId)
      : null;

  const getSubStationName = (subStationId?: string) =>
    subStationId
      ? (INITIAL_DATA.find((n) => n.id === subStationId)?.shortDescription ??
        subStationId)
      : null;

  const handleCardClick = (eq: EquipmentNode) => {
    if (selectedEq?.id === eq.id) {
      setSelectedEq(null);
    } else {
      setSelectedEq(eq);
      setDetailTab("specification");
    }
  };

  const handleSubmit = async () => {
    try {
      await addEquipment.mutateAsync(form);
      toast.success("Equipment added");
      setModalOpen(false);
      setForm({ name: "", equipmentType: "", location: "", notes: "" });
    } catch {
      toast.error("Failed to add equipment");
    }
  };

  return (
    <div className="space-y-5" data-ocid="equipment.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Equipment</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            {equipment.length} registered units
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="equipment.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate({ to: "/data-manager" })}
            data-ocid="equipment.data_manager.button"
          >
            <Database size={15} /> Data Manager
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2"
            data-ocid="equipment.add.button"
          >
            <Plus size={15} /> Add Equipment
          </Button>
        </div>
      </div>

      {/* MES Equipment Overview from Data Manager */}
      {mesEquipment.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[14px] font-semibold text-foreground">
            MES Equipment (Data Manager)
          </h2>

          {/* Two-column layout: card grid + detail panel */}
          <div className={cn("flex gap-4", selectedEq ? "items-start" : "")}>
            {/* Card grid */}
            <div
              className={cn(
                "grid gap-3",
                selectedEq
                  ? "flex-1 sm:grid-cols-1 xl:grid-cols-2"
                  : "w-full sm:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {mesEquipment.map((eq, i) => {
                const cleaningBadge = computeCleaningBadge({
                  equipmentId: eq.id,
                  equipmentType: eq.equipmentType,
                  lastCleanedAt: eq.lastCleanedAt,
                  cleaningValidTill: eq.cleaningValidTill,
                  lastProductUsed: eq.lastProductUsed,
                  cleaningReason: eq.cleaningReason,
                  currentCampaignBatches: eq.currentCampaignBatches,
                });
                const showWarning =
                  cleaningBadge === "Due" || cleaningBadge === "Expired";
                const roomName = getRoomName(eq.roomId);
                const stationName = getStationName(eq.stationId);
                const subStName = getSubStationName(eq.subStationId);
                const hierarchyParts = [
                  roomName,
                  stationName,
                  subStName,
                ].filter(Boolean);
                const isSelected = selectedEq?.id === eq.id;

                return (
                  <motion.div
                    key={eq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "bg-card border rounded-lg p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer",
                      isSelected
                        ? "border-primary ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40",
                    )}
                    onClick={() => handleCardClick(eq)}
                    data-ocid={`equipment.mes_item.${i + 1}`}
                  >
                    {/* Cleaning warning banner */}
                    {showWarning && (
                      <div
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium mb-3 border",
                          cleaningBadge === "Expired"
                            ? "bg-red-50 border-red-200 text-red-800"
                            : "bg-amber-50 border-amber-200 text-amber-800",
                        )}
                        data-ocid={`equipment.mes_item.cleaning_warning.${i + 1}`}
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {cleaningBadge === "Expired"
                          ? "Cleaning required before execution"
                          : "Cleaning due soon — schedule before next run"}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full shrink-0",
                            eq.status === "Approved"
                              ? "bg-green-500"
                              : eq.status === "Executed"
                                ? "bg-blue-500"
                                : "bg-gray-400",
                          )}
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {eq.identifier}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border",
                            getCleaningBadgeStyle(cleaningBadge),
                          )}
                          data-ocid={`equipment.mes_item.cleaning_badge.${i + 1}`}
                        >
                          {cleaningBadge === "Clean"
                            ? "✓"
                            : cleaningBadge === "Due"
                              ? "⚠"
                              : "✗"}{" "}
                          {cleaningBadge}
                        </span>
                        {eq.equipmentType && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                            {eq.equipmentType}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg shrink-0">
                        <Wrench size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-semibold text-foreground leading-tight">
                          {eq.shortDescription}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {eq.entityType === "EquipmentEntity"
                            ? "Equipment Entity"
                            : "Equipment Class"}
                        </p>
                      </div>
                    </div>

                    {hierarchyParts.length > 0 && (
                      <div className="flex items-center gap-1 mt-2.5 text-[10.5px] text-muted-foreground">
                        <MapPin size={10} className="shrink-0" />
                        <span className="font-mono truncate">
                          {hierarchyParts.join(" → ")}
                        </span>
                      </div>
                    )}

                    {eq.lastProductUsed && (
                      <p className="text-[10.5px] text-muted-foreground mt-1.5">
                        Last product:{" "}
                        <span className="font-mono font-medium">
                          {eq.lastProductUsed}
                        </span>
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selectedEq && (
              <motion.div
                key={selectedEq.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-[420px] shrink-0 bg-card border border-border rounded-lg shadow-sm flex flex-col"
                data-ocid="equipment.detail_panel"
              >
                {/* Detail header */}
                <div className="flex items-start justify-between px-4 py-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-block w-2 h-2 rounded-full shrink-0",
                          selectedEq.status === "Approved"
                            ? "bg-green-500"
                            : selectedEq.status === "Executed"
                              ? "bg-blue-500"
                              : "bg-gray-400",
                        )}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {selectedEq.identifier}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded border",
                          selectedEq.status === "Approved"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : selectedEq.status === "Executed"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {selectedEq.status ?? "Draft"}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-foreground mt-0.5">
                      {selectedEq.shortDescription}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEq(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    data-ocid="equipment.detail_panel.close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <Tabs
                  value={detailTab}
                  onValueChange={setDetailTab}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <TabsList className="mx-4 mt-3 mb-0 h-8 bg-muted/50 justify-start gap-0.5">
                    <TabsTrigger
                      value="specification"
                      className="text-[11px] h-7 px-3"
                      data-ocid="equipment.detail_panel.specification.tab"
                    >
                      Specification
                    </TabsTrigger>
                    <TabsTrigger
                      value="logbook"
                      className="text-[11px] h-7 px-3"
                      data-ocid="equipment.detail_panel.logbook.tab"
                    >
                      Logbook
                    </TabsTrigger>
                  </TabsList>

                  {/* SPECIFICATION TAB */}
                  <TabsContent
                    value="specification"
                    className="flex-1 overflow-auto px-4 pb-4 mt-3"
                  >
                    <SectionHeader title="Equipment Specification" />
                    <FieldRow label="Equipment Type">
                      <div className="h-7 flex items-center">
                        {selectedEq.equipmentType ? (
                          <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                            {selectedEq.equipmentType}
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </FieldRow>
                    <FieldRow label="Cleaning Type">
                      <div className="h-7 flex items-center">
                        <span className="text-[12px] text-foreground">
                          {selectedEq.cleaningType ?? "—"}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow label="Requires Cleaning">
                      <div className="h-7 flex items-center">
                        {selectedEq.requiresCleaning === true ? (
                          <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                            Required
                          </span>
                        ) : selectedEq.requiresCleaning === false ? (
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

                    {/* Cleaning Check section */}
                    <div className="mt-5">
                      <SectionHeader title="Cleaning Check" />
                    </div>

                    {/* Cleaning Status badge */}
                    <FieldRow label="Cleaning Status">
                      <div className="h-7 flex items-center gap-2">
                        {(() => {
                          const cs = selectedEq.cleaningStatus;
                          if (!cs)
                            return (
                              <span className="text-[12px] text-muted-foreground">
                                Not Set
                              </span>
                            );
                          const styles: Record<string, string> = {
                            Clean:
                              "bg-green-50 text-green-700 border-green-200",
                            Due: "bg-amber-50 text-amber-700 border-amber-200",
                            Expired: "bg-red-50 text-red-700 border-red-200",
                          };
                          const icons: Record<string, string> = {
                            Clean: "✓",
                            Due: "⚠",
                            Expired: "✗",
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
                          {selectedEq.lastCleanedAt
                            ? new Date(selectedEq.lastCleanedAt).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—"}
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Cleaning Valid Till">
                      <div className="h-7 flex items-center gap-2">
                        <span className="text-[12px] text-foreground font-mono">
                          {selectedEq.cleaningValidTill
                            ? new Date(
                                selectedEq.cleaningValidTill,
                              ).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                        {selectedEq.cleaningValidTill &&
                          (() => {
                            const now = new Date();
                            const till = new Date(selectedEq.cleaningValidTill);
                            const diffMs = till.getTime() - now.getTime();
                            const daysLeft = Math.floor(
                              diffMs / (1000 * 60 * 60 * 24),
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
                          {selectedEq.lastProductUsed ?? "—"}
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Cleaning Level">
                      <div className="h-7 flex items-center">
                        {(() => {
                          const cl = selectedEq.cleaningLog?.cleaningLevel;
                          if (!cl)
                            return (
                              <span className="text-[12px] text-muted-foreground">
                                Not Set
                              </span>
                            );
                          const styles: Record<string, string> = {
                            None: "bg-gray-50 text-gray-500 border-gray-200",
                            Minor: "bg-blue-50 text-blue-700 border-blue-200",
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

                    {/* Cleaning required warning banner */}
                    {selectedEq.cleaningStatus &&
                      selectedEq.cleaningStatus !== "Clean" && (
                        <div
                          className={cn(
                            "mt-4 flex items-start gap-2 p-3 rounded-lg border text-[12px]",
                            selectedEq.cleaningStatus === "Expired"
                              ? "bg-red-50 border-red-200 text-red-800"
                              : "bg-amber-50 border-amber-200 text-amber-800",
                          )}
                        >
                          <AlertTriangle
                            size={14}
                            className="shrink-0 mt-0.5"
                          />
                          <span>
                            {selectedEq.cleaningStatus === "Expired"
                              ? "Equipment cleaning has expired. Execution is blocked until cleaning is completed."
                              : "Equipment cleaning is due soon. Schedule cleaning before the next batch execution."}
                          </span>
                        </div>
                      )}
                  </TabsContent>

                  {/* LOGBOOK TAB */}
                  <TabsContent
                    value="logbook"
                    className="flex-1 overflow-auto px-4 pb-4 mt-3"
                  >
                    <SectionHeader title="Equipment Logbook" />

                    {/* Entry count summary pills */}
                    {selectedEq.logbookEntries &&
                      selectedEq.logbookEntries.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-3 mt-1">
                          {(
                            [
                              "Execution Start",
                              "Execution Stop",
                              "Cleaning",
                              "Pause",
                              "Resume",
                              "Status Change",
                            ] as EquipmentLogbookAction[]
                          ).map((action) => {
                            const count = selectedEq.logbookEntries!.filter(
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

                    {!selectedEq.logbookEntries ||
                    selectedEq.logbookEntries.length === 0 ? (
                      <div
                        className="text-[12px] text-muted-foreground py-6 text-center"
                        data-ocid="equipment.logbook.empty_state"
                      >
                        No logbook entries recorded.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...selectedEq.logbookEntries]
                          .reverse()
                          .map((entry, idx) => {
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
                                data-ocid={`equipment.logbook.item.${idx + 1}`}
                              >
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
                                    {new Date(entry.timestamp).toLocaleString(
                                      "en-GB",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                                    {entry.user}
                                  </span>
                                </div>
                                <p className="text-[12px] text-foreground mt-1.5">
                                  {entry.reason}
                                </p>
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
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Backend-registered equipment */}
      {isLoading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="equipment.loading_state"
        >
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.length > 0 && (
            <h2 className="text-[14px] font-semibold text-foreground">
              Registered Equipment
            </h2>
          )}
          <div
            className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
            data-ocid="equipment.list"
          >
            {equipment.map((eq, i) => {
              const lastMaintenance = new Date(
                Number(eq.lastMaintenance / BigInt(1_000_000)),
              );
              return (
                <motion.div
                  key={eq.equipmentId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-xs hover:shadow-sm transition-shadow"
                  data-ocid={`equipment.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Circle
                        size={10}
                        className={
                          statusDotColor[eq.status] ??
                          "text-gray-400 fill-gray-400"
                        }
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {eq.equipmentId}
                      </span>
                    </div>
                    <EquipmentStatusBadge status={eq.status} />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg shrink-0">
                      <Wrench size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-foreground leading-tight">
                        {eq.name}
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {eq.equipmentType}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[12px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        Location:
                      </span>
                      <span className="truncate">{eq.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        Last Maintenance:
                      </span>
                      <span>
                        {lastMaintenance.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {eq.notes && (
                      <p className="text-muted-foreground italic">{eq.notes}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="equipment.add.modal">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Equipment Name</Label>
              <Input
                data-ocid="equipment.name.input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Fluid Bed Granulator FBG-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Equipment Type</Label>
                <Input
                  data-ocid="equipment.type.input"
                  value={form.equipmentType}
                  onChange={(e) =>
                    setForm({ ...form, equipmentType: e.target.value })
                  }
                  placeholder="e.g. Granulator"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  data-ocid="equipment.location.input"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="Room 101"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                data-ocid="equipment.notes.textarea"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="equipment.add.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.name || !form.equipmentType || addEquipment.isPending
              }
              data-ocid="equipment.add.submit_button"
            >
              {addEquipment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpPanel
        title={helpContent.equipment.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.equipment.sections}
      />
    </div>
  );
}
