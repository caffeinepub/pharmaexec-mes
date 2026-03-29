import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Cpu,
  Database,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Menu,
  Package,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/batch-records", label: "Batch Records", icon: ClipboardList },
  { to: "/work-orders", label: "Work Orders", icon: ListChecks },
  { to: "/equipment", label: "Equipment", icon: Cpu },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/data-manager", label: "Data Manager", icon: Database },
  { to: "/recipe-designer", label: "Recipe Designer", icon: BookOpen },
  { to: "/workflow-designer", label: "Workflow Designer", icon: GitBranch },
  { to: "/deviations", label: "Deviations", icon: AlertTriangle },
  { to: "/personnel", label: "Personnel", icon: Users },
  { to: "/audit-trail", label: "Audit Trail", icon: Shield },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isActive = (to: string) => {
    if (to === "/") return currentPath === "/";
    return currentPath.startsWith(to);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-[15px] leading-tight">
            PharmaExec
          </div>
          <div className="text-sidebar-foreground/50 text-[11px] tracking-wide uppercase">
            MES Platform
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              data-ocid={`nav.${label.toLowerCase().replace(/ /g, "_")}.link`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={17} />
              <span className="flex-1">{label}</span>
              {active && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 text-green-400 border-0 font-medium">
                  Active
                </Badge>
              )}
              {label === "Deviations" && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive/80 text-white text-[10px] font-bold">
                  4
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <Link
          to="/settings"
          data-ocid="nav.settings.link"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <Settings size={17} className="shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-sidebar h-full">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/50 w-full cursor-default"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[220px] bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </Button>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                data-ocid="header.search_input"
                className="pl-9 h-9 bg-[oklch(0.97_0.004_240)] border-border text-[13px]"
                placeholder="Search batches, orders, equipment…"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-ocid="header.notifications.button"
            >
              <Bell size={17} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-white text-[12px] font-semibold">
                  SC
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-[13px] font-medium text-foreground">
                Dr. Sarah Chen
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
