import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PawPrint, Save, ArrowLeft, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type { RootState } from '@/store/store';
import { resolveOwnedShelterId } from '@/services/shelter.service';

interface Species {
  id: number;
  name: string;
  breeds: Breed[];
}

interface Breed {
  id: number;
  speciesId: number;
  name: string;
}

const CreateAnimalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    speciesId: '',
    breed: '',
    gender: '',
    ageValue: '',
    ageUnit: 'years' as 'years' | 'months',
    color: '',
    statusId: '1', // Available by default
    description: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const speciesRes = await api.get('/catalog/species');
        setSpeciesList(speciesRes.data);
      } catch {
        toast.error('Failed to load form data');
      }
    };
    loadData();
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.speciesId) newErrors.speciesId = 'Species is required';
    if (!formData.breed.trim()) newErrors.breed = 'Breed is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const shelterId = user?.id
        ? await resolveOwnedShelterId(user.id)
        : '00000000-0000-0000-0000-000000000000';

      // If no shelter exists yet, send a placeholder — backend will auto-create one
      const canonicalShelterId = shelterId
        ? shelterId
        : '00000000-0000-0000-0000-000000000000';

      // Calculate age in years (backend expects years)
      let ageInYears: number | null = null;
      if (formData.ageValue) {
        const val = parseFloat(formData.ageValue);
        if (!isNaN(val)) {
          ageInYears = formData.ageUnit === 'months' ? val / 12 : val;
        }
      }

      const petData = {
        name: formData.name,
        speciesId: Number(formData.speciesId),
        breedName: formData.breed,
        genderId: formData.gender ? Number(formData.gender) : null,
        age: ageInYears,
        color: formData.color || null,
        statusId: Number(formData.statusId),
        description: formData.description || null,
        shelterId: canonicalShelterId,
      };

      const response = await api.post('/pets', petData);

      // Upload image if provided
      if (imageFile && response.data.id) {
        const imageForm = new FormData();
        imageForm.append('file', imageFile);
        try {
          await api.post(`/pets/${response.data.id}/image`, imageForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.error('Pet created but image upload failed');
        }
      }

      toast.success('Animal profile created successfully!');
      navigate(`/animals/${response.data.id}`);
    } catch (error: unknown) {
      const message = isAxiosError(error)
        ? error.response?.data?.message || error.response?.data || 'Failed to create animal'
        : 'Failed to create animal';
      if (typeof message === 'string') {
        toast.error(message);
      } else {
        toast.error('Failed to create animal profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthorized = user?.role === 'veterinarian' || user?.role === 'shelter';

  if (!isAuthorized) {
    return (
      <div className="py-8 text-center">
        <PawPrint className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-600" />
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-300">Only authenticated users can create animal profiles.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Map species names for display (Unknown -> Other)
  const displaySpeciesName = (name: string) => {
    if (name === 'Unknown') return 'Other';
    return name;
  };

  return (
    <div className="py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.84)]">
        <div className="flex items-center gap-3 mb-6">
          <PawPrint className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Animal Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Choose photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full cursor-pointer text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-500/10 dark:file:text-primary-200"
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); }}
                  className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                type="text"
                placeholder="e.g., Buddy"
                value={formData.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
              />
            </div>
          </div>

          {/* Species & Breed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Species</label>
              <select
                value={formData.speciesId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, speciesId: e.target.value })}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:text-white ${errors.speciesId ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
              >
                <option value="">Select species...</option>
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>{displaySpeciesName(s.name)}</option>
                ))}
              </select>
              {errors.speciesId && <p className="mt-1 text-sm text-red-600">{errors.speciesId}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Breed</label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, breed: e.target.value })}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:text-white ${errors.breed ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                placeholder="e.g., Golden Retriever, Mixed, etc."
              />
              {errors.breed && <p className="mt-1 text-sm text-red-600">{errors.breed}</p>}
            </div>
          </div>

          {/* Gender, Age, Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={formData.gender}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Not specified</option>
                <option value="1">♂ Male</option>
                <option value="2">♀ Female</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.ageValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ageValue: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g., 6"
                />
                <select
                  value={formData.ageUnit}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, ageUnit: e.target.value as 'years' | 'months' })}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="years">years</option>
                  <option value="months">months</option>
                </select>
              </div>
            </div>

            <Input
              label="Color"
              type="text"
              placeholder="e.g., Golden"
              value={formData.color}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Story</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Tell us about this animal's personality, history, and what makes them special..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnimalPage;
