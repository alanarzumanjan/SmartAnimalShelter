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

const unwrapData = <T>(payload: any): T => payload?.data ?? payload;

const normalizeDevice = (raw: any): DeviceRecord => {
  const deviceId = String(raw?.deviceId ?? raw?.id ?? '');

  return {
    id: deviceId,
    uuid: raw?.uuid ? String(raw.uuid) : undefined,
    deviceId,
    name: String(raw?.name ?? 'Unnamed Device'),
    location: String(raw?.location ?? 'Unknown'),
    description: raw?.description ? String(raw.description) : undefined,
    registeredAt: raw?.registeredAt ? String(raw.registeredAt) : undefined,
    lastSeenAt: raw?.lastSeenAt ? String(raw.lastSeenAt) : null,
    userId: raw?.userId ? String(raw.userId) : undefined,
  };
};

const normalizeMeasurement = (raw: any): MeasurementRecord => ({
  id: String(raw?.id ?? crypto.randomUUID()),
  deviceId: String(raw?.deviceId ?? ''),
  co2: Number(raw?.co2 ?? 0),
  temperature: Number(raw?.temperature ?? 0),
  humidity: Number(raw?.humidity ?? 0),
  timestamp: String(raw?.timestamp ?? ''),
  userId: raw?.userId ? String(raw.userId) : undefined,
});

export const getStoredUser = (): { id: string; name?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { id: string; name?: string; email?: string; role?: string };
  } catch {
    return null;
  }
};

export async function getUserDevices(userId: string): Promise<DeviceRecord[]> {
  const response = await api.get(`/devices/user/${userId}`);
  const items = unwrapData<any[]>(response.data);
  return Array.isArray(items) ? items.map(normalizeDevice) : [];
}

export async function getDevice(deviceId: string): Promise<DeviceRecord> {
  const response = await api.get(`/devices/id/${encodeURIComponent(deviceId)}`);
  return normalizeDevice(unwrapData<any>(response.data));
}

export async function registerDevice(input: DeviceRegisterInput): Promise<DeviceRecord> {
  const response = await api.post('/devices/register', input);
  return normalizeDevice(unwrapData<any>(response.data));
}

export async function getLatestMeasurement(deviceId: string): Promise<MeasurementRecord | null> {
  try {
    const response = await api.get(`/measurements/${encodeURIComponent(deviceId)}/latest`);
    return normalizeMeasurement(unwrapData<any>(response.data));
  } catch {
    return null;
  }
}

export async function getDeviceMeasurements(deviceId: string, limit = 50): Promise<MeasurementRecord[]> {
  const response = await api.get(`/measurements/${encodeURIComponent(deviceId)}?limit=${limit}`);
  const items = unwrapData<any[]>(response.data);
  return Array.isArray(items) ? items.map(normalizeMeasurement) : [];
}

export async function updateDevice(deviceId: string, updates: { name?: string; location?: string }): Promise<DeviceRecord> {
  const response = await api.put(`/devices/${encodeURIComponent(deviceId)}`, updates);
  return normalizeDevice(unwrapData<any>(response.data));
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

  const response = await api.get(`/measurements/user/${userId}?${params.toString()}`);
  const payload = response.data;
  const items = payload?.data ?? payload;
  return {
    data: Array.isArray(items) ? items.map(normalizeMeasurement) : [],
    total: payload?.total ?? 0,
    limit: payload?.limit ?? 0,
    offset: payload?.offset ?? 0,
  };
}
