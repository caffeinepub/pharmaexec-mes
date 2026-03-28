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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, HelpCircle, Loader2, Plus, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { DeviationSeverity } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { DeviationStatusBadge, SeverityBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAllDeviations, useReportDeviation } from "../hooks/useQueries";

export default function Deviations() {
  const navigate = useNavigate();
  const { data: deviations = [], isLoading } = useAllDeviations();
  const reportDeviation = useReportDeviation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    batchRecordId: "",
    severity: DeviationSeverity.minor,
  });

  const handleSubmit = async () => {
    try {
      await reportDeviation.mutateAsync(form);
      toast.success("Deviation reported");
      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        batchRecordId: "",
        severity: DeviationSeverity.minor,
      });
    } catch {
      toast.error("Failed to report deviation");
    }
  };

  return (
    <div className="space-y-5" data-ocid="deviations.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Deviations</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            {deviations.filter((d) => d.deviationStatus !== "closed").length}{" "}
            open deviations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="deviations.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2"
            data-ocid="deviations.report.button"
          >
            <Plus size={15} /> Report Deviation
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="deviations.loading_state"
          >
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <table className="w-full" data-ocid="deviations.table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  "ID",
                  "Batch ID",
                  "Severity",
                  "Title",
                  "Reported",
                  "Status",
                  "Actions",
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
              {deviations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-20 text-center text-muted-foreground text-[13px]"
                    data-ocid="deviations.empty_state"
                  >
                    No deviations reported.
                  </td>
                </tr>
              ) : (
                deviations.map((dev, i) => {
                  const reported = new Date(
                    Number(dev.reportedDate / BigInt(1_000_000)),
                  );
                  return (
                    <motion.tr
                      key={dev.deviationId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                      data-ocid={`deviations.item.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">
                        {dev.deviationId}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {dev.batchRecordId}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={dev.severity} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground max-w-[280px]">
                        <span className="line-clamp-2">{dev.title}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {reported.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <DeviationStatusBadge status={dev.deviationStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[12px] h-7 px-2 text-primary"
                            onClick={() => navigate({ to: "/batch-records" })}
                            data-ocid="deviations.batch.link"
                          >
                            <ClipboardList size={12} className="mr-1" /> Batch
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[12px] h-7 px-2 text-muted-foreground"
                            onClick={() => navigate({ to: "/equipment" })}
                            data-ocid="deviations.equipment.link"
                          >
                            <Wrench size={12} className="mr-1" /> Equipment
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="deviations.report.modal">
          <DialogHeader>
            <DialogTitle>Report Deviation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                data-ocid="deviations.title.input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of the deviation"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Batch Record ID</Label>
                <Input
                  data-ocid="deviations.batch_id.input"
                  value={form.batchRecordId}
                  onChange={(e) =>
                    setForm({ ...form, batchRecordId: e.target.value })
                  }
                  placeholder="B-2026-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    setForm({ ...form, severity: v as DeviationSeverity })
                  }
                >
                  <SelectTrigger data-ocid="deviations.severity.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeviationSeverity.critical}>
                      Critical
                    </SelectItem>
                    <SelectItem value={DeviationSeverity.major}>
                      Major
                    </SelectItem>
                    <SelectItem value={DeviationSeverity.minor}>
                      Minor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                data-ocid="deviations.description.textarea"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Detailed description of the deviation and observations"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="deviations.report.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.title || !form.description || reportDeviation.isPending
              }
              data-ocid="deviations.report.submit_button"
            >
              {reportDeviation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Report Deviation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpPanel
        title={helpContent.deviations.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.deviations.sections}
      />
    </div>
  );
}
