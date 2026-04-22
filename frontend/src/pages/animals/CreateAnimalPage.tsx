import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PawPrint, Save, ArrowLeft, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { RootState } from '@/store/store'

interface Species { id: number; name: string; }

const sel = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const ta  = `${sel} resize-none`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function TriState({ label, value, onChange }: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex gap-2">
        {([null, true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              value === v
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {v === null ? 'Unknown' : v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CreateAnimalPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState(false);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const [f, setF] = useState({
    name: '', speciesId: '', breed: '', gender: '',
    ageValue: '', ageUnit: 'years' as 'years' | 'months',
    weight: '', color: '', statusId: '1', size: '',
    description: '', medicalNotes: '', idealHome: '',
    specialNeeds: '', currentMedications: '',
    intakeReason: '', intakeDate: '',
    energyLevel: '', experienceLevel: '', housingRequirement: '',
    chipNumber: '', adoptionFee: '',
  });
  const [bools, setBools] = useState({
    isNeutered: null as boolean | null,
    isChipped: null as boolean | null,
    isHouseTrained: null as boolean | null,
    goodWithKids: null as boolean | null,
    goodWithDogs: null as boolean | null,
    goodWithCats: null as boolean | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/catalog/species')
      .then(({ data }) => setSpeciesList(data))
      .catch(() => toast.error('Failed to load species'));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.speciesId) e.speciesId = 'Species is required';
    if (!f.breed.trim()) e.breed = 'Breed is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      const sheltersRes = await api.get('/shelters');
      const userShelters = (sheltersRes.data.shelters || []).filter((s: { ownerId: string }) => s.ownerId === user?.id);
      const shelterId = userShelters.length > 0 ? userShelters[0].id : '00000000-0000-0000-0000-000000000000';

      let ageInYears: number | null = null;
      if (f.ageValue) {
        const v = parseFloat(f.ageValue);
        if (!isNaN(v)) ageInYears = f.ageUnit === 'months' ? v / 12 : v;
      }

      const petData = {
        name: f.name,
        speciesId: Number(f.speciesId),
        breedName: f.breed,
        genderId: f.gender ? Number(f.gender) : null,
        age: ageInYears,
        weight: f.weight ? parseFloat(f.weight) : null,
        color: f.color || null,
        statusId: Number(f.statusId),
        size: f.size || null,
        description: f.description || null,
        medicalNotes: f.medicalNotes || null,
        idealHome: f.idealHome || null,
        specialNeeds: f.specialNeeds || null,
        currentMedications: f.currentMedications || null,
        intakeReason: f.intakeReason || null,
        intakeDate: f.intakeDate || null,
        energyLevel: f.energyLevel || null,
        experienceLevel: f.experienceLevel || null,
        housingRequirement: f.housingRequirement || null,
        chipNumber: f.chipNumber || null,
        adoptionFee: f.adoptionFee ? parseFloat(f.adoptionFee) : null,
        shelterId,
        ...bools,
      };

      const response = await api.post('/pets', petData);

      if (imageFile && response.data.id) {
        const form = new FormData();
        form.append('file', imageFile);
        try {
          await api.post(`/pets/${response.data.id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch { toast.error('Pet created but image upload failed'); }
      }

      toast.success('Animal profile created!');
      navigate(`/animals/${response.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create animal';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (user?.role !== 'veterinarian' && user?.role !== 'shelter') {
    return (
      <div className="py-8 text-center">
        <PawPrint className="mx-auto mb-4 h-16 w-16 text-slate-300" />
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <Button onClick={() => navigate(-1)} className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex items-center gap-3 mb-8">
          <PawPrint className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Animal Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">

          <Section title="Photo">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="h-10 w-10 text-slate-400" />}
                </div>
                <label className="mt-2 block">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setImageFile(file); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(file); }
                  }} className="block w-full cursor-pointer text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100" />
                </label>
                {imagePreview && (
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className="mt-2 flex items-center gap-1 text-sm text-red-600">
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          </Section>

          <Section title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={f.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setF({ ...f, name: e.target.value })} error={errors.name} placeholder="e.g. Buddy" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select value={f.statusId} onChange={(e) => setF({ ...f, statusId: e.target.value })} className={sel}>
                  <option value="1">Available</option>
                  <option value="2">Adopted</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Species</label>
                <select value={f.speciesId} onChange={(e) => setF({ ...f, speciesId: e.target.value })} className={errors.speciesId ? `${sel} border-red-500` : sel}>
                  <option value="">Select species...</option>
                  {speciesList.map((s) => <option key={s.id} value={s.id}>{s.name === 'Unknown' ? 'Other' : s.name}</option>)}
                </select>
                {errors.speciesId && <p className="mt-1 text-sm text-red-600">{errors.speciesId}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Breed</label>
                <input value={f.breed} onChange={(e) => setF({ ...f, breed: e.target.value })} className={errors.breed ? `${sel} border-red-500` : sel} placeholder="e.g. Golden Retriever" />
                {errors.breed && <p className="mt-1 text-sm text-red-600">{errors.breed}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="1">♂ Male</option>
                  <option value="2">♀ Female</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                <div className="flex gap-2">
                  <input type="number" step="0.5" min="0" value={f.ageValue} onChange={(e) => setF({ ...f, ageValue: e.target.value })} className={sel} placeholder="e.g. 3" />
                  <select value={f.ageUnit} onChange={(e) => setF({ ...f, ageUnit: e.target.value as 'years' | 'months' })} className={sel}>
                    <option value="years">years</option>
                    <option value="months">months</option>
                  </select>
                </div>
              </div>
              <Input label="Color" value={f.color} onChange={(e: ChangeEvent<HTMLInputElement>) => setF({ ...f, color: e.target.value })} placeholder="e.g. Golden" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Weight (kg)</label>
                <input type="number" step="0.1" min="0" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} className={sel} placeholder="e.g. 4.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Size</label>
                <select value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Adoption fee (€)</label>
                <input type="number" step="0.01" min="0" value={f.adoptionFee} onChange={(e) => setF({ ...f, adoptionFee: e.target.value })} className={sel} placeholder="0 = free" />
              </div>
            </div>
          </Section>

          <Section title="Intake">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Intake reason</label>
                <select value={f.intakeReason} onChange={(e) => setF({ ...f, intakeReason: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="Found on street">Found on street</option>
                  <option value="Surrendered by owner">Surrendered by owner</option>
                  <option value="Transfer from another shelter">Transfer from another shelter</option>
                  <option value="Born in shelter">Born in shelter</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Intake date</label>
                <input type="date" value={f.intakeDate} onChange={(e) => setF({ ...f, intakeDate: e.target.value })} className={sel} />
              </div>
            </div>
          </Section>

          <Section title="Medical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TriState label="Neutered / Spayed" value={bools.isNeutered} onChange={(v) => setBools({ ...bools, isNeutered: v })} />
              <TriState label="Microchipped" value={bools.isChipped} onChange={(v) => setBools({ ...bools, isChipped: v })} />
            </div>
            {bools.isChipped && (
              <Input label="Chip number" value={f.chipNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setF({ ...f, chipNumber: e.target.value })} placeholder="e.g. 900182000123456" />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Medical notes</label>
              <textarea rows={3} value={f.medicalNotes} onChange={(e) => setF({ ...f, medicalNotes: e.target.value })} className={ta} placeholder="Vaccinations, health status, vet notes..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Special needs</label>
              <textarea rows={2} value={f.specialNeeds} onChange={(e) => setF({ ...f, specialNeeds: e.target.value })} className={ta} placeholder="Diabetes, allergies, chronic conditions..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Current medications</label>
              <input value={f.currentMedications} onChange={(e) => setF({ ...f, currentMedications: e.target.value })} className={sel} placeholder="e.g. Apoquel 16mg daily" />
            </div>
          </Section>

          <Section title="Behaviour & Compatibility">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Energy level</label>
                <select value={f.energyLevel} onChange={(e) => setF({ ...f, energyLevel: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Owner experience</label>
                <select value={f.experienceLevel} onChange={(e) => setF({ ...f, experienceLevel: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="Any">First-time OK</option>
                  <option value="Experienced">Experienced preferred</option>
                  <option value="Expert">Expert only</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Housing</label>
                <select value={f.housingRequirement} onChange={(e) => setF({ ...f, housingRequirement: e.target.value })} className={sel}>
                  <option value="">Not specified</option>
                  <option value="Any">Apartment OK</option>
                  <option value="House">House preferred</option>
                  <option value="Farm">Farm / Rural</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <TriState label="House trained / Litter trained" value={bools.isHouseTrained} onChange={(v) => setBools({ ...bools, isHouseTrained: v })} />
              <TriState label="Good with kids" value={bools.goodWithKids} onChange={(v) => setBools({ ...bools, goodWithKids: v })} />
              <TriState label="Good with dogs" value={bools.goodWithDogs} onChange={(v) => setBools({ ...bools, goodWithDogs: v })} />
              <TriState label="Good with cats" value={bools.goodWithCats} onChange={(v) => setBools({ ...bools, goodWithCats: v })} />
            </div>
          </Section>

          <Section title="Story & Home">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Story</label>
              <textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={ta} placeholder="Tell adopters about this animal's personality and history..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ideal home</label>
              <textarea rows={3} value={f.idealHome} onChange={(e) => setF({ ...f, idealHome: e.target.value })} className={ta} placeholder="What kind of home would suit this animal best..." />
            </div>
          </Section>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}><Save className="w-4 h-4 mr-2" />Create Profile</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
