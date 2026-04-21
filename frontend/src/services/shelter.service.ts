import api from '@/services/api';

interface ShelterSummary {
  id?: string;
  Id?: string;
  ownerId?: string;
  OwnerId?: string;
  createdAt?: string;
  CreatedAt?: string;
}

interface PetShelterRef {
  id?: string;
  Id?: string;
  ownerId?: string;
  OwnerId?: string;
}

interface PetSummary {
  shelter?: PetShelterRef | null;
  shelterId?: string;
  ShelterId?: string;
  createdAt?: string;
  CreatedAt?: string;
}

function getShelterId(shelter: ShelterSummary) {
  return shelter.id ?? shelter.Id ?? null;
}

function getShelterOwnerId(shelter: ShelterSummary) {
  return shelter.ownerId ?? shelter.OwnerId ?? null;
}

function getShelterCreatedAt(shelter: ShelterSummary) {
  return shelter.createdAt ?? shelter.CreatedAt ?? null;
}

function getPetShelterId(pet: PetSummary) {
  return pet.shelter?.id ?? pet.shelter?.Id ?? pet.shelterId ?? pet.ShelterId ?? null;
}

function getPetShelterOwnerId(pet: PetSummary) {
  return pet.shelter?.ownerId ?? pet.shelter?.OwnerId ?? null;
}

function getPetCreatedAt(pet: PetSummary) {
  return pet.createdAt ?? pet.CreatedAt ?? null;
}

export async function resolveOwnedShelterId(ownerId: string): Promise<string | null> {
  const { data } = await api.get('/shelters?page=1&pageSize=100');
  const ownedShelters = (Array.isArray(data?.shelters) ? data.shelters : []).filter((shelter: ShelterSummary) => (
    getShelterOwnerId(shelter) === ownerId && Boolean(getShelterId(shelter))
  ));

  if (ownedShelters.length === 0) {
    return null;
  }

  if (ownedShelters.length === 1) {
    return getShelterId(ownedShelters[0]);
  }

  const ownedShelterIds = new Set(
    ownedShelters
      .map(getShelterId)
      .filter((value: string | null): value is string => Boolean(value))
  );

  try {
    const petsResponse = await api.get('/pets?page=1&pageSize=100');
    const pets = Array.isArray(petsResponse.data?.pets) ? petsResponse.data.pets : [];
    const petShelterStats = new Map<string, { count: number; latestCreatedAt: number }>();

    for (const pet of pets as PetSummary[]) {
      if (getPetShelterOwnerId(pet) !== ownerId) continue;

      const shelterId = getPetShelterId(pet);
      if (!shelterId || !ownedShelterIds.has(shelterId)) continue;

      const createdAtValue = getPetCreatedAt(pet);
      const createdAt = createdAtValue ? new Date(createdAtValue).getTime() : 0;
      const current = petShelterStats.get(shelterId);

      if (!current) {
        petShelterStats.set(shelterId, { count: 1, latestCreatedAt: createdAt });
        continue;
      }

      current.count += 1;
      current.latestCreatedAt = Math.max(current.latestCreatedAt, createdAt);
    }

    const canonicalShelterId = [...petShelterStats.entries()]
      .sort((left, right) => {
        if (right[1].count !== left[1].count) {
          return right[1].count - left[1].count;
        }

        return right[1].latestCreatedAt - left[1].latestCreatedAt;
      })[0]?.[0];

    if (canonicalShelterId) {
      return canonicalShelterId;
    }
  } catch {
    // Fall back to shelter metadata if pets cannot be loaded.
  }

  return [...ownedShelters]
    .sort((left, right) => {
      const leftCreatedAt = getShelterCreatedAt(left);
      const rightCreatedAt = getShelterCreatedAt(right);
      return new Date(rightCreatedAt ?? 0).getTime() - new Date(leftCreatedAt ?? 0).getTime();
    })
    .map(getShelterId)
    .find((value: string | null): value is string => Boolean(value)) ?? null;
}
