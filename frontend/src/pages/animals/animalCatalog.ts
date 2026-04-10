export type AnimalStatus = 'Available' | 'Adopted' | 'Quarantine';

export interface AnimalItem {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  status: AnimalStatus;
  imageUrl?: string;
  location?: string;
  description?: string;
  tags?: string[];
  shelterName?: string;
  contactName?: string;
  story?: string;
  personality?: string[];
  careHighlights?: string[];
  medicalNotes?: string;
  idealHome?: string;
}

export const previewAnimals: AnimalItem[] = [
  {
    id: 'preview-luna',
    name: 'Luna',
    species: 'Cat',
    breed: 'British Shorthair mix',
    age: '2 years',
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80',
    location: 'Riga Central Shelter',
    shelterName: 'Riga Central Shelter',
    contactName: 'Marta Ozola',
    description: 'Calm indoor cat with a playful streak. Comfortable with apartments and gentle children.',
    story: 'Luna arrived after being found near an apartment complex and quickly became one of the calmest cats in the socialization room. She enjoys quiet mornings, window watching, and slow introductions.',
    personality: ['Affectionate', 'Indoor-ready', 'Gentle with visitors'],
    careHighlights: ['Vaccinated', 'Litter trained', 'Comfortable with low-noise homes'],
    medicalNotes: 'Healthy, vaccinated, and ready for adoption.',
    idealHome: 'Best suited for a calm home that can offer soft spaces, toys, and a gradual introduction to other pets.',
    tags: ['Vaccinated', 'Indoor', 'Family-friendly'],
  },
  {
    id: 'preview-archie',
    name: 'Archie',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: '4 years',
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
    location: 'Jurmala Partner Shelter',
    shelterName: 'Jurmala Partner Shelter',
    contactName: 'Edgars Briedis',
    description: 'Friendly, social, and trained for leash walks. Great candidate for an active household.',
    story: 'Archie was surrendered when his family relocated. He is energetic outdoors, settles well indoors, and already knows several basic commands.',
    personality: ['Confident', 'Social', 'Enjoys activity'],
    careHighlights: ['Neutered', 'Leash trained', 'Good with dogs'],
    medicalNotes: 'In good condition and fully assessed by the shelter team.',
    idealHome: 'A household that enjoys walks, play, and consistent daily routines.',
    tags: ['Neutered', 'Active', 'Good with dogs'],
  },
  {
    id: 'preview-poppy',
    name: 'Poppy',
    species: 'Rabbit',
    breed: 'Mini Lop',
    age: '1 year',
    status: 'Quarantine',
    imageUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1200&q=80',
    location: 'Medical observation unit',
    shelterName: 'Northern Rescue Unit',
    contactName: 'Ilze Krumina',
    description: 'Currently under observation after intake. Profile layout prepared for medical status and release notes.',
    story: 'Poppy is still in the intake process, so this page demonstrates how we can show in-progress profiles with observation notes before public release.',
    personality: ['Quiet', 'Curious', 'Sensitive to noise'],
    careHighlights: ['Observation', 'Small pet enclosure', 'Gentle handling'],
    medicalNotes: 'Under temporary quarantine while the team completes intake checks.',
    idealHome: 'To be confirmed after medical clearance and behavior assessment.',
    tags: ['Observation', 'Gentle', 'Small pet'],
  },
  {
    id: 'preview-max',
    name: 'Max',
    species: 'Dog',
    breed: 'Mixed breed',
    age: '6 years',
    status: 'Adopted',
    imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    location: 'Recently matched',
    shelterName: 'Coastal Shelter Network',
    contactName: 'Laura Berzina',
    description: 'Included as a preview of how adopted animals can still appear in the catalog history.',
    story: 'Max recently found a home. His page stays visible as a reference for how adopted animals can remain part of the public shelter story.',
    personality: ['Steady', 'People-oriented', 'Experienced'],
    careHighlights: ['Matched', 'Archive-ready', 'History preserved'],
    medicalNotes: 'Final adoption paperwork completed.',
    idealHome: 'Already matched with an adopter.',
    tags: ['Matched', 'Archive-ready'],
  },
];

export const normalizeStatus = (value: unknown): AnimalStatus => {
  if (value === 'Adopted' || value === 'Quarantine') {
    return value;
  }

  return 'Available';
};

export const mapAnimal = (animal: any, index = 0): AnimalItem => ({
  id: animal.id ?? `animal-${index}`,
  name: animal.name ?? 'Unnamed pet',
  species: animal.species?.name ?? animal.species ?? 'Pet',
  breed: animal.breed?.name ?? animal.breed ?? undefined,
  age: animal.age ? `${animal.age} years` : undefined,
  status: normalizeStatus(animal.status?.name ?? animal.status),
  imageUrl: animal.imageUrl ?? undefined,
  location: animal.shelter?.name ?? 'Shelter network',
  shelterName: animal.shelter?.name ?? 'Shelter network',
  contactName: 'Shelter team',
  description: animal.description ?? 'Profile details will appear here once backend content is connected.',
  story: animal.description ?? 'This profile is ready for a fuller story once rescue intake notes and adoption context are connected.',
  personality: [
    animal.gender?.name,
    animal.category,
    animal.color,
  ].filter(Boolean),
  careHighlights: [
    animal.price ? `Fee: ${animal.price}` : undefined,
    animal.externalUrl ? 'External listing available' : undefined,
    animal.status?.name ?? animal.status,
  ].filter(Boolean),
  medicalNotes: 'Medical details can be expanded here when shelter records are available.',
  idealHome: 'The ideal-home summary can be connected to backend notes later.',
  tags: [
    animal.gender?.name,
    animal.category,
    animal.price ? `Fee: ${animal.price}` : undefined,
  ].filter(Boolean),
});

export const getPreviewAnimalById = (animalId: string) =>
  previewAnimals.find((animal) => animal.id === animalId);
