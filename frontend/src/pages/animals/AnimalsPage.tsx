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
      : 'bg-white/90 text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
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
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)] md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-200">
              <HeartHandshake className="w-4 h-4" />
              Adoption catalog
            </div>
            <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">Animals</h1>
            <p className="text-lg leading-7 text-slate-600 dark:text-slate-300">
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
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">Showing</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{filtered.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">Source</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{isPreview ? 'Preview' : 'Live'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <span className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
            <span className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Showing preview cards — no live data available right now.
          </p>
        )}
      </section>

      {isLoading ? (
        <p className="py-12 text-center text-slate-400 dark:text-slate-500">Loading animals...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500">
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
