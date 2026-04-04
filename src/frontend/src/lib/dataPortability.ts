const ALL_KEYS = [
  "mes_batches",
  "mes_deviations",
  "mes_work_orders",
  "mes_equipment",
  "mes_materials",
  "mes_personnel",
  "mes_audit_events",
  "mes_recipes",
  "mes_workflows",
  "pharma_production_plan",
  "pharma_feasibility_log",
  "pharma_campaigns",
  "pharma_holidays",
  "pharma_pm_windows",
  "pharma_scheduled_tasks",
];

export function exportAllData(): void {
  const data: Record<string, unknown> = {};

  for (const key of ALL_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const payload = {
    _meta: {
      appName: "PharmaExec MES",
      version: "1.0.0",
      exportedAt: now.toISOString(),
      schema: 1,
    },
    ...data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pharmaexec-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importAllData(file: File): Promise<void> {
  const text = await file.text();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "Invalid file: could not parse JSON. Please select a valid PharmaExec backup file.",
    );
  }

  if (!parsed._meta || typeof parsed._meta !== "object") {
    throw new Error(
      "Invalid backup file: missing _meta block. This does not appear to be a PharmaExec backup.",
    );
  }

  const meta = parsed._meta as Record<string, unknown>;
  if (meta.appName !== "PharmaExec MES") {
    throw new Error(
      `Invalid backup file: expected appName "PharmaExec MES" but got "${meta.appName}".`,
    );
  }

  const knownKeys = ALL_KEYS.filter((k) => k in parsed);
  if (knownKeys.length === 0) {
    throw new Error(
      "Invalid backup file: no recognisable MES data keys found. The file may be empty or corrupted.",
    );
  }

  for (const key of knownKeys) {
    const value = parsed[key];
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }

  window.location.reload();
}

export function resetAllData(): void {
  for (const key of ALL_KEYS) {
    localStorage.removeItem(key);
  }
  window.location.reload();
}
