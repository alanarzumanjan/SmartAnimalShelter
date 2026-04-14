import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Pencil, Trash2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
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
}

const statusColors = {
  Available: 'bg-green-100 text-green-700',
  Adopted: 'bg-blue-100 text-blue-700',
  Quarantine: 'bg-yellow-100 text-yellow-700',
};

const AnimalCard: React.FC<AnimalCardProps> = ({
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
  shelterId,
}) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Check if user can manage this pet (veterinarian, shelter, or pet owner)
  const canManagePet = isAuthenticated && (
    user?.role === 'veterinarian' || 
    user?.role === 'shelter' || 
    user?.role === 'user'
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete ${name}'s profile? This cannot be undone.`)) return;
    try {
      await api.delete(`/pets/${id}`);
      toast.success(`${name}'s profile deleted`);
      window.location.reload();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to delete';
      toast.error(typeof msg === 'string' ? msg : 'Failed to delete');
    }
  };

  // Veterinarians can manage all pets. Shelter users can manage pets in their shelters.
  // Users can manage their own pets (backend enforces ownership)
  const isAuthorized = canManagePet;

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col h-full">
      <div className="w-full h-52 bg-gray-100 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-6xl text-gray-300">🐾</span>
        )}
        {isAuthorized && (
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
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{name}</h3>
          <div className="text-gray-500 text-sm">{species}{breed ? ` • ${breed}` : ''}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>{status}</div>
      </div>
      <div className="space-y-2 text-sm text-gray-500 mb-4">
        {age && <div>Age: {age}</div>}
        {location && <div>Location: {location}</div>}
        {description && <p className="text-gray-600 leading-6">{description}</p>}
      </div>
      {tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-5">
        <Link
          to={`/animals/${id}`}
          className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          More Information
        </Link>
        {isAuthorized && (
          <Link
            to={`/animals/${id}/edit`}
            className="inline-flex items-center justify-center px-3 py-3 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
            title="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        )}
      </div>
    </article>
  );
};

export default AnimalCard;
