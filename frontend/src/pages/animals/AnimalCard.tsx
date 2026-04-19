import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/services/api';
import type { RootState } from '@/store/store';

interface AnimalCardProps {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  status: 'Available' | 'Adopted' | 'Quarantine';
  imageUrl?: string;
  location?: string;
  description?: string;
  tags?: string[];
  shelterId?: string;
  shelterOwnerId?: string;
}

const statusColors = {
  Available: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  Adopted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Quarantine: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
};

export default function AnimalCard({
  id,
  name,
  species,
  breed,
  age,
  status,
  imageUrl,
  location,
  description,
  tags = [],
  shelterOwnerId,
}: AnimalCardProps) {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const canEdit = isAuthenticated && user?.role === 'shelter' && user?.id === shelterOwnerId;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete ${name}'s profile? This cannot be undone.`)) return;
    try {
      await api.delete(`/pets/${id}`);
      toast.success(`${name} removed`);
      window.location.reload();
    } catch (err: any) {
      const msg = err.response?.data;
      toast.error(typeof msg === 'string' ? msg : 'Failed to delete');
    }
  }

  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_26px_80px_-40px_rgba(2,6,23,0.82)]">
      <div className="relative mb-4 flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800/80">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-6xl text-slate-300 dark:text-slate-600">🐾</span>
        )}
        {canEdit && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Link
              to={`/animals/${id}/edit`}
              className="rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-slate-900/85 dark:hover:bg-slate-800"
              title="Edit"
            >
              <Pencil className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 dark:bg-slate-900/85 dark:hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{species}{breed ? ` · ${breed}` : ''}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="mb-4 space-y-1 text-sm text-slate-500 dark:text-slate-400">
        {age && <p>Age: {age}</p>}
        {location && <p>Location: {location}</p>}
        {description && <p className="line-clamp-2 leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
      </div>

      {tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          to={`/animals/${id}`}
          className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          More Information
        </Link>
        {canEdit && (
          <Link
            to={`/animals/${id}/edit`}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-3 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
