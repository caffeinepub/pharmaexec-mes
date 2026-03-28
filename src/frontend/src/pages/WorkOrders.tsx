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
import { Principal } from "@icp-sdk/core/principal";
import { HelpCircle, Loader2, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { HelpPanel } from "../components/HelpPanel";
import { PriorityBadge, WorkOrderStatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAllWorkOrders, useCreateWorkOrder } from "../hooks/useQueries";

export default function WorkOrders() {
  const { data: workOrders = [], isLoading } = useAllWorkOrders();
  const createWO = useCreateWorkOrder();
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    batchRecordId: "",
    priority: "Medium",
    scheduledStart: "",
  });

  const handleSubmit = async () => {
    try {
      await createWO.mutateAsync({
        description: form.description,
        batchRecordId: form.batchRecordId,
        priority: form.priority,
        scheduledStart:
          BigInt(new Date(form.scheduledStart).getTime()) * BigInt(1_000_000),
        assignedTo: Principal.anonymous(),
      });
      toast.success("Work order created");
      setModalOpen(false);
      setForm({
        description: "",
        batchRecordId: "",
        priority: "Medium",
        scheduledStart: "",
      });
    } catch {
      toast.error("Failed to create work order");
    }
  };

  return (
    <div className="space-y-5" data-ocid="work_orders.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            {workOrders.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="workOrders.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2"
            data-ocid="work_orders.new.button"
          >
            <Plus size={15} /> New Work Order
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="work_orders.loading_state"
          >
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <table className="w-full" data-ocid="work_orders.table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  "WO ID",
                  "Batch",
                  "Description",
                  "Priority",
                  "Status",
                  "Scheduled Start",
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
              {workOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground text-[13px]"
                    data-ocid="work_orders.empty_state"
                  >
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo, i) => {
                  const startDate = new Date(
                    Number(wo.scheduledStart / BigInt(1_000_000)),
                  );
                  return (
                    <motion.tr
                      key={wo.workOrderId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                      data-ocid={`work_orders.item.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">
                        {wo.workOrderId}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {wo.batchRecordId}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground max-w-[240px]">
                        <span className="line-clamp-2">{wo.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <WorkOrderStatusBadge status={wo.status} />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {startDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[12px] h-7 px-2 text-primary"
                        >
                          View
                        </Button>
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
        <DialogContent data-ocid="work_orders.new.modal">
          <DialogHeader>
            <DialogTitle>New Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                data-ocid="work_orders.description.textarea"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the work to be done"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Batch Record ID</Label>
                <Input
                  data-ocid="work_orders.batch_id.input"
                  value={form.batchRecordId}
                  onChange={(e) =>
                    setForm({ ...form, batchRecordId: e.target.value })
                  }
                  placeholder="B-2026-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger data-ocid="work_orders.priority.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Start</Label>
              <Input
                data-ocid="work_orders.scheduled_start.input"
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) =>
                  setForm({ ...form, scheduledStart: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="work_orders.new.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.description || !form.scheduledStart || createWO.isPending
              }
              data-ocid="work_orders.new.submit_button"
            >
              {createWO.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpPanel
        title={helpContent.workOrders.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.workOrders.sections}
      />
    </div>
  );
}
