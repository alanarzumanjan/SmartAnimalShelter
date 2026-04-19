import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PawPrint, Save, ArrowLeft, Upload, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RootState } from '@/store/store';

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

const EditAnimalPage: React.FC = () => {
  const navigate = useNavigate();
  const { animalId } = useParams<{ animalId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [currentBreedName, setCurrentBreedName] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    speciesId: '',
    breed: '',
    gender: '',
    ageValue: '',
    ageUnit: 'years' as 'years' | 'months',
    color: '',
    statusId: '1',
    description: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [speciesRes, animalRes] = await Promise.all([
          api.get('/catalog/species'),
          api.get(`/pets/${animalId}`),
        ]);
        setSpeciesList(speciesRes.data);

        const animal = animalRes.data;
        const breedName = animal.breed?.name || '';
        setCurrentBreedName(breedName);

        // Convert age from years to display format
        const ageYears = animal.age;
        let ageValue = '';
        let ageUnit: 'years' | 'months' = 'years';
        if (ageYears !== null && ageYears !== undefined) {
          if (ageYears < 1) {
            // Show in months
            ageValue = Math.round(ageYears * 12).toString();
            ageUnit = 'months';
          } else {
            ageValue = ageYears.toString();
            ageUnit = 'years';
          }
        }

        setFormData({
          name: animal.name || '',
          speciesId: animal.speciesId?.toString() || '',
          breed: breedName,
          gender: animal.genderId?.toString() || '',
          ageValue,
          ageUnit,
          color: animal.color || '',
          statusId: animal.statusId?.toString() || '1',
          description: animal.description || '',
        });
        if (animal.imageUrl) {
          setCurrentImageUrl(animal.imageUrl);
          setImagePreview(animal.imageUrl);
        }
      } catch {
        toast.error('Failed to load animal data');
        navigate('/animals');
      }
    };
    loadData();
  }, [animalId, navigate]);

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
      // Calculate age in years
      let ageInYears: number | null = null;
      if (formData.ageValue) {
        const val = parseFloat(formData.ageValue);
        if (!isNaN(val)) {
          ageInYears = formData.ageUnit === 'months' ? val / 12 : val;
        }
      }

      const patchData: Record<string, unknown> = {};
      if (formData.name) patchData.name = formData.name;
      if (formData.speciesId) patchData.speciesId = Number(formData.speciesId);
      if (formData.gender) patchData.genderId = Number(formData.gender);
      if (formData.ageValue) patchData.age = ageInYears;
      if (formData.color) patchData.color = formData.color;
      if (formData.statusId) patchData.statusId = Number(formData.statusId);
      if (formData.description) patchData.description = formData.description;

      await api.patch(`/pets/${animalId}`, patchData);

      // Update breed name if changed
      if (formData.breed && formData.breed !== currentBreedName) {
        try {
          await api.patch(`/pets/${animalId}/breed`, { breedName: formData.breed });
        } catch {
          // Breed update failed but main save succeeded
        }
      }

      // Upload new image if provided
      if (imageFile) {
        const imageForm = new FormData();
        imageForm.append('file', imageFile);
        try {
          await api.post(`/pets/${animalId}/image`, imageForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.error('Image upload failed');
        }
      }

      toast.success('Animal profile updated successfully!');
      navigate(`/animals/${animalId}`);
    } catch {
      toast.error('Failed to update animal profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this animal profile? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await api.delete(`/pets/${animalId}`);
      toast.success('Animal profile deleted');
      navigate('/animals');
    } catch {
      toast.error('Failed to delete animal profile');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAuthorized = user?.role === 'veterinarian' || user?.role === 'shelter';

  if (!isAuthorized) {
    return (
      <div className="py-8 text-center">
        <PawPrint className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-600" />
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-300">Only pet owners can edit animal profiles.</p>
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
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Profile
        </Button>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.84)]">
        <div className="flex items-center gap-3 mb-6">
          <PawPrint className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Animal Profile</h1>
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
              {imagePreview && imagePreview !== currentImageUrl && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(currentImageUrl); }}
                  className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-3 h-3" /> Remove new image
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={formData.statusId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, statusId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="1">Available</option>
                  <option value="2">Adopted</option>
                  <option value="3">Pending</option>
                </select>
              </div>
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAnimalPage;
