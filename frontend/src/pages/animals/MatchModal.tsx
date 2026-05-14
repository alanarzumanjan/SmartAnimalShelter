import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";

export interface MatchPreferences {
  housingType: "apartment" | "house" | "house_with_yard";
  hasKids: boolean;
  hasDogs: boolean;
  hasCats: boolean;
  energyPreference: "low" | "medium" | "high";
  experienceLevel: "first_time" | "experienced";
  sizePreference: "small" | "medium" | "large" | "any";
  needsHouseTrained: boolean;
}

interface Props {
  onClose: () => void;
  onSubmit: (prefs: MatchPreferences) => void;
  isLoading: boolean;
}

type PillGroupProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

function PillGroup<T extends string>({ label, options, value, onChange }: PillGroupProps<T>) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              value === opt.value
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TogglePill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        value
          ? "bg-primary-600 text-white border-primary-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-primary-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function MatchModal({ onClose, onSubmit, isLoading }: Props) {
  const [prefs, setPrefs] = useState<MatchPreferences>({
    housingType: "apartment",
    hasKids: false,
    hasDogs: false,
    hasCats: false,
    energyPreference: "medium",
    experienceLevel: "first_time",
    sizePreference: "any",
    needsHouseTrained: false,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Find your match</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. Housing */}
          <PillGroup
            label="🏠 Your home type"
            value={prefs.housingType}
            onChange={(v) => setPrefs((p) => ({ ...p, housingType: v }))}
            options={[
              { value: "apartment", label: "Apartment" },
              { value: "house", label: "House" },
              { value: "house_with_yard", label: "House + yard" },
            ]}
          />

          {/* 2. Household members */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              🏡 Who lives with you?
            </p>
            <div className="flex flex-wrap gap-2">
              <TogglePill
                label="👶 Children"
                value={prefs.hasKids}
                onChange={(v) => setPrefs((p) => ({ ...p, hasKids: v }))}
              />
              <TogglePill
                label="🐕 Dogs"
                value={prefs.hasDogs}
                onChange={(v) => setPrefs((p) => ({ ...p, hasDogs: v }))}
              />
              <TogglePill
                label="🐈 Cats"
                value={prefs.hasCats}
                onChange={(v) => setPrefs((p) => ({ ...p, hasCats: v }))}
              />
            </div>
          </div>

          {/* 3. Energy */}
          <PillGroup
            label="⚡ Preferred activity level"
            value={prefs.energyPreference}
            onChange={(v) => setPrefs((p) => ({ ...p, energyPreference: v }))}
            options={[
              { value: "low", label: "Calm" },
              { value: "medium", label: "Moderate" },
              { value: "high", label: "Active" },
            ]}
          />

          {/* 4. Experience */}
          <PillGroup
            label="🎓 Your experience with pets"
            value={prefs.experienceLevel}
            onChange={(v) => setPrefs((p) => ({ ...p, experienceLevel: v }))}
            options={[
              { value: "first_time", label: "First time owner" },
              { value: "experienced", label: "Experienced" },
            ]}
          />

          {/* 5. Size */}
          <PillGroup
            label="📏 Preferred size"
            value={prefs.sizePreference}
            onChange={(v) => setPrefs((p) => ({ ...p, sizePreference: v }))}
            options={[
              { value: "any", label: "No preference" },
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />

          {/* 6. House trained */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              🏠 Important to you?
            </p>
            <TogglePill
              label="✅ Already house trained"
              value={prefs.needsHouseTrained}
              onChange={(v) => setPrefs((p) => ({ ...p, needsHouseTrained: v }))}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => onSubmit(prefs)}
          disabled={isLoading}
          className="mt-8 w-full py-3 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
        >
          {isLoading ? "Finding matches…" : "Show my matches"}
        </button>
      </div>
    </div>
  );
}
