import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Circle,
  ClipboardList,
  Cpu,
  HelpCircle,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { BatchStatus, EquipmentStatus } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { BatchStatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAllBatchRecords } from "../hooks/useQueries";
import { useAllWorkOrders } from "../hooks/useQueries";
import { useAllEquipment } from "../hooks/useQueries";
import { useAllDeviations } from "../hooks/useQueries";

const stageProgress: Record<string, number> = {
  Dispensing: 10,
  Granulation: 25,
  Blending: 40,
  Compression: 55,
  Coating: 70,
  "QA Testing": 85,
  Packaging: 95,
  Completed: 100,
};

const equipmentStatusColor: Record<string, string> = {
  available: "text-green-500",
  inUse: "text-blue-500",
  cleaning: "text-amber-500",
  maintenance: "text-amber-500",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const { data: batches = [] } = useAllBatchRecords();
  const { data: workOrders = [] } = useAllWorkOrders();
  const { data: equipment = [] } = useAllEquipment();
  const { data: deviations = [] } = useAllDeviations();

  const activeBatches = useMemo(
    () => batches.filter((b) => b.status === BatchStatus.inProgress).length,
    [batches],
  );

  const inUseEquipment = useMemo(
    () => equipment.filter((e) => e.status === EquipmentStatus.inUse).length,
    [equipment],
  );
  const equipmentUtil = equipment.length
    ? Math.round((inUseEquipment / equipment.length) * 100)
    : 0;

  const openDeviations = useMemo(
    () => deviations.filter((d) => d.deviationStatus !== "closed").length,
    [deviations],
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kpis = [
    {
      label: "Active Batches",
      value: activeBatches,
      delta: "+2 from yesterday",
      positive: true,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50",
      route: "/batch-records" as const,
    },
    {
      label: "Equipment Utilization",
      value: `${equipmentUtil}%`,
      delta: "+4% from last shift",
      positive: true,
      icon: Cpu,
      color: "text-green-600",
      bg: "bg-green-50",
      route: "/equipment" as const,
    },
    {
      label: "Open Deviations",
      value: openDeviations,
      delta: "-1 since last week",
      positive: true,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      route: "/deviations" as const,
    },
    {
      label: "Work Orders",
      value: workOrders.length,
      delta: "+3 new today",
      positive: false,
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50",
      route: "/work-orders" as const,
    },
  ];

  const activeBatchList = batches.filter(
    (b) =>
      b.status === BatchStatus.inProgress || b.status === BatchStatus.pending,
  );

  return (
    <div className="space-y-6" data-ocid="dashboard.page">
      {/* Page title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">
            Manufacturing Operations Dashboard
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            Real-time overview of production floor activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="dashboard.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-semibold text-foreground">
              {timeStr}
            </div>
            <div className="text-[12px] text-muted-foreground">{dateStr}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="flex items-center gap-3 flex-wrap"
        data-ocid="dashboard.quick_actions.section"
      >
        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions:
        </span>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-[13px]"
          onClick={() => navigate({ to: "/batch-records" })}
          data-ocid="dashboard.new_batch.button"
        >
          <Plus size={14} /> New Batch
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-[13px]"
          onClick={() => navigate({ to: "/deviations" })}
          data-ocid="dashboard.new_deviation.button"
        >
          <AlertTriangle size={14} /> New Deviation
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-[13px]"
          onClick={() => navigate({ to: "/work-orders" })}
          data-ocid="dashboard.new_work_order.button"
        >
          <ClipboardList size={14} /> New Work Order
        </Button>
      </div>

      {/* KPI cards */}
      <div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
        data-ocid="dashboard.kpi.section"
      >
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card border border-border rounded-lg p-5 shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/30 hover:shadow-sm transition-all"
            onClick={() => navigate({ to: kpi.route })}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ to: kpi.route });
            }}
            tabIndex={0}
            data-ocid={`dashboard.kpi.item.${i + 1}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="text-[32px] font-bold text-foreground leading-none mt-2">
                  {kpi.value}
                </p>
              </div>
              <div className={`${kpi.bg} p-2.5 rounded-lg`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              {kpi.positive ? (
                <TrendingUp size={12} className="text-green-500" />
              ) : (
                <TrendingDown size={12} className="text-red-500" />
              )}
              <span
                className={`text-[11px] font-medium ${kpi.positive ? "text-green-600" : "text-red-500"}`}
              >
                {kpi.delta}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Batch production table */}
        <div className="xl:col-span-2 bg-card border border-border rounded-lg shadow-xs">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[15px] font-semibold text-foreground">
              Current Batch Production
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Active and pending batches on the production floor
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" data-ocid="dashboard.batches.table">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Batch ID",
                    "Product",
                    "Status",
                    "Stage",
                    "Progress",
                    "Start Time",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeBatchList.map((batch, i) => {
                  const progress = stageProgress[batch.currentStage] ?? 50;
                  const startDate = new Date(
                    Number(batch.startTime / BigInt(1_000_000)),
                  );
                  return (
                    <tr
                      key={batch.batchId}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate({ to: "/batch-records" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          navigate({ to: "/batch-records" });
                      }}
                      tabIndex={0}
                      data-ocid={`dashboard.batches.row.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">
                        {batch.batchId}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground max-w-[180px]">
                        <span className="line-clamp-1">
                          {batch.productName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <BatchStatusBadge status={batch.status} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {batch.currentStage}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-muted-foreground w-8">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {startDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {startDate.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Equipment status */}
          <div className="bg-card border border-border rounded-lg shadow-xs">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                Equipment Status
              </h2>
            </div>
            <div className="p-4 space-y-2.5">
              {equipment.slice(0, 6).map((eq, i) => (
                <div
                  key={eq.equipmentId}
                  className="flex items-center gap-3 cursor-pointer hover:bg-accent/20 rounded px-1 -mx-1 transition-colors"
                  onClick={() => navigate({ to: "/equipment" })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate({ to: "/equipment" });
                  }}
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: clickable list item
                  tabIndex={0}
                  data-ocid={`dashboard.equipment.item.${i + 1}`}
                >
                  <Circle
                    size={8}
                    className={`fill-current shrink-0 ${equipmentStatusColor[eq.status] ?? "text-gray-400"}`}
                  />
                  <span className="text-[13px] text-foreground flex-1 truncate">
                    {eq.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {eq.status === "inUse" ? "In Use" : eq.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent deviations */}
          <div className="bg-card border border-border rounded-lg shadow-xs">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-foreground">
                Recent Deviations
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {deviations.slice(0, 4).map((dev, i) => (
                <div
                  key={dev.deviationId}
                  className="border-l-2 border-destructive pl-3 cursor-pointer hover:bg-accent/20 rounded-r pr-1 transition-colors"
                  onClick={() => navigate({ to: "/deviations" })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate({ to: "/deviations" });
                  }}
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: clickable list item
                  tabIndex={0}
                  data-ocid={`dashboard.deviations.item.${i + 1}`}
                >
                  <p className="text-[12px] font-semibold text-foreground line-clamp-1">
                    {dev.deviationId}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {dev.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <HelpPanel
        title={helpContent.dashboard.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.dashboard.sections}
      />
    </div>
  );
}
