import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Cpu, MapPin, History as HistoryIcon } from "lucide-react";
import toast from "react-hot-toast";
import TimeZoneSelect from "@/components/ui/TimeZoneSelect";
import {
  type DeviceRecord,
  type MeasurementRecord,
  getLatestMeasurement,
  getStoredUser,
  getUserDevices,
} from "@/services/device.service";
import {
  formatDateTimeForTimeZone,
  getPreferredTimeZone,
  setPreferredTimeZone,
} from "@/services/timezone.service";

const getCo2State = (co2: number | null) => {
  if (co2 === null)
    return {
      label: "No data",
      className:
        "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
    };
  if (co2 <= 800)
    return {
      label: "Good",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  if (co2 <= 1200)
    return {
      label: "Attention",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    };
  return {
    label: "High",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };
};

const DashboardPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [latestByDevice, setLatestByDevice] = useState<
    Record<string, MeasurementRecord | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeZone, setTimeZone] = useState(getPreferredTimeZone());

  const currentUser = getStoredUser();

  const loadDashboard = useCallback(async () => {
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
        nextDevices.map(
          async (device) =>
            [device.id, await getLatestMeasurement(device.id)] as const,
        ),
      );

      setLatestByDevice(Object.fromEntries(measurementEntries));
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to load devices.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
    [devices, latestByDevice],
  );

  const totalDevices = devices.length;
  const devicesWithData = latestMeasurements.length;

  const handleTimeZoneChange = (nextTimeZone: string) => {
    setTimeZone(nextTimeZone);
    setPreferredTimeZone(nextTimeZone);
  };

  return (
    <div className="py-8 space-y-8">
      {/* Hero */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-indigo-500/15 text-primary-700 dark:text-indigo-300 text-sm font-medium mb-4">
              <Cpu className="w-4 h-4" />
              IoT dashboard
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-slate-400 text-lg leading-7">
              Connect your IoT sensor via the ESP32 captive portal to start
              monitoring air quality in real time.
            </p>
          </div>

          <div className="w-full max-w-[28rem] space-y-3 lg:ml-auto">
            <div className="flex justify-start lg:justify-end">
              <TimeZoneSelect
                timeZone={timeZone}
                onChange={handleTimeZoneChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[280px]">
              <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-4">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Devices
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalDevices}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-4">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Reporting
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {devicesWithData}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-4">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  User
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentUser?.name ?? "Unknown user"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connection guide */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            How to connect
          </h2>
        </div>
        <div className="space-y-3 text-gray-600 dark:text-slate-400 leading-7">
          <p>
            1. Power on your ESP32 sensor — it will create a WiFi network called{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              CO2-SETUP
            </code>
            .
          </p>
          <p>
            2. Connect your phone or computer to that network and open{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              http://192.168.4.1
            </code>
            .
          </p>
          <p>
            3. Enter your site email/password and select your home WiFi. The
            device will enroll automatically.
          </p>
          <p>4. Once connected, measurements appear here within a minute.</p>
        </div>
      </section>

      {/* My devices */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              My devices
            </h2>
            {!isLoading && (
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {totalDevices === 1 ? "1 device" : `${totalDevices} devices`}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <HistoryIcon className="w-4 h-4" />
              All history
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-gray-400">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              No devices connected yet
            </p>
            <p className="text-gray-500 dark:text-slate-400 mt-2">
              Power on your ESP32 and follow the connection guide above.
            </p>
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
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow hover:-translate-y-[1px]"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {device.name}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-slate-400 font-mono mt-1">
                        {device.deviceId}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        CO2
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {latest ? latest.co2.toFixed(0) : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Temp
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {latest ? latest.temperature.toFixed(1) : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Humidity
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {latest ? latest.humidity.toFixed(0) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {device.location}
                    </div>
                    <div>
                      Last update:{" "}
                      {formatDateTimeForTimeZone(
                        latest?.timestamp ?? device.lastSeenAt,
                        timeZone,
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Latest measurements table */}
      {latestMeasurements.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Latest measurements
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 pr-4">Device</th>
                  <th className="py-3 pr-4">CO2</th>
                  <th className="py-3 pr-4">Temperature</th>
                  <th className="py-3 pr-4">Humidity</th>
                  <th className="py-3 pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {latestMeasurements.map(({ device, measurement }) => (
                  <tr
                    key={measurement!.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {device.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                        {device.deviceId}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-900 dark:text-white">
                      {measurement!.co2.toFixed(0)} ppm
                    </td>
                    <td className="py-4 pr-4 text-gray-900 dark:text-white">
                      {measurement!.temperature.toFixed(1)} °C
                    </td>
                    <td className="py-4 pr-4 text-gray-900 dark:text-white">
                      {measurement!.humidity.toFixed(0)} %
                    </td>
                    <td className="py-4 pr-4 text-gray-500 dark:text-slate-400">
                      {formatDateTimeForTimeZone(
                        measurement!.timestamp,
                        timeZone,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;
