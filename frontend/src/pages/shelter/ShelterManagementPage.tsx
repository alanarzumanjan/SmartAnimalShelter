import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  PawPrint, Plus, Cpu, Wind, Thermometer, Droplets,
  LayoutGrid, ChevronRight, Trash2, X, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import type { RootState } from "@/store/store";
import {
  getMyEnclosures, createEnclosure, deleteEnclosure,
  co2Status, type EnclosureRecord,
} from "@/services/enclosure.service";
import { getUserDevices, type DeviceRecord } from "@/services/device.service";
import api from "@/services/api";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";

function PetAvatar({ pet }: { pet: { id: string; name: string | null; mongoImageId?: string | null } }) {
  const src = pet.mongoImageId ? `${API_BASE}/pets/${pet.id}/image` : null;
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
      {src
        ? <img src={src} alt={pet.name ?? ""} className="w-full h-full object-cover" />
        : <PawPrint className="w-4 h-4 text-slate-400" />}
    </div>
  );
}

function EnclosureCard({ enc, onDelete }: { enc: EnclosureRecord; onDelete: (id: string) => void }) {
  const m = enc.latestMeasurement;
  const status = co2Status(m?.co2 ?? null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete enclosure "${enc.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteEnclosure(enc.id);
      onDelete(enc.id);
      toast.success("Enclosure deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative group">
      <Link
        to={`/enclosures/${enc.id}`}
        className="block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md hover:-translate-y-[1px] transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{enc.name}</h3>
            {enc.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{enc.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { icon: Wind, label: "CO₂", value: m ? m.co2.toFixed(0) : "—", unit: "ppm" },
            { icon: Thermometer, label: "Temp", value: m ? m.temperature.toFixed(1) : "—", unit: "°C" },
            { icon: Droplets, label: "Hum", value: m ? m.humidity.toFixed(0) : "—", unit: "%" },
          ] as const).map(({ icon: Icon, label, value, unit }) => (
            <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
              <div className="flex items-center gap-1 mb-1">
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {value}<span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {enc.pets.length === 0 ? (
            <span className="text-xs text-slate-400">No animals assigned</span>
          ) : (
            <>
              <div className="flex -space-x-2">
                {enc.pets.slice(0, 5).map(p => <PetAvatar key={p.id} pet={p} />)}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {enc.pets.length} animal{enc.pets.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
        </div>

        {enc.device && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span className="text-[11px] text-slate-400">{enc.device.name}</span>
          </div>
        )}
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CreateEnclosureModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (enc: EnclosureRecord) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const enc = await createEnclosure({ name: name.trim(), description: desc.trim() || undefined });
      onCreate(enc);
      toast.success("Enclosure created");
      onClose();
    } catch {
      toast.error("Failed to create enclosure");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Enclosure</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Block A, East Wing"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShelterManagementPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [enclosures, setEnclosures] = useState<EnclosureRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [animals, setAnimals] = useState<{ id: string; name: string | null }[]>([]);
  const [shelterId, setShelterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [encRes, devRes] = await Promise.all([
        getMyEnclosures(),
        getUserDevices(user.id),
      ]);
      setEnclosures(encRes.data);
      setShelterId(encRes.shelterId);
      setDevices(devRes);

      if (encRes.shelterId) {
        const { data } = await api.get(`/pets?shelterId=${encRes.shelterId}&pageSize=100`);
        const pets = (data?.pets ?? []) as { id: string; name: string | null }[];
        setAnimals(pets);
      }
    } catch {
      toast.error("Failed to load shelter data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  if (user?.role !== "shelter") {
    return (
      <div className="py-16 text-center">
        <PawPrint className="mx-auto mb-4 h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const assignedPetIds = new Set(enclosures.flatMap(e => e.pets.map(p => p.id)));
  const unassignedAnimals = animals.filter(a => !assignedPetIds.has(a.id));

  return (
    <div className="py-8 space-y-8">
      {/* Hero */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-3">
              <LayoutGrid className="w-4 h-4" />
              Shelter Management
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Shelter</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage enclosures, monitor IoT sensors and track your animals.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {shelterId && (
              <Link
                to={`/shelters/${shelterId}`}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Public page
              </Link>
            )}
            <Link
              to="/animals/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add animal
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Enclosures", value: enclosures.length },
            { label: "Animals", value: animals.length },
            { label: "Devices", value: devices.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Enclosures */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enclosures</h2>
            <span className="text-sm text-slate-400">{enclosures.length}</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New enclosure
          </button>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
            Loading...
          </div>
        ) : enclosures.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
            <LayoutGrid className="mx-auto w-10 h-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-900 dark:text-white">No enclosures yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first enclosure to assign animals and IoT devices.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create enclosure
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {enclosures.map(enc => (
              <EnclosureCard
                key={enc.id}
                enc={enc}
                onDelete={id => setEnclosures(prev => prev.filter(e => e.id !== id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Unassigned animals */}
      {!loading && unassignedAnimals.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <PawPrint className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Not assigned to any enclosure</h2>
            <span className="text-sm text-slate-400">{unassignedAnimals.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedAnimals.map(a => (
              <Link
                key={a.id}
                to={`/animals/${a.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <PawPrint className="w-3.5 h-3.5 text-slate-400" />
                {a.name ?? "Unnamed"}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Devices */}
      {!loading && devices.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Devices</h2>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {devices.map(d => {
              const assignedTo = enclosures.find(e => e.device?.deviceId === d.deviceId);
              return (
                <Link
                  key={d.id}
                  to={`/dashboard/devices/${encodeURIComponent(d.deviceId)}`}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{d.name}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{d.deviceId}</p>
                    {assignedTo && (
                      <p className="text-xs text-indigo-500 mt-0.5">→ {assignedTo.name}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {showCreate && (
        <CreateEnclosureModal
          onClose={() => setShowCreate(false)}
          onCreate={enc => setEnclosures(prev => [...prev, { ...enc, pets: [], device: null, latestMeasurement: null }])}
        />
      )}
    </div>
  );
}
