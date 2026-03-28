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
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Circle,
  Database,
  HelpCircle,
  Loader2,
  Plus,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { EquipmentStatus } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { EquipmentStatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAddEquipment, useAllEquipment } from "../hooks/useQueries";

const statusDotColor: Record<EquipmentStatus, string> = {
  [EquipmentStatus.available]: "text-green-500 fill-green-500",
  [EquipmentStatus.inUse]: "text-blue-500 fill-blue-500",
  [EquipmentStatus.cleaning]: "text-amber-500 fill-amber-500",
  [EquipmentStatus.maintenance]: "text-amber-500 fill-amber-500",
};

export default function EquipmentPage() {
  const navigate = useNavigate();
  const { data: equipment = [], isLoading } = useAllEquipment();
  const addEquipment = useAddEquipment();
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    equipmentType: "",
    location: "",
    notes: "",
  });

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

      {isLoading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="equipment.loading_state"
        >
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
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
