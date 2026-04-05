/**
 * Cleaning Event Log Service
 * Append-only log of all cleaning events performed on equipment.
 * Stored in localStorage.
 */

const CLEANING_LOG_KEY = "mes_cleaning_event_log";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CleaningEvent {
  id: string;
  equipmentId: string;
  equipmentIdentifier: string;
  cleanedBy: string;
  cleaningReason: string;
  productCode: string;
  cleanedAt: string; // ISO string
  validTill: string; // ISO string
  notes?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadEvents(): CleaningEvent[] {
  try {
    const raw = localStorage.getItem(CLEANING_LOG_KEY);
    return raw ? (JSON.parse(raw) as CleaningEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CleaningEvent[]): void {
  localStorage.setItem(CLEANING_LOG_KEY, JSON.stringify(events));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Logs a new cleaning event. Appends to the log — never overwrites.
 */
export function logCleaningEvent(
  event: Omit<CleaningEvent, "id">,
): CleaningEvent {
  const events = loadEvents();
  const newEvent: CleaningEvent = {
    ...event,
    id: `clev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

/**
 * Returns all cleaning events, optionally filtered by equipment ID.
 */
export function getCleaningEvents(equipmentId?: string): CleaningEvent[] {
  const events = loadEvents();
  if (equipmentId) {
    return events.filter(
      (e) =>
        e.equipmentId === equipmentId || e.equipmentIdentifier === equipmentId,
    );
  }
  return events;
}

/**
 * Returns all cleaning events across all equipment.
 */
export function getAllCleaningEvents(): CleaningEvent[] {
  return loadEvents();
}

/**
 * Returns the most recent cleaning event for a given equipment.
 */
export function getLatestCleaningEvent(
  equipmentId: string,
): CleaningEvent | null {
  const events = getCleaningEvents(equipmentId);
  if (events.length === 0) return null;
  return events.sort(
    (a, b) => new Date(b.cleanedAt).getTime() - new Date(a.cleanedAt).getTime(),
  )[0];
}
