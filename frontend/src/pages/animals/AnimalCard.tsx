import React from 'react';
import { Link } from 'react-router-dom';

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
}) => (
  <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col h-full">
    <div className="w-full h-52 bg-gray-100 rounded-2xl mb-4 overflow-hidden flex items-center justify-center">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="object-cover w-full h-full" />
      ) : (
        <span className="text-6xl text-gray-300">🐾</span>
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
    <Link
      to={`/animals/${id}`}
      className="mt-5 inline-flex items-center justify-center px-4 py-3 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
    >
      More Information
    </Link>
  </article>
);

export default AnimalCard;
