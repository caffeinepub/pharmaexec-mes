import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AppShell from "./components/AppShell";
import AuditTrail from "./pages/AuditTrail";
import BatchRecords from "./pages/BatchRecords";
import Dashboard from "./pages/Dashboard";
import DataManager from "./pages/DataManager";
import Deviations from "./pages/Deviations";
import EquipmentPage from "./pages/Equipment";
import Materials from "./pages/Materials";
import Personnel from "./pages/Personnel";
import ProductionPlanning from "./pages/ProductionPlanning";
import RecipeDesigner from "./pages/RecipeDesigner";
import Settings from "./pages/Settings";
import WorkOrders from "./pages/WorkOrders";
import WorkflowDesigner from "./pages/WorkflowDesigner";

// Root route with shell layout
const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const batchRecordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/batch-records",
  component: BatchRecords,
});

const workOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/work-orders",
  component: WorkOrders,
});

const productionPlanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/production-planning",
  component: ProductionPlanning,
});

const equipmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/equipment",
  component: EquipmentPage,
});

const materialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/materials",
  component: Materials,
});

const deviationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deviations",
  component: Deviations,
});

const personnelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/personnel",
  component: Personnel,
});

const auditTrailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit-trail",
  component: AuditTrail,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const recipeDesignerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipe-designer",
  component: RecipeDesigner,
});

const workflowDesignerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workflow-designer",
  component: WorkflowDesigner,
});

const dataManagerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-manager",
  component: DataManager,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  batchRecordsRoute,
  workOrdersRoute,
  productionPlanningRoute,
  equipmentRoute,
  materialsRoute,
  deviationsRoute,
  personnelRoute,
  auditTrailRoute,
  settingsRoute,
  dataManagerRoute,
  recipeDesignerRoute,
  workflowDesignerRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
