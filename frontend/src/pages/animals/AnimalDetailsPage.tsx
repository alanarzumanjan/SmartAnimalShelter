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
  const isAuthorized = isAuthenticated && user?.role === 'shelter' && user?.id === animal?.shelterOwnerId;

  if (isLoading) {
    return <div className="py-16 text-center text-slate-400 dark:text-slate-500">Loading pet profile...</div>;
  }

  if (!animal) {
    return (
      <div className="py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">Pet not found</h1>
        <p className="mb-6 text-slate-500 dark:text-slate-400">This profile is unavailable right now.</p>
        <Link to="/animals" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          Back to animals
        </Link>
      </div>
    );
  }

  const chatLink = `/dashboard/chats?target=${encodeURIComponent(animal.shelterName ?? 'Shelter team')}&pet=${encodeURIComponent(animal.name)}&recipientId=${animal.shelterOwnerId ?? ''}&message=${encodeURIComponent(`Hi! I'm interested in adopting ${animal.name} (${animal.species}). Could you tell me more?`)}`;

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

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[360px] max-h-[480px] items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800/80">
            {animal.imageUrl ? (
              <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl text-slate-300 dark:text-slate-600">🐾</span>
            )}
          </div>
          <div className="p-8 md:p-10 overflow-y-auto max-h-[480px] min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-200">
              <PawPrint className="w-4 h-4" />
              More Information
            </div>
            <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">{animal.name}</h1>
            <p className="mb-6 text-lg text-slate-500 dark:text-slate-400">
              {animal.species}{animal.breed ? ` • ${animal.breed}` : ''}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <div className="text-sm text-slate-500 dark:text-slate-400">Status</div>
                <div className="font-semibold text-slate-900 dark:text-white">{animal.status}</div>
              </div>
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <div className="text-sm text-slate-500 dark:text-slate-400">Age</div>
                <div className="font-semibold text-slate-900 dark:text-white">{animal.age ?? 'To be confirmed'}</div>
              </div>
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <div className="text-sm text-slate-500 dark:text-slate-400">Shelter</div>
                {animal.shelterId ? (
                  <Link
                    to={`/shelters/${animal.shelterId}`}
                    className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  >
                    {animal.shelterName ?? 'Shelter team'}
                  </Link>
                ) : (
                  <div className="font-semibold text-slate-900 dark:text-white">{animal.shelterName ?? 'Shelter team'}</div>
                )}
              </div>
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <div className="text-sm text-slate-500 dark:text-slate-400">Contact</div>
                <div className="font-semibold text-slate-900 dark:text-white">{animal.contactName ?? 'Shelter team'}</div>
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
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                You can view pet details without signing in. Starting a chat will ask you to log in first.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Full description</h2>
          <p className="mb-6 break-words leading-7 text-slate-600 dark:text-slate-300 overflow-wrap-anywhere">{animal.story ?? animal.description}</p>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Personality</h3>
              <div className="flex flex-wrap gap-2">
                {(animal.personality ?? []).map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Care highlights</h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
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
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Medical notes</h3>
            <p className="leading-7 text-slate-600 dark:text-slate-300">{animal.medicalNotes}</p>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Ideal home</h3>
            <p className="leading-7 text-slate-600 dark:text-slate-300">{animal.idealHome}</p>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-600 mt-1" />
              <div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">Location</h3>
                <p className="text-slate-600 dark:text-slate-300">{animal.location ?? animal.shelterName ?? 'Shelter network'}</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default AnimalDetailsPage;
