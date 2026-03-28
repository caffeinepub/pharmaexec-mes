import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  Grid3x3,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutGrid,
  Link2,
  Minus,
  MoreHorizontal,
  Move,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Settings,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type DialogType =
  | "none"
  | "changeStatus"
  | "statusHistory"
  | "openDialog"
  | "electronicSignature"
  | "statistics"
  | "about";

interface WFNode {
  id: string;
  type: "start" | "end" | "phase" | "transition";
  label: string;
  x: number;
  y: number;
  selected?: boolean;
  equip?: number;
  process?: number;
  binding?: number;
  status?: number;
}

interface WFEdge {
  from: string;
  to: string;
  type?: "normal" | "selection" | "simultaneous";
  condition?: string;
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  children?: TreeNode[];
  status?: string;
}

// ── Sample Data ───────────────────────────────────────────────────────────────
const WORKFLOW_TABS = [
  {
    id: "wf1",
    label: "WF-WEIGH-001 [1] (1) [Weighing]",
    type: "workflow",
    unsaved: false,
  },
  {
    id: "wf2",
    label: "WF-GRAN-002 [1] (1) [Granulation]",
    type: "workflow",
    unsaved: true,
  },
];

const WF_NODES: WFNode[] = [
  { id: "start", type: "start", label: "Start", x: 220, y: 30 },
  {
    id: "n1",
    type: "phase",
    label: "Identify Equipment",
    x: 140,
    y: 100,
    equip: 1,
    process: 1,
    binding: 1,
    status: 0,
  },
  {
    id: "n2",
    type: "phase",
    label: "Get Process Value",
    x: 140,
    y: 200,
    equip: 1,
    process: 2,
    binding: 1,
    status: 0,
  },
  {
    id: "n3",
    type: "phase",
    label: "Start Timer",
    x: 140,
    y: 300,
    equip: 0,
    process: 1,
    binding: 0,
    status: 0,
  },
  { id: "t1", type: "transition", label: "", x: 212, y: 390 },
  // Left branch
  {
    id: "n4",
    type: "phase",
    label: "In-Process Checks",
    x: 80,
    y: 460,
    equip: 2,
    process: 3,
    binding: 1,
    status: 0,
    selected: true,
  },
  {
    id: "n5",
    type: "phase",
    label: "Evaluate Timer",
    x: 80,
    y: 560,
    equip: 0,
    process: 2,
    binding: 0,
    status: 0,
  },
  // Right branch
  {
    id: "nr1",
    type: "phase",
    label: "Monitor Equipment",
    x: 310,
    y: 460,
    equip: 1,
    process: 1,
    binding: 1,
    status: 0,
  },
  { id: "t2", type: "transition", label: "", x: 212, y: 660 },
  {
    id: "n6",
    type: "phase",
    label: "Get Machine Data",
    x: 140,
    y: 730,
    equip: 1,
    process: 2,
    binding: 1,
    status: 0,
  },
  {
    id: "n7",
    type: "phase",
    label: "Perform Transition",
    x: 140,
    y: 830,
    equip: 1,
    process: 1,
    binding: 1,
    status: 0,
  },
  {
    id: "n8",
    type: "phase",
    label: "Make Logbook Entry",
    x: 140,
    y: 930,
    equip: 0,
    process: 1,
    binding: 0,
    status: 0,
  },
  { id: "end", type: "end", label: "End", x: 220, y: 1020 },
];

const WF_EDGES: WFEdge[] = [
  { from: "start", to: "n1" },
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "t1" },
  // Left branch
  { from: "t1", to: "n4", condition: "CONDITION" },
  { from: "n4", to: "n5" },
  { from: "n5", to: "t2" },
  // Right branch
  { from: "t1", to: "nr1", condition: "CONDITION" },
  { from: "nr1", to: "t2" },
  // Merge and continue
  { from: "t2", to: "n6" },
  { from: "n6", to: "n7" },
  { from: "n7", to: "n8" },
  { from: "n8", to: "end" },
];

const EXPLORER_TREE: TreeNode[] = [
  {
    id: "wf1",
    label: "WF-WEIGH-001",
    type: "workflow",
    children: [
      {
        id: "up1",
        label: "Weighing Unit Procedure",
        type: "unitprocedure",
        children: [
          {
            id: "op1",
            label: "Weighing Operation",
            type: "operation",
            status: "active",
            children: [
              { id: "ph1", label: "Identify Equipment", type: "phase" },
              { id: "ph2", label: "Get Process Value", type: "phase" },
              { id: "ph3", label: "Start Timer", type: "phase" },
              { id: "ph4", label: "In-Process Checks", type: "phase" },
              { id: "ph5", label: "Evaluate Timer", type: "phase" },
              { id: "ph6", label: "Get Machine Data", type: "phase" },
              { id: "ph7", label: "Perform Transition", type: "phase" },
              { id: "ph8", label: "Make Logbook Entry", type: "phase" },
            ],
          },
        ],
      },
    ],
  },
];

const SETLIST_EQUIPMENT_PHASES = [
  "D-Identify Equipment",
  "D-Get Process Value",
  "D-Timer Start",
  "D-Timer Evaluate",
  "D-In-Process Check",
  "D-Get Machine Data",
  "D-Transition Phase",
  "D-Logbook Entry",
  "D-Equipment Release",
  "D-Bind Equipment",
  "D-Unbind Equipment",
];

const MESSAGES_DATA = [
  {
    id: "0031WF",
    type: "warning",
    text: "Phase 'In-Process Checks' has equipment binding but no class assigned.",
    element: "n4",
  },
  {
    id: "0012WF",
    type: "warning",
    text: "Transition condition at T2 is undefined — will evaluate as TRUE.",
    element: "t2",
  },
  {
    id: "0003WF",
    type: "info",
    text: "'Make Logbook Entry' is optional and can be disabled at runtime.",
    element: "n8",
  },
];

const COMPARISON_DATA = [
  {
    category: "added",
    type: "Phase",
    id: "In-Process Checks",
    attribute: "Equipment Binding",
    newVal: "Mixer-GR-01",
    oldVal: "",
  },
  {
    category: "changed",
    type: "Process parameter",
    id: "Timer Duration",
    attribute: "Default value",
    newVal: "3600",
    oldVal: "1800",
  },
  {
    category: "removed",
    type: "Transition",
    id: "T2-Completed",
    attribute: "Expression",
    newVal: "",
    oldVal: "={Timer}/{Elapsed}",
  },
];

const STATUS_HISTORY_DATA = [
  {
    ts: "2024-02-10 08:15:22",
    action: "Submit for verification",
    toStatus: "Verification",
    toVersion: "1 (1)",
    validFrom: "2024-02-10",
    validTo: "9999-12-30",
    signature: "Dr. Chen",
    comment: "Initial version review",
    db: "PHARMAEXEC_PROD",
  },
  {
    ts: "2024-01-20 14:33:05",
    action: "Create",
    toStatus: "Edit",
    toVersion: "1 (1)",
    validFrom: "",
    validTo: "",
    signature: "",
    comment: "Created from template",
    db: "PHARMAEXEC_PROD",
  },
];

const OPEN_WORKFLOWS = [
  {
    id: "wf1",
    identifier: "WF-WEIGH-001",
    description: "Weighing Workflow",
    status: "Valid",
    version: "1 (1)",
    product: "Sonolin Retard 100",
  },
  {
    id: "wf2",
    identifier: "WF-GRAN-002",
    description: "Granulation Workflow",
    status: "Edit",
    version: "1 (1)",
    product: "Sonolin Retard 100",
  },
  {
    id: "wf3",
    identifier: "WF-BLEND-003",
    description: "Blending Workflow",
    status: "Valid",
    version: "2 (3)",
    product: "Acetylsalicylic 500",
  },
  {
    id: "wf4",
    identifier: "WF-COMP-004",
    description: "Compression Workflow",
    status: "Obsolete",
    version: "1 (2)",
    product: "Acetylsalicylic 500",
  },
  {
    id: "wf5",
    identifier: "WF-COAT-005",
    description: "Coating Workflow",
    status: "Verification",
    version: "1 (1)",
    product: "Metformin HCL 850",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const NODE_W = 140;
const NODE_H = 40;
const CX = 220;

function getNodeCenter(n: WFNode) {
  if (n.type === "start" || n.type === "end") return { x: CX, y: n.y + 15 };
  if (n.type === "transition") return { x: CX, y: n.y + 8 };
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
}

// ── Toolbar Button ─────────────────────────────────────────────────────────────
function TBtn({
  icon,
  tooltip,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded hover:bg-gray-300 active:bg-gray-400 disabled:opacity-40 disabled:cursor-not-allowed",
              active && "bg-blue-200 hover:bg-blue-300",
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── SFC Canvas ─────────────────────────────────────────────────────────────────
function WFSFCCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: WFNode[];
  edges: WFEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodeMap: Record<string, WFNode> = {};
  for (const n of nodes) nodeMap[n.id] = n;

  return (
    <svg
      role="img"
      aria-label="Workflow SFC Graph"
      width="520"
      height="1100"
      style={{ display: "block" }}
    >
      {/* Edges */}
      {edges.map((e) => {
        const fn = nodeMap[e.from];
        const tn = nodeMap[e.to];
        if (!fn || !tn) return null;
        const fc = getNodeCenter(fn);
        const tc = getNodeCenter(tn);
        const fx = fc.x;
        let fy = fc.y;
        let ty = tc.y;
        if (
          fn.type !== "start" &&
          fn.type !== "end" &&
          fn.type !== "transition"
        )
          fy = fn.y + NODE_H;
        if (
          tn.type !== "start" &&
          tn.type !== "end" &&
          tn.type !== "transition"
        )
          ty = tn.y;
        const tx = tc.x;
        const isLShaped = Math.abs(fx - tx) > 5;
        const midY = (fy + ty) / 2;
        return (
          <g key={`${e.from}-${e.to}`}>
            {isLShaped ? (
              <path
                d={`M ${fx},${fy} L ${fx},${midY} L ${tx},${midY} L ${tx},${ty - 6}`}
                fill="none"
                stroke="#555"
                strokeWidth={1.5}
              />
            ) : (
              <line
                x1={fx}
                y1={fy}
                x2={fx}
                y2={ty - 6}
                stroke="#555"
                strokeWidth={1.5}
              />
            )}
            <polygon
              points={`${tx},${ty} ${tx - 4},${ty - 8} ${tx + 4},${ty - 8}`}
              fill="#555"
            />
            {e.condition &&
              (() => {
                const bx = isLShaped ? (fx + tx) / 2 : fx;
                const by = isLShaped ? midY : (fy + ty) / 2;
                const bw = 68;
                const bh = 14;
                return (
                  <g>
                    <rect
                      x={bx - bw / 2}
                      y={by - bh / 2}
                      width={bw}
                      height={bh}
                      fill="#C0392B"
                      rx={2}
                    />
                    <text
                      x={bx}
                      y={by + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize={9}
                      fontWeight="bold"
                      fontFamily="Arial, sans-serif"
                    >
                      {e.condition}
                    </text>
                  </g>
                );
              })()}
          </g>
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const isSelected = selectedId === n.id || n.selected;
        if (n.type === "start") {
          return (
            <g
              key={n.id}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <ellipse cx={CX} cy={n.y + 15} rx={28} ry={14} fill="#1a4480" />
              <text
                x={CX}
                y={n.y + 19}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight="bold"
              >
                Start
              </text>
            </g>
          );
        }
        if (n.type === "end") {
          return (
            <g
              key={n.id}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <ellipse
                cx={CX}
                cy={n.y + 15}
                rx={28}
                ry={14}
                fill="#1a4480"
                stroke="#1a4480"
                strokeWidth={3}
              />
              <ellipse cx={CX} cy={n.y + 15} rx={22} ry={10} fill="#2e6fba" />
              <text
                x={CX}
                y={n.y + 19}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight="bold"
              >
                End
              </text>
            </g>
          );
        }
        if (n.type === "transition") {
          return (
            <g
              key={n.id}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={CX - 8}
                y={n.y}
                width={16}
                height={16}
                fill="white"
                stroke="#555"
                strokeWidth={1.5}
              />
            </g>
          );
        }
        // Phase node
        const nx = n.x;
        const ny = n.y;
        return (
          <g
            key={n.id}
            onClick={() => onSelect(n.id)}
            onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
              if (e.key === "Enter") onSelect(n.id);
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={nx}
              y={ny}
              width={NODE_W}
              height={NODE_H}
              fill={isSelected ? "#EBF5FB" : "#F0F8FF"}
              stroke={isSelected ? "#1a4480" : "#7F8C8D"}
              strokeWidth={isSelected ? 2 : 1}
              rx={2}
            />
            <text
              x={nx + NODE_W / 2}
              y={ny + NODE_H / 2 - 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="500"
              fill="#1a1a1a"
            >
              {n.label}
            </text>
            {/* Top-left: equipment binding */}
            <rect
              x={nx}
              y={ny}
              width={18}
              height={16}
              fill="#D5F5E3"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + 9}
              y={ny + 11}
              textAnchor="middle"
              fontSize={9}
              fill={n.equip === 0 ? "#7F8C8D" : "#1E8449"}
            >
              {n.equip ?? "-"}
            </text>
            {/* Bottom-left: binding indicator */}
            <rect
              x={nx}
              y={ny + NODE_H - 16}
              width={18}
              height={16}
              fill="#D6EAF8"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + 9}
              y={ny + NODE_H - 5}
              textAnchor="middle"
              fontSize={9}
              fill={n.binding === 0 ? "#7F8C8D" : "#154360"}
            >
              {n.binding ?? "-"}
            </text>
            {/* Top-right: process params */}
            <rect
              x={nx + NODE_W - 18}
              y={ny}
              width={18}
              height={16}
              fill="#FEF9E7"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + NODE_W - 9}
              y={ny + 11}
              textAnchor="middle"
              fontSize={9}
              fill="#7D6608"
            >
              {n.process ?? "-"}
            </text>
            {/* Bottom-right: status */}
            <rect
              x={nx + NODE_W - 18}
              y={ny + NODE_H - 16}
              width={18}
              height={16}
              fill="#FDEDEC"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + NODE_W - 9}
              y={ny + NODE_H - 5}
              textAnchor="middle"
              fontSize={9}
              fill="#922B21"
            >
              {n.status ?? "-"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Explorer Tree Node ─────────────────────────────────────────────────────────
function ExplorerNode({
  node,
  level,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  level: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const typeColors: Record<string, string> = {
    workflow: "text-blue-800",
    unitprocedure: "text-violet-700",
    operation: "text-emerald-700",
    phase: "text-gray-700",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    workflow: <GitBranch size={11} />,
    unitprocedure: <LayoutGrid size={11} />,
    operation: <Settings size={11} />,
    phase: <Square size={10} />,
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-0.5 py-0.5 px-1 cursor-pointer text-xs select-none rounded-sm",
          isSelected ? "bg-blue-800 text-white" : "hover:bg-gray-200",
          node.status === "active" && !isSelected && "font-bold text-blue-900",
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter") {
            onSelect(node.id);
            if (hasChildren) onToggle(node.id);
          }
        }}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard accessible tree node
        tabIndex={0}
      >
        {hasChildren ? (
          <span className="w-3 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
          </span>
        ) : (
          <span className="w-3" />
        )}
        <span
          className={cn(
            "mr-0.5 flex-shrink-0",
            isSelected
              ? "text-white"
              : (typeColors[node.type] ?? "text-gray-600"),
          )}
        >
          {typeIcons[node.type] ?? <Square size={10} />}
        </span>
        <span className="truncate">{node.label}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <ExplorerNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Electronic Signature Dialog ───────────────────────────────────────────────
function ElectronicSignatureDialog({
  open,
  onClose,
  onSign,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onSign: () => void;
  description: string;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-ocid="wf_signature.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Electronic Signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="text-gray-500">{description}</p>
          <div>
            <Label className="text-xs">User name *</Label>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="h-7 text-xs mt-0.5"
              data-ocid="wf_signature.user.input"
            />
          </div>
          <div>
            <Label className="text-xs">Password *</Label>
            <Input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="h-7 text-xs mt-0.5"
              data-ocid="wf_signature.password.input"
            />
          </div>
          <div>
            <Label className="text-xs">Comment</Label>
            <Textarea
              className="text-xs h-16 mt-0.5 resize-none"
              placeholder="Optional comment..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_signature.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              onSign();
              onClose();
            }}
            disabled={!user || !pass}
            data-ocid="wf_signature.confirm_button"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Status Dialog ──────────────────────────────────────────────────────
function ChangeStatusDialog({
  open,
  onClose,
  onConfirm,
}: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [action, setAction] = useState("submit_verification");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl" data-ocid="wf_changestatus.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Change Status of WF-WEIGH-001
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-500">Identifier:</span>
              <br />
              <strong>WF-WEIGH-001</strong>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>
              <br />
              <strong>1 (1)</strong>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <br />
              <Badge variant="outline" className="text-xs">
                Edit
              </Badge>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Weighing Workflow – Sonolin Retard 100
          </div>
          <hr />
          <div>
            <Label className="text-xs">Action *</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger
                className="h-7 text-xs mt-0.5"
                data-ocid="wf_changestatus.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submit_verification" className="text-xs">
                  Submit for verification (Verification)
                </SelectItem>
                <SelectItem value="set_valid" className="text-xs">
                  Set valid (Valid)
                </SelectItem>
                <SelectItem value="set_obsolete" className="text-xs">
                  Set obsolete (Obsolete)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Valid from</Label>
              <Input
                type="date"
                className="h-7 text-xs mt-0.5"
                defaultValue="2024-03-15"
              />
            </div>
            <div>
              <Label className="text-xs">Valid to</Label>
              <Input
                type="date"
                className="h-7 text-xs mt-0.5"
                defaultValue="9999-12-30"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1">Available Versions</p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-6 text-xs">Status</TableHead>
                  <TableHead className="h-6 text-xs">Version</TableHead>
                  <TableHead className="h-6 text-xs">Valid from</TableHead>
                  <TableHead className="h-6 text-xs">Valid to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="text-xs bg-blue-50">
                  <TableCell className="py-1">
                    <Badge variant="outline" className="text-xs">
                      Edit
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1">1 (1)</TableCell>
                  <TableCell className="py-1">-</TableCell>
                  <TableCell className="py-1">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_changestatus.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onConfirm}
            data-ocid="wf_changestatus.confirm_button"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Status History Dialog ─────────────────────────────────────────────────────
function StatusHistoryDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl" data-ocid="wf_statushistory.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Status History of WF-WEIGH-001
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-500">Identifier:</span>{" "}
              <strong>WF-WEIGH-001</strong>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>{" "}
              <strong>1 (1)</strong>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{" "}
              <Badge variant="outline" className="text-xs">
                Edit
              </Badge>
            </div>
          </div>
          <p className="text-gray-500">
            Weighing Workflow – Sonolin Retard 100
          </p>
          <ScrollArea className="h-[300px] border rounded">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  {[
                    "Timestamp",
                    "Action",
                    "To Status",
                    "Version",
                    "Valid from",
                    "Valid to",
                    "Signature",
                    "Comment",
                    "Database",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="h-7 text-xs whitespace-nowrap px-2"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {STATUS_HISTORY_DATA.map((r) => (
                  <TableRow key={r.ts} className="text-xs">
                    <TableCell className="py-1 px-2 whitespace-nowrap">
                      {r.ts}
                    </TableCell>
                    <TableCell className="py-1 px-2">{r.action}</TableCell>
                    <TableCell className="py-1 px-2">
                      <Badge variant="outline" className="text-xs">
                        {r.toStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 px-2">{r.toVersion}</TableCell>
                    <TableCell className="py-1 px-2">
                      {r.validFrom || "-"}
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      {r.validTo || "-"}
                    </TableCell>
                    <TableCell className="py-1 px-2 whitespace-nowrap">
                      {r.signature || "-"}
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      {r.comment || "-"}
                    </TableCell>
                    <TableCell className="py-1 px-2">{r.db}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_statushistory.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Open Workflow Dialog ──────────────────────────────────────────────────────
function OpenWorkflowDialog({
  open,
  onClose,
  onOpen,
}: { open: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const filtered = OPEN_WORKFLOWS.filter(
    (w) =>
      w.identifier.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-ocid="wf_open.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Open Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search size={12} className="text-gray-400" />
            <Input
              className="h-7 text-xs flex-1"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="wf_open.search_input"
            />
          </div>
          <ScrollArea className="h-[280px] border rounded">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  {[
                    "Identifier",
                    "Description",
                    "Status",
                    "Version",
                    "Product",
                  ].map((h) => (
                    <TableHead key={h} className="h-7 text-xs px-2">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow
                    key={w.id}
                    className={cn(
                      "text-xs cursor-pointer",
                      selected === w.id ? "bg-blue-100" : "hover:bg-gray-50",
                    )}
                    onClick={() => setSelected(w.id)}
                    onDoubleClick={() => {
                      onOpen(w.id);
                      onClose();
                    }}
                    data-ocid="wf_open.item.1"
                  >
                    <TableCell className="py-1 px-2 font-mono">
                      {w.identifier}
                    </TableCell>
                    <TableCell className="py-1 px-2">{w.description}</TableCell>
                    <TableCell className="py-1 px-2">
                      <Badge variant="outline" className="text-xs">
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 px-2">{w.version}</TableCell>
                    <TableCell className="py-1 px-2">{w.product}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_open.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            disabled={!selected}
            onClick={() => {
              onOpen(selected);
              onClose();
            }}
            data-ocid="wf_open.confirm_button"
          >
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Statistics Dialog ─────────────────────────────────────────────────────────
function StatisticsDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const stats: [string, number][] = [
    ["Unit Procedures", 1],
    ["Operations", 1],
    ["Phases", 8],
    ["Transitions", 2],
    ["Equipment Bindings", 5],
    ["Process Parameters", 12],
    ["Logbook Parameters", 3],
    ["Timer Parameters", 2],
    ["Scale Configurations", 1],
  ];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-ocid="wf_statistics.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Statistics of WF-WEIGH-001
          </DialogTitle>
        </DialogHeader>
        <Table>
          <TableBody>
            {stats.map(([label, val]) => (
              <TableRow key={label} className="text-xs">
                <TableCell className="py-1 text-gray-600">{label}</TableCell>
                <TableCell className="py-1 font-medium text-right">
                  {val}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs h-7">
            <Copy size={11} className="mr-1" /> Copy to clipboard
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_statistics.close_button"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── About Dialog ──────────────────────────────────────────────────────────────
function AboutDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-ocid="wf_about.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">About PharmaExec MES</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-800 rounded-lg flex items-center justify-center">
              <GitBranch size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">PharmaExec MES</p>
              <p className="text-gray-500">Workflow Designer</p>
              <p className="text-gray-400">Version 8.1.0 (Build 4521)</p>
            </div>
          </div>
          <hr />
          <div className="grid grid-cols-2 gap-1">
            <span className="text-gray-500">User:</span>
            <span>Dr. Sarah Chen</span>
            <span className="text-gray-500">Database:</span>
            <span>PHARMAEXEC_PROD</span>
            <span className="text-gray-500">EBR Server:</span>
            <span className="text-green-600">Available</span>
            <span className="text-gray-500">License:</span>
            <span>Unlimited</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs h-7">
            Details
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="wf_about.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WorkflowDesigner() {
  const navigate = useNavigate();

  // Panel visibility
  const [showMap, setShowMap] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showSetlist, setShowSetlist] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showPhasePreview, setShowPhasePreview] = useState(true);
  const [showMessages, setShowMessages] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  // Graph state
  const [selectedNode, setSelectedNode] = useState<string | null>("n4");
  const [activeTab, setActiveTab] = useState("wf1");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Explorer/tree state
  const [selectedTreeId, setSelectedTreeId] = useState("op1");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["wf1", "up1", "op1"]),
  );

  // Bottom panel state
  const [bottomTab, setBottomTab] = useState("messages");
  const [msgFilter, setMsgFilter] = useState({
    errors: true,
    warnings: true,
    info: true,
  });
  const [cmpFilter, setCmpFilter] = useState({
    added: true,
    changed: true,
    removed: true,
  });

  // Dialog state
  const [dialog, setDialog] = useState<DialogType>("none");
  const [sigDialog, setSigDialog] = useState(false);
  const [sigDescription, setSigDescription] = useState("");

  // Property panel tab
  const [propTab, setPropTab] = useState("header");

  const toggleTree = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleChangeStatus = () => setDialog("changeStatus");

  const handleStatusConfirm = () => {
    setDialog("none");
    setSigDescription(
      "Submit for verification: WF-WEIGH-001 [1] → Verification status",
    );
    setSigDialog(true);
  };

  const handleSigned = () =>
    toast.success("Workflow status changed to Verification.");

  const filteredMessages = MESSAGES_DATA.filter((m) => {
    if (m.type === "error" && !msgFilter.errors) return false;
    if (m.type === "warning" && !msgFilter.warnings) return false;
    if (m.type === "info" && !msgFilter.info) return false;
    return true;
  });

  const filteredComparison = COMPARISON_DATA.filter((r) => {
    if (r.category === "added" && !cmpFilter.added) return false;
    if (r.category === "changed" && !cmpFilter.changed) return false;
    if (r.category === "removed" && !cmpFilter.removed) return false;
    return true;
  });

  const msgCounts = {
    errors: MESSAGES_DATA.filter((m) => m.type === "error").length,
    warnings: MESSAGES_DATA.filter((m) => m.type === "warning").length,
    info: MESSAGES_DATA.filter((m) => m.type === "info").length,
  };
  const cmpCounts = {
    added: COMPARISON_DATA.filter((r) => r.category === "added").length,
    changed: COMPARISON_DATA.filter((r) => r.category === "changed").length,
    removed: COMPARISON_DATA.filter((r) => r.category === "removed").length,
  };

  const selectedPhase = WF_NODES.find((n) => n.id === selectedNode);

  const now = new Date();
  const localTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className="flex flex-col bg-gray-100"
      style={{
        height: "calc(100vh - 0px)",
        fontSize: "12px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* ── Menu Bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gray-200 border-b border-gray-400">
        <Menubar className="border-0 rounded-none bg-transparent h-6 px-1 gap-0">
          {/* File */}
          <MenubarMenu>
            <MenubarTrigger
              className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white"
              data-ocid="wf_menu.file_button"
            >
              File
            </MenubarTrigger>
            <MenubarContent className="text-xs min-w-[260px]">
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => toast.info("New workflow")}
              >
                <span className="flex-1">New workflow</span>
                <MenubarShortcut>Ctrl+Shift+W</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">New unit procedure</span>
                <MenubarShortcut>Ctrl+Shift+U</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">New operation</span>
                <MenubarShortcut>Ctrl+Shift+O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">New phase</span>
                <MenubarShortcut>Ctrl+Shift+F</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("openDialog")}
              >
                <span className="flex-1">Open</span>
                <MenubarShortcut>Ctrl+O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => toast.success("Saved")}
              >
                <span className="flex-1">Save WF-WEIGH-001</span>
                <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Save all</span>
                <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Close WF-WEIGH-001</span>
                <MenubarShortcut>Ctrl+F4</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">Close all</MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Delete WF-WEIGH-001
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Rename WF-WEIGH-001
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                className="text-xs py-0.5"
                onClick={handleChangeStatus}
              >
                <span className="flex-1">Change status of WF-WEIGH-001</span>
                <MenubarShortcut>Ctrl+H</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("statusHistory")}
              >
                <span className="flex-1">View status history</span>
                <MenubarShortcut>Ctrl+Q</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Print report</span>
                <MenubarShortcut>Ctrl+P</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("statistics")}
              >
                Show statistics
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Exit</span>
                <MenubarShortcut>Alt+F4</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Edit */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              Edit
            </MenubarTrigger>
            <MenubarContent className="text-xs min-w-[220px]">
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Undo</span>
                <MenubarShortcut>Ctrl+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Redo</span>
                <MenubarShortcut>Ctrl+Y</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Cut</span>
                <MenubarShortcut>Ctrl+X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Copy</span>
                <MenubarShortcut>Ctrl+C</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Paste</span>
                <MenubarShortcut>Ctrl+V</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Delete</span>
                <MenubarShortcut>Del</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Select all</span>
                <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">Insert phase</MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Insert transition
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Insert branch
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Bind equipment
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Unbind equipment
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Configure workstation
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* View */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              View
            </MenubarTrigger>
            <MenubarContent className="text-xs">
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showMap}
                onCheckedChange={setShowMap}
              >
                Map<MenubarShortcut>Alt+M</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showExplorer}
                onCheckedChange={setShowExplorer}
              >
                Explorer<MenubarShortcut>Alt+E</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showSetlist}
                onCheckedChange={setShowSetlist}
              >
                Setlist<MenubarShortcut>Alt+S</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showProperties}
                onCheckedChange={setShowProperties}
              >
                Properties<MenubarShortcut>Alt+H</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showPhasePreview}
                onCheckedChange={setShowPhasePreview}
              >
                Phase Preview<MenubarShortcut>Alt+P</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showMessages}
                onCheckedChange={setShowMessages}
              >
                Messages<MenubarShortcut>Alt+V</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showComparison}
                onCheckedChange={setShowComparison}
              >
                Comparison<MenubarShortcut>Alt+O</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              >
                Show Grid<MenubarShortcut>Alt+G</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Zoom In</span>
                <MenubarShortcut>Ctrl++</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Zoom Out</span>
                <MenubarShortcut>Ctrl+-</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Reset Zoom</span>
                <MenubarShortcut>Ctrl+1</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Window */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              Window
            </MenubarTrigger>
            <MenubarContent className="text-xs">
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => navigate({ to: "/recipe-designer" })}
              >
                Recipe Designer - Batch
              </MenubarItem>
              <MenubarCheckboxItem className="text-xs py-0.5" checked={true}>
                Workflow Designer
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Undo layout change
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Redo layout change
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Save user layout
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Load user layout
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">Reset layout</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Help */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              Help
            </MenubarTrigger>
            <MenubarContent className="text-xs">
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Workflow Designer Help</span>
                <MenubarShortcut>Alt+F1</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("about")}
              >
                About PharmaSuite
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* ── Toolbars ──────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 bg-gray-200 border-b border-gray-400 flex items-center gap-0.5 px-1 py-0.5"
        style={{ minHeight: "30px" }}
      >
        {/* File group */}
        <TBtn
          icon={<GitBranch size={13} />}
          tooltip="New Workflow (Ctrl+Shift+W)"
          onClick={() => toast.info("New workflow")}
        />
        <TBtn
          icon={<LayoutGrid size={13} />}
          tooltip="New Unit Procedure (Ctrl+Shift+U)"
        />
        <TBtn
          icon={<Settings size={13} />}
          tooltip="New Operation (Ctrl+Shift+O)"
        />
        <TBtn icon={<Square size={11} />} tooltip="New Phase (Ctrl+Shift+F)" />
        <TBtn
          icon={<FolderOpen size={13} />}
          tooltip="Open (Ctrl+O)"
          onClick={() => setDialog("openDialog")}
        />
        <TBtn
          icon={<Save size={13} />}
          tooltip="Save (Ctrl+S)"
          onClick={() => toast.success("Workflow saved")}
        />
        <TBtn icon={<X size={13} />} tooltip="Close" />
        <TBtn icon={<Printer size={13} />} tooltip="Print report (Ctrl+P)" />
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* Status group */}
        <TBtn
          icon={<ArrowUp size={13} />}
          tooltip="Change Status (Ctrl+H)"
          onClick={handleChangeStatus}
        />
        <TBtn
          icon={<History size={13} />}
          tooltip="View Status History (Ctrl+Q)"
          onClick={() => setDialog("statusHistory")}
        />
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* Edit group */}
        <TBtn icon={<RotateCcw size={13} />} tooltip="Undo (Ctrl+Z)" />
        <TBtn icon={<RotateCw size={13} />} tooltip="Redo (Ctrl+Y)" />
        <TBtn icon={<Copy size={11} />} tooltip="Copy (Ctrl+C)" />
        <TBtn icon={<Move size={11} />} tooltip="Move" />
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* Equipment binding group */}
        <TBtn
          icon={<Link2 size={13} />}
          tooltip="Bind Equipment"
          onClick={() => toast.info("Bind equipment to phase")}
        />
        <TBtn icon={<Minus size={11} />} tooltip="Unbind Equipment" />
        <TBtn icon={<Settings size={11} />} tooltip="Configure Workstation" />
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* View group */}
        <TBtn
          icon={<span className="text-xs font-bold">1:1</span>}
          tooltip="Zoom to 100%"
          onClick={() => setZoomLevel(100)}
        />
        <TBtn
          icon={<ZoomIn size={13} />}
          tooltip="Zoom In (Ctrl++)"
          onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
        />
        <TBtn
          icon={<ZoomOut size={13} />}
          tooltip="Zoom Out (Ctrl+-)"
          onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
        />
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* Help */}
        <TBtn icon={<HelpCircle size={13} />} tooltip="Help (Alt+F1)" />
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-gray-600 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
            {zoomLevel}%
          </span>
        </div>
      </div>

      {/* ── Main 3-column layout ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panels ──────────────────────────────────────── */}
        {(showMap || showExplorer) && (
          <div
            className="flex flex-col bg-gray-100 border-r border-gray-400 flex-shrink-0"
            style={{ width: "200px" }}
          >
            {/* Map Panel */}
            {showMap && (
              <div
                className="flex flex-col border-b border-gray-400"
                style={{ height: "140px" }}
              >
                <div className="bg-gray-300 border-b border-gray-400 px-2 py-0.5 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    Map
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden relative bg-white">
                  <svg
                    role="img"
                    aria-label="Workflow map overview"
                    width="100%"
                    height="100%"
                    viewBox="0 0 300 1020"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ opacity: 0.4 }}
                  >
                    {WF_NODES.map((n) => {
                      if (n.type === "start" || n.type === "end")
                        return (
                          <ellipse
                            key={n.id}
                            cx={220}
                            cy={n.y + 15}
                            rx={20}
                            ry={10}
                            fill="#1a4480"
                          />
                        );
                      if (n.type === "transition")
                        return (
                          <rect
                            key={n.id}
                            x={212}
                            y={n.y}
                            width={16}
                            height={16}
                            fill="white"
                            stroke="#555"
                            strokeWidth={1}
                          />
                        );
                      return (
                        <rect
                          key={n.id}
                          x={150}
                          y={n.y}
                          width={140}
                          height={40}
                          fill={n.selected ? "#EBF5FB" : "#F0F8FF"}
                          stroke="#7F8C8D"
                          strokeWidth={1}
                          rx={1}
                        />
                      );
                    })}
                  </svg>
                  <div
                    className="absolute border-2 border-blue-500 opacity-50"
                    style={{
                      top: "10%",
                      left: "5%",
                      width: "90%",
                      height: "40%",
                    }}
                  />
                </div>
              </div>
            )}
            {/* Explorer Panel */}
            {showExplorer && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="bg-gray-300 border-b border-gray-400 px-2 py-0.5 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    Explorer
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowExplorer(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-200 border-b border-gray-300 flex-shrink-0">
                  <TBtn
                    icon={<Plus size={10} />}
                    tooltip="Expand all"
                    onClick={() =>
                      setExpandedIds(new Set(["wf1", "up1", "op1"]))
                    }
                  />
                  <TBtn
                    icon={<Minus size={10} />}
                    tooltip="Collapse all"
                    onClick={() => setExpandedIds(new Set())}
                  />
                  <TBtn icon={<RefreshCw size={10} />} tooltip="Refresh" />
                </div>
                <ScrollArea className="flex-1">
                  <div className="py-0.5">
                    {EXPLORER_TREE.map((node) => (
                      <ExplorerNode
                        key={node.id}
                        node={node}
                        level={0}
                        selectedId={selectedTreeId}
                        expandedIds={expandedIds}
                        onSelect={setSelectedTreeId}
                        onToggle={toggleTree}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* ── Center: Workflow tab bar + SFC canvas ─────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Tab bar for open workflows */}
          <div
            className="flex items-end border-b border-gray-400 bg-gray-200 flex-shrink-0"
            style={{ height: "24px" }}
          >
            {WORKFLOW_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "text-xs px-2 border-r border-gray-400 h-full flex items-center gap-1 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-white font-semibold border-t-2 border-t-blue-600"
                    : "hover:bg-gray-100",
                )}
                data-ocid="workflow.tab"
              >
                {tab.unsaved && (
                  <span className="text-orange-500 font-bold">*</span>
                )}
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              className="text-xs px-2 border-l border-gray-400 h-full hover:bg-gray-100"
              onClick={() => setDialog("openDialog")}
              data-ocid="workflow.open_modal_button"
            >
              <Plus size={10} />
            </button>
          </div>

          {/* Sub-tabs */}
          <div
            className="flex border-b border-gray-300 bg-gray-100 flex-shrink-0"
            style={{ height: "20px" }}
          >
            {["Unit Procedure", "Operation", "Phase"].map((t) => (
              <button
                type="button"
                key={t}
                className="text-xs px-2 border-r border-gray-300 hover:bg-gray-200"
              >
                {t}
              </button>
            ))}
          </div>

          {/* SFC Graph */}
          <ScrollArea className="flex-1">
            <div
              className="relative min-h-full"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top left",
                backgroundImage: showGrid
                  ? "radial-gradient(circle, #ccc 1px, transparent 1px)"
                  : undefined,
                backgroundSize: showGrid ? "20px 20px" : undefined,
              }}
            >
              <WFSFCCanvas
                nodes={WF_NODES}
                edges={WF_EDGES}
                selectedId={selectedNode}
                onSelect={(id) => {
                  setSelectedNode(id);
                  toast.info(
                    `Selected: ${WF_NODES.find((n) => n.id === id)?.label ?? id}`,
                  );
                }}
              />
            </div>
          </ScrollArea>
        </div>

        {/* ── Right Panels ──────────────────────────────────────── */}
        {(showSetlist || showProperties) && (
          <div
            className="flex flex-col bg-gray-50 border-l border-gray-400 flex-shrink-0 overflow-hidden"
            style={{ width: "200px" }}
          >
            {/* Setlist */}
            {showSetlist && (
              <div
                className="flex flex-col overflow-hidden"
                style={{ height: showProperties ? "50%" : "100%" }}
              >
                <div className="bg-gray-300 border-b border-gray-400 px-2 py-0.5 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    Setlist
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSetlist(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-200 border-b border-gray-300 flex-shrink-0 flex-wrap">
                  {[
                    { icon: <Plus size={10} />, tip: "Add to setlist" },
                    { icon: <Search size={10} />, tip: "Search setlist" },
                    { icon: <ArrowUp size={11} />, tip: "Move up" },
                    { icon: <ArrowDown size={11} />, tip: "Move down" },
                    { icon: <MoreHorizontal size={11} />, tip: "More actions" },
                  ].map((btn) => (
                    <TBtn key={btn.tip} icon={btn.icon} tooltip={btn.tip} />
                  ))}
                </div>
                <ScrollArea className="flex-1">
                  <Accordion
                    type="multiple"
                    defaultValue={["equip", "phase"]}
                    className="w-full"
                  >
                    {[
                      {
                        id: "equip",
                        label: "Equipment Classes",
                        items: [
                          "Mixer GR-01",
                          "Scale WB-50",
                          "Granulator FBG-300",
                          "Dryer FBD-200",
                        ],
                        isEquip: true,
                      },
                      {
                        id: "workcenter",
                        label: "Work Centers",
                        items: ["Granulation Room A", "Weighing Station B"],
                        isWorkCenter: true,
                      },
                      {
                        id: "station",
                        label: "Stations",
                        items: ["Station-WS-01", "Station-WS-02"],
                      },
                      {
                        id: "phase",
                        label: "Phase Library",
                        items: SETLIST_EQUIPMENT_PHASES,
                      },
                      {
                        id: "scale",
                        label: "Scale Configurations",
                        items: ["Scale-WB-50-Config", "Scale-LW-100-Config"],
                      },
                      { id: "capability", label: "Capabilities", items: [] },
                      {
                        id: "privilege",
                        label: "Signature Privileges",
                        items: [],
                      },
                    ].map((section) => (
                      <AccordionItem
                        key={section.id}
                        value={section.id}
                        className="border-0"
                      >
                        <AccordionTrigger className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 border-b border-gray-200 font-medium text-gray-700 h-6 [&>svg]:h-3 [&>svg]:w-3">
                          {section.label}{" "}
                          {section.items.length > 0 && (
                            <span className="ml-1 text-gray-400">
                              ({section.items.length})
                            </span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          {section.items.length > 0 ? (
                            <div className="border-b border-gray-100">
                              {section.items.map((item) => (
                                <div
                                  key={item}
                                  className="text-xs px-2 py-0.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex items-center gap-1"
                                  onDoubleClick={() =>
                                    toast.success(`Added: ${item}`)
                                  }
                                  data-ocid="wf_setlist.item.1"
                                >
                                  <Square
                                    size={9}
                                    className="text-gray-400 flex-shrink-0"
                                  />
                                  <span className="truncate flex-1">
                                    {item}
                                  </span>
                                  {(section.isEquip ||
                                    section.isWorkCenter) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate({
                                          to: section.isEquip
                                            ? "/equipment"
                                            : "/data-manager",
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 ml-auto"
                                      title={
                                        section.isEquip
                                          ? "View in Equipment"
                                          : "View in Data Manager"
                                      }
                                    >
                                      <ExternalLink
                                        size={9}
                                        className="text-blue-500"
                                      />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 px-2 py-1 italic">
                              No items
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>
            )}

            {/* Property Windows */}
            {showProperties && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="bg-gray-300 border-b border-gray-400 px-2 py-0.5 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    Properties
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProperties(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="flex-shrink-0 border-b border-gray-200">
                  <div className="flex">
                    {["Header", "Element", "Source"].map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setPropTab(t.toLowerCase())}
                        className={cn(
                          "text-xs px-2 py-0.5 border-r border-gray-200",
                          propTab === t.toLowerCase()
                            ? "bg-white font-semibold border-b-white"
                            : "bg-gray-100 hover:bg-gray-50",
                        )}
                        data-ocid="wf_properties.tab"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {propTab === "header" && (
                    <div className="text-xs">
                      {[
                        ["Identifier", "WF-WEIGH-001"],
                        ["Version", "1 (1)"],
                        ["Description", "Weighing Workflow"],
                        ["Status", "Edit"],
                        ["Product", "Sonolin Retard 100"],
                        ["Usage type", "Production"],
                        ["Planned quantity", "1000 kg"],
                        ["Created by", "Dr. Sarah Chen"],
                        ["Created date", "2024-01-20"],
                        ["Modified by", "Dr. Sarah Chen"],
                        ["Modified date", "2024-03-10"],
                        ["Review mode", "Automatic"],
                        ["Comment", ""],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex border-b border-gray-100"
                        >
                          <div
                            className="w-24 flex-shrink-0 bg-gray-50 px-1.5 py-0.5 text-gray-500 border-r border-gray-200 break-words"
                            style={{ fontSize: "10px" }}
                          >
                            {label}
                          </div>
                          <div
                            className="flex-1 px-1.5 py-0.5 text-gray-800"
                            style={{ fontSize: "11px" }}
                          >
                            {label === "Status" ? (
                              <Badge variant="outline" className="text-xs h-4">
                                {value}
                              </Badge>
                            ) : (
                              <span>{value}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {propTab === "element" && (
                    <div className="text-xs p-2">
                      {selectedPhase && selectedPhase.type === "phase" ? (
                        <div className="space-y-1.5">
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Identifier
                            </span>
                            <span className="font-mono text-xs">
                              {selectedPhase.label}
                            </span>
                          </div>
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Equipment
                            </span>
                            <span className="text-xs text-green-700">
                              {selectedPhase.equip ? "Mixer GR-01" : "None"}
                            </span>
                          </div>
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Binding
                            </span>
                            <span className="text-xs">
                              {selectedPhase.binding ? "Bound" : "Unbound"}
                            </span>
                          </div>
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Process Params
                            </span>
                            <span className="text-xs">
                              {selectedPhase.process ?? 0}
                            </span>
                          </div>
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Status
                            </span>
                            <span className="text-xs text-gray-400">
                              Active
                            </span>
                          </div>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 w-full gap-1"
                              onClick={() => navigate({ to: "/equipment" })}
                              data-ocid="wf_element.equipment.button"
                            >
                              <ExternalLink size={10} /> View Equipment
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-xs">
                          No phase selected
                        </p>
                      )}
                    </div>
                  )}
                  {propTab === "source" && (
                    <div className="text-xs p-2">
                      <div className="flex border-b pb-1 mb-1">
                        <span className="w-24 text-gray-500 text-xs">
                          Identifier
                        </span>
                        <span className="font-mono text-xs">
                          {selectedPhase?.label ?? "—"}
                        </span>
                      </div>
                      <div className="mt-2 border rounded p-1 bg-gray-50">
                        <p className="font-medium text-xs text-gray-700 mb-1">
                          System Source
                        </p>
                        {[
                          "Usable in",
                          "Trigger",
                          "Server-run",
                          "Pause-aware",
                          "Equipment-bound",
                        ].map((prop) => (
                          <div
                            key={prop}
                            className="flex items-center justify-between py-0.5"
                          >
                            <span
                              className="text-gray-500"
                              style={{ fontSize: "10px" }}
                            >
                              {prop}
                            </span>
                            <span
                              className="text-gray-400"
                              style={{ fontSize: "10px" }}
                            >
                              —
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Panels ─────────────────────────────────────────── */}
      {(showPhasePreview || showMessages || showComparison) && (
        <div
          className="flex-shrink-0 border-t border-gray-400"
          style={{ height: "180px" }}
        >
          {/* Bottom tab bar */}
          <div
            className="flex border-b border-gray-300 bg-gray-200 flex-shrink-0"
            style={{ height: "22px" }}
          >
            {showPhasePreview && (
              <button
                type="button"
                onClick={() => setBottomTab("phasepreview")}
                className={cn(
                  "text-xs px-2 border-r border-gray-300 flex-shrink-0",
                  bottomTab === "phasepreview"
                    ? "bg-white font-semibold"
                    : "hover:bg-gray-100",
                )}
                data-ocid="wf_bottom.tab"
              >
                Phase Preview
              </button>
            )}
            {showMessages && (
              <button
                type="button"
                onClick={() => setBottomTab("messages")}
                className={cn(
                  "text-xs px-2 border-r border-gray-300 flex-shrink-0",
                  bottomTab === "messages"
                    ? "bg-white font-semibold"
                    : "hover:bg-gray-100",
                )}
                data-ocid="wf_bottom.tab"
              >
                Messages ({msgCounts.errors}/{msgCounts.warnings}/
                {msgCounts.info})
              </button>
            )}
            {showComparison && (
              <button
                type="button"
                onClick={() => setBottomTab("comparison")}
                className={cn(
                  "text-xs px-2 border-r border-gray-300 flex-shrink-0",
                  bottomTab === "comparison"
                    ? "bg-white font-semibold"
                    : "hover:bg-gray-100",
                )}
                data-ocid="wf_bottom.tab"
              >
                Comparison ({cmpCounts.added}/{cmpCounts.changed}/
                {cmpCounts.removed})
              </button>
            )}
          </div>

          <div className="flex" style={{ height: "calc(180px - 22px)" }}>
            {/* Phase Preview */}
            {showPhasePreview && bottomTab === "phasepreview" && (
              <div
                className="flex flex-col bg-gray-50 border-r border-gray-300 flex-shrink-0"
                style={{ width: "240px" }}
              >
                <div className="flex items-center justify-between px-2 py-0.5 bg-gray-200 border-b border-gray-300 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    Phase Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPhasePreview(false)}
                  >
                    <X size={10} className="text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-2">
                  {selectedPhase && selectedPhase.type === "phase" ? (
                    <div className="bg-white border border-gray-300 rounded p-2 w-full shadow-sm">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {selectedPhase.label}
                      </p>
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Equipment:</span>
                          <span className="text-green-700">
                            {selectedPhase.equip ? "Bound" : "Unbound"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Parameters:</span>
                          <span>{selectedPhase.process ?? 0}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 bg-gray-200 border border-gray-300 rounded text-gray-400 cursor-not-allowed"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 bg-gray-200 border border-gray-300 rounded text-gray-400 cursor-not-allowed"
                        >
                          Exception
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Select a phase to preview
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 italic">
                    Preview only
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {showMessages && bottomTab === "messages" && (
              <div className="flex flex-col flex-1 overflow-hidden border-r border-gray-300">
                <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 border-b border-gray-300 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setMsgFilter((f) => ({ ...f, errors: !f.errors }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded font-mono",
                      msgFilter.errors
                        ? "bg-red-100 border-red-300 text-red-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_messages.toggle"
                  >
                    E {msgCounts.errors}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMsgFilter((f) => ({ ...f, warnings: !f.warnings }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded font-mono",
                      msgFilter.warnings
                        ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_messages.toggle"
                  >
                    W {msgCounts.warnings}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMsgFilter((f) => ({ ...f, info: !f.info }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded font-mono",
                      msgFilter.info
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_messages.toggle"
                  >
                    I {msgCounts.info}
                  </button>
                  <span className="text-gray-400 text-xs ml-1">
                    WF-WEIGH-001 / Weighing / In-Process Checks
                  </span>
                  <button
                    type="button"
                    className="ml-auto"
                    onClick={() => setShowMessages(false)}
                  >
                    <X size={10} className="text-gray-400" />
                  </button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  <div className="w-28 border-r border-gray-200 bg-gray-50 overflow-auto">
                    <div className="text-xs p-1">
                      {[
                        "WF-WEIGH-001",
                        "Weighing",
                        "In-Process Checks",
                        "T2",
                      ].map((node, i) => (
                        <div
                          key={node}
                          className={cn(
                            "py-0.5 px-1 rounded cursor-pointer text-xs",
                            i < 2
                              ? "text-gray-600"
                              : "text-yellow-700 font-medium",
                          )}
                        >
                          {node}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-6 text-xs w-5"> </TableHead>
                          <TableHead className="h-6 text-xs w-16">ID</TableHead>
                          <TableHead className="h-6 text-xs">Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMessages.map((m, i) => (
                          <TableRow
                            key={m.id}
                            className="text-xs cursor-pointer hover:bg-gray-50"
                            data-ocid={`wf_messages.item.${i + 1}`}
                          >
                            <TableCell className="py-0.5 px-1">
                              {m.type === "error" && (
                                <AlertCircle
                                  size={11}
                                  className="text-red-500"
                                />
                              )}
                              {m.type === "warning" && (
                                <AlertCircle
                                  size={11}
                                  className="text-yellow-500"
                                />
                              )}
                              {m.type === "info" && (
                                <Info size={11} className="text-blue-500" />
                              )}
                            </TableCell>
                            <TableCell
                              className="py-0.5 px-1 font-mono text-gray-500"
                              style={{ fontSize: "10px" }}
                            >
                              {m.id}
                            </TableCell>
                            <TableCell
                              className="py-0.5 px-1"
                              style={{ fontSize: "11px" }}
                            >
                              {m.text}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison */}
            {showComparison && bottomTab === "comparison" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 border-b border-gray-300 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCmpFilter((f) => ({ ...f, added: !f.added }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded",
                      cmpFilter.added
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_comparison.toggle"
                  >
                    Added {cmpCounts.added}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCmpFilter((f) => ({ ...f, changed: !f.changed }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded",
                      cmpFilter.changed
                        ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_comparison.toggle"
                  >
                    Changed {cmpCounts.changed}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCmpFilter((f) => ({ ...f, removed: !f.removed }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded",
                      cmpFilter.removed
                        ? "bg-red-100 border-red-300 text-red-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="wf_comparison.toggle"
                  >
                    Removed {cmpCounts.removed}
                  </button>
                  <button
                    type="button"
                    className="ml-auto"
                    onClick={() => setShowComparison(false)}
                  >
                    <X size={10} className="text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        {[
                          "Cat.",
                          "Type",
                          "ID",
                          "Attribute",
                          "New Value",
                          "Old Value",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="h-6 text-xs whitespace-nowrap px-2"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComparison.map((r, i) => (
                        <TableRow
                          key={`${r.category}-${r.id}`}
                          className="text-xs cursor-pointer hover:bg-gray-50"
                          data-ocid={`wf_comparison.item.${i + 1}`}
                        >
                          <TableCell className="py-0.5 px-2">
                            <span
                              className={cn(
                                "w-3 h-3 rounded-full inline-block",
                                r.category === "added"
                                  ? "bg-green-400"
                                  : r.category === "changed"
                                    ? "bg-yellow-400"
                                    : "bg-red-400",
                              )}
                            />
                          </TableCell>
                          <TableCell
                            className="py-0.5 px-2"
                            style={{ fontSize: "10px" }}
                          >
                            {r.type}
                          </TableCell>
                          <TableCell
                            className="py-0.5 px-2 font-mono"
                            style={{ fontSize: "10px" }}
                          >
                            {r.id}
                          </TableCell>
                          <TableCell
                            className="py-0.5 px-2"
                            style={{ fontSize: "10px" }}
                          >
                            {r.attribute}
                          </TableCell>
                          <TableCell
                            className="py-0.5 px-2 text-green-700"
                            style={{ fontSize: "10px" }}
                          >
                            {r.newVal || "—"}
                          </TableCell>
                          <TableCell
                            className="py-0.5 px-2 text-red-600"
                            style={{ fontSize: "10px" }}
                          >
                            {r.oldVal || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Status Bar ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-2 bg-gray-300 border-t border-gray-400"
        style={{ height: "18px" }}
      >
        <span className="text-xs text-gray-600">
          User: <strong>Dr. Sarah Chen</strong>
        </span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-600">
          DB: <strong>PHARMAEXEC_PROD</strong>
        </span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-600">
          WF-WEIGH-001 [1] (1) – Edit
        </span>
        <div className="ml-auto">
          <span className="text-xs text-gray-600">{localTime}</span>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <ChangeStatusDialog
        open={dialog === "changeStatus"}
        onClose={() => setDialog("none")}
        onConfirm={handleStatusConfirm}
      />
      <StatusHistoryDialog
        open={dialog === "statusHistory"}
        onClose={() => setDialog("none")}
      />
      <OpenWorkflowDialog
        open={dialog === "openDialog"}
        onClose={() => setDialog("none")}
        onOpen={(id) => toast.success(`Opened workflow: ${id}`)}
      />
      <StatisticsDialog
        open={dialog === "statistics"}
        onClose={() => setDialog("none")}
      />
      <AboutDialog
        open={dialog === "about"}
        onClose={() => setDialog("none")}
      />
      <ElectronicSignatureDialog
        open={sigDialog}
        onClose={() => setSigDialog(false)}
        onSign={handleSigned}
        description={sigDescription}
      />
    </div>
  );
}
