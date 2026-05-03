import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Wind, Thermometer, Droplets, Cpu, PawPrint,
  Plus, X, Pencil, Check, Trash2,
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

function MetricCard({ icon: Icon, label, value, unit, highlight }: {
  icon: React.ElementType; label: string; value: string; unit: string; highlight?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs uppercase tracking-wide text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-4xl font-bold text-slate-900 dark:text-white">
        {value}
        <span className="text-lg font-normal text-slate-400 ml-1">{unit}</span>
      </div>
      {highlight && <div className={`mt-2 text-xs font-semibold ${highlight}`}>{label}</div>}
    </div>
  );
}

function PetChip({ pet, onRemove }: {
  pet: { id: string; name: string | null; mongoImageId?: string | null; species?: string; breed?: string };
  onRemove: (id: string) => void;
}) {
  const src = pet.mongoImageId ? `${API_BASE}/pets/${pet.id}/image` : null;
  return (
    <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 group">
      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
        {src
          ? <img src={src} alt={pet.name ?? ""} className="w-full h-full object-cover" />
          : <PawPrint className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="min-w-0">
        <Link to={`/animals/${pet.id}`} className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
          {pet.name ?? "Unnamed"}
        </Link>
        {(pet.species || pet.breed) && (
          <p className="text-[11px] text-slate-400 truncate">{[pet.species, pet.breed].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(pet.id)}
        className="ml-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function EnclosurePage() {
  const { enclosureId } = useParams<{ enclosureId: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [enc, setEnc] = useState<EnclosureRecord | null>(null);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [allPets, setAllPets] = useState<{ id: string; name: string | null; mongoImageId?: string | null; species?: string; breed?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit name/desc
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign pet modal
  const [showAssign, setShowAssign] = useState(false);
  const [assigningPet, setAssigningPet] = useState<string | null>(null);

  // Device select
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [savingDevice, setSavingDevice] = useState(false);

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

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading...</div>;
  }

  if (!enc) return null;

  const m = enc.latestMeasurement;
  const status = co2Status(m?.co2 ?? null);
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

        <div className="flex items-center gap-2 shrink-0 mt-8">
          <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
          <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Live metrics */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Wind className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live Environment</h2>
          {m && (
            <span className="text-xs text-slate-400 ml-auto">
              {formatDateTimeForTimeZone(m.timestamp)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard icon={Wind} label="CO₂" value={m ? m.co2.toFixed(0) : "—"} unit="ppm" />
          <MetricCard icon={Thermometer} label="Temperature" value={m ? m.temperature.toFixed(1) : "—"} unit="°C" />
          <MetricCard icon={Droplets} label="Humidity" value={m ? m.humidity.toFixed(0) : "—"} unit="%" />
        </div>
        {!m && (
          <p className="text-center text-sm text-slate-400 mt-3">No measurements yet — assign an IoT device below.</p>
        )}
      </section>

      {/* Animals */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <PawPrint className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Animals</h2>
            <span className="text-sm text-slate-400">{enc.pets.length}</span>
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
          <div className="text-center py-8 text-slate-400">
            <PawPrint className="mx-auto w-8 h-8 mb-2 text-slate-300" />
            <p className="text-sm">No animals in this enclosure yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enc.pets.map(p => (
              <PetChip key={p.id} pet={p} onRemove={handleRemovePet} />
            ))}
          </div>
        )}
      </section>

      {/* IoT Device */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">IoT Device</h2>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-slate-400">No devices registered. <Link to="/shelter" className="text-indigo-500 hover:underline">Register a device first.</Link></p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Select device</label>
              <select
                value={selectedDevice}
                onChange={e => setSelectedDevice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— No device —</option>
                {devices.map(d => (
                  <option key={d.id} value={d.uuid ?? d.id}>{d.name} ({d.deviceId})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssignDevice}
              disabled={savingDevice}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {savingDevice ? "Saving..." : "Save"}
            </button>
          </div>
        )}

        {enc.device && (
          <Link
            to={`/dashboard/devices/${encodeURIComponent(enc.device.deviceId)}`}
            className="mt-4 flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
          >
            <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{enc.device.name}</p>
              <p className="text-xs text-indigo-500 font-mono">{enc.device.deviceId}</p>
            </div>
            {enc.device.lastSeenAt && (
              <p className="text-xs text-indigo-400 ml-auto">Last seen: {formatDateTimeForTimeZone(enc.device.lastSeenAt)}</p>
            )}
          </Link>
        )}
      </section>

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
