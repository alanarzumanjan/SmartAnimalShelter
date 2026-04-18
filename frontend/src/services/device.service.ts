import api from '@/services/api';

export interface DeviceRecord {
  id: string;
  uuid?: string;
  deviceId: string;
  name: string;
  location: string;
  description?: string;
  registeredAt?: string;
  lastSeenAt?: string | null;
  userId?: string;
}

export interface MeasurementRecord {
  id: string;
  deviceId: string;
  co2: number;
  temperature: number;
  humidity: number;
  timestamp: string;
  userId?: string;
}

interface DeviceRegisterInput {
  id: string;
  name?: string;
  location?: string;
  userId: string;
}

type RawRecord = Record<string, unknown>;

function unwrapData<T>(payload: unknown): T {
  const p = payload as RawRecord;
  return (p?.data ?? payload) as T;
}

function str(v: unknown, fallback = ''): string {
  return v != null ? String(v) : fallback;
}

function normalizeDevice(raw: unknown): DeviceRecord {
  const r = raw as RawRecord;
  const deviceId = str(r?.deviceId ?? r?.id);
  return {
    id: deviceId,
    uuid: r?.uuid ? str(r.uuid) : undefined,
    deviceId,
    name: str(r?.name, 'Unnamed Device'),
    location: str(r?.location, 'Unknown'),
    description: r?.description ? str(r.description) : undefined,
    registeredAt: r?.registeredAt ? str(r.registeredAt) : undefined,
    lastSeenAt: r?.lastSeenAt ? str(r.lastSeenAt) : null,
    userId: r?.userId ? str(r.userId) : undefined,
  };
}

function normalizeMeasurement(raw: unknown): MeasurementRecord {
  const r = raw as RawRecord;
  return {
    id: str(r?.id, crypto.randomUUID()),
    deviceId: str(r?.deviceId),
    co2: Number(r?.co2 ?? 0),
    temperature: Number(r?.temperature ?? 0),
    humidity: Number(r?.humidity ?? 0),
    timestamp: str(r?.timestamp),
    userId: r?.userId ? str(r.userId) : undefined,
  };
}

export function getStoredUser(): { id: string; name?: string; email?: string; role?: string } | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; name?: string; email?: string; role?: string };
  } catch {
    return null;
  }
}

export async function getUserDevices(userId: string): Promise<DeviceRecord[]> {
  const { data } = await api.get(`/devices/user/${userId}`);
  const items = unwrapData<unknown[]>(data);
  return Array.isArray(items) ? items.map(normalizeDevice) : [];
}

export async function getDevice(deviceId: string): Promise<DeviceRecord> {
  const { data } = await api.get(`/devices/id/${encodeURIComponent(deviceId)}`);
  return normalizeDevice(unwrapData<unknown>(data));
}

export async function registerDevice(input: DeviceRegisterInput): Promise<DeviceRecord> {
  const { data } = await api.post('/devices/register', input);
  return normalizeDevice(unwrapData<unknown>(data));
}

export async function getLatestMeasurement(deviceId: string): Promise<MeasurementRecord | null> {
  try {
    const { data } = await api.get(`/measurements/${encodeURIComponent(deviceId)}/latest`);
    return normalizeMeasurement(unwrapData<unknown>(data));
  } catch {
    return null;
  }
}

export async function getDeviceMeasurements(deviceId: string, limit = 50): Promise<MeasurementRecord[]> {
  const { data } = await api.get(`/measurements/${encodeURIComponent(deviceId)}?limit=${limit}`);
  const items = unwrapData<unknown[]>(data);
  return Array.isArray(items) ? items.map(normalizeMeasurement) : [];
}

export async function updateDevice(deviceId: string, updates: { name?: string; location?: string }): Promise<DeviceRecord> {
  const { data } = await api.put(`/devices/${encodeURIComponent(deviceId)}`, updates);
  return normalizeDevice(unwrapData<unknown>(data));
}

export async function getUserMeasurements(
  userId: string,
  options?: { from?: string; to?: string; limit?: number; offset?: number }
): Promise<{ data: MeasurementRecord[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const { data } = await api.get(`/measurements/user/${userId}?${params.toString()}`);
  const payload = data as RawRecord;
  const items = payload?.data ?? data;
  return {
    data: Array.isArray(items) ? (items as unknown[]).map(normalizeMeasurement) : [],
    total: Number(payload?.total ?? 0),
    limit: Number(payload?.limit ?? 0),
    offset: Number(payload?.offset ?? 0),
  };
}
