import React from "react";
import { Link } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { AnimalItem, formatDate, getStatusColor } from "./types";

interface Props {
  animals: AnimalItem[];
  isLoading: boolean;
  canCreate: boolean;
}

export default function AnimalsTab({ animals, isLoading, canCreate }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          My Animals
        </h2>
        {canCreate && (
          <Link
            to="/animals/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <PawPrint className="w-4 h-4" />
            Add Animal
          </Link>
        )}
      </div>

      {isLoading && (
        <p className="text-center text-gray-500 dark:text-slate-400 py-8">
          Loading animals...
        </p>
      )}

      {!isLoading && animals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-12 text-center">
          <PawPrint className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            No animals yet
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {canCreate
              ? "Create your first animal profile to get started."
              : "You don't have any animals associated with your account."}
          </p>
        </div>
      )}

      {!isLoading && animals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animals.map((animal) => (
            <Link
              key={animal.id}
              to={`/animals/${animal.id}`}
              className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                  {animal.name}
                </h3>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(animal.status?.name ?? "available")}`}
                >
                  {animal.status?.name ?? "Available"}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {animal.species?.name}
                {animal.breed?.name ? ` · ${animal.breed.name}` : ""}
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                Added {formatDate(animal.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
