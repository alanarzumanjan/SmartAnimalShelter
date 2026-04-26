export type AnimalStatus = "Available" | "Adopted";

export interface AnimalItem {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  status: AnimalStatus;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  shelterName?: string;
  contactName?: string;
  shelterId?: string;
  shelterOwnerId?: string;
  story?: string;
  personality?: string[];
  medicalNotes?: string;
  idealHome?: string;
  weight?: number;
  size?: string;
  energyLevel?: string;
  experienceLevel?: string;
  housingRequirement?: string;
  isNeutered?: boolean | null;
  isChipped?: boolean | null;
  chipNumber?: string;
  isHouseTrained?: boolean | null;
  goodWithKids?: boolean | null;
  goodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  adoptionFee?: number;
  specialNeeds?: string;
  currentMedications?: string;
  intakeReason?: string;
  intakeDate?: string;
}

export interface PreviewShelter {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  ownerId?: string;
  createdAt: string;
}

interface BackendNamedEntity {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  ownerId?: string;
  OwnerId?: string;
  address?: string;
  Address?: string;
}

interface BackendAnimal {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  species?: BackendNamedEntity | string | null;
  breed?: BackendNamedEntity | string | null;
  gender?: BackendNamedEntity | null;
  status?: BackendNamedEntity | string | null;
  age?: number | string | null;
  imageUrl?: string | null;
  location?: string | null;
  shelter?: BackendNamedEntity | null;
  shelterId?: string;
  ShelterId?: string;
  description?: string | null;
  category?: string | null;
  color?: string | null;
  price?: string | number | null;
  externalUrl?: string | null;
  medicalNotes?: string | null;
  idealHome?: string | null;
  MedicalNotes?: string | null;
  IdealHome?: string | null;
  weight?: number | null;
  Weight?: number | null;
  size?: string | null;
  Size?: string | null;
  energyLevel?: string | null;
  EnergyLevel?: string | null;
  experienceLevel?: string | null;
  ExperienceLevel?: string | null;
  housingRequirement?: string | null;
  HousingRequirement?: string | null;
  isNeutered?: boolean | null;
  IsNeutered?: boolean | null;
  isChipped?: boolean | null;
  IsChipped?: boolean | null;
  chipNumber?: string | null;
  ChipNumber?: string | null;
  isHouseTrained?: boolean | null;
  IsHouseTrained?: boolean | null;
  goodWithKids?: boolean | null;
  GoodWithKids?: boolean | null;
  goodWithDogs?: boolean | null;
  GoodWithDogs?: boolean | null;
  goodWithCats?: boolean | null;
  GoodWithCats?: boolean | null;
  adoptionFee?: number | null;
  AdoptionFee?: number | null;
  specialNeeds?: string | null;
  SpecialNeeds?: string | null;
  currentMedications?: string | null;
  CurrentMedications?: string | null;
  intakeReason?: string | null;
  IntakeReason?: string | null;
  intakeDate?: string | null;
  IntakeDate?: string | null;
}

const getEntityName = (value?: BackendNamedEntity | string | null) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.name ?? value.Name;
};

const getEntityId = (value?: BackendNamedEntity | null) =>
  value?.id ?? value?.Id;
const getEntityOwnerId = (value?: BackendNamedEntity | null) =>
  value?.ownerId ?? value?.OwnerId;

export const previewShelters: PreviewShelter[] = [
  {
    id: "preview-shelter-riga-central",
    name: "Riga Central Shelter",
    description:
      "A calm city shelter focused on cat and small animal adoptions, with gentle introductions for new families.",
    address: "Riga city center",
    email: "riga-central@example.com",
    phone: "+371 2000 0101",
    createdAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "preview-shelter-jurmala-partner",
    name: "Jurmala Partner Shelter",
    description:
      "A coastal adoption partner known for active dogs, outdoor routines, and adopter onboarding support.",
    address: "Jurmala coast",
    email: "jurmala-partner@example.com",
    phone: "+371 2000 0102",
    createdAt: "2025-02-14T09:00:00.000Z",
  },
  {
    id: "preview-shelter-northern-rescue",
    name: "Northern Rescue Unit",
    description:
      "A rescue-first intake team that highlights observation, stabilization, and careful recovery planning.",
    address: "Northern intake network",
    email: "northern-rescue@example.com",
    phone: "+371 2000 0103",
    createdAt: "2025-03-01T09:00:00.000Z",
  },
  {
    id: "preview-shelter-coastal-network",
    name: "Coastal Shelter Network",
    description:
      "A collaborative shelter network sharing adoption stories, archived profiles, and successful placements.",
    address: "Baltic coastal region",
    email: "coastal-network@example.com",
    phone: "+371 2000 0104",
    createdAt: "2025-03-20T09:00:00.000Z",
  },
];

export const previewAnimals: AnimalItem[] = [
  {
    id: "preview-luna",
    name: "Luna",
    species: "Cat",
    breed: "British Shorthair mix",
    age: "2 years",
    status: "Available",
    imageUrl:
      "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80",
    shelterName: "Riga Central Shelter",
    shelterId: "preview-shelter-riga-central",
    contactName: "Marta Ozola",
    description:
      "Calm indoor cat with a playful streak. Comfortable with apartments and gentle children.",
    story:
      "Luna arrived after being found near an apartment complex and quickly became one of the calmest cats in the socialization room. She enjoys quiet mornings, window watching, and slow introductions.",
    personality: ["Affectionate", "Indoor-ready", "Gentle with visitors"],
    medicalNotes: "Healthy, vaccinated, and ready for adoption.",
    idealHome:
      "Best suited for a calm home that can offer soft spaces, toys, and a gradual introduction to other pets.",
    tags: ["Vaccinated", "Indoor", "Family-friendly"],
  },
  {
    id: "preview-archie",
    name: "Archie",
    species: "Dog",
    breed: "Golden Retriever",
    age: "4 years",
    status: "Available",
    imageUrl:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
    shelterName: "Jurmala Partner Shelter",
    shelterId: "preview-shelter-jurmala-partner",
    contactName: "Edgars Briedis",
    description:
      "Friendly, social, and trained for leash walks. Great candidate for an active household.",
    story:
      "Archie was surrendered when his family relocated. He is energetic outdoors, settles well indoors, and already knows several basic commands.",
    personality: ["Confident", "Social", "Enjoys activity"],
    medicalNotes: "In good condition and fully assessed by the shelter team.",
    idealHome:
      "A household that enjoys walks, play, and consistent daily routines.",
    tags: ["Neutered", "Active", "Good with dogs"],
  },
  {
    id: "preview-poppy",
    name: "Poppy",
    species: "Rabbit",
    breed: "Mini Lop",
    age: "1 year",
    status: "Available",
    imageUrl:
      "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1200&q=80",
    shelterName: "Northern Rescue Unit",
    shelterId: "preview-shelter-northern-rescue",
    contactName: "Ilze Krumina",
    description:
      "Currently under observation after intake. Profile layout prepared for medical status and release notes.",
    story:
      "Poppy is still in the intake process, so this page demonstrates how we can show in-progress profiles with observation notes before public release.",
    personality: ["Quiet", "Curious", "Sensitive to noise"],
    medicalNotes:
      "Under temporary quarantine while the team completes intake checks.",
    idealHome:
      "To be confirmed after medical clearance and behavior assessment.",
    tags: ["Observation", "Gentle", "Small pet"],
  },
  {
    id: "preview-max",
    name: "Max",
    species: "Dog",
    breed: "Mixed breed",
    age: "6 years",
    status: "Adopted",
    imageUrl:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    shelterName: "Coastal Shelter Network",
    shelterId: "preview-shelter-coastal-network",
    contactName: "Laura Berzina",
    description:
      "Included as a preview of how adopted animals can still appear in the catalog history.",
    story:
      "Max recently found a home. His page stays visible as a reference for how adopted animals can remain part of the public shelter story.",
    personality: ["Steady", "People-oriented", "Experienced"],
    medicalNotes: "Final adoption paperwork completed.",
    idealHome: "Already matched with an adopter.",
    tags: ["Matched", "Archive-ready"],
  },
];

export const normalizeStatus = (value: unknown): AnimalStatus => {
  if (value === "Adopted") return "Adopted";
  return "Available";
};

export const mapAnimal = (animal: BackendAnimal, index = 0): AnimalItem => {
  // Format age: show months if < 1 year
  let ageDisplay: string | undefined = undefined;
  if (animal.age !== null && animal.age !== undefined) {
    const ageNum = parseFloat(String(animal.age));
    if (ageNum < 1) {
      const months = Math.round(ageNum * 12);
      ageDisplay = months <= 1 ? "1 month" : `${months} months`;
    } else {
      ageDisplay = ageNum === 1 ? "1 year" : `${ageNum} years`;
    }
  }

  // Resolve image URL: prepend API base URL for relative paths
  let resolvedImageUrl: string | undefined = undefined;
  if (animal.imageUrl) {
    resolvedImageUrl = animal.imageUrl.startsWith("http")
      ? animal.imageUrl
      : `${import.meta.env.VITE_API_URL || "https://api.alantech.id.lv"}${animal.imageUrl}`;
  }

  const shelterName = getEntityName(animal.shelter);

  return {
    id: animal.id ?? animal.Id ?? `animal-${index}`,
    name: animal.name ?? animal.Name ?? "Unnamed pet",
    species: getEntityName(animal.species) ?? "Pet",
    breed: getEntityName(animal.breed) ?? undefined,
    age: ageDisplay,
    status: normalizeStatus(getEntityName(animal.status)),
    imageUrl: resolvedImageUrl,
    shelterName: shelterName ?? "Shelter network",
    contactName: shelterName ?? "Shelter team",
    shelterId:
      getEntityId(animal.shelter) ??
      animal.shelterId ??
      animal.ShelterId ??
      undefined,
    shelterOwnerId: getEntityOwnerId(animal.shelter) ?? undefined,
    description:
      animal.description ??
      "Profile details will appear here once backend content is connected.",
    story:
      animal.description ??
      "This profile is ready for a fuller story once rescue intake notes and adoption context are connected.",
    personality: [
      getEntityName(animal.gender),
      animal.category,
      animal.color,
    ].filter((value): value is string => Boolean(value)),
    medicalNotes: animal.medicalNotes ?? animal.MedicalNotes ?? undefined,
    idealHome: animal.idealHome ?? animal.IdealHome ?? undefined,
    weight: animal.weight ?? animal.Weight ?? undefined,
    size: animal.size ?? animal.Size ?? undefined,
    energyLevel: animal.energyLevel ?? animal.EnergyLevel ?? undefined,
    experienceLevel:
      animal.experienceLevel ?? animal.ExperienceLevel ?? undefined,
    housingRequirement:
      animal.housingRequirement ?? animal.HousingRequirement ?? undefined,
    isNeutered: animal.isNeutered ?? animal.IsNeutered ?? null,
    isChipped: animal.isChipped ?? animal.IsChipped ?? null,
    chipNumber: animal.chipNumber ?? animal.ChipNumber ?? undefined,
    isHouseTrained: animal.isHouseTrained ?? animal.IsHouseTrained ?? null,
    goodWithKids: animal.goodWithKids ?? animal.GoodWithKids ?? null,
    goodWithDogs: animal.goodWithDogs ?? animal.GoodWithDogs ?? null,
    goodWithCats: animal.goodWithCats ?? animal.GoodWithCats ?? null,
    adoptionFee: animal.adoptionFee ?? animal.AdoptionFee ?? undefined,
    specialNeeds: animal.specialNeeds ?? animal.SpecialNeeds ?? undefined,
    currentMedications:
      animal.currentMedications ?? animal.CurrentMedications ?? undefined,
    intakeReason: animal.intakeReason ?? animal.IntakeReason ?? undefined,
    intakeDate: animal.intakeDate ?? animal.IntakeDate ?? undefined,
    tags: [
      getEntityName(animal.gender),
      animal.category,
      animal.price ? `Fee: ${animal.price}` : undefined,
    ].filter((value): value is string => Boolean(value)),
  };
};

export const getPreviewAnimalById = (animalId: string) =>
  previewAnimals.find((animal) => animal.id === animalId);

export const getPreviewShelterById = (shelterId: string) =>
  previewShelters.find((shelter) => shelter.id === shelterId);
