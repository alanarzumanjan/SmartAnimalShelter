import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  MapPin, Phone, Mail, PawPrint, ArrowLeft,
  Edit2, Save, X, Plus, MessageSquare, Building2,
  Heart, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import AnimalCard from '@/pages/animals/AnimalCard';
import {
  getPreviewShelterById,
  mapAnimal,
  previewAnimals,
  type AnimalItem,
  type PreviewShelter,
} from '@/pages/animals/animalCatalog';
import type { RootState } from '@/store/store';

interface Shelter {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

interface ShelterApiResponse {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  phone?: string;
  Phone?: string;
  email?: string;
  Email?: string;
  description?: string;
  Description?: string;
  ownerId?: string;
  OwnerId?: string;
  createdAt?: string;
  CreatedAt?: string;
}

type ShelterSource = Partial<PreviewShelter> & ShelterApiResponse;

const field = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-white';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function normalizeShelter(data: ShelterSource): Shelter {
  return {
    id: data.id ?? data.Id ?? '',
    name: data.name ?? data.Name ?? 'Shelter',
    address: data.address ?? data.Address ?? '',
    phone: data.phone ?? data.Phone ?? undefined,
    email: data.email ?? data.Email ?? undefined,
    description: data.description ?? data.Description ?? undefined,
    ownerId: data.ownerId ?? data.OwnerId ?? '',
    createdAt: data.createdAt ?? data.CreatedAt ?? new Date().toISOString(),
  };
}

export default function ShelterPage() {
  const { shelterId } = useParams<{ shelterId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', description: '' });

  const isOwner = isAuthenticated && user?.id === shelter?.ownerId;

  useEffect(() => {
    if (!shelterId) {
      setShelter(null);
      setAnimals([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      const currentShelterId = shelterId;
      if (!currentShelterId) return;

      setIsLoading(true);
      try {
        const previewShelter = getPreviewShelterById(currentShelterId);

        if (previewShelter) {
          if (!isMounted) return;
          setShelter(normalizeShelter(previewShelter));
          setAnimals(previewAnimals.filter((animal) => animal.shelterId === currentShelterId));
          return;
        }

        const [shelterRes, petsRes] = await Promise.allSettled([
          api.get(`/shelters/${currentShelterId}`),
          api.get(`/pets?shelterId=${currentShelterId}&page=1&pageSize=50`),
        ]);

        if (!isMounted) return;

        if (shelterRes.status === 'fulfilled') {
          setShelter(normalizeShelter(shelterRes.value.data));
        } else {
          setShelter(null);
        }

        if (petsRes.status === 'fulfilled') {
          const items = Array.isArray(petsRes.value.data?.pets) ? petsRes.value.data.pets.map(mapAnimal) : [];
          setAnimals(items);
        } else {
          setAnimals([]);
        }
      } catch {
        if (!isMounted) return;
        setShelter(null);
        setAnimals([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [shelterId]);

  const available = useMemo(() => animals.filter((a) => a.status === 'Available'), [animals]);
  const adopted   = useMemo(() => animals.filter((a) => a.status === 'Adopted'),   [animals]);

  // Species breakdown
  const speciesBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    animals.forEach((a) => { counts[a.species] = (counts[a.species] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [animals]);

  const maxSpeciesCount = speciesBreakdown[0]?.[1] ?? 1;

  function startEdit() {
    if (!shelter) return;
    setForm({
      name: shelter.name,
      address: shelter.address ?? '',
      phone: shelter.phone ?? '',
      email: shelter.email ?? '',
      description: shelter.description ?? '',
    });
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!shelter) return;
    setIsSaving(true);
    try {
      await api.patch(`/shelters/${shelter.id}`, {
        name: form.name || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        description: form.description || undefined,
      });
      const { data } = await api.get(`/shelters/${shelter.id}`);
      setShelter(normalizeShelter(data));
      setIsEditing(false);
      toast.success('Shelter updated');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  const chatLink = shelter?.ownerId
    ? `/dashboard/chats?recipientId=${shelter.ownerId}&recipientName=${encodeURIComponent(shelter.name)}`
    : null;

  if (isLoading) {
    return <div className="py-16 text-center text-slate-400">Loading shelter...</div>;
  }

  if (!shelter) {
    return (
      <div className="py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">Shelter not found</h1>
        <Link to="/animals" className="font-medium text-primary-600 hover:text-primary-700">Back to animals</Link>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <Link
        to="/animals"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to animals
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shadow-lg shadow-indigo-500/30">
              {shelter.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shelter name" className={field} />
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell adopters about your shelter, mission, and animals" rows={3} className={`${field} resize-none`} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className={field} />
                    <input value={form.phone}   onChange={(e) => setForm({ ...form, phone: e.target.value })}   placeholder="Phone"   className={field} />
                    <input value={form.email}   onChange={(e) => setForm({ ...form, email: e.target.value })}   placeholder="Email"   className={`${field} sm:col-span-2`} type="email" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveEdit} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 transition-colors">
                      <Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                      <X className="w-4 h-4" />Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{shelter.name}</h1>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Animal shelter</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Since {formatDate(shelter.createdAt)}</span>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={startEdit} className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                        <Edit2 className="w-4 h-4" />Edit
                      </button>
                    )}
                  </div>

                  {shelter.description ? (
                    <p className="text-slate-600 dark:text-slate-300 leading-7 mb-5 max-w-2xl">{shelter.description}</p>
                  ) : isOwner ? (
                    <p className="mb-5 text-sm text-slate-400 italic">No description yet — click Edit to tell adopters about your shelter.</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {shelter.address && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />{shelter.address}
                      </span>
                    )}
                    {shelter.phone && (
                      <a href={`tel:${shelter.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />{shelter.phone}
                      </a>
                    )}
                    {shelter.email && (
                      <a href={`mailto:${shelter.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />{shelter.email}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    {isAuthenticated && !isOwner && chatLink && (
                      <Link to={chatLink} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 transition-colors">
                        <MessageSquare className="w-4 h-4" />Contact shelter
                      </Link>
                    )}
                    {isOwner && (
                      <button onClick={() => navigate('/animals/create')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 transition-colors">
                        <Plus className="w-4 h-4" />Add animal
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats + Species breakdown */}
      {animals.length > 0 && (
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 flex flex-col justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{animals.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-5 backdrop-blur-xl dark:border-emerald-500/20 dark:bg-emerald-500/5 flex flex-col justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Available</p>
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">{available.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/80 p-5 backdrop-blur-xl dark:border-blue-500/20 dark:bg-blue-500/5 flex flex-col justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Adopted</p>
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300 mt-2">{adopted.length}</p>
            </div>
          </div>

          {/* Species breakdown */}
          <div className="rounded-2xl border border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Animals by species</p>
            <div className="space-y-3">
              {speciesBreakdown.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
                    <span className="text-sm text-slate-400 dark:text-slate-500">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${(count / maxSpeciesCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available spotlight */}
      {available.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Looking for a home</h2>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              {available.length} available
            </span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {available.map((animal) => (
              <Link
                key={animal.id}
                to={`/animals/${animal.id}`}
                className="group shrink-0 w-52 rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="h-36 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {animal.imageUrl ? (
                    <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🐾</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{animal.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All animals */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <PawPrint className="w-5 h-5 text-primary-600" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">All animals</h2>
          {animals.length > 0 && <span className="text-sm text-slate-400">{animals.length}</span>}
        </div>

        {animals.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500">
            {isOwner ? 'No animals yet — add your first one above.' : 'No animals listed yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {animals.map((animal) => (
              <AnimalCard
                key={animal.id}
                id={animal.id}
                name={animal.name}
                species={animal.species}
                breed={animal.breed}
                age={animal.age}
                status={animal.status}
                imageUrl={animal.imageUrl}
                location={animal.location}
                description={animal.description}
                tags={animal.tags}
                shelterName={animal.shelterName}
                shelterId={animal.shelterId}
                shelterOwnerId={animal.shelterOwnerId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
