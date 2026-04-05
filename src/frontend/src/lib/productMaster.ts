// Product Master — PharmaExec MES
// Product entity for campaign/cleaning/DETH validation

export interface ProductMaster {
  id: string;
  productCode: string; // Unique product code (e.g. "PRD-AMX-001")
  productName: string; // Full product name
  description: string;
  campaignLength: number; // Max campaign length in batches before mandatory cleaning
  dethTime: number; // Dirty Equipment Hold Time in hours
  status: "Draft" | "Approved" | "Executed";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isUsedInBatch: boolean;
  changeHistory: Array<{
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    action?: "Create" | "Update" | "Delete";
    reason?: string;
  }>;
}

const PRODUCT_STORE_KEY = "mes_product_master";

function loadProducts(): ProductMaster[] {
  try {
    const raw = localStorage.getItem(PRODUCT_STORE_KEY);
    if (!raw) return getInitialProducts();
    const parsed = JSON.parse(raw) as ProductMaster[];
    if (!Array.isArray(parsed) || parsed.length === 0)
      return getInitialProducts();
    return parsed;
  } catch {
    return getInitialProducts();
  }
}

function saveProducts(products: ProductMaster[]): void {
  localStorage.setItem(PRODUCT_STORE_KEY, JSON.stringify(products));
}

export function getAllProducts(): ProductMaster[] {
  return loadProducts();
}

export function getProductByCode(
  productCode: string,
): ProductMaster | undefined {
  return loadProducts().find((p) => p.productCode === productCode);
}

export function createProduct(
  data: Omit<ProductMaster, "id" | "createdAt" | "changeHistory">,
  user: string,
): ProductMaster {
  const products = loadProducts();
  const now = new Date().toISOString();
  const product: ProductMaster = {
    ...data,
    id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    createdBy: user,
    updatedAt: now,
    isUsedInBatch: false,
    changeHistory: [
      {
        timestamp: now,
        field: "*",
        oldValue: "",
        newValue: "Created",
        changedBy: user,
        action: "Create",
        reason: "Product created",
      },
    ],
  };
  products.push(product);
  saveProducts(products);
  return product;
}

export function updateProduct(
  id: string,
  changes: Partial<ProductMaster>,
  user: string,
  reason?: string,
): ProductMaster {
  const products = loadProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  const prev = products[idx];
  const now = new Date().toISOString();
  const skipFields = new Set(["changeHistory", "createdAt", "id"]);
  const newEntries = Object.entries(changes)
    .filter(([f]) => !skipFields.has(f))
    .filter(
      ([f, v]) =>
        String(prev[f as keyof ProductMaster] ?? "") !== String(v ?? ""),
    )
    .map(([f, v]) => ({
      timestamp: now,
      field: f,
      oldValue: String(prev[f as keyof ProductMaster] ?? ""),
      newValue: String(v ?? ""),
      changedBy: user,
      action: "Update" as const,
      reason: reason ?? "",
    }));
  const updated: ProductMaster = {
    ...prev,
    ...changes,
    id: prev.id,
    createdAt: prev.createdAt,
    createdBy: prev.createdBy,
    updatedAt: now,
    changeHistory: [...prev.changeHistory, ...newEntries],
  };
  products[idx] = updated;
  saveProducts(products);
  return updated;
}

export function deleteProduct(id: string): void {
  const products = loadProducts();
  const target = products.find((p) => p.id === id);
  if (!target) throw new Error(`Product ${id} not found`);
  if (target.status !== "Draft")
    throw new Error("Only Draft products can be deleted");
  saveProducts(products.filter((p) => p.id !== id));
}

export function approveProduct(id: string, user: string): ProductMaster {
  const products = loadProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  if (products[idx].status !== "Draft")
    throw new Error("Only Draft products can be approved");
  const now = new Date().toISOString();
  const updated: ProductMaster = {
    ...products[idx],
    status: "Approved",
    updatedAt: now,
    changeHistory: [
      ...products[idx].changeHistory,
      {
        timestamp: now,
        field: "status",
        oldValue: "Draft",
        newValue: "Approved",
        changedBy: user,
        action: "Update" as const,
        reason: "GMP Approval",
      },
    ],
  };
  products[idx] = updated;
  saveProducts(products);
  return updated;
}

function getInitialProducts(): ProductMaster[] {
  const now = new Date().toISOString();
  return [
    {
      id: "prod_001",
      productCode: "PRD-AMX-001",
      productName: "Amoxicillin 500mg Capsules",
      description: "Beta-lactam antibiotic, oral capsule form",
      campaignLength: 5,
      dethTime: 48,
      status: "Approved",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      isUsedInBatch: true,
      changeHistory: [],
    },
    {
      id: "prod_002",
      productCode: "PRD-MET-002",
      productName: "Metformin HCl 850mg Tablets",
      description: "Biguanide antidiabetic, sustained-release tablet",
      campaignLength: 8,
      dethTime: 72,
      status: "Approved",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      isUsedInBatch: false,
      changeHistory: [],
    },
    {
      id: "prod_003",
      productCode: "PRD-OMP-003",
      productName: "Omeprazole 20mg Enteric Coated",
      description: "Proton pump inhibitor, enteric coating required",
      campaignLength: 4,
      dethTime: 36,
      status: "Approved",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      isUsedInBatch: false,
      changeHistory: [],
    },
    {
      id: "prod_004",
      productCode: "PRD-ATV-004",
      productName: "Atorvastatin 40mg Film Coated",
      description: "HMG-CoA reductase inhibitor, film-coated tablet",
      campaignLength: 6,
      dethTime: 60,
      status: "Approved",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      isUsedInBatch: false,
      changeHistory: [],
    },
    {
      id: "prod_005",
      productCode: "PRD-CIP-005",
      productName: "Ciprofloxacin 250mg Tablets",
      description: "Fluoroquinolone antibiotic, immediate-release tablet",
      campaignLength: 3,
      dethTime: 24,
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      isUsedInBatch: false,
      changeHistory: [],
    },
  ];
}
