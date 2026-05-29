import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

type PetLike = {
  id: string;
  name?: string;
  species?: { name?: string } | null;
  breed?: { name?: string } | null;
};

type PetApiItem = {
  id?: string | number | null;
  Id?: string | number | null;
  petId?: string | number | null;
  name?: string | null;
  Name?: string | null;
  species?: { name?: string } | null;
  Species?: { name?: string } | null;
  breed?: { name?: string } | null;
  Breed?: { name?: string } | null;
};



const AdoptionFormPage: React.FC = () => {
  const [form, setForm] = useState({

    animalId: "" as string,
    comment: "",

    name: "",
    phone: "",
    email: "",
    animal: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [pets, setPets] = useState<PetLike[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);

  const petOptionsLabel = useMemo(() => {
    if (!form.animalId) return "";
    const pet = pets.find((p) => p.id === form.animalId);
    return pet?.name ?? pet?.id ?? "";
  }, [form.animalId, pets]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadPets = async () => {
    setPetsLoading(true);
    try {
      const { data } = await api.get("/pets?page=1&pageSize=100");
      const items = data?.pets ?? data?.data?.pets ?? [];
      setPets(
        (Array.isArray(items) ? items : []).map((p: PetApiItem): PetLike => ({
          id: String(p.id ?? p.Id ?? p.petId ?? ""),
          name: (p.name ?? p.Name) ?? undefined,
          species: p.species ?? p.Species ?? null,
          breed: p.breed ?? p.Breed ?? null,
        })).filter((p) => !!p.id),
      );
    } catch {
      // keep form usable even if pets loading fails
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure pets are loaded if user navigated directly
      if (pets.length === 0) {
        await loadPets();
      }

      if (!form.animalId) {
        alert("Please select an animal to adopt.");
        return;
      }

      // backend expects: POST /pets/adoption with body { petId, message }
      await api.post("/pets/adoption", {
        petId: form.animalId,
        message: form.comment,
      });
      setSubmitted(true);
    } catch {
      alert("Failed to submit the application. Please try again later.");
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-8 text-center shadow-[0_20px_70px_-32px_rgba(16,185,129,0.28)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:shadow-[0_28px_80px_-40px_rgba(5,46,22,0.75)]">
          <h1 className="mb-4 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            Application submitted
          </h1>
          <p className="text-emerald-800 dark:text-emerald-100">
            A shelter team member will contact you to confirm the next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.84)]">
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
          Adoption Request
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">
              Your name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">
              Phone number
            </label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">
              Animal
            </label>
            <select
              name="animalId"
              value={form.animalId}
              onChange={handleChange}
              required
              onFocus={async () => {
                if (pets.length === 0 && !petsLoading) {
                  await loadPets();
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="" disabled>
                {petsLoading ? "Loading pets..." : "Select a pet"}
              </option>
              {pets.map((p) => {
                const spec = [p.species?.name, p.breed?.name].filter(Boolean).join(" · ");
                return (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.id}
                    {spec ? ` (${spec})` : ""}
                  </option>
                );
              })}
            </select>
            {petOptionsLabel ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Selected: {petOptionsLabel}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">
              Comment
            </label>
            <textarea
              name="comment"
              value={form.comment}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Submit request
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdoptionFormPage;

