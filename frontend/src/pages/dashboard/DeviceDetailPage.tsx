import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  History as HistoryIcon,
  Edit2,
  X,
  Check,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";
import {
  type DeviceRecord,
  type MeasurementRecord,
  getDevice,
  getDeviceMeasurements,
  updateDevice,
} from "@/services/device.service";
import {
  formatDateTimeForTimeZone,
  formatShortDateTimeForTimeZone,
  formatShortTimeForTimeZone,
  getPreferredTimeZone,
} from "@/services/timezone.service";

// ===== CO2 thresholds =====
const CO2_LEVELS = [400, 600, 700, 800, 1000, 1200, 1400, 2000] as const;

function ledCountForCo2(co2: number): number {
  let count = 0;
  for (const t of CO2_LEVELS) if (co2 >= t) count++;
  return Math.max(0, Math.min(8, count));
}

function segmentColorClass(index: number): string {
  if (index <= 2) return "bg-emerald-500/90";
  if (index <= 5) return "bg-orange-500/90";
  return "bg-red-600/90";
}

type Quality = { title: string; badgeClass: string };
type Notice = {
  level: "green" | "orange" | "red";
  title: string;
  text: string;
};

function co2Quality(co2: number | null): Quality {
  if (co2 === null)
    return {
      title: "No data",
      badgeClass:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };
  if (co2 <= 400)
    return {
      title: "Ideal",
      badgeClass:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  if (co2 <= 600)
    return {
      title: "Excellent",
      badgeClass:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  if (co2 <= 700)
    return {
      title: "Normal",
      badgeClass:
        "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
    };
  if (co2 <= 1000)
    return {
      title: "Not good",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    };
  if (co2 <= 1200)
    return {
      title: "Bad",
      badgeClass:
        "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    };
  if (co2 <= 1400)
    return {
      title: "Very bad",
      badgeClass:
        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    };
  return {
    title: "Terrible",
    badgeClass: "bg-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  };
}

function co2Notice(co2: number | null): Notice | null {
  if (co2 == null) return null;
  if (co2 <= 700)
    return {
      level: "green",
      title: "Air looks good ✅",
      text: "Great conditions. Keep normal ventilation habits. No action needed.",
    };
  if (co2 <= 1200)
    return {
      level: "orange",
      title: "Air needs freshening 🟧",
      text: "Open a window for 5–10 minutes, or increase ventilation. You may feel drowsy soon.",
    };
  return {
    level: "red",
    title: "High CO₂ — ventilate now 🟥",
    text: "Ventilate immediately (10–15 minutes). Avoid long stays, especially for kids or during sleep.",
  };
}

function noticeClasses(level: Notice["level"]) {
  if (level === "green")
    return {
      box: "border-emerald-500/25 bg-emerald-500/10",
      badge:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      dot: "bg-emerald-400",
    };
  if (level === "orange")
    return {
      box: "border-orange-500/25 bg-orange-500/10",
      badge:
        "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25",
      dot: "bg-orange-400",
    };
  return {
    box: "border-red-500/25 bg-red-500/10",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/25",
    dot: "bg-red-400",
  };
}

type PresetKey = "1h" | "24h" | "7d" | "30d" | "all";

function presetMs(p: PresetKey): number | null {
  if (p === "1h") return 1 * 60 * 60 * 1000;
  if (p === "24h") return 24 * 60 * 60 * 1000;
  if (p === "7d") return 7 * 24 * 60 * 60 * 1000;
  if (p === "30d") return 30 * 24 * 60 * 60 * 1000;
  return null;
}

type ChartPoint = {
  timeLabel: string;
  ts: number;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
};

function formatTimeLabel(d: Date, preset: PresetKey, timeZone: string): string {
  if (preset === "1h" || preset === "24h") {
    return formatShortTimeForTimeZone(d, timeZone);
  }
  return formatShortDateTimeForTimeZone(d, timeZone);
}

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string | null;
};
type TooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
};

const LIVE_POLL_MS = 15_000;
const PAGE_SIZE = 20;

const DeviceDetailPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  // edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // time filter
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [live, setLive] = useState(true);
  const timeZone = getPreferredTimeZone();

  const pollTimerRef = useRef<number | null>(null);

  const latest = useMemo(() => measurements[0] ?? null, [measurements]);
  const latestCo2 = latest?.co2 ?? null;
  const latestTemp = latest?.temperature ?? null;
  const latestHum = latest?.humidity ?? null;
  const quality = co2Quality(latestCo2);
  const ledCount = latestCo2 !== null ? ledCountForCo2(latestCo2) : 0;
  const notice = co2Notice(latestCo2);
  const noticeUi = notice ? noticeClasses(notice.level) : null;

  const canShowMore = showCount < measurements.length;
  const visibleMeasurements = useMemo(
    () => measurements.slice(0, showCount),
    [measurements, showCount],
  );

  // Chart data
  const chartData = useMemo<ChartPoint[]>(() => {
    return measurements
      .slice()
      .reverse()
      .map((m) => {
        const ts = new Date(m.timestamp);
        return {
          ts: ts.getTime(),
          timeLabel: formatTimeLabel(ts, preset, timeZone),
          co2: m.co2,
          temperature: m.temperature,
          humidity: m.humidity,
        };
      });
  }, [measurements, preset, timeZone]);

  // Fetch measurements for preset
  const fetchRange = async () => {
    if (!deviceId) return;
    const dur = presetMs(preset);
    let result: MeasurementRecord[];

    if (preset === "all") {
      result = await getDeviceMeasurements(deviceId, 10000);
    } else if (dur) {
      const cutoff = new Date(Date.now() - dur);
      const all = await getDeviceMeasurements(deviceId, 10000);
      result = all.filter((m) => new Date(m.timestamp) >= cutoff);
    } else {
      result = await getDeviceMeasurements(deviceId, 200);
    }

    setMeasurements(result);
  };

  // Update device
  const handleSaveEdit = async () => {
    if (!deviceId || !device) return;
    try {
      const updated = await updateDevice(device.deviceId, {
        name: editName,
        location: editLocation,
      });
      setDevice(updated);
      setIsEditing(false);
      toast.success("Device updated.");
    } catch {
      toast.error("Failed to update device.");
    }
  };

  const handleStartEdit = () => {
    setEditName(device?.name ?? "");
    setEditLocation(device?.location ?? "");
    setIsEditing(true);
  };

  // Load device
  useEffect(() => {
    const load = async () => {
      if (!deviceId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [nextDevice] = await Promise.all([getDevice(deviceId)]);
        setDevice(nextDevice);
      } catch {
        toast.error("Failed to load device.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [deviceId]);

  // Fetch data on preset change
  useEffect(() => {
    if (isLoading || !deviceId) return;
    fetchRange();
    setShowCount(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, deviceId, preset]);

  // Live polling
  useEffect(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const dur = presetMs(preset);
    if (live && dur && !isLoading) {
      fetchRange();
      pollTimerRef.current = window.setInterval(fetchRange, LIVE_POLL_MS);
    }

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, isLoading, deviceId, preset]);

  // Tooltip
  const TooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const rows = payload
      .filter((p) => p.value !== null && p.value !== undefined)
      .map((p) => {
        const key = String(p.dataKey ?? p.name ?? "");
        const num = typeof p.value === "number" ? p.value : Number(p.value);
        if (!Number.isFinite(num)) return null;
        if (key === "co2") return { k: "CO₂", v: `${num.toFixed(0)} ppm` };
        if (key === "temperature")
          return { k: "Temp", v: `${num.toFixed(1)} °C` };
        if (key === "humidity") return { k: "Hum", v: `${num.toFixed(0)} %` };
        return null;
      })
      .filter((x): x is { k: string; v: string } => x !== null);

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg">
        <div className="font-semibold mb-1">{String(label ?? "")}</div>
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.k} className="flex justify-between gap-4">
              <span className="opacity-80">{r.k}</span>
              <span className="font-mono">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        Loading device...
      </div>
    );
  }

  if (!device) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Device not found
        </h1>
        <Link
          to="/dashboard"
          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap w-full">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Device name"
                className="flex-1 min-w-[120px] px-3 py-1.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Location"
                className="flex-1 min-w-[100px] px-3 py-1.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSaveEdit}
                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {device.name}
              </h1>
              <button
                onClick={handleStartEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit device"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <p className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                {device.enclosureName
                  ? <>Enclosure: <span className="font-medium">{device.enclosureName}</span></>
                  : <>Location: {device.location}</>} · MAC:{" "}
                <span className="font-mono">{device.deviceId}</span>
                {latest ? (
                  <span className="ml-2 text-xs">
                    · Updated:{" "}
                    {formatDateTimeForTimeZone(latest.timestamp, timeZone)}
                  </span>
                ) : null}
              </p>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/dashboard/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <HistoryIcon className="w-4 h-4" />
              All history
            </Link>
            <button
              type="button"
              onClick={fetchRange}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Refresh now
            </button>
          </div>
        )}
      </div>

      {/* Quality badge + LED bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${quality.badgeClass}`}
          >
            Air quality:{" "}
            <span className="uppercase tracking-wide">{quality.title}</span>
            {latestCo2 != null ? (
              <span className="font-mono opacity-90">
                · {latestCo2.toFixed(0)} ppm
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
            LED level: <span className="font-mono">{ledCount}/8</span>
          </span>
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            Sensor sends ~1 measurement / minute.
          </span>
        </div>

        {/* Notification */}
        {notice && noticeUi && (
          <div className={`rounded-2xl border p-4 ${noticeUi.box}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Notifications
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Based on the latest CO₂ reading.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${noticeUi.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${noticeUi.dot}`} />
                <span className="uppercase tracking-wide">{notice.level}</span>
                {latestCo2 != null ? (
                  <span className="font-mono opacity-90">
                    · {latestCo2.toFixed(0)} ppm
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {notice.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {notice.text}
              </p>
            </div>
          </div>
        )}

        {/* LED BAR */}
        <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2">
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => {
              const on = i < ledCount;
              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full border transition-all ${
                    on
                      ? `${segmentColorClass(i)} border-transparent`
                      : "bg-slate-200/60 border-slate-300 dark:bg-slate-900/60 dark:border-slate-800"
                  }`}
                  style={
                    on
                      ? {
                          boxShadow:
                            "0 0 10px rgba(255,255,255,0.08), 0 0 16px rgba(255,255,255,0.06)",
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Current cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Current CO₂
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {latestCo2 != null ? `${latestCo2.toFixed(0)} ppm` : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Temperature
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {latestTemp != null ? `${latestTemp.toFixed(1)} °C` : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Humidity
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {latestHum != null ? `${latestHum.toFixed(0)} %` : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Air metrics over time
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Presets update range and reload chart from server.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Points: {chartData.length}</span>
            <span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              {live && presetMs(preset)
                ? `Live: ON (${LIVE_POLL_MS / 1000}s)`
                : "Live: OFF"}
            </span>
          </div>
        </div>

        {/* Presets + Live */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["1h", "1 hour"],
              ["24h", "1 day"],
              ["7d", "1 week"],
              ["30d", "1 month"],
              ["all", "All time"],
            ] as [PresetKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={[
                "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors",
                preset === key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950",
              ].join(" ")}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            disabled={presetMs(preset) === null}
            onClick={() => setLive((v) => !v)}
            className={[
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ml-auto",
              presetMs(preset) === null
                ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed border-transparent"
                : live
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950",
            ].join(" ")}
            title={
              presetMs(preset) === null
                ? "Live works only with preset ranges"
                : `Auto-refresh every ${LIVE_POLL_MS / 1000}s`
            }
          >
            {live && presetMs(preset) ? "Live: ON" : "Live: OFF"}
          </button>
        </div>

        {/* Chart area */}
        <div className="h-64 mt-3">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No measurements in this time range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="timeLabel" fontSize={10} tickMargin={6} />
                <YAxis yAxisId="co2" fontSize={10} tickMargin={6} />
                <YAxis
                  yAxisId="env"
                  orientation="right"
                  fontSize={10}
                  tickMargin={6}
                />
                <Tooltip content={<TooltipContent />} />
                <Line
                  yAxisId="co2"
                  type="monotone"
                  dataKey="co2"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="env"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="env"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Latest measurements
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {Math.min(showCount, measurements.length)} of{" "}
            {measurements.length}
          </p>
        </div>

        {measurements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No measurements received yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-200/60 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-right">CO₂ (ppm)</th>
                    <th className="px-3 py-2 text-right">Temp (°C)</th>
                    <th className="px-3 py-2 text-right">Humidity (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMeasurements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {formatDateTimeForTimeZone(m.timestamp, timeZone)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                        {m.co2.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                        {m.temperature.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                        {m.humidity.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Newest first. "Show more" reveals +20 rows.
              </div>
              <div className="flex gap-2">
                {showCount > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setShowCount(PAGE_SIZE)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
                  >
                    Show less
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canShowMore}
                  onClick={() =>
                    setShowCount((v) =>
                      Math.min(v + PAGE_SIZE, measurements.length),
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    canShowMore
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed"
                  }`}
                >
                  + Show more (20)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceDetailPage;
