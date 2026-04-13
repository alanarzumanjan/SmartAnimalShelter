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
        <PawPrint className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only veterinarians and shelter managers can edit animal profiles.</p>
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <PawPrint className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Edit Animal Profile</h1>
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
              {imagePreview && imagePreview !== currentImageUrl && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(currentImageUrl); }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.statusId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, statusId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAnimalPage;
