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

interface SFCNode {
  id: string;
  type: "start" | "end" | "phase" | "operation" | "transition" | "unitproc";
  label: string;
  x: number;
  y: number;
  selected?: boolean;
  materialIn?: number;
  materialOut?: number;
  equip?: number;
  process?: number;
  privilege?: number;
}

interface SFCEdge {
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
const RECIPE_TABS = [
  {
    id: "mr1",
    label: "Master Recipe ID_SR-001 [1] (1) [20-821]",
    type: "master",
    unsaved: false,
  },
];

const SFC_NODES: SFCNode[] = [
  { id: "start", type: "start", label: "Start", x: 220, y: 30 },
  {
    id: "n1",
    type: "phase",
    label: "Identify Material",
    x: 140,
    y: 100,
    materialIn: 1,
    materialOut: 0,
    equip: 1,
    process: 2,
    privilege: 1,
  },
  {
    id: "n2",
    type: "phase",
    label: "Select Scale",
    x: 140,
    y: 200,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 0,
  },
  {
    id: "n3",
    type: "phase",
    label: "Tare Scale",
    x: 140,
    y: 300,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 1,
  },
  {
    id: "n4",
    type: "phase",
    label: "Weigh Material",
    x: 140,
    y: 400,
    materialIn: 1,
    materialOut: 1,
    equip: 1,
    process: 3,
    privilege: 1,
    selected: true,
  },
  { id: "t_split", type: "transition", label: "", x: 212, y: 490 },
  // Left branch
  {
    id: "n5",
    type: "phase",
    label: "Release Scale (Pre)",
    x: 80,
    y: 560,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 1,
  },
  {
    id: "n6",
    type: "phase",
    label: "Tare Material",
    x: 80,
    y: 660,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 0,
  },
  {
    id: "n7",
    type: "phase",
    label: "Release Scale (Accs)",
    x: 80,
    y: 760,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 1,
  },
  // Right branch
  {
    id: "nr1",
    type: "phase",
    label: "Run Verification",
    x: 310,
    y: 560,
    materialIn: 0,
    materialOut: 0,
    equip: 1,
    process: 1,
    privilege: 0,
  },
  { id: "t_merge", type: "transition", label: "", x: 212, y: 860 },
  {
    id: "n8",
    type: "phase",
    label: "Account Materials",
    x: 140,
    y: 900,
    materialIn: 1,
    materialOut: 1,
    equip: 0,
    process: 2,
    privilege: 1,
  },
  {
    id: "n9",
    type: "phase",
    label: "Print Report",
    x: 140,
    y: 1000,
    materialIn: 0,
    materialOut: 0,
    equip: 0,
    process: 1,
    privilege: 1,
  },
  { id: "end", type: "end", label: "End", x: 220, y: 1090 },
];

const SFC_EDGES: SFCEdge[] = [
  { from: "start", to: "n1" },
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n4", to: "t_split" },
  // Left branch
  { from: "t_split", to: "n5", condition: "CONDITION" },
  { from: "n5", to: "n6" },
  { from: "n6", to: "n7" },
  { from: "n7", to: "t_merge" },
  // Right branch
  { from: "t_split", to: "nr1", condition: "CONDITION" },
  { from: "nr1", to: "t_merge" },
  // Merge and continue
  { from: "t_merge", to: "n8" },
  { from: "n8", to: "n9" },
  { from: "n9", to: "end" },
];

const EXPLORER_TREE: TreeNode[] = [
  {
    id: "mr1",
    label: "ID_SR-001",
    type: "masterrecipe",
    children: [
      {
        id: "proc1",
        label: "Sonolin Retard 100",
        type: "procedure",
        children: [
          {
            id: "up1",
            label: "Sonolin Retard 100",
            type: "unitprocedure",
            children: [
              {
                id: "op1",
                label: "Weighing",
                type: "operation",
                status: "active",
                children: [
                  { id: "ph1", label: "Identify Material", type: "phase" },
                  { id: "ph2", label: "Select Scale", type: "phase" },
                  { id: "ph3", label: "Tare Scale", type: "phase" },
                  { id: "ph4", label: "Weigh Material", type: "phase" },
                  { id: "ph5", label: "Release Scale (Pre)", type: "phase" },
                  { id: "ph6", label: "Tare Material", type: "phase" },
                  { id: "ph7", label: "Release Scale (Accs)", type: "phase" },
                  { id: "ph8", label: "Account Materials", type: "phase" },
                  { id: "ph9", label: "Print Report", type: "phase" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const SETLIST_PHASES = [
  "D-Identify Material",
  "D-Select Scale",
  "D-Tare",
  "D-Weigh Material",
  "D-Release Scale (Pre)",
  "D-Tare Material",
  "Pre-accounting",
  "D-Release Scale (Accs)",
  "Account Materials",
  "Identify Rooms",
  "Identify Mixing Input",
];

const MESSAGES_DATA = [
  {
    id: "0027RS",
    type: "warning",
    text: "Transition starts selection branch but has no condition expression defined.",
    element: "op1",
  },
  {
    id: "0001RS",
    type: "info",
    text: "The 'Tare Material' is a dummy element.",
    element: "ph6",
  },
  {
    id: "0010RS",
    type: "info",
    text: "The 'Account Materials' has too few material input parameters.",
    element: "ph8",
  },
];

const COMPARISON_DATA = [
  {
    category: "added",
    type: "Phase",
    id: "Weigh Material",
    attribute: "Predecessor",
    newVal: "Tare Scale",
    oldVal: "",
  },
  {
    category: "changed",
    type: "Process parameter",
    id: "Reprint label",
    attribute: "Risk assessment",
    newVal: "Low",
    oldVal: "High",
  },
  {
    category: "changed",
    type: "Material parameter",
    id: "60/D003-04",
    attribute: "Default weighing method",
    newVal: "Only identification",
    oldVal: "Net",
  },
  {
    category: "removed",
    type: "Transition",
    id: "Completed",
    attribute: "Transition expression",
    newVal: "",
    oldVal: "={Preparation}/{Weigh...}",
  },
];

const STATUS_HISTORY_DATA = [
  {
    ts: "2024-01-15 09:23:11",
    action: "Submit for verification",
    toStatus: "Verification",
    toVersion: "1.1",
    validFrom: "2024-01-15 00:00",
    validTo: "2099-12-30 23:59",
    signature: "Gen. Delamara (dgn)",
    comment: "Ready for QA",
    db: "PHARMA_PROD",
  },
  {
    ts: "2024-01-10 14:05:33",
    action: "Create",
    toStatus: "Edit",
    toVersion: "1.0",
    validFrom: "",
    validTo: "",
    signature: "Gen. Delamara (dgn)",
    comment: "",
    db: "PHARMA_PROD",
  },
];

const OPEN_DIALOG_DATA = [
  {
    id: "ID_SR-001",
    version: "1",
    status: "Edit",
    material: "Sonolin Retard 100",
    modified: "2024-03-10",
  },
  {
    id: "ID_SR-002",
    version: "2",
    status: "Valid",
    material: "Tablette-200",
    modified: "2024-02-20",
  },
  {
    id: "ID_SR-003",
    version: "1",
    status: "Archived",
    material: "Capsule-50",
    modified: "2023-11-01",
  },
  {
    id: "ID_UP-001",
    version: "1",
    status: "Approved",
    material: "",
    modified: "2024-01-15",
  },
];

// ── ToolbarButton ─────────────────────────────────────────────────────────────
function TBtn({
  icon,
  tooltip,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "h-6 w-6 flex items-center justify-center rounded border border-transparent text-gray-600 hover:bg-gray-200 hover:border-gray-300 transition-colors",
              active && "bg-blue-100 border-blue-300 text-blue-700",
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

// ── SFC Graph Canvas ──────────────────────────────────────────────────────────
function SFCCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: SFCNode[];
  edges: SFCEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const NODE_W = 160;
  const NODE_H = 50;
  const PHASE_X = 60;
  const CX = PHASE_X + NODE_W / 2;

  function getNodeCenter(n: SFCNode) {
    if (n.type === "start" || n.type === "end") return { x: CX, y: n.y + 15 };
    if (n.type === "transition") return { x: CX, y: n.y + 8 };
    return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
  }

  return (
    <svg
      role="img"
      aria-label="SFC Graph"
      width="520"
      height="1200"
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
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              onClick={() => onSelect(n.id)}
              style={{ cursor: "pointer" }}
            >
              <ellipse cx={CX} cy={n.y + 15} rx={28} ry={14} fill="#333" />
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
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              onClick={() => onSelect(n.id)}
              style={{ cursor: "pointer" }}
            >
              <ellipse
                cx={CX}
                cy={n.y + 15}
                rx={28}
                ry={14}
                fill="#333"
                stroke="#333"
                strokeWidth={3}
              />
              <ellipse cx={CX} cy={n.y + 15} rx={22} ry={10} fill="#555" />
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
              onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter") onSelect(n.id);
              }}
              onClick={() => onSelect(n.id)}
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
            onKeyDown={(e: React.KeyboardEvent<SVGGElement>) => {
              if (e.key === "Enter") onSelect(n.id);
            }}
            onClick={() => onSelect(n.id)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={nx}
              y={ny}
              width={NODE_W}
              height={NODE_H}
              fill={isSelected ? "#EBF5FB" : "#F8FBFF"}
              stroke={isSelected ? "#C0392B" : "#7F8C8D"}
              strokeWidth={isSelected ? 2 : 1}
              rx={2}
            />
            {/* Label */}
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
            {/* Parameter corner buttons */}
            {/* Top-left: material in */}
            <rect
              x={nx}
              y={ny}
              width={18}
              height={16}
              fill="#D6EAF8"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + 9}
              y={ny + 11}
              textAnchor="middle"
              fontSize={9}
              fill={n.materialIn === 0 ? "#C0392B" : "#154360"}
            >
              {n.materialIn ?? "-"}
            </text>
            {/* Bottom-left: material out */}
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
              fill={n.materialOut === 0 ? "#7F8C8D" : "#154360"}
            >
              {n.materialOut ?? "-"}
            </text>
            {/* Top-right: equipment */}
            <rect
              x={nx + NODE_W - 18}
              y={ny}
              width={18}
              height={16}
              fill="#D5F5E3"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + NODE_W - 9}
              y={ny + 11}
              textAnchor="middle"
              fontSize={9}
              fill="#1E8449"
            >
              {n.equip ?? "-"}
            </text>
            {/* Bottom-right: process */}
            <rect
              x={nx + NODE_W - 18}
              y={ny + NODE_H - 16}
              width={18}
              height={16}
              fill="#FEF9E7"
              stroke="#7F8C8D"
              strokeWidth={0.5}
              rx={1}
            />
            <text
              x={nx + NODE_W - 9}
              y={ny + NODE_H - 5}
              textAnchor="middle"
              fontSize={9}
              fill="#7D6608"
            >
              {n.process ?? "-"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── TreeNode Component ─────────────────────────────────────────────────────────
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
    masterrecipe: "text-blue-800",
    procedure: "text-indigo-700",
    unitprocedure: "text-violet-700",
    operation: "text-emerald-700",
    phase: "text-gray-700",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    masterrecipe: <Layers size={11} />,
    procedure: <GitBranch size={11} />,
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
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect(node.id);
            if (hasChildren) onToggle(node.id);
          }
        }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={10} className="flex-shrink-0" />
          ) : (
            <ChevronRight size={10} className="flex-shrink-0" />
          )
        ) : (
          <span className="w-2.5" />
        )}
        <span
          className={cn(
            "flex-shrink-0",
            isSelected
              ? "text-white"
              : typeColors[node.type] || "text-gray-700",
          )}
        >
          {typeIcons[node.type]}
        </span>
        <span className="ml-0.5 truncate">{node.label}</span>
      </div>
      {isExpanded &&
        hasChildren &&
        node.children!.map((child) => (
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
  );
}

// ── Electronic Signature Dialog ───────────────────────────────────────────────
function ElectronicSignatureDialog({
  open,
  onClose,
  description,
  onSign,
}: {
  open: boolean;
  onClose: () => void;
  description: string;
  onSign: () => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [comment, setComment] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-ocid="signature.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Electronic Signature
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="font-medium text-blue-900">Description:</p>
            <p className="text-blue-800 mt-0.5">{description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Login Name *</Label>
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="h-7 text-xs mt-0.5"
                data-ocid="signature.input"
              />
            </div>
            <div>
              <Label className="text-xs">Password *</Label>
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-xs mt-0.5 min-h-[50px]"
              data-ocid="signature.textarea"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="signature.cancel_button"
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
            data-ocid="signature.confirm_button"
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
      <DialogContent className="max-w-xl" data-ocid="changestatus.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Change Status of ID_SR-001
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-500">Identifier:</span>
              <br />
              <strong>ID_SR-001</strong>
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
            Sonolin Retard 100 – bulk production
          </div>
          <hr />
          <div>
            <Label className="text-xs">Action *</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger
                className="h-7 text-xs mt-0.5"
                data-ocid="changestatus.select"
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
            data-ocid="changestatus.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onConfirm}
            data-ocid="changestatus.confirm_button"
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
      <DialogContent className="max-w-3xl" data-ocid="statushistory.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Status History of ID_SR-001
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-500">Identifier:</span>{" "}
              <strong>ID_SR-001</strong>
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
          <p className="text-gray-500">Sonolin Retard 100 – bulk production</p>
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
                      {r.signature}
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
            data-ocid="statushistory.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Open Dialog ───────────────────────────────────────────────────────────────
function OpenRecipeDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = OPEN_DIALOG_DATA.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.material.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-ocid="opendialog.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Open</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={12}
                className="absolute left-2 top-1.5 text-gray-400"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-7 text-xs pl-6"
                data-ocid="opendialog.search_input"
              />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <RefreshCw size={12} />
            </Button>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="w-28 border rounded p-1 bg-gray-50">
              <p className="font-medium mb-1">Object type</p>
              {["Master Recipe", "Unit Procedure", "Operation", "Phase"].map(
                (t) => (
                  <div
                    key={t}
                    className="py-0.5 px-1 hover:bg-blue-100 cursor-pointer rounded text-xs"
                  >
                    {t}
                  </div>
                ),
              )}
            </div>
            <div className="flex-1 border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-6 text-xs">Identifier</TableHead>
                    <TableHead className="h-6 text-xs">Version</TableHead>
                    <TableHead className="h-6 text-xs">Status</TableHead>
                    <TableHead className="h-6 text-xs">Material</TableHead>
                    <TableHead className="h-6 text-xs">Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow
                      key={r.id}
                      className="text-xs cursor-pointer hover:bg-blue-50"
                      onDoubleClick={() => {
                        toast.success(`Opened ${r.id}`);
                        onClose();
                      }}
                      data-ocid={`opendialog.item.${i + 1}`}
                    >
                      <TableCell className="py-1">{r.id}</TableCell>
                      <TableCell className="py-1">{r.version}</TableCell>
                      <TableCell className="py-1">
                        <Badge variant="outline" className="text-xs">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1">{r.material}</TableCell>
                      <TableCell className="py-1">{r.modified}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            Double-click to open. {filtered.length} item(s) found.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="opendialog.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="opendialog.primary_button"
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
  const stats = [
    ["Unit procedures", 1],
    ["Operations", 1],
    ["Phases", 9],
    ["Process parameters", 12],
    ["Material parameters", 4],
    ["MFC inputs", 2],
    ["MFC outputs", 2],
    ["Privilege parameters", 7],
    ["Capability parameters", 0],
    ["Work center assignments", 1],
    ["Equipment requirements", 6],
    ["Transitions with identifiers", 0],
  ];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-ocid="statistics.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Statistics of ID_SR-001</DialogTitle>
        </DialogHeader>
        <Table>
          <TableBody>
            {stats.map(([label, val]) => (
              <TableRow key={label as string} className="text-xs">
                <TableCell className="py-1 text-gray-600">
                  {label as string}
                </TableCell>
                <TableCell className="py-1 font-medium text-right">
                  {val as number}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs h-7">
            <Copy size={11} className="mr-1" />
            Copy to clipboard
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
            data-ocid="statistics.close_button"
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
      <DialogContent className="max-w-sm" data-ocid="about.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">About PharmaExec MES</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-800 rounded-lg flex items-center justify-center">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">PharmaExec MES</p>
              <p className="text-gray-500">Recipe and Workflow Designer</p>
              <p className="text-gray-400">Version 8.1.0 (Build 4521)</p>
            </div>
          </div>
          <hr />
          <div className="grid grid-cols-2 gap-1">
            <span className="text-gray-500">User:</span>
            <span>Gen. Delamara (dgn)</span>
            <span className="text-gray-500">Database:</span>
            <span>PHARMA_PROD</span>
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
            data-ocid="about.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RecipeDesigner() {
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
  const [activeTab, setActiveTab] = useState("mr1");
  const [activeSubTab, setActiveSubTab] = useState("operation");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Explorer/tree state
  const [selectedTreeId, setSelectedTreeId] = useState("op1");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["mr1", "proc1", "up1", "op1"]),
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

  const handleChangeStatus = () => {
    setDialog("changeStatus");
  };

  const handleStatusConfirm = () => {
    setDialog("none");
    setSigDescription(
      "Submit for verification: ID_SR-001 [1] → Verification status",
    );
    setSigDialog(true);
  };

  const handleSigned = () => {
    toast.success("Status changed to Verification successfully.");
  };

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
              data-ocid="menu.file_button"
            >
              File
            </MenubarTrigger>
            <MenubarContent className="text-xs min-w-[260px]">
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => toast.info("New master recipe")}
              >
                <span className="flex-1">New master recipe</span>
                <MenubarShortcut>Ctrl+Shift+M</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">New procedure</span>
                <MenubarShortcut>Ctrl+Shift+R</MenubarShortcut>
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
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">New change request</span>
                <MenubarShortcut>Ctrl+Shift+C</MenubarShortcut>
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
                <span className="flex-1">Save ID_SR-001</span>
                <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Save ID_SR-001 as</span>
                <MenubarShortcut>Ctrl+F12</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Save all</span>
                <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Close ID_SR-001</span>
                <MenubarShortcut>Ctrl+F4</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Close all</span>
                <MenubarShortcut>Ctrl+Shift+F4</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Delete ID_SR-001
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Rename ID_SR-001
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                Prepare ID_SR-001 for status change
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={handleChangeStatus}
              >
                <span className="flex-1">Change status of ID_SR-001</span>
                <MenubarShortcut>Ctrl+H</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("statusHistory")}
              >
                <span className="flex-1">View status history of ID_SR-001</span>
                <MenubarShortcut>Ctrl+Q</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Print report</span>
                <MenubarShortcut>Ctrl+P</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Print report (without comparison)
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Open graph pagination</span>
                <MenubarShortcut>Ctrl+R</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setDialog("statistics")}
              >
                Show statistics of ID_SR-001
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
            <MenubarContent className="text-xs min-w-[240px]">
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Rename selected</span>
                <MenubarShortcut>F2</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Select all</span>
                <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Clear selection</span>
                <MenubarShortcut>Ctrl+D</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Select steps and transitions</span>
                <MenubarShortcut>Ctrl+T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Select links</span>
                <MenubarShortcut>Ctrl+L</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
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
                <span className="flex-1">Delete selected</span>
                <MenubarShortcut>Del</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Find</span>
                <MenubarShortcut>Ctrl+F</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          {/* View */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              View
            </MenubarTrigger>
            <MenubarContent className="text-xs min-w-[240px]">
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setZoomLevel(100)}
              >
                <span className="flex-1">Zoom to fit</span>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setZoomLevel(100)}
              >
                <span className="flex-1">Zoom to 100%</span>
                <MenubarShortcut>Ctrl+1</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
              >
                <span className="flex-1">Zoom in</span>
                <MenubarShortcut>Ctrl++</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                className="text-xs py-0.5"
                onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
              >
                <span className="flex-1">Zoom out</span>
                <MenubarShortcut>Ctrl+-</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarCheckboxItem
                className="text-xs py-0.5"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              >
                Show/hide grid<MenubarShortcut>Ctrl+G</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarSeparator />
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
                Header properties<MenubarShortcut>Alt+H</MenubarShortcut>
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
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Universe</span>
                <MenubarShortcut>Alt+U</MenubarShortcut>
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                <span className="flex-1">Material Flow Control</span>
                <MenubarShortcut>Alt+C</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          {/* Window */}
          <MenubarMenu>
            <MenubarTrigger className="text-xs h-6 px-2 py-0 rounded-none data-[state=open]:bg-blue-700 data-[state=open]:text-white">
              Window
            </MenubarTrigger>
            <MenubarContent className="text-xs">
              <MenubarCheckboxItem className="text-xs py-0.5" checked={true}>
                Recipe Designer - Batch
              </MenubarCheckboxItem>
              <MenubarItem className="text-xs py-0.5">
                Recipe Designer - Device
              </MenubarItem>
              <MenubarItem className="text-xs py-0.5">
                Workflow Designer
              </MenubarItem>
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
                <span className="flex-1">Recipe Designer Help</span>
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
          icon={<FileText size={13} />}
          tooltip="New Master Recipe (Ctrl+Shift+M)"
          onClick={() => toast.info("New master recipe")}
        />
        <TBtn
          icon={<GitBranch size={13} />}
          tooltip="New Procedure (Ctrl+Shift+R)"
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
          onClick={() => toast.success("Saved")}
        />
        <TBtn icon={<X size={13} />} tooltip="Close" />
        <TBtn
          icon={<Printer size={13} />}
          tooltip="Open graph pagination (Ctrl+R)"
        />
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
        <div className="w-px h-5 bg-gray-400 mx-0.5" />
        {/* View group */}
        <TBtn
          icon={<span className="text-xs font-bold">1:1</span>}
          tooltip="Zoom to 100% (Ctrl+1)"
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
        <TBtn icon={<Layers size={13} />} tooltip="Open Universe (Alt+U)" />
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
            {/* Map panel */}
            {showMap && (
              <div
                className="border-b border-gray-400 flex-shrink-0"
                style={{ height: "135px" }}
              >
                <div className="bg-gray-300 border-b border-gray-400 px-2 py-0.5 flex items-center justify-between">
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
                <div
                  className="p-1 flex flex-col gap-1"
                  style={{ height: "calc(135px - 20px)" }}
                >
                  {["Procedure", "Unit Procedure", "Operation"].map(
                    (level, i) => (
                      <div
                        key={level}
                        className={cn(
                          "flex-1 border rounded flex items-center justify-center relative",
                          i === 2
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 bg-white",
                        )}
                        style={{ minHeight: "24px" }}
                      >
                        {/* corner markers */}
                        {Array.from({ length: 4 - i }).map(
                          (_: unknown, j: number) => (
                            <div
                              key={String(j)}
                              className={cn(
                                "absolute w-2 h-2",
                                j === 0 && "top-0 left-0 border-t-2 border-l-2",
                                j === 1 &&
                                  "top-0 right-0 border-t-2 border-r-2",
                                j === 2 &&
                                  "bottom-0 left-0 border-b-2 border-l-2",
                                j === 3 &&
                                  "bottom-0 right-0 border-b-2 border-r-2",
                              )}
                              style={{
                                borderColor: i === 2 ? "#2563eb" : "#9ca3af",
                              }}
                            />
                          ),
                        )}
                        <span
                          className="text-xs text-gray-500"
                          style={{ fontSize: "9px" }}
                        >
                          {level}
                        </span>
                        {i === 2 && (
                          <div className="absolute inset-1 flex items-center justify-center">
                            <svg
                              role="img"
                              aria-label="Operation level graph"
                              width="100%"
                              height="100%"
                              viewBox="0 0 80 30"
                              preserveAspectRatio="xMidYMid meet"
                            >
                              <circle cx="10" cy="15" r="4" fill="#333" />
                              <rect
                                x="24"
                                y="10"
                                width="20"
                                height="10"
                                fill="#EBF5FB"
                                stroke="#C0392B"
                                strokeWidth="1.5"
                                rx="1"
                              />
                              <circle
                                cx="68"
                                cy="15"
                                r="4"
                                fill="#555"
                                stroke="#333"
                                strokeWidth="2"
                              />
                              <line
                                x1="14"
                                y1="15"
                                x2="24"
                                y2="15"
                                stroke="#555"
                                strokeWidth="1"
                              />
                              <line
                                x1="44"
                                y1="15"
                                x2="60"
                                y2="15"
                                stroke="#555"
                                strokeWidth="1"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
            {/* Explorer panel */}
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

        {/* ── Center: Graph Window ──────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden bg-white">
          {/* Upper tab bar */}
          <div
            className="flex-shrink-0 bg-gray-200 border-b border-gray-400 flex items-end overflow-x-auto"
            style={{ minHeight: "24px" }}
          >
            {RECIPE_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "text-xs px-2 py-0.5 border border-b-0 border-gray-400 rounded-t mr-0.5 mt-0.5 flex-shrink-0 flex items-center gap-1 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-sky-200 font-semibold"
                    : "bg-gray-300 hover:bg-gray-200",
                )}
                data-ocid="recipe.tab"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                {tab.label}
                {tab.unsaved && <span className="text-orange-500">*</span>}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-0.5 px-1 pb-0.5">
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-300 rounded"
              >
                <ArrowDown size={10} />
              </button>
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-300 rounded"
              >
                <X size={10} />
              </button>
            </div>
          </div>

          {/* Lower sub-tab bar */}
          <div
            className="flex-shrink-0 bg-gray-100 border-b border-gray-400 flex items-end overflow-x-auto"
            style={{ minHeight: "22px" }}
          >
            {[
              { id: "masterrecipe", label: "Master Recipe" },
              { id: "procedure", label: "Sonolin Retard 100" },
              { id: "unitprocedure", label: "Sonolin Retard 100" },
              { id: "operation", label: "Weighing" },
              { id: "mfc", label: "Material Flow Control" },
            ].map((sub) => (
              <button
                type="button"
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={cn(
                  "text-xs px-2 py-0.5 border border-b-0 border-gray-400 rounded-t mr-0.5 mt-0.5 flex-shrink-0 whitespace-nowrap",
                  activeSubTab === sub.id
                    ? "bg-white font-semibold"
                    : "bg-gray-200 hover:bg-gray-100",
                )}
                data-ocid="subtab.tab"
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Graph Canvas */}
          <div
            className="flex-1 overflow-auto relative"
            style={{
              background: showGrid
                ? "repeating-linear-gradient(0deg, transparent, transparent 19px, #e5e7eb 19px, #e5e7eb 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #e5e7eb 19px, #e5e7eb 20px)"
                : "white",
            }}
          >
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                padding: "16px",
              }}
            >
              <SFCCanvas
                nodes={SFC_NODES}
                edges={SFC_EDGES}
                selectedId={selectedNode}
                onSelect={(id) => {
                  setSelectedNode(id);
                }}
              />
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-300 px-2 py-0.5">
            <span className="text-xs text-gray-500">Operations: </span>
            <span className="text-xs text-blue-700 cursor-pointer hover:underline">
              ID_SR-001
            </span>
            <span className="text-xs text-gray-400"> / </span>
            <span className="text-xs text-blue-700 cursor-pointer hover:underline">
              Sonolin Retard 100
            </span>
            <span className="text-xs text-gray-400"> / </span>
            <span className="text-xs text-blue-700 cursor-pointer hover:underline">
              Weighing
            </span>
            <span className="text-xs text-gray-400"> / </span>
            <span className="text-xs font-medium">Dispensing</span>
          </div>
        </div>

        {/* ── Right Panels ──────────────────────────────────────── */}
        {(showSetlist || showProperties) && (
          <div
            className="flex flex-col bg-white border-l border-gray-400 flex-shrink-0"
            style={{ width: "230px" }}
          >
            {/* Setlist */}
            {showSetlist && (
              <div
                className="flex flex-col border-b border-gray-400 flex-shrink-0"
                style={{ height: "55%" }}
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
                {/* Setlist toolbar */}
                <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-gray-200 flex-shrink-0 flex-wrap">
                  {[
                    { icon: <ArrowDown size={11} />, tip: "Sequence" },
                    { icon: <GitBranch size={11} />, tip: "Selection Branch" },
                    { icon: <Move size={11} />, tip: "Simultaneous Branch" },
                    { icon: <Check size={11} />, tip: "Join" },
                    { icon: <RefreshCw size={11} />, tip: "Replace" },
                    {
                      icon: <MoreHorizontal size={11} />,
                      tip: "Smart Replace",
                    },
                    { icon: <ArrowDown size={11} />, tip: "Input" },
                    { icon: <ArrowUp size={11} />, tip: "Output" },
                    {
                      icon: <RotateCcw size={11} />,
                      tip: "Invert drawing direction",
                    },
                  ].map((btn) => (
                    <TBtn key={btn.tip} icon={btn.icon} tooltip={btn.tip} />
                  ))}
                </div>
                <ScrollArea className="flex-1">
                  <Accordion
                    type="multiple"
                    defaultValue={["phase"]}
                    className="w-full"
                  >
                    {[
                      { id: "material", label: "Material", items: [] },
                      { id: "erpbom", label: "ERP BOM Item", items: [] },
                      { id: "equip", label: "Equipment Class", items: [] },
                      { id: "proptype", label: "Property Type", items: [] },
                      { id: "workcenter", label: "Work Center", items: [] },
                      { id: "station", label: "Station", items: [] },
                      {
                        id: "privilege",
                        label: "Signature Privilege",
                        items: [],
                      },
                      { id: "capability", label: "Capability", items: [] },
                      { id: "procedure", label: "Procedure", items: [] },
                      { id: "unitproc", label: "Unit Procedure", items: [] },
                      { id: "operation", label: "Operation", items: [] },
                      { id: "phase", label: "Phase", items: SETLIST_PHASES },
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
                                  data-ocid="setlist.item.1"
                                >
                                  <Square
                                    size={9}
                                    className="text-gray-400 flex-shrink-0"
                                  />
                                  <span className="truncate">{item}</span>
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
                        data-ocid="properties.tab"
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
                        ["Identifier", "ID_SR-001"],
                        ["Version", "1 (1)"],
                        ["Description", ""],
                        ["Comparison baseline", ""],
                        ["Method", ""],
                        ["Method description", ""],
                        ["Reason for creation", ""],
                        ["Usage type", "Production"],
                        ["Status data", "Edit"],
                        ["Planned quantity", "1000 kg"],
                        ["Minimum quantity", "800 kg"],
                        ["Maximum quantity", "1200 kg"],
                        ["Registration number", "20-821"],
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
                            {label === "Status data" ? (
                              <Badge variant="outline" className="text-xs h-4">
                                {value}
                              </Badge>
                            ) : label === "Identifier" ||
                              label === "Version" ? (
                              <span className="font-mono">{value}</span>
                            ) : (
                              <span>{value}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="bg-gray-50 border-t border-gray-200 p-1.5">
                        <p
                          className="text-gray-500 italic"
                          style={{ fontSize: "10px" }}
                        >
                          Sonolin Retard 100 – bulk production
                        </p>
                      </div>
                    </div>
                  )}
                  {propTab === "element" && (
                    <div className="text-xs p-2">
                      {selectedNode ? (
                        <div className="space-y-2">
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Identifier
                            </span>
                            <span className="font-mono text-xs">
                              {SFC_NODES.find((n) => n.id === selectedNode)
                                ?.label ?? "—"}
                            </span>
                          </div>
                          <div className="flex border-b pb-1">
                            <span className="w-20 text-gray-500 text-xs">
                              Description
                            </span>
                            <span className="text-xs">—</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-xs">
                          No element selected
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
                          {SFC_NODES.find((n) => n.id === selectedNode)
                            ?.label ?? "—"}
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
                data-ocid="bottom.tab"
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
                data-ocid="bottom.tab"
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
                data-ocid="bottom.tab"
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
                style={{ width: "220px" }}
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
                  <div className="bg-white border border-gray-300 rounded p-2 w-full text-center shadow-sm">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Weigh the material.
                    </p>
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
                    data-ocid="messages.toggle"
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
                    data-ocid="messages.toggle"
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
                    data-ocid="messages.toggle"
                  >
                    I {msgCounts.info}
                  </button>
                  <span className="text-gray-400 text-xs ml-1">
                    ID_SR-001 / Sonolin Retard 100 / Weighing
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
                  {/* Tree panel */}
                  <div className="w-28 border-r border-gray-200 bg-gray-50 overflow-auto">
                    <div className="text-xs p-1">
                      {[
                        "ID_SR-001",
                        "Weighing",
                        "Weigh Material",
                        "Tare Material",
                      ].map((node, i) => (
                        <div
                          key={node}
                          className={cn(
                            "py-0.5 px-1 rounded cursor-pointer text-xs",
                            i < 2
                              ? "text-gray-600"
                              : "text-red-600 font-medium",
                          )}
                        >
                          {node}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* List panel */}
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
                            data-ocid={`messages.item.${i + 1}`}
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
                      "text-xs px-1.5 py-0.5 border rounded font-bold",
                      cmpFilter.added
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="comparison.toggle"
                  >
                    + {cmpCounts.added}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCmpFilter((f) => ({ ...f, changed: !f.changed }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded font-bold",
                      cmpFilter.changed
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="comparison.toggle"
                  >
                    ~ {cmpCounts.changed}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCmpFilter((f) => ({ ...f, removed: !f.removed }))
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 border rounded font-bold",
                      cmpFilter.removed
                        ? "bg-red-100 border-red-300 text-red-700"
                        : "bg-gray-100 border-gray-300",
                    )}
                    data-ocid="comparison.toggle"
                  >
                    - {cmpCounts.removed}
                  </button>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-5 text-xs w-28 ml-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All types
                      </SelectItem>
                      <SelectItem value="property" className="text-xs">
                        Property
                      </SelectItem>
                      <SelectItem value="phase" className="text-xs">
                        Phase
                      </SelectItem>
                      <SelectItem value="transition" className="text-xs">
                        Transition
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className="ml-auto"
                    onClick={() => setShowComparison(false)}
                  >
                    <X size={10} className="text-gray-400" />
                  </button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  {/* Tree panel */}
                  <div className="w-24 border-r border-gray-200 bg-gray-50 overflow-auto">
                    <div className="text-xs p-1">
                      {["ID_SR-001", "Weighing"].map((node, i) => (
                        <div
                          key={node}
                          className={cn(
                            "py-0.5 px-1 rounded cursor-pointer text-xs",
                            i === 0
                              ? "text-blue-700 font-bold"
                              : "text-gray-600",
                          )}
                        >
                          {node}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* List panel */}
                  <ScrollArea className="flex-1">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-6 text-xs w-5"> </TableHead>
                          <TableHead className="h-6 text-xs w-20">
                            Type
                          </TableHead>
                          <TableHead className="h-6 text-xs w-24">
                            Identifier
                          </TableHead>
                          <TableHead className="h-6 text-xs w-24">
                            Attribute
                          </TableHead>
                          <TableHead className="h-6 text-xs">
                            New value
                          </TableHead>
                          <TableHead className="h-6 text-xs">
                            Old value
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredComparison.map((r, i) => (
                          <TableRow
                            key={r.id + r.type + String(i)}
                            className="text-xs cursor-pointer hover:bg-gray-50"
                            data-ocid={`comparison.item.${i + 1}`}
                          >
                            <TableCell className="py-0.5 px-1">
                              {r.category === "added" && (
                                <Plus size={11} className="text-green-600" />
                              )}
                              {r.category === "changed" && (
                                <Pencil size={11} className="text-blue-600" />
                              )}
                              {r.category === "removed" && (
                                <Minus size={11} className="text-red-600" />
                              )}
                            </TableCell>
                            <TableCell
                              className="py-0.5 px-1"
                              style={{ fontSize: "10px" }}
                            >
                              {r.type}
                            </TableCell>
                            <TableCell
                              className="py-0.5 px-1 font-mono"
                              style={{ fontSize: "10px" }}
                            >
                              {r.id}
                            </TableCell>
                            <TableCell
                              className="py-0.5 px-1"
                              style={{ fontSize: "10px" }}
                            >
                              {r.attribute}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "py-0.5 px-1",
                                r.category === "added" ? "text-green-700" : "",
                              )}
                              style={{ fontSize: "10px" }}
                            >
                              {r.newVal || "—"}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "py-0.5 px-1",
                                r.category === "removed"
                                  ? "text-red-700"
                                  : "text-gray-500",
                              )}
                              style={{ fontSize: "10px" }}
                            >
                              {r.oldVal || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Status Bar ────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 bg-gray-300 border-t border-gray-400 flex items-center px-2 gap-4"
        style={{ height: "20px" }}
      >
        <span className="text-gray-600" style={{ fontSize: "10px" }}>
          Gen. Delamara (dgn) ▲
        </span>
        <div className="flex-1 flex justify-center">
          <span className="text-gray-500" style={{ fontSize: "10px" }}>
            PHARMA_PROD
          </span>
        </div>
        <span className="text-gray-600" style={{ fontSize: "10px" }}>
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          CEST
        </span>
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
      <OpenRecipeDialog
        open={dialog === "openDialog"}
        onClose={() => setDialog("none")}
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
        description={sigDescription}
        onSign={handleSigned}
      />
    </div>
  );
}
