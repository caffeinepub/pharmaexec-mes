// Location Hierarchy — PharmaExec MES
// Room → Station → Sub-Station → Equipment
// Provides types, seed data, and hierarchy helper utilities.

const LOCATION_STORE_KEY = "mes_location_hierarchy";

export interface RoomNode {
  id: string;
  identifier: string;
  name: string;
  description: string;
  area: string; // e.g. "Manufacturing", "Packaging", "QC"
  cleanRoomClass: string; // e.g. "ISO 7", "ISO 8", "Unclassified"
  status: "Active" | "Inactive" | "Under Maintenance";
  createdAt: string;
  updatedAt: string;
}

export interface SubStationNode {
  id: string;
  identifier: string;
  name: string;
  description: string;
  parentStationId: string; // references EquipmentNode with entityType="Station"
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface LocationHierarchyData {
  rooms: RoomNode[];
  subStations: SubStationNode[];
}

function loadLocationData(): LocationHierarchyData {
  try {
    const raw = localStorage.getItem(LOCATION_STORE_KEY);
    if (!raw) return getInitialLocationData();
    const parsed = JSON.parse(raw) as LocationHierarchyData;
    if (!parsed.rooms || !parsed.subStations) return getInitialLocationData();
    return parsed;
  } catch {
    return getInitialLocationData();
  }
}

function saveLocationData(data: LocationHierarchyData): void {
  localStorage.setItem(LOCATION_STORE_KEY, JSON.stringify(data));
}

export function getAllRooms(): RoomNode[] {
  return loadLocationData().rooms;
}

export function getAllSubStations(): SubStationNode[] {
  return loadLocationData().subStations;
}

export function getSubStationsByStation(stationId: string): SubStationNode[] {
  return loadLocationData().subStations.filter(
    (ss) => ss.parentStationId === stationId,
  );
}

export function getRoomById(id: string): RoomNode | undefined {
  return loadLocationData().rooms.find((r) => r.id === id);
}

export function getSubStationById(id: string): SubStationNode | undefined {
  return loadLocationData().subStations.find((ss) => ss.id === id);
}

export function createRoom(
  room: Omit<RoomNode, "id" | "createdAt" | "updatedAt">,
): RoomNode {
  const data = loadLocationData();
  const now = new Date().toISOString();
  const newRoom: RoomNode = {
    ...room,
    id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  data.rooms.push(newRoom);
  saveLocationData(data);
  return newRoom;
}

export function createSubStation(
  ss: Omit<SubStationNode, "id" | "createdAt" | "updatedAt">,
): SubStationNode {
  const data = loadLocationData();
  const now = new Date().toISOString();
  const newSS: SubStationNode = {
    ...ss,
    id: `subst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  data.subStations.push(newSS);
  saveLocationData(data);
  return newSS;
}

function getInitialLocationData(): LocationHierarchyData {
  const now = new Date().toISOString();
  return {
    rooms: [
      {
        id: "room_001",
        identifier: "RM-MFG-01",
        name: "Manufacturing Room A",
        description: "Primary solid dosage manufacturing area",
        area: "Manufacturing",
        cleanRoomClass: "ISO 8",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "room_002",
        identifier: "RM-MFG-02",
        name: "Manufacturing Room B",
        description: "Secondary coating and granulation area",
        area: "Manufacturing",
        cleanRoomClass: "ISO 7",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "room_003",
        identifier: "RM-PKG-01",
        name: "Packaging Room 1",
        description: "Primary packaging blister line",
        area: "Packaging",
        cleanRoomClass: "ISO 8",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    subStations: [
      {
        id: "subst_001",
        identifier: "SS-COAT-01A",
        name: "Coating Sub-Station A",
        description: "Sub-station for drum loading and spray system",
        parentStationId: "st3",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "subst_002",
        identifier: "SS-COAT-01B",
        name: "Coating Sub-Station B",
        description: "Sub-station for air handling and exhaust",
        parentStationId: "st3",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "subst_003",
        identifier: "SS-GRN-01A",
        name: "Granulation Sub-Station A",
        description: "Wet granulation impeller sub-station",
        parentStationId: "st4",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
