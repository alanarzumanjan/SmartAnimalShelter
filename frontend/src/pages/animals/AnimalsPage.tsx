import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HeartHandshake, SlidersHorizontal, Plus } from 'lucide-react';

import AnimalCard from './AnimalCard';
import api from '@/services/api';
import { type AnimalItem, type AnimalStatus, mapAnimal, previewAnimals } from './animalCatalog';
import { Button } from '@/components/ui/Button';
import type { RootState } from '@/store/store';

const statusOptions: { value: '' | AnimalStatus; label: string }[] = [
  { value: '',            label: 'All' },
  { value: 'Available',  label: 'Available' },
  { value: 'Adopted',    label: 'Adopted' },
  { value: 'Quarantine', label: 'Quarantine' },
];

const filterBtn = (active: boolean) =>
  `px-4 py-2 rounded-full border text-sm transition-colors ${
    active
      ? 'bg-primary-600 text-white border-primary-600'
      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
  }`;

export default function AnimalsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [status, setStatus] = useState<'' | AnimalStatus>('');
  const [species, setSpecies] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  const canCreate = isAuthenticated && (user?.role === 'veterinarian' || user?.role === 'shelter');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/pets?page=1&pageSize=20');
        const items: AnimalItem[] = Array.isArray(data?.pets) ? data.pets.map(mapAnimal) : [];
        if (items.length > 0) {
          setAnimals(items);
        } else {
          setAnimals(previewAnimals);
          setIsPreview(true);
        }
      } catch {
        setAnimals(previewAnimals);
        setIsPreview(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const speciesOptions = useMemo(
    () => [...new Set(animals.map((a) => a.species).filter(Boolean))].sort(),
    [animals],
  );

  const filtered = useMemo(
    () => animals.filter((a) => (!status || a.status === status) && (!species || a.species === species)),
    [animals, status, species],
  );

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <HeartHandshake className="w-4 h-4" />
              Adoption catalog
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Animals</h1>
            <p className="text-gray-600 text-lg leading-7">
              Browse animals available for adoption. Live data when connected, preview cards otherwise.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {canCreate && (
              <Button onClick={() => navigate('/animals/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Animal
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3 min-w-[200px]">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Showing</p>
                <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Source</p>
                <p className="text-sm font-semibold text-gray-900">{isPreview ? 'Preview' : 'Live'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <span className="flex items-center gap-2 text-gray-500 text-sm shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
            Status
          </span>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button key={opt.value || 'all'} type="button" className={filterBtn(status === opt.value)} onClick={() => setStatus(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {speciesOptions.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <span className="flex items-center gap-2 text-gray-500 text-sm shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              Species
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={filterBtn(species === '')} onClick={() => setSpecies('')}>All</button>
              {speciesOptions.map((s) => (
                <button key={s} type="button" className={filterBtn(species === s)} onClick={() => setSpecies(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {isPreview && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">
            Showing preview cards — no live data available right now.
          </p>
        )}
      </section>

      {isLoading ? (
        <p className="text-center text-gray-400 py-12">Loading animals...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          No animals match the selected filters.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((animal) => (
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
}
