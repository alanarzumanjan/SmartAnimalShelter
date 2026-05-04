import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Wind, Thermometer, Droplets, Cpu, PawPrint,
  Plus, X, Pencil, Check, Settings, ExternalLink, AlertTriangle, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { RootState } from "@/store/store";
import {
  getEnclosure, updateEnclosure, assignDevice, assignPet, removePet,
  co2Status, type EnclosureRecord,
} from "@/services/enclosure.service";
import { getUserDevices, type DeviceRecord } from "@/services/device.service";
import { formatDateTimeForTimeZone } from "@/services/timezone.service";
import api from "@/services/api";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";

// ── Helpers ──────────────────────────────────────────────────────────────────

function co2Label(co2: number): string {
  if (co2 <= 600) return "Excellent";
  if (co2 <= 700) return "Normal";
  if (co2 <= 1000) return "Not good";
  if (co2 <= 1200) return "Bad";
  return "Danger";
}

function tempLabel(t: number): string {
  if (t < 10) return "Too cold";
  if (t <= 18) return "Cool";
  if (t <= 26) return "Comfortable";
  if (t <= 30) return "Warm";
  return "Too hot";
}

function humLabel(h: number): string {
  if (h < 30) return "Too dry";
  if (h <= 60) return "Normal";
  if (h <= 75) return "Humid";
  return "Too humid";
}

function co2Bar(co2: number): number { return Math.min(100, (co2 / 2000) * 100); }
function tempBar(t: number): number { return Math.min(100, Math.max(0, ((t + 10) / 60) * 100)); }
function humBar(h: number): number { return Math.min(100, h); }

function barColor(pct: number): string {
  if (pct < 40) return "bg-emerald-500";
  if (pct < 65) return "bg-amber-400";
  return "bg-red-500";
}

type NoticeLevel = "green" | "orange" | "red";
interface Notice { level: NoticeLevel; title: string; text: string; }

function co2Notice(co2: number | null): Notice | null {
  if (co2 == null) return null;
  if (co2 <= 700) return { level: "green",  title: "Air quality is good",        text: "Conditions are healthy. No action needed." };
  if (co2 <= 1200) return { level: "orange", title: "Air needs freshening",       text: "Open a window or increase ventilation for 5–10 min." };
  return              { level: "red",    title: "High CO\u2082 — ventilate now", text: "Ventilate immediately. Avoid prolonged exposure." };
}

const noticeStyles: Record<NoticeLevel, { wrap: string; badge: string; dot: string; icon: string }> = {
  green:  { wrap: "border-emerald-500/25 bg-emerald-500/8",  badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",  dot: "bg-emerald-400",  icon: "text-emerald-500" },
  orange: { wrap: "border-amber-500/25   bg-amber-500/8",    badge: "bg-amber-500/15   text-amber-700   dark:text-amber-300   border-amber-500/25",    dot: "bg-amber-400",    icon: "text-amber-500" },
  red:    { wrap: "border-red-500/25     bg-red-500/8",      badge: "bg-red-500/15     text-red-700     dark:text-red-300     border-red-500/25",      dot: "bg-red-400",      icon: "text-red-500" },
};

// ── PetCard ───────────────────────────────────────────────────────────────────

function PetCard({ pet, onRemove }: {
  pet: { id: string; name: string | null; mongoImageId?: string | null; species?: string; breed?: string };
  onRemove: (id: string) => void;
}) {
  const src = pet.mongoImageId ? `${API_BASE}/pets/${pet.id}/image` : null;
  return (
    <div className="relative group">
      <Link
        to={`/animals/${pet.id}`}
        className="block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:shadow-lg hover:-translate-y-0.5"
      >
        <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center overflow-hidden">
          {src
            ? <img src={src} alt={pet.name ?? ""} className="w-full h-full object-cover" />
            : <PawPrint className="w-12 h-12 text-slate-300 dark:text-slate-600" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5">
            <p className="text-sm font-bold text-white truncate leading-tight">{pet.name ?? "Unnamed"}</p>
            {(pet.species || pet.breed) && (
              <p className="text-[11px] text-white/70 truncate mt-0.5">{[pet.species, pet.breed].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={() => onRemove(pet.id)}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-500 text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── EnvironmentWidget ─────────────────────────────────────────────────────────

function EnvironmentWidget({ enc, devices, selectedDevice, savingDevice, showDeviceSettings, onSelectDevice, onSaveDevice, onToggleSettings }: {
  enc: EnclosureRecord;
  devices: DeviceRecord[];
  selectedDevice: string;
  savingDevice: boolean;
  showDeviceSettings: boolean;
  onSelectDevice: (id: string) => void;
  onSaveDevice: () => void;
  onToggleSettings: () => void;
}) {
  const m = enc.latestMeasurement;
  const status = co2Status(m?.co2 ?? null);
  const notice = co2Notice(m?.co2 ?? null);
  const ns = notice ? noticeStyles[notice.level] : null;

  const metrics = m ? [
    { icon: Wind,        label: "CO₂",  value: m.co2.toFixed(0),         unit: "ppm", sublabel: co2Label(m.co2),         bar: co2Bar(m.co2) },
    { icon: Thermometer, label: "Temp", value: m.temperature.toFixed(1),  unit: "°C",  sublabel: tempLabel(m.temperature), bar: tempBar(m.temperature) },
    { icon: Droplets,    label: "Hum",  value: m.humidity.toFixed(0),     unit: "%",   sublabel: humLabel(m.humidity),     bar: humBar(m.humidity) },
  ] : null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Compact header row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {enc.device?.name ?? "No device"}
        </span>
        {enc.device && (
          <span className="text-xs font-mono text-slate-400 truncate hidden sm:block">{enc.device.deviceId}</span>
        )}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
        <span className={`text-xs font-semibold shrink-0 ${status.color}`}>{status.label}</span>
        {m && (
          <span className="ml-auto text-[11px] text-slate-400 shrink-0">
            {formatDateTimeForTimeZone(m.timestamp)}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {enc.device && (
            <Link
              to={`/dashboard/devices/${encodeURIComponent(enc.device.deviceId)}`}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg border transition-colors ${
              showDeviceSettings
                ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-500"
                : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device picker */}
      {showDeviceSettings && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {devices.length === 0 ? (
            <p className="text-xs text-slate-400">No devices. <Link to="/shelter" className="text-indigo-500 hover:underline">Register one first.</Link></p>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedDevice}
                onChange={e => onSelectDevice(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— No device —</option>
                {devices.map(d => (
                  <option key={d.id} value={d.uuid ?? d.id}>{d.name} ({d.deviceId})</option>
                ))}
              </select>
              <button
                onClick={onSaveDevice}
                disabled={savingDevice}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {savingDevice ? "…" : "Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compact notice banner */}
      {notice && ns && (
        <div className={`flex items-center gap-3 px-4 py-2 border-t border-slate-100 dark:border-slate-800 ${ns.wrap}`}>
          {notice.level === "green"
            ? <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ns.icon}`} />
            : <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${ns.icon}`} />}
          <span className="text-xs font-semibold text-slate-900 dark:text-white shrink-0">{notice.title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{notice.text}</span>
          <span className={`ml-auto shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ns.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ns.dot}`} />
            {m!.co2.toFixed(0)} ppm
          </span>
        </div>
      )}

      {/* Metrics inline strip */}
      {metrics ? (
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          {metrics.map(({ icon: Icon, label, value, unit, sublabel, bar }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{value}</span>
                  <span className="text-xs text-slate-400">{unit}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(bar)}`} style={{ width: `${bar}%` }} />
                </div>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 hidden md:block">{sublabel}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          No measurements — assign a device above.
        </p>
      )}
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EnclosurePage() {
  const { enclosureId } = useParams<{ enclosureId: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [enc, setEnc] = useState<EnclosureRecord | null>(null);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [allPets, setAllPets] = useState<{ id: string; name: string | null; mongoImageId?: string | null; species?: string; breed?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [assigningPet, setAssigningPet] = useState<string | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [savingDevice, setSavingDevice] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  const load = useCallback(async () => {
    if (!enclosureId || !user?.id) return;
    setLoading(true);
    try {
      const [encData, devData] = await Promise.all([
        getEnclosure(enclosureId),
        getUserDevices(user.id),
      ]);
      setEnc(encData);
      setDevices(devData);
      setSelectedDevice(encData.device?.id ?? "");

      const { data } = await api.get(`/pets?shelterId=${encData.shelterId}&pageSize=100`);
      const pets = (data?.pets ?? []) as { id: string; name: string | null; mongoImageId?: string | null; species?: { name?: string }; breed?: { name?: string } }[];
      setAllPets(pets.map(p => ({
        id: p.id,
        name: p.name,
        mongoImageId: p.mongoImageId ?? null,
        species: p.species?.name,
        breed: p.breed?.name,
      })));
    } catch {
      toast.error("Failed to load enclosure");
      navigate("/shelter");
    } finally {
      setLoading(false);
    }
  }, [enclosureId, user?.id, navigate]);

  useEffect(() => { void load(); }, [load]);

  async function handleSaveEdit() {
    if (!enc || !editName.trim()) return;
    setSaving(true);
    try {
      await updateEnclosure(enc.id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setEnc(prev => prev ? { ...prev, name: editName.trim(), description: editDesc.trim() || null } : prev);
      setEditing(false);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignDevice() {
    if (!enc) return;
    setSavingDevice(true);
    try {
      await assignDevice(enc.id, selectedDevice || null);
      const found = devices.find(d => d.uuid === selectedDevice || d.id === selectedDevice);
      setEnc(prev => prev ? {
        ...prev,
        device: found ? { id: found.uuid ?? found.id, deviceId: found.deviceId, name: found.name, location: found.location, lastSeenAt: found.lastSeenAt } : null
      } : prev);
      toast.success(selectedDevice ? "Device assigned" : "Device removed");
      setShowDeviceSettings(false);
    } catch {
      toast.error("Failed to assign device");
    } finally {
      setSavingDevice(false);
    }
  }

  async function handleAssignPet(petId: string) {
    if (!enc) return;
    setAssigningPet(petId);
    try {
      await assignPet(enc.id, petId);
      const pet = allPets.find(p => p.id === petId);
      if (pet) setEnc(prev => prev ? { ...prev, pets: [...prev.pets, pet] } : prev);
      setShowAssign(false);
      toast.success("Animal assigned");
    } catch {
      toast.error("Failed to assign animal");
    } finally {
      setAssigningPet(null);
    }
  }

  async function handleRemovePet(petId: string) {
    if (!enc) return;
    try {
      await removePet(enc.id, petId);
      setEnc(prev => prev ? { ...prev, pets: prev.pets.filter(p => p.id !== petId) } : prev);
      toast.success("Animal removed");
    } catch {
      toast.error("Failed to remove animal");
    }
  }

  if (loading) return <div className="py-16 text-center text-slate-400">Loading...</div>;
  if (!enc) return null;

  const assignedPetIds = new Set(enc.pets.map(p => p.id));
  const availablePets = allPets.filter(p => !assignedPetIds.has(p.id));

  return (
    <div className="py-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/shelter"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            My Shelter
          </Link>

          {editing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b-2 border-indigo-500 outline-none text-slate-900 dark:text-white w-full"
                autoFocus
              />
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                className="text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-slate-500 dark:text-slate-400 w-full"
              />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEdit} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  <Check className="w-3.5 h-3.5" />{saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{enc.name}</h1>
              <button
                onClick={() => { setEditName(enc.name); setEditDesc(enc.description ?? ""); setEditing(true); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          {enc.description && !editing && (
            <p className="text-slate-500 dark:text-slate-400 mt-1">{enc.description}</p>
          )}
        </div>
      </div>

      {/* Animals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <PawPrint className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Animals</h2>
            {enc.pets.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                {enc.pets.length}
              </span>
            )}
          </div>
          {availablePets.length > 0 && (
            <button
              onClick={() => setShowAssign(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign
            </button>
          )}
        </div>

        {enc.pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center mb-4">
              <PawPrint className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No animals assigned yet</p>
            {availablePets.length > 0 && (
              <button
                onClick={() => setShowAssign(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Assign an animal
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {enc.pets.map(p => (
              <PetCard key={p.id} pet={p} onRemove={handleRemovePet} />
            ))}
          </div>
        )}
      </section>

      {/* Environment widget */}
      <EnvironmentWidget
        enc={enc}
        devices={devices}
        selectedDevice={selectedDevice}
        savingDevice={savingDevice}
        showDeviceSettings={showDeviceSettings}
        onSelectDevice={setSelectedDevice}
        onSaveDevice={handleAssignDevice}
        onToggleSettings={() => setShowDeviceSettings(v => !v)}
      />

      {/* Assign pet modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Animal</h2>
              <button onClick={() => setShowAssign(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            {availablePets.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">All animals are already assigned.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {availablePets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAssignPet(p.id)}
                    disabled={assigningPet === p.id}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <PawPrint className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name ?? "Unnamed"}</p>
                      {(p.species || p.breed) && (
                        <p className="text-xs text-slate-400">{[p.species, p.breed].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    {assigningPet === p.id && <span className="ml-auto text-xs text-indigo-500">Assigning...</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
