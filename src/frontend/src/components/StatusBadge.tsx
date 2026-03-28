import { cn } from "@/lib/utils";
import {
  BatchStatus,
  DeviationSeverity,
  DeviationStatus,
  EquipmentStatus,
  MaterialStatus,
  WorkOrderStatus,
} from "../backend";

type BadgeVariant = "green" | "amber" | "blue" | "red" | "gray";

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-[oklch(0.91_0.06_155)] text-[oklch(0.45_0.12_155)]",
  amber: "bg-[oklch(0.93_0.08_80)] text-[oklch(0.45_0.10_80)]",
  blue: "bg-[oklch(0.91_0.07_255)] text-[oklch(0.42_0.15_255)]",
  red: "bg-[oklch(0.88_0.08_25)] text-[oklch(0.42_0.14_25)]",
  gray: "bg-[oklch(0.93_0.005_240)] text-[oklch(0.45_0.015_240)]",
};

export function StatusBadge({
  variant,
  label,
}: { variant: BadgeVariant; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
        variantClasses[variant],
      )}
    >
      {label}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const map: Record<BatchStatus, { variant: BadgeVariant; label: string }> = {
    [BatchStatus.inProgress]: { variant: "blue", label: "In Progress" },
    [BatchStatus.pending]: { variant: "amber", label: "Pending" },
    [BatchStatus.completed]: { variant: "green", label: "Completed" },
    [BatchStatus.onHold]: { variant: "amber", label: "On Hold" },
    [BatchStatus.rejected]: { variant: "red", label: "Rejected" },
  };
  const { variant, label } = map[status] ?? { variant: "gray", label: status };
  return <StatusBadge variant={variant} label={label} />;
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const map: Record<WorkOrderStatus, { variant: BadgeVariant; label: string }> =
    {
      [WorkOrderStatus.open]: { variant: "amber", label: "Open" },
      [WorkOrderStatus.inProgress]: { variant: "blue", label: "In Progress" },
      [WorkOrderStatus.completed]: { variant: "green", label: "Completed" },
      [WorkOrderStatus.cancelled]: { variant: "gray", label: "Cancelled" },
    };
  const { variant, label } = map[status] ?? { variant: "gray", label: status };
  return <StatusBadge variant={variant} label={label} />;
}

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const map: Record<EquipmentStatus, { variant: BadgeVariant; label: string }> =
    {
      [EquipmentStatus.available]: { variant: "green", label: "Available" },
      [EquipmentStatus.inUse]: { variant: "blue", label: "In Use" },
      [EquipmentStatus.cleaning]: { variant: "amber", label: "Cleaning" },
      [EquipmentStatus.maintenance]: { variant: "amber", label: "Maintenance" },
    };
  const { variant, label } = map[status] ?? { variant: "gray", label: status };
  return <StatusBadge variant={variant} label={label} />;
}

export function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  const map: Record<MaterialStatus, { variant: BadgeVariant; label: string }> =
    {
      [MaterialStatus.released]: { variant: "green", label: "Released" },
      [MaterialStatus.consumed]: { variant: "gray", label: "Consumed" },
      [MaterialStatus.quarantine]: { variant: "amber", label: "Quarantine" },
      [MaterialStatus.rejected]: { variant: "red", label: "Rejected" },
    };
  const { variant, label } = map[status] ?? { variant: "gray", label: status };
  return <StatusBadge variant={variant} label={label} />;
}

export function DeviationStatusBadge({ status }: { status: DeviationStatus }) {
  const map: Record<DeviationStatus, { variant: BadgeVariant; label: string }> =
    {
      [DeviationStatus.open]: { variant: "red", label: "Open" },
      [DeviationStatus.underInvestigation]: {
        variant: "amber",
        label: "Under Investigation",
      },
      [DeviationStatus.closed]: { variant: "green", label: "Closed" },
    };
  const { variant, label } = map[status] ?? { variant: "gray", label: status };
  return <StatusBadge variant={variant} label={label} />;
}

export function SeverityBadge({ severity }: { severity: DeviationSeverity }) {
  const map: Record<
    DeviationSeverity,
    { variant: BadgeVariant; label: string }
  > = {
    [DeviationSeverity.critical]: { variant: "red", label: "Critical" },
    [DeviationSeverity.major]: { variant: "amber", label: "Major" },
    [DeviationSeverity.minor]: { variant: "blue", label: "Minor" },
  };
  const { variant, label } = map[severity] ?? {
    variant: "gray",
    label: severity,
  };
  return <StatusBadge variant={variant} label={label} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { variant: BadgeVariant }> = {
    Critical: { variant: "red" },
    High: { variant: "amber" },
    Medium: { variant: "blue" },
    Low: { variant: "gray" },
  };
  const { variant } = map[priority] ?? { variant: "gray" };
  return <StatusBadge variant={variant} label={priority} />;
}
