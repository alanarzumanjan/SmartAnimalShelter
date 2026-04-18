import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  type MeasurementRecord,
  getStoredUser,
  getUserMeasurements,
  getUserDevices,
  type DeviceRecord,
} from '@/services/device.service';

const PAGE_SIZE = 30;

// ===== CO2 quality =====
function co2Quality(co2: number): { title: string; badgeClass: string } {
  if (co2 <= 400) return { title: 'Ideal', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' };
  if (co2 <= 600) return { title: 'Excellent', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' };
  if (co2 <= 700) return { title: 'Normal', badgeClass: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300' };
  if (co2 <= 1000) return { title: 'Not good', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' };
  if (co2 <= 1200) return { title: 'Bad', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' };
  if (co2 <= 1400) return { title: 'Very bad', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' };
  return { title: 'Terrible', badgeClass: 'bg-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-300' };
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

// datetime-local input value
function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type PresetKey = '1h' | '24h' | '7d' | '30d' | 'custom' | 'all';

function presetMs(p: PresetKey): number | null {
  if (p === '1h') return 1 * 60 * 60 * 1000;
  if (p === '24h') return 24 * 60 * 60 * 1000;
  if (p === '7d') return 7 * 24 * 60 * 60 * 1000;
  if (p === '30d') return 30 * 24 * 60 * 60 * 1000;
  return null;
}

const HistoryPage: React.FC = () => {
  const currentUser = getStoredUser();

  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(() => Boolean(currentUser?.id));
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // time filter
  const [preset, setPreset] = useState<PresetKey>('all');
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const [fromValue, setFromValue] = useState<string>(toDateTimeLocalValue(dayAgo));
  const [toValue, setToValue] = useState<string>(toDateTimeLocalValue(now));

  // device filter
  const [deviceFilter, setDeviceFilter] = useState<string>('');

  // Load devices for filter dropdown
  useEffect(() => {
    if (!currentUser?.id) return;
    getUserDevices(currentUser.id).then(setDevices).catch(() => {});
  }, []);

  // Fetch measurements
  useEffect(() => {
    if (!currentUser?.id) return;

    const dur = presetMs(preset);
    let from: string | undefined;
    let to: string | undefined;

    if (preset === 'all') {
      from = undefined;
      to = undefined;
    } else if (preset === 'custom') {
      from = fromValue;
      to = toValue;
    } else if (dur) {
      const toD = new Date();
      const fromD = new Date(toD.getTime() - dur);
      from = fromD.toISOString();
      to = toD.toISOString();
    }

    getUserMeasurements(currentUser.id, { from, to, limit: PAGE_SIZE, offset })
      .then((res) => {
        let data = res.data;
        if (deviceFilter) {
          data = data.filter((m) => m.deviceId === deviceFilter);
        }
        setMeasurements(data);
        setTotal(res.total);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.error ?? 'Failed to load measurements.');
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id, preset, fromValue, toValue, offset, deviceFilter]);

  // Preset changes
  const handlePresetChange = (p: PresetKey) => {
    setLoading(true);
    setOffset(0);

    if (p === 'all') {
      setPreset('all');
    } else if (p === 'custom') {
      setPreset('custom');
    } else {
      const dur = presetMs(p);
      if (dur) {
        const toD = new Date();
        const fromD = new Date(toD.getTime() - dur);
        setFromValue(toDateTimeLocalValue(fromD));
        setToValue(toDateTimeLocalValue(toD));
      }
      setPreset(p);
    }
  };

  const deviceNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of devices) map[d.deviceId] = d.name || 'Unnamed';
    return map;
  }, [devices]);

  const hasMore = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            All Measurements
          </h1>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {total} total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            ['all', 'All time'],
            ['1h', '1 hour'],
            ['24h', '1 day'],
            ['7d', '1 week'],
            ['30d', '1 month'],
            ['custom', 'Custom'],
          ] as [PresetKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetChange(key)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                preset === key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom range + device filter */}
        <div className="flex flex-wrap items-end gap-3">
          {preset === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">From</label>
                <input
                  type="datetime-local"
                  value={fromValue}
                  onChange={(e) => {
                    setLoading(true);
                    setOffset(0);
                    setFromValue(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">To</label>
                <input
                  type="datetime-local"
                  value={toValue}
                  onChange={(e) => {
                    setLoading(true);
                    setOffset(0);
                    setToValue(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </>
          )}

          {devices.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">Device</label>
              <select
                value={deviceFilter}
                onChange={(e) => {
                  setLoading(true);
                  setOffset(0);
                  setDeviceFilter(e.target.value);
                }}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
              >
                <option value="">All devices</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.name || d.deviceId}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Measurements
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {measurements.length} of {total}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : measurements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No measurements found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-200/60 text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Device</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-right">CO₂ (ppm)</th>
                    <th className="px-3 py-2 text-right">Temp (°C)</th>
                    <th className="px-3 py-2 text-right">Humidity (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, idx) => {
                    const q = co2Quality(m.co2);
                    const name = deviceNames[m.deviceId] || m.deviceId;
                    return (
                      <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-400">{offset + idx + 1}</td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/dashboard/devices/${encodeURIComponent(m.deviceId)}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          >
                            {name}
                          </Link>
                          <div className="text-[10px] text-slate-400 font-mono">{m.deviceId}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{formatDateTime(m.timestamp)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-semibold text-slate-900 dark:text-white">{m.co2.toFixed(0)}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${q.badgeClass}`}>
                            {q.title}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">{m.temperature.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">{m.humidity.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap gap-2 items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {total > PAGE_SIZE ? `Page ${Math.floor(offset / PAGE_SIZE) + 1}` : 'All rows shown'}
              </div>

              <div className="flex gap-2">
                {offset > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setOffset((o) => Math.max(0, o - PAGE_SIZE));
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    ← Previous
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasMore}
                  onClick={() => {
                    setLoading(true);
                    setOffset((o) => o + PAGE_SIZE);
                  }}
                  className={[
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                    hasMore
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed',
                  ].join(' ')}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
