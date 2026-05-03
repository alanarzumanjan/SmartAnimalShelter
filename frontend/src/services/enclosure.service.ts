import api from "@/services/api";

// Raw response from backend (PascalCase fields from C#)
interface RawMeasurement {
  co2?: number; CO2?: number; cO2?: number;
  temperature?: number; Temperature?: number;
  humidity?: number; Humidity?: number;
  timestamp?: string; Timestamp?: string;
}

interface RawDevice {
  id?: string; Id?: string;
  deviceId?: string; DeviceId?: string;
  name?: string; Name?: string;
  location?: string; Location?: string;
  lastSeenAt?: string | null; LastSeenAt?: string | null;
}

interface RawPet {
  id?: string; Id?: string;
  name?: string | null; Name?: string | null;
  mongoImageId?: string | null; MongoImageId?: string | null;
  species?: string; Species?: string;
  breed?: string; Breed?: string;
}

interface RawEnclosure {
  id?: string; Id?: string;
  name?: string; Name?: string;
  description?: string | null; Description?: string | null;
  shelterId?: string; ShelterId?: string;
  createdAt?: string; CreatedAt?: string;
  pets?: RawPet[]; Pets?: RawPet[];
  device?: RawDevice | null; Device?: RawDevice | null;
  latestMeasurement?: RawMeasurement | null; LatestMeasurement?: RawMeasurement | null;
}

function normalizeMeasurement(r: RawMeasurement | null | undefined): EnclosureMeasurement | null {
  if (!r) return null;
  return {
    co2: Number(r.co2 ?? r.cO2 ?? r.CO2 ?? 0),
    temperature: Number(r.temperature ?? r.Temperature ?? 0),
    humidity: Number(r.humidity ?? r.Humidity ?? 0),
    timestamp: String(r.timestamp ?? r.Timestamp ?? ""),
  };
}

function normalizeDevice(r: RawDevice | null | undefined): EnclosureDevice | null {
  if (!r) return null;
  return {
    id: String(r.id ?? r.Id ?? ""),
    deviceId: String(r.deviceId ?? r.DeviceId ?? ""),
    name: String(r.name ?? r.Name ?? ""),
    location: String(r.location ?? r.Location ?? ""),
    lastSeenAt: (r.lastSeenAt ?? r.LastSeenAt) ?? null,
  };
}

function normalizeEnclosure(r: RawEnclosure): EnclosureRecord {
  const rawPets = r.pets ?? r.Pets ?? [];
  const rawDevice = r.device ?? r.Device;
  const rawMeasurement = r.latestMeasurement ?? r.LatestMeasurement;
  return {
    id: String(r.id ?? r.Id ?? ""),
    name: String(r.name ?? r.Name ?? ""),
    description: r.description ?? r.Description ?? null,
    shelterId: String(r.shelterId ?? r.ShelterId ?? ""),
    createdAt: String(r.createdAt ?? r.CreatedAt ?? ""),
    pets: rawPets.map(p => ({
      id: String(p.id ?? p.Id ?? ""),
      name: p.name ?? p.Name ?? null,
      mongoImageId: p.mongoImageId ?? p.MongoImageId ?? null,
      species: p.species ?? p.Species,
      breed: p.breed ?? p.Breed,
    })),
    device: normalizeDevice(rawDevice),
    latestMeasurement: normalizeMeasurement(rawMeasurement),
  };
}

export interface EnclosurePet {
  id: string;
  name: string | null;
  mongoImageId?: string | null;
  species?: string;
  breed?: string;
}

export interface EnclosureDevice {
  id: string;
  deviceId: string;
  name: string;
  location?: string;
  lastSeenAt?: string | null;
}

export interface EnclosureMeasurement {
  co2: number;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface EnclosureRecord {
  id: string;
  name: string;
  description?: string | null;
  shelterId: string;
  createdAt: string;
  pets: EnclosurePet[];
  device: EnclosureDevice | null;
  latestMeasurement: EnclosureMeasurement | null;
}

export async function getMyEnclosures(): Promise<{ shelterId: string; data: EnclosureRecord[] }> {
  const { data } = await api.get("/enclosures/my");
  const raw = data as { shelterId: string; data: RawEnclosure[] };
  return { shelterId: raw.shelterId, data: raw.data.map(normalizeEnclosure) };
}

export async function getEnclosure(id: string): Promise<EnclosureRecord> {
  const { data } = await api.get(`/enclosures/${id}`);
  return normalizeEnclosure(data as RawEnclosure);
}

export async function createEnclosure(payload: { name: string; description?: string }): Promise<EnclosureRecord> {
  const { data } = await api.post("/enclosures", payload);
  return (data as { data: EnclosureRecord }).data;
}

export async function updateEnclosure(id: string, payload: { name?: string; description?: string }): Promise<void> {
  await api.patch(`/enclosures/${id}`, payload);
}

export async function deleteEnclosure(id: string): Promise<void> {
  await api.delete(`/enclosures/${id}`);
}

export async function assignDevice(enclosureId: string, deviceId: string | null): Promise<void> {
  await api.patch(`/enclosures/${enclosureId}/device`, { deviceId });
}

export async function assignPet(enclosureId: string, petId: string): Promise<void> {
  await api.patch(`/enclosures/${enclosureId}/pets/${petId}`);
}

export async function removePet(enclosureId: string, petId: string): Promise<void> {
  await api.delete(`/enclosures/${enclosureId}/pets/${petId}`);
}

export function co2Status(co2: number | null): { label: string; color: string; dot: string } {
  if (co2 === null) return { label: "No data", color: "text-slate-400", dot: "bg-slate-400" };
  if (co2 <= 800) return { label: "Good", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" };
  if (co2 <= 1200) return { label: "Attention", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
  return { label: "High CO₂", color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" };
}
