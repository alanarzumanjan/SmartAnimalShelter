import React, { useMemo, useState } from 'react';
import { ShoppingBag, PackageCheck, Cpu, ShieldCheck } from 'lucide-react';

type Category = 'All' | 'Sensors' | 'Stations' | 'Accessories';

interface StoreItem {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  price: string;
  availability: string;
  description: string;
  features: string[];
}

const categoryOptions: Category[] = ['All', 'Sensors', 'Stations', 'Accessories'];

const previewProducts: StoreItem[] = [
  {
    id: 'station-home',
    name: 'Shelter Home Station',
    category: 'Stations',
    price: '€249',
    availability: 'Preview stock',
    description: 'A compact base station designed for home adopters who want to track comfort metrics after adoption.',
    features: ['Temperature + humidity', 'Wi-Fi sync', 'Future mobile alerts'],
  },
  {
    id: 'station-pro',
    name: 'Shelter Pro Hub',
    category: 'Stations',
    price: '€499',
    availability: 'Ready for catalog',
    description: 'A multi-room monitoring hub for shelters with space for enclosure mapping, alerts, and future order workflows.',
    features: ['CO2 monitoring', 'Multi-zone support', 'Dashboard integration'],
  },
  {
    id: 'sensor-air',
    name: 'Air Quality Sensor',
    category: 'Sensors',
    price: '€89',
    availability: 'Preview stock',
    description: 'A standalone sensor card example showing how individual devices can be listed alongside the main kits.',
    features: ['CO2 readings', 'Compact housing', 'Calibration ready'],
  },
  {
    id: 'mount-kit',
    name: 'Enclosure Mount Kit',
    category: 'Accessories',
    price: '€29',
    availability: 'Concept preview',
    description: 'Accessory listing for brackets, cable routing, and shelter-safe mounting hardware.',
    features: ['Wall mount', 'Cable clips', 'Fast install'],
  },
];

const StorePage: React.FC = () => {
  const [category, setCategory] = useState<Category>('All');

  const filteredProducts = useMemo(
    () => (category === 'All' ? previewProducts : previewProducts.filter((item) => item.category === category)),
    [category]
  );

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <ShoppingBag className="w-4 h-4" />
              Public storefront preview
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Store</h1>
            <p className="text-gray-600 text-lg leading-7">
              A product showcase for future shelter hardware sales. The layout is ready for real inventory, checkout, stock states, and richer product data later.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Products</div>
              <div className="text-2xl font-bold text-gray-900">{previewProducts.length}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Catalog mode</div>
              <div className="text-sm font-semibold text-gray-900">Preview</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Checkout</div>
              <div className="text-sm font-semibold text-gray-900">Coming later</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap gap-3">
          {categoryOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                category === option
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <article key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center mb-4">
              {product.category === 'Stations' ? <Cpu className="w-6 h-6" /> : product.category === 'Sensors' ? <PackageCheck className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.category}</p>
              </div>
              <span className="text-sm font-semibold text-primary-700">{product.price}</span>
            </div>
            <p className="text-sm text-gray-600 leading-6 mb-4">{product.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {product.features.map((feature) => (
                <span key={feature} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
                  {feature}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{product.availability}</span>
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Preview item
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default StorePage;
