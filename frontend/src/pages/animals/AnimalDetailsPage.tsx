import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MessageSquare, MapPin, PawPrint, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import type { RootState } from '@/store/store';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { getPreviewAnimalById, mapAnimal, type AnimalItem } from './animalCatalog';
import toast from 'react-hot-toast';

const AnimalDetailsPage: React.FC = () => {
  const { animalId } = useParams<{ animalId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [animal, setAnimal] = useState<AnimalItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAnimal = async () => {
      if (!animalId) {
        setAnimal(null);
        setIsLoading(false);
        return;
      }

      const previewAnimal = getPreviewAnimalById(animalId);
      if (previewAnimal) {
        setAnimal(previewAnimal);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/pets/${animalId}`);
        if (isMounted) {
          setAnimal(mapAnimal(response.data));
        }
      } catch {
        if (isMounted) {
          setAnimal(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnimal();

    return () => {
      isMounted = false;
    };
  }, [animalId]);

  const handleDelete = async () => {
    if (!animalId || !window.confirm(`Delete ${animal?.name}'s profile? This cannot be undone.`)) return;
    try {
      await api.delete(`/pets/${animalId}`);
      toast.success(`${animal?.name}'s profile deleted`);
      navigate('/animals');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Veterinarians and shelter users can manage all pets
  // Users can manage their own pets (backend enforces ownership)
  const isAuthorized = isAuthenticated && (user?.role === 'veterinarian' || user?.role === 'shelter' || user?.role === 'user');

  if (isLoading) {
    return <div className="py-16 text-center text-gray-400">Loading pet profile...</div>;
  }

  if (!animal) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Pet not found</h1>
        <p className="text-gray-500 mb-6">This profile is unavailable right now.</p>
        <Link to="/animals" className="text-primary-600 font-medium hover:text-primary-700">
          Back to animals
        </Link>
      </div>
    );
  }

  const chatLink = `/dashboard/chats?target=${encodeURIComponent(animal.shelterName ?? 'Shelter team')}&pet=${encodeURIComponent(animal.name)}`;

  return (
    <div className="py-8 space-y-8">
      {/* Admin action buttons */}
      {isAuthorized && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(`/animals/${animalId}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Profile
          </Button>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gray-100 min-h-[360px] flex items-center justify-center">
            {animal.imageUrl ? (
              <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl text-gray-300">🐾</span>
            )}
          </div>
          <div className="p-8 md:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <PawPrint className="w-4 h-4" />
              More Information
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{animal.name}</h1>
            <p className="text-gray-500 text-lg mb-6">
              {animal.species}{animal.breed ? ` • ${animal.breed}` : ''}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-semibold text-gray-900">{animal.status}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Age</div>
                <div className="font-semibold text-gray-900">{animal.age ?? 'To be confirmed'}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Shelter</div>
                <div className="font-semibold text-gray-900">{animal.shelterName ?? 'Shelter team'}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Contact</div>
                <div className="font-semibold text-gray-900">{animal.contactName ?? 'Shelter team'}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to={chatLink}>
                <Button>
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
              </Link>
              <Link to="/adoption">
                <Button variant="secondary">Adoption Request</Button>
              </Link>
            </div>

            {!isAuthenticated && (
              <p className="mt-4 text-sm text-gray-500">
                You can view pet details without signing in. Starting a chat will ask you to log in first.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Full description</h2>
          <p className="text-gray-600 leading-7 mb-6">{animal.story ?? animal.description}</p>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Personality</h3>
              <div className="flex flex-wrap gap-2">
                {(animal.personality ?? []).map((item) => (
                  <span key={item} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Care highlights</h3>
              <ul className="space-y-2 text-gray-600">
                {(animal.careHighlights ?? []).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical notes</h3>
            <p className="text-gray-600 leading-7">{animal.medicalNotes}</p>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Ideal home</h3>
            <p className="text-gray-600 leading-7">{animal.idealHome}</p>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
                <p className="text-gray-600">{animal.location ?? animal.shelterName ?? 'Shelter network'}</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default AnimalDetailsPage;
