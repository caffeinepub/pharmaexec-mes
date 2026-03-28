import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { HelpCircle, Loader2, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { EntityType } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { helpContent } from "../data/helpContent";
import { useAuditTrail } from "../hooks/useQueries";

const entityTypeLabel: Record<EntityType, string> = {
  [EntityType.batchRecord]: "Batch Record",
  [EntityType.workOrder]: "Work Order",
  [EntityType.equipment]: "Equipment",
  [EntityType.material]: "Material",
  [EntityType.deviation]: "Deviation",
  [EntityType.personnel]: "Personnel",
};

const entityTypeRoute: Partial<Record<EntityType, string>> = {
  [EntityType.batchRecord]: "/batch-records",
  [EntityType.workOrder]: "/work-orders",
  [EntityType.equipment]: "/equipment",
  [EntityType.deviation]: "/deviations",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-[oklch(0.91_0.07_255)] text-[oklch(0.42_0.15_255)]",
  STATUS_UPDATE: "bg-[oklch(0.93_0.08_80)] text-[oklch(0.45_0.10_80)]",
  CLOSE: "bg-[oklch(0.91_0.06_155)] text-[oklch(0.45_0.12_155)]",
  CONSUME: "bg-[oklch(0.93_0.005_240)] text-[oklch(0.45_0.015_240)]",
  UPDATE: "bg-[oklch(0.93_0.08_80)] text-[oklch(0.45_0.10_80)]",
  DELETE: "bg-[oklch(0.88_0.08_25)] text-[oklch(0.42_0.14_25)]",
};

export default function AuditTrail() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType>(
    EntityType.batchRecord,
  );
  const { data: events = [], isLoading } = useAuditTrail(entityTypeFilter, "");

  return (
    <div className="space-y-5" data-ocid="audit_trail.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Audit Trail</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            Immutable log of all system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="audit_trail.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <span className="text-[12px] text-muted-foreground">
            Filter by type:
          </span>
          <Select
            value={entityTypeFilter}
            onValueChange={(v) => setEntityTypeFilter(v as EntityType)}
          >
            <SelectTrigger
              className="w-48"
              data-ocid="audit_trail.filter.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EntityType).map((et) => (
                <SelectItem key={et} value={et}>
                  {entityTypeLabel[et]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-xs">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Shield size={15} className="text-muted-foreground" />
          <span className="text-[14px] font-semibold text-foreground">
            Event Log
          </span>
          <span className="ml-auto text-[12px] text-muted-foreground">
            {events.length} events
          </span>
        </div>

        {isLoading ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="audit_trail.loading_state"
          >
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : events.length === 0 ? (
          <div
            className="text-center py-20 text-muted-foreground text-[13px]"
            data-ocid="audit_trail.empty_state"
          >
            No audit events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-ocid="audit_trail.table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    "Timestamp",
                    "Event ID",
                    "Action",
                    "Entity Type",
                    "Entity ID",
                    "Details",
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
                {events.map((event, i) => {
                  const ts = new Date(
                    Number(event.timestamp / BigInt(1_000_000)),
                  );
                  const actionCls =
                    actionColors[event.action] ??
                    "bg-muted text-muted-foreground";
                  const entityRoute = entityTypeRoute[event.entityType];
                  return (
                    <motion.tr
                      key={event.eventId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                      data-ocid={`audit_trail.item.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {ts.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {ts.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">
                        {event.eventId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${actionCls}`}
                        >
                          {event.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {entityTypeLabel[event.entityType] ?? event.entityType}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {entityRoute ? (
                          <button
                            type="button"
                            className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                            onClick={() =>
                              navigate({
                                to: entityRoute as
                                  | "/batch-records"
                                  | "/work-orders"
                                  | "/equipment"
                                  | "/deviations",
                              })
                            }
                            data-ocid="audit_trail.entity.link"
                          >
                            {event.entityId}
                          </button>
                        ) : (
                          <span className="font-medium text-primary">
                            {event.entityId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-foreground max-w-[320px]">
                        <span className="line-clamp-2">{event.details}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <HelpPanel
        title={helpContent.auditTrail.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.auditTrail.sections}
      />
    </div>
  );
}
