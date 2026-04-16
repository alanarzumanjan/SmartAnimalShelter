import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, PawPrint, Calendar } from 'lucide-react';
import { AdoptionRecord, formatDate, getStatusColor } from './types';

interface Props {
  adoptions: AdoptionRecord[];
  isLoading: boolean;
}

export default function AdoptionsTab({ adoptions, isLoading }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Adoption Requests</h2>

      {isLoading && (
        <p className="text-center text-gray-500 dark:text-slate-400 py-8">Loading adoptions...</p>
      )}

      {!isLoading && adoptions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-12 text-center">
          <Heart className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No requests yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Find an animal you'd like to adopt and submit a request.
          </p>
          <Link
            to="/animals"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <PawPrint className="w-4 h-4" />
            Browse Animals
          </Link>
        </div>
      )}

      {!isLoading && adoptions.length > 0 && (
        <div className="space-y-3">
          {adoptions.map((adoption) => (
            <div
              key={adoption.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <PawPrint className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {adoption.petName || `Pet #${adoption.petId.slice(0, 8)}`}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(adoption.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(adoption.status)}`}>
                  {adoption.status}
                </span>
              </div>

              {adoption.message && (
                <p className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 italic">
                  "{adoption.message}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
