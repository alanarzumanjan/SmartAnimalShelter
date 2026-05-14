import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  HeartHandshake,
  Plus,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  X,
} from "lucide-react";

import AnimalCard from "./AnimalCard";
import MatchModal, { type MatchPreferences } from "./MatchModal";
import api from "@/services/api";
import { type AnimalItem, type AnimalStatus, mapAnimal } from "./animalCatalog";
import { Button } from "@/components/ui/Button";
import type { RootState } from "@/store/store";

const statusOptions: { value: "" | AnimalStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "Available", label: "Available" },
  { value: "Adopted", label: "Adopted" },
];

function Dropdown({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = Boolean(value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all ${
          active
            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-500"
        }`}
      >
        {value || placeholder}
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
              !value
                ? "text-slate-900 font-medium dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                value === opt
                  ? "text-slate-900 font-medium dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MatchResult {
  id: string;
  compatibilityScore: number;
  matchReasons: string[];
}

export default function AnimalsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [status, setStatus] = useState<"" | AnimalStatus>("");
  const [species, setSpecies] = useState("");
  const [shelter, setShelter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);

  const canCreate = isAuthenticated && user?.role === "shelter";

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/pets?page=1&pageSize=50");
        const items: AnimalItem[] = Array.isArray(data?.pets)
          ? data.pets.map(mapAnimal)
          : [];
        setAnimals(items);
      } catch {
        setAnimals([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleMatch(prefs: MatchPreferences) {
    setMatchLoading(true);
    try {
      const { data } = await api.post("/pets/match", prefs);
      const results: MatchResult[] = (data.pets ?? []).map(
        (p: {
          id: string;
          compatibilityScore: number;
          matchReasons: string[];
        }) => ({
          id: p.id,
          compatibilityScore: p.compatibilityScore,
          matchReasons: p.matchReasons ?? [],
        }),
      );
      setMatchResults(results);
      setShowMatchModal(false);
    } catch {
      setMatchResults(null);
    } finally {
      setMatchLoading(false);
    }
  }

  function resetMatch() {
    setMatchResults(null);
    setCompatibilityMode("all");
  }

  const scoreMap = useMemo(() => {
    if (!matchResults) return null;
    return new Map(matchResults.map((r) => [r.id, r]));
  }, [matchResults]);

  const speciesOptions = useMemo(
    () => [...new Set(animals.map((a) => a.species).filter(Boolean))].sort(),
    [animals],
  );

  const shelterOptions = useMemo(
    () =>
      [
        ...new Set(animals.map((a) => a.shelterName).filter(Boolean)),
      ].sort() as string[],
    [animals],
  );

  const filtered = useMemo(() => {
    let list = animals.filter(
      (a) =>
        (user?.role !== "shelter" ||
          a.status !== "Adopted" ||
          a.shelterOwnerId === user?.id) &&
        (user?.role === "shelter" || a.status !== "Adopted") &&
        (!status || a.status === status) &&
        (!species || a.species === species) &&
        (!shelter || a.shelterName === shelter),
    );

    if (scoreMap) {
      list = [...list].sort((a, b) => {
        const sa = scoreMap.get(a.id)?.compatibilityScore ?? 0;
        const sb = scoreMap.get(b.id)?.compatibilityScore ?? 0;
        return sb - sa;
      });
    }

    return list;
  }, [animals, status, species, shelter, user?.role, user?.id, scoreMap]);

  const visibleStatusOptions = useMemo(
    () =>
      user?.role === "shelter"
        ? statusOptions
        : statusOptions.filter((o) => o.value === ""),
    [user],
  );

  const hasFilters = speciesOptions.length > 0 || shelterOptions.length > 0;

  const [compatibilityMode, setCompatibilityMode] = useState<
    "all" | "compatible"
  >("all");
  const [compatibilityThreshold, setCompatibilityThreshold] =
    useState<number>(70);

  const requireMatchForCompatibility = true;

  const filteredWithCompatibility = useMemo(() => {
    if (compatibilityMode !== "compatible") return filtered;

    const list = filtered.filter((a) => {
      const s = scoreMap?.get(a.id)?.compatibilityScore;

      // If we require an actual match entry, hide pets without score.
      if (requireMatchForCompatibility) {
        return typeof s === "number" && s >= compatibilityThreshold;
      }

      // Otherwise, treat missing score as 0.
      const score = typeof s === "number" ? s : 0;
      return score >= compatibilityThreshold;
    });

    return list;
  }, [
    compatibilityMode,
    compatibilityThreshold,
    filtered,
    scoreMap,
    requireMatchForCompatibility,
  ]);

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-200">
              <HeartHandshake className="w-4 h-4" />
              Adoption catalog
            </div>
            <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
              Animals
            </h1>
            <p className="text-lg leading-7 text-slate-600 dark:text-slate-300">
              Browse animals available for adoption.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {canCreate && (
              <Button onClick={() => navigate("/animals/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Animal
              </Button>
            )}

            <div className="flex items-center gap-3">
              {matchResults ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompatibilityMode("compatible")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        compatibilityMode === "compatible"
                          ? "bg-primary-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      Only compatible
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompatibilityMode("all")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        compatibilityMode === "all"
                          ? "bg-primary-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      All
                    </button>
                    <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-800/80">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Threshold
                      </p>
                      <select
                        value={compatibilityThreshold}
                        onChange={(e) =>
                          setCompatibilityThreshold(Number(e.target.value))
                        }
                        disabled={compatibilityMode !== "compatible"}
                        className="text-sm rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/50"
                      >
                        {[50, 60, 70, 80, 90].map((t) => (
                          <option key={t} value={t}>
                            {t}%
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetMatch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-600 hover:border-slate-500 transition-colors dark:border-slate-600 dark:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                    Reset match
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMatchModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Find my match
                </button>
              )}

              <div className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {compatibilityMode === "compatible"
                    ? filteredWithCompatibility.length
                    : filtered.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleStatusOptions.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-1.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              {visibleStatusOptions.map((opt) => (
                <button
                  key={opt.value || "all"}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    status === opt.value
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {(speciesOptions.length > 0 || shelterOptions.length > 0) && (
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          )}

          {speciesOptions.length > 0 && (
            <Dropdown
              value={species}
              placeholder="Species"
              options={speciesOptions}
              onChange={setSpecies}
            />
          )}

          {shelterOptions.length > 0 && (
            <Dropdown
              value={shelter}
              placeholder="Shelter"
              options={shelterOptions}
              onChange={setShelter}
            />
          )}

          {(status || species || shelter) && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setSpecies("");
                  setShelter("");
                }}
                className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Reset
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full transition-all ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-full transition-all ${
                viewMode === "list"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <p className="py-12 text-center text-slate-400 dark:text-slate-500">
          Loading animals...
        </p>
      ) : animals.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No animals listed yet
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Shelters haven't added any animals yet.
          </p>
        </div>
      ) : (compatibilityMode === "compatible"
          ? filteredWithCompatibility.length
          : filtered.length) === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500">
          No animals match the selected filters.
        </div>
      ) : (
        <section
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
              : "flex flex-col gap-3"
          }
        >
          {(compatibilityMode === "compatible"
            ? filteredWithCompatibility
            : filtered
          ).map((animal) => (
            <AnimalCard
              key={animal.id}
              id={animal.id}
              name={animal.name}
              species={animal.species}
              breed={animal.breed}
              age={animal.age}
              status={animal.status}
              imageUrl={animal.imageUrl}
              description={animal.description}
              tags={animal.tags}
              shelterName={animal.shelterName}
              shelterId={animal.shelterId}
              shelterOwnerId={animal.shelterOwnerId}
              viewMode={viewMode}
              compatibilityScore={scoreMap?.get(animal.id)?.compatibilityScore}
              matchReasons={scoreMap?.get(animal.id)?.matchReasons}
            />
          ))}
        </section>
      )}

      {showMatchModal && (
        <MatchModal
          onClose={() => setShowMatchModal(false)}
          onSubmit={handleMatch}
          isLoading={matchLoading}
        />
      )}
    </div>
  );
}
