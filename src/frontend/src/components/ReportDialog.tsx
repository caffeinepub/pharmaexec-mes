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
import XLSX from "@/lib/xlsx-shim";
import { Download, FileSpreadsheet } from "lucide-react";
import React, { useMemo, useState } from "react";

type EntityType =
  | "WorkCenter"
  | "Room"
  | "Station"
  | "SubStation"
  | "EquipmentClass"
  | "EquipmentEntity"
  | "PropertyType"
  | "ProductMaster";

interface ChangeEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  action?: "Create" | "Update" | "Delete";
  reason?: string;
}

interface EquipmentNode {
  id: string;
  identifier: string;
  shortDescription: string;
  description: string;
  level: string;
  entityType: EntityType;
  parentId: string | null;
  disposed: boolean;
  createdAt: string;
  changeHistory: ChangeEntry[];
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  WorkCenter: "Work Center",
  Room: "Room",
  Station: "Station",
  SubStation: "Sub-Station",
  EquipmentClass: "Equipment Class",
  EquipmentEntity: "Equipment Entity",
  PropertyType: "Property Type",
  ProductMaster: "Product Master",
};

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nodes: EquipmentNode[];
}

export function ReportDialog({ open, onOpenChange, nodes }: ReportDialogProps) {
  const [filterEntityType, setFilterEntityType] = useState<"all" | EntityType>(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "disposed"
  >("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (filterEntityType !== "all" && node.entityType !== filterEntityType)
        return false;
      if (filterStatus === "active" && node.disposed) return false;
      if (filterStatus === "disposed" && !node.disposed) return false;
      return true;
    });
  }, [nodes, filterEntityType, filterStatus]);

  const filteredLogbook = useMemo(() => {
    const entries: Array<{ node: EquipmentNode; entry: ChangeEntry }> = [];
    for (const node of filteredNodes) {
      for (const entry of node.changeHistory) {
        if (filterDateFrom && entry.timestamp < filterDateFrom) continue;
        if (filterDateTo && entry.timestamp > `${filterDateTo}T23:59:59`)
          continue;
        if (
          filterUser.trim() &&
          !entry.changedBy
            .toLowerCase()
            .includes(filterUser.trim().toLowerCase())
        )
          continue;
        entries.push({ node, entry });
      }
    }
    return entries;
  }, [filteredNodes, filterDateFrom, filterDateTo, filterUser]);

  function handleGenerate() {
    setIsGenerating(true);
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Entity Master
      const entityRows = filteredNodes.map((node) => {
        const parent = node.parentId
          ? nodes.find((n) => n.id === node.parentId)
          : null;
        const lastChange = node.changeHistory[node.changeHistory.length - 1];
        return {
          "Entity Type": ENTITY_TYPE_LABELS[node.entityType],
          Identifier: node.identifier,
          Name: node.shortDescription,
          Description: node.description,
          Level: node.level,
          Parent: parent ? parent.shortDescription : "—",
          Status: node.disposed ? "Disposed" : "Active",
          "Created Date": new Date(node.createdAt).toLocaleString(),
          "Modified Date": lastChange
            ? new Date(lastChange.timestamp).toLocaleString()
            : new Date(node.createdAt).toLocaleString(),
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(
        entityRows.length > 0
          ? entityRows
          : [
              {
                "Entity Type": "",
                Identifier: "",
                Name: "",
                Description: "",
                Level: "",
                Parent: "",
                Status: "",
                "Created Date": "",
                "Modified Date": "",
              },
            ],
      );
      XLSX.utils.book_append_sheet(wb, ws1, "Entity Master");

      // Sheet 2: Logbook
      const logRows = filteredLogbook.map(({ node, entry }) => ({
        "Entity ID": node.identifier,
        "Entity Name": node.shortDescription,
        "Entity Type": ENTITY_TYPE_LABELS[node.entityType],
        Action: entry.action ?? "Update",
        "Field Changed": entry.field,
        "Old Value": entry.oldValue,
        "New Value": entry.newValue,
        "Changed By": entry.changedBy,
        Timestamp: new Date(entry.timestamp).toLocaleString(),
        Reason: entry.reason ?? "—",
      }));
      const ws2 = XLSX.utils.json_to_sheet(
        logRows.length > 0
          ? logRows
          : [
              {
                "Entity ID": "",
                "Entity Name": "",
                "Entity Type": "",
                Action: "",
                "Field Changed": "",
                "Old Value": "",
                "New Value": "",
                "Changed By": "",
                Timestamp: "",
                Reason: "",
              },
            ],
      );
      XLSX.utils.book_append_sheet(wb, ws2, "Logbook");

      // Sheet 3: Summary
      const breakdownByType = (
        Object.keys(ENTITY_TYPE_LABELS) as EntityType[]
      ).map((type) => ({
        "Entity Type": ENTITY_TYPE_LABELS[type],
        Count: filteredNodes.filter((n) => n.entityType === type).length,
      }));

      const summaryRows = [
        { Key: "Export Date", Value: new Date().toLocaleString() },
        {
          Key: "Date Range",
          Value:
            filterDateFrom || filterDateTo
              ? `${filterDateFrom || "Start"} to ${filterDateTo || "End"}`
              : "All time",
        },
        {
          Key: "Entity Type Filter",
          Value:
            filterEntityType === "all"
              ? "All Types"
              : ENTITY_TYPE_LABELS[filterEntityType],
        },
        {
          Key: "Status Filter",
          Value:
            filterStatus === "all"
              ? "All"
              : filterStatus === "active"
                ? "Active"
                : "Disposed",
        },
        { Key: "User Filter", Value: filterUser.trim() || "All Users" },
        { Key: "Total Entities Exported", Value: filteredNodes.length },
        { Key: "Total Logbook Entries", Value: filteredLogbook.length },
        { Key: "", Value: "" },
        { Key: "Breakdown by Entity Type", Value: "" },
        ...breakdownByType.map((r) => ({
          Key: r["Entity Type"],
          Value: r.Count,
        })),
      ];
      const ws3 = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws3, "Summary");

      XLSX.writeFile(wb, `PharmaExec_Report_${Date.now()}.xlsx`);
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-ocid="report.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <FileSpreadsheet size={16} className="text-green-600" />
            Generate Excel Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] text-muted-foreground">
                Entity Type
              </Label>
              <Select
                value={filterEntityType}
                onValueChange={(v) =>
                  setFilterEntityType(v as "all" | EntityType)
                }
              >
                <SelectTrigger
                  className="h-8 text-[12px]"
                  data-ocid="report.entity_type_filter.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">
                    All Types
                  </SelectItem>
                  {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(
                    (type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="text-[12px]"
                      >
                        {ENTITY_TYPE_LABELS[type]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] text-muted-foreground">
                Status
              </Label>
              <Select
                value={filterStatus}
                onValueChange={(v) =>
                  setFilterStatus(v as "all" | "active" | "disposed")
                }
              >
                <SelectTrigger
                  className="h-8 text-[12px]"
                  data-ocid="report.status_filter.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">
                    All
                  </SelectItem>
                  <SelectItem value="active" className="text-[12px]">
                    Active
                  </SelectItem>
                  <SelectItem value="disposed" className="text-[12px]">
                    Disposed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] text-muted-foreground">
                Date From
              </Label>
              <Input
                type="date"
                className="h-8 text-[12px]"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                data-ocid="report.date_from.input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] text-muted-foreground">
                Date To
              </Label>
              <Input
                type="date"
                className="h-8 text-[12px]"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                data-ocid="report.date_to.input"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-[12px] text-muted-foreground">
                Filter by User
              </Label>
              <Input
                placeholder="e.g. operator1"
                className="h-8 text-[12px]"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                data-ocid="report.user_filter.input"
              />
            </div>
          </div>

          {/* Preview summary */}
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-[12px] space-y-1">
            <p className="font-medium text-[12px] text-foreground mb-1">
              Export Preview
            </p>
            <div className="flex justify-between text-muted-foreground">
              <span>Entities</span>
              <span className="font-semibold text-foreground">
                {filteredNodes.length}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Logbook Entries</span>
              <span className="font-semibold text-foreground">
                {filteredLogbook.length}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Sheets</span>
              <span className="font-semibold text-foreground">
                3 (Entity Master, Logbook, Summary)
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-ocid="report.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleGenerate}
            disabled={isGenerating || filteredNodes.length === 0}
            data-ocid="report.submit_button"
          >
            <Download size={13} />
            {isGenerating ? "Generating..." : "Generate & Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
