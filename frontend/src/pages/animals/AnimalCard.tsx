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
  Available: 'bg-green-100 text-green-700',
  Adopted: 'bg-blue-100 text-blue-700',
  Quarantine: 'bg-yellow-100 text-yellow-700',
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
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col h-full">
      <div className="w-full h-52 bg-gray-100 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-6xl text-gray-300">🐾</span>
        )}
        {canEdit && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Link
              to={`/animals/${id}/edit`}
              className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4 text-gray-700" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{name}</h3>
          <p className="text-gray-500 text-sm">{species}{breed ? ` · ${breed}` : ''}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-500 mb-4">
        {age && <p>Age: {age}</p>}
        {location && <p>Location: {location}</p>}
        {description && <p className="text-gray-600 leading-6 line-clamp-2">{description}</p>}
      </div>

      {tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
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
            className="inline-flex items-center justify-center px-3 py-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
