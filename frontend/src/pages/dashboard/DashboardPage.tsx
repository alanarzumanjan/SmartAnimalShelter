import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Cpu, MapPin, PlusCircle, Thermometer, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  type DeviceRecord,
  type MeasurementRecord,
  getLatestMeasurement,
  getStoredUser,
  getUserDevices,
  registerDevice,
} from '@/services/device.service';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'No data yet';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'No data yet' : parsed.toLocaleString();
};

const getCo2State = (co2: number | null) => {
  if (co2 === null) {
    return {
      label: 'No data',
      className: 'bg-gray-100 text-gray-600',
    };
  }

  if (co2 <= 800) {
    return {
      label: 'Good',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (co2 <= 1200) {
    return {
      label: 'Attention',
      className: 'bg-amber-100 text-amber-800',
    };
  }

  return {
    label: 'High',
    className: 'bg-rose-100 text-rose-700',
  };
};

const DashboardPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [latestByDevice, setLatestByDevice] = useState<Record<string, MeasurementRecord | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    location: '',
  });

  const currentUser = getStoredUser();

  const loadDashboard = async () => {
    if (!currentUser?.id) {
      setDevices([]);
      setLatestByDevice({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextDevices = await getUserDevices(currentUser.id);
      setDevices(nextDevices);

      const measurementEntries = await Promise.all(
        nextDevices.map(async (device) => [device.id, await getLatestMeasurement(device.id)] as const)
      );

      setLatestByDevice(Object.fromEntries(measurementEntries));
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to load devices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleConnectDevice = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentUser?.id) {
      toast.error('Please sign in again before connecting a device.');
      return;
    }

    setIsConnecting(true);

    try {
      await registerDevice({
        id: form.id,
        name: form.name,
        location: form.location,
        userId: currentUser.id,
      });

      toast.success('Device connected successfully.');
      setForm({ id: '', name: '', location: '' });
      await loadDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to connect device.');
    } finally {
      setIsConnecting(false);
    }
  };

  const latestMeasurements = useMemo(
    () =>
      devices
        .map((device) => ({
          device,
          measurement: latestByDevice[device.id] ?? null,
        }))
        .filter((entry) => entry.measurement)
        .sort((left, right) => {
          const leftTime = new Date(left.measurement!.timestamp).getTime();
          const rightTime = new Date(right.measurement!.timestamp).getTime();
          return rightTime - leftTime;
        }),
    [devices, latestByDevice]
  );

  const totalDevices = devices.length;
  const devicesWithData = latestMeasurements.length;

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <Cpu className="w-4 h-4" />
              IoT dashboard
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Dashboard</h1>
            <p className="text-gray-600 text-lg leading-7">
              Based on the `carbon_dioxide_meter` flow: connect devices, see the latest measurements immediately, and open each device for more detailed telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Devices</div>
              <div className="text-2xl font-bold text-gray-900">{totalDevices}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Reporting</div>
              <div className="text-2xl font-bold text-gray-900">{devicesWithData}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">User</div>
              <div className="text-sm font-semibold text-gray-900">{currentUser?.name ?? 'Unknown user'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <PlusCircle className="w-5 h-5 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Connect device</h2>
          </div>

          <form onSubmit={handleConnectDevice} className="grid md:grid-cols-2 gap-4">
            <Input
              label="Device MAC"
              placeholder="AA:BB:CC:DD:EE:FF"
              value={form.id}
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
            />
            <Input
              label="Device name"
              placeholder="Shelter Sensor 01"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Input
                label="Location"
                placeholder="Cat room A"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-start">
              <Button type="submit" isLoading={isConnecting}>
                <PlusCircle className="w-4 h-4" />
                Connect Device
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connection notes</h2>
          <div className="space-y-4 text-gray-600 leading-7">
            <p>Register the sensor using its MAC address, then the ESP32 can authenticate through the existing backend device flow and begin sending measurements.</p>
            <p>This mirrors the structure used in `carbon_dioxide_meter`: devices are listed first, and the latest telemetry is shown directly in the dashboard for quick monitoring.</p>
            <p>Open any device card to inspect a fuller measurement history.</p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">My devices</h2>
          {!isLoading && (
            <div className="text-sm text-gray-500">
              {totalDevices === 1 ? '1 device' : `${totalDevices} devices`}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-12 text-center">
            <p className="text-lg font-semibold text-gray-900">No devices connected yet</p>
            <p className="text-gray-500 mt-2">Use the form above to connect your first IoT sensor.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {devices.map((device) => {
              const latest = latestByDevice[device.id] ?? null;
              const badge = getCo2State(latest?.co2 ?? null);

              return (
                <Link
                  key={device.id}
                  to={`/dashboard/devices/${encodeURIComponent(device.id)}`}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{device.name}</h3>
                      <div className="text-sm text-gray-500 font-mono mt-1">{device.deviceId}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">CO2</div>
                      <div className="text-lg font-bold text-gray-900">{latest ? latest.co2.toFixed(0) : '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Temp</div>
                      <div className="text-lg font-bold text-gray-900">{latest ? latest.temperature.toFixed(1) : '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Humidity</div>
                      <div className="text-lg font-bold text-gray-900">{latest ? latest.humidity.toFixed(0) : '—'}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {device.location}
                    </div>
                    <div>Last update: {formatDateTime(latest?.timestamp ?? device.lastSeenAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Latest measurements</h2>
        </div>

        {latestMeasurements.length === 0 ? (
          <div className="text-gray-500">No measurements have been received yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 pr-4">Device</th>
                  <th className="py-3 pr-4">CO2</th>
                  <th className="py-3 pr-4">Temperature</th>
                  <th className="py-3 pr-4">Humidity</th>
                  <th className="py-3 pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {latestMeasurements.map(({ device, measurement }) => (
                  <tr key={measurement!.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">{device.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{device.deviceId}</div>
                    </td>
                    <td className="py-4 pr-4">{measurement!.co2.toFixed(0)} ppm</td>
                    <td className="py-4 pr-4 inline-flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-rose-500" />
                      {measurement!.temperature.toFixed(1)} °C
                    </td>
                    <td className="py-4 pr-4 inline-flex items-center gap-2">
                      <Waves className="w-4 h-4 text-sky-500" />
                      {measurement!.humidity.toFixed(0)} %
                    </td>
                    <td className="py-4 pr-4 text-gray-500">{formatDateTime(measurement!.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
