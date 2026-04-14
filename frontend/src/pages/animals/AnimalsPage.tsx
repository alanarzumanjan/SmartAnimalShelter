import React, { useEffect, useMemo, useState } from 'react';
import { HeartHandshake, SlidersHorizontal, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AnimalCard from './AnimalCard';
import api from '@/services/api';
import { type AnimalItem, type AnimalStatus, mapAnimal, previewAnimals } from './animalCatalog';
import { Button } from '@/components/ui/Button';
import type { RootState } from '@/store/store';

const statusOptions: Array<{ value: '' | AnimalStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'Available', label: 'Available' },
  { value: 'Adopted', label: 'Adopted' },
  { value: 'Quarantine', label: 'Quarantine' },
];

const AnimalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [status, setStatus] = useState<'' | AnimalStatus>('');
  const [species, setSpecies] = useState<string>('');
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingPreviewData, setUsingPreviewData] = useState(false);

  const isAuthorized = isAuthenticated && (user?.role === 'veterinarian' || user?.role === 'shelter');

  useEffect(() => {
    let isMounted = true;

    const loadAnimals = async () => {
      setIsLoading(true);

      try {
        const response = await api.get('/pets?page=1&pageSize=20');
        const items = Array.isArray(response.data?.pets)
          ? response.data.pets.map(mapAnimal)
          : [];

        if (!isMounted) {
          return;
        }

        if (items.length > 0) {
          setAnimals(items);
          setUsingPreviewData(false);
        } else {
          setAnimals(previewAnimals);
          setUsingPreviewData(true);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setAnimals(previewAnimals);
        setUsingPreviewData(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnimals();

    return () => {
      isMounted = false;
    };
  }, []);

  const speciesOptions = useMemo(() => {
    const unique = Array.from(new Set(animals.map((a) => a.species).filter(Boolean)));
    return unique.sort();
  }, [animals]);

  const filteredAnimals = useMemo(() => {
    return animals.filter((a) => {
      if (status && a.status !== status) return false;
      if (species && a.species !== species) return false;
      return true;
    });
  }, [animals, status, species]);

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <HeartHandshake className="w-4 h-4" />
              Adoption-ready catalog preview
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Animals</h1>
            <p className="text-gray-600 text-lg leading-7">
              Browse live shelter animals when data is available, and fall back to preview cards when you just want to review the future storefront layout.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {isAuthorized && (
              <Button onClick={() => navigate('/animals/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Animal Profile
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3 min-w-[220px]">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Visible cards</div>
                <div className="text-2xl font-bold text-gray-900">{filteredAnimals.length}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Data mode</div>
                <div className="text-sm font-semibold text-gray-900">{usingPreviewData ? 'Preview demo' : 'Live API'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              Status
            </div>
            <div className="flex flex-wrap gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    status === option.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {speciesOptions.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
                Species
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    species === ''
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSpecies('')}
                >
                  All
                </button>
                {speciesOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                      species === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSpecies(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {usingPreviewData && (
          <div className="mt-4 rounded-2xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            Showing preview cards so the catalog design can be reviewed even without live shelter data.
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading animals...</div>
      ) : filteredAnimals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          No animals match the selected filter.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredAnimals.map((animal) => (
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
              shelterId={animal.shelterId}
              shelterOwnerId={animal.shelterOwnerId}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default AnimalsPage;
