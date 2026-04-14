import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PawPrint, Save, ArrowLeft, Upload, X } from 'lucide-react';
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
      // Find the user's shelter
      const sheltersRes = await api.get('/shelters');
      const userShelters = (sheltersRes.data.shelters || []).filter(
        (s: any) => s.ownerId === user?.id
      );

      // If no shelter exists yet, send a placeholder — backend will auto-create one
      const shelterId = userShelters.length > 0
        ? userShelters[0].id
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
        shelterId,
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
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data || 'Failed to create animal';
      if (typeof message === 'string') {
        toast.error(message);
      } else {
        toast.error('Failed to create animal profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthorized = user?.role === 'veterinarian' || user?.role === 'shelter' || user?.role === 'user';

  if (!isAuthorized) {
    return (
      <div className="py-8 text-center">
        <PawPrint className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only authenticated users can create animal profiles.</p>
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <PawPrint className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Create Animal Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Choose photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
              <select
                value={formData.speciesId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, speciesId: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white ${errors.speciesId ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select species...</option>
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>{displaySpeciesName(s.name)}</option>
                ))}
              </select>
              {errors.speciesId && <p className="mt-1 text-sm text-red-600">{errors.speciesId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, breed: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.breed ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., Golden Retriever, Mixed, etc."
              />
              {errors.breed && <p className="mt-1 text-sm text-red-600">{errors.breed}</p>}
            </div>
          </div>

          {/* Gender, Age, Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              >
                <option value="">Not specified</option>
                <option value="1">♂ Male</option>
                <option value="2">♀ Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.ageValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ageValue: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 6"
                />
                <select
                  value={formData.ageUnit}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, ageUnit: e.target.value as 'years' | 'months' })}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Story</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
