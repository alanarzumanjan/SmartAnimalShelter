import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  isDeleting: boolean;
  onDelete: (confirm: string) => void;
}

export default function DangerTab({ isDeleting, onDelete }: Props) {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h2>

      <div className="rounded-2xl border-2 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Delete Account</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                This is <strong className="text-red-600 dark:text-red-400">permanent</strong> — your profile,
                animals, adoption requests and order history will all be gone.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Type <strong className="text-red-600 dark:text-red-400">DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border-2 border-red-200 dark:border-red-500/40 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => onDelete(value)}
              disabled={value !== 'DELETE' || isDeleting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
