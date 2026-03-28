import { Badge } from "@/components/ui/badge";
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
import { Principal } from "@icp-sdk/core/principal";
import { HelpCircle, Loader2, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { PersonnelRole } from "../backend";
import { HelpPanel } from "../components/HelpPanel";
import { StatusBadge } from "../components/StatusBadge";
import { helpContent } from "../data/helpContent";
import { useAddPersonnel, useAllPersonnel } from "../hooks/useQueries";

const roleLabel: Record<PersonnelRole, string> = {
  [PersonnelRole.admin]: "Admin",
  [PersonnelRole.productionManager]: "Production Manager",
  [PersonnelRole.operator]: "Operator",
  [PersonnelRole.qaInspector]: "QA Inspector",
};

export default function Personnel() {
  const { data: personnel = [], isLoading } = useAllPersonnel();
  const addPersonnel = useAddPersonnel();
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: PersonnelRole.operator,
    certifications: "",
  });

  const filtered = personnel.filter((p) => {
    if (roleFilter === "all") return true;
    return p.role === roleFilter;
  });

  const handleSubmit = async () => {
    try {
      await addPersonnel.mutateAsync({
        name: form.name,
        role: form.role,
        certifications: form.certifications
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        principalId: Principal.anonymous(),
      });
      toast.success("Personnel added");
      setModalOpen(false);
      setForm({ name: "", role: PersonnelRole.operator, certifications: "" });
    } catch {
      toast.error("Failed to add personnel");
    }
  };

  return (
    <div className="space-y-5" data-ocid="personnel.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Personnel</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            {personnel.filter((p) => p.isActive).length} active members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setHelpOpen(true)}
            data-ocid="personnel.help.button"
          >
            <HelpCircle size={15} /> Help
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2"
            data-ocid="personnel.add.button"
          >
            <Plus size={15} /> Add Personnel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {["all", ...Object.values(PersonnelRole)].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            data-ocid="personnel.filter.tab"
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              roleFilter === role
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {role === "all"
              ? "All"
              : (roleLabel[role as PersonnelRole] ?? role)}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="personnel.loading_state"
          >
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <table className="w-full" data-ocid="personnel.table">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Name", "Role", "Certifications", "Status"].map((h) => (
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
                    colSpan={4}
                    className="text-center py-16 text-muted-foreground text-[13px]"
                    data-ocid="personnel.empty_state"
                  >
                    No personnel found.
                  </td>
                </tr>
              ) : (
                filtered.map((person, i) => (
                  <motion.tr
                    key={`${person.name}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    data-ocid={`personnel.item.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-semibold">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="text-[13px] font-semibold text-foreground">
                          {person.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                      {roleLabel[person.role] ?? person.role}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {person.certifications.map((cert) => (
                          <Badge
                            key={cert}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        variant={person.isActive ? "green" : "gray"}
                        label={person.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="personnel.add.modal">
          <DialogHeader>
            <DialogTitle>Add Personnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                data-ocid="personnel.name.input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Sarah Chen"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm({ ...form, role: v as PersonnelRole })
                }
              >
                <SelectTrigger data-ocid="personnel.role.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PersonnelRole).map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Certifications (comma-separated)</Label>
              <Input
                data-ocid="personnel.certifications.input"
                value={form.certifications}
                onChange={(e) =>
                  setForm({ ...form, certifications: e.target.value })
                }
                placeholder="GMP Certified, QA Inspector Level 2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="personnel.add.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || addPersonnel.isPending}
              data-ocid="personnel.add.submit_button"
            >
              {addPersonnel.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Personnel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpPanel
        title={helpContent.personnel.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.personnel.sections}
      />
    </div>
  );
}
