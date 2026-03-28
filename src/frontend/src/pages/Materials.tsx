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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Loader2, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { MaterialStatus } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { MaterialStatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAddMaterial, useAllMaterials } from "../hooks/useQueries";

export default function Materials() {
  const { data: materials = [], isLoading } = useAllMaterials();
  const addMaterial = useAddMaterial();
  const [filter, setFilter] = useState("all");
  const [helpOpen, setHelpOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lotNumber: "",
    quantity: "",
    unit: "kg",
    storageLocation: "",
    expiryDate: "",
  });

  const filtered = materials.filter((m) => {
    if (filter === "all") return true;
    return m.materialStatus === filter;
  });

  const handleSubmit = async () => {
    try {
      await addMaterial.mutateAsync({
        name: form.name,
        lotNumber: form.lotNumber,
        quantity: Number(form.quantity),
        unit: form.unit,
        storageLocation: form.storageLocation,
        expiryDate:
          BigInt(new Date(form.expiryDate).getTime()) * BigInt(1_000_000),
      });
      toast.success("Material received");
      setModalOpen(false);
      setForm({
        name: "",
        lotNumber: "",
        quantity: "",
        unit: "kg",
        storageLocation: "",
        expiryDate: "",
      });
    } catch {
      toast.error("Failed to receive material");
    }
  };

  return (
    <div className="space-y-5" data-ocid="materials.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Materials</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            {materials.length} total items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="materials.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2"
            data-ocid="materials.receive.button"
          >
            <Plus size={15} /> Receive Material
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList data-ocid="materials.filter.tab">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value={MaterialStatus.released}>Released</TabsTrigger>
          <TabsTrigger value={MaterialStatus.quarantine}>
            Quarantine
          </TabsTrigger>
          <TabsTrigger value={MaterialStatus.consumed}>Consumed</TabsTrigger>
          <TabsTrigger value={MaterialStatus.rejected}>Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="materials.loading_state"
          >
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <table className="w-full" data-ocid="materials.table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  "Material ID",
                  "Name",
                  "Lot Number",
                  "Quantity",
                  "Expiry",
                  "Location",
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-16 text-muted-foreground text-[13px]"
                    data-ocid="materials.empty_state"
                  >
                    No materials found.
                  </td>
                </tr>
              ) : (
                filtered.map((mat, i) => {
                  const expiry = new Date(
                    Number(mat.expiryDate / BigInt(1_000_000)),
                  );
                  const isExpiringSoon =
                    expiry < new Date(Date.now() + 90 * 86400000);
                  return (
                    <motion.tr
                      key={mat.materialId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                      data-ocid={`materials.item.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">
                        {mat.materialId}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">
                        {mat.name}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground font-mono">
                        {mat.lotNumber}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">
                        {mat.quantity.toLocaleString()} {mat.unit}
                      </td>
                      <td
                        className={`px-4 py-3 text-[12px] ${isExpiringSoon ? "text-destructive font-medium" : "text-muted-foreground"}`}
                      >
                        {expiry.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {isExpiringSoon && " ⚠️"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {mat.storageLocation}
                      </td>
                      <td className="px-4 py-3">
                        <MaterialStatusBadge status={mat.materialStatus} />
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
        <DialogContent data-ocid="materials.receive.modal">
          <DialogHeader>
            <DialogTitle>Receive Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Material Name</Label>
              <Input
                data-ocid="materials.name.input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Amoxicillin Trihydrate API"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lot Number</Label>
                <Input
                  data-ocid="materials.lot_number.input"
                  value={form.lotNumber}
                  onChange={(e) =>
                    setForm({ ...form, lotNumber: e.target.value })
                  }
                  placeholder="LOT-XXXX-2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    data-ocid="materials.quantity.input"
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    placeholder="500"
                  />
                  <Select
                    value={form.unit}
                    onValueChange={(v) => setForm({ ...form, unit: v })}
                  >
                    <SelectTrigger
                      className="w-24"
                      data-ocid="materials.unit.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="Units">Units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Storage Location</Label>
                <Input
                  data-ocid="materials.location.input"
                  value={form.storageLocation}
                  onChange={(e) =>
                    setForm({ ...form, storageLocation: e.target.value })
                  }
                  placeholder="Cold Storage A"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input
                  data-ocid="materials.expiry.input"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm({ ...form, expiryDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="materials.receive.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.name ||
                !form.quantity ||
                !form.expiryDate ||
                addMaterial.isPending
              }
              data-ocid="materials.receive.submit_button"
            >
              {addMaterial.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Receive Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpPanel
        title={helpContent.materials.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.materials.sections}
      />
    </div>
  );
}
