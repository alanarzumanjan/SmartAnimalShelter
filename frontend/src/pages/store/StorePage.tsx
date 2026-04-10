import React, { useMemo, useState } from 'react';
import { Cpu, Minus, Plus, ShieldCheck, Thermometer, Wifi } from 'lucide-react';

const unitPrice = 249;

const installationTips = [
  'Install the device 1.5 to 2 meters above the floor for more stable environmental readings.',
  'Avoid placing the unit directly near heaters, windows, or strong drafts.',
  'Use one device per room or enclosure zone where you want independent temperature and air-quality tracking.',
  'Connect it to steady Wi-Fi and place it where staff can easily access the status light and mounting bracket.',
];

const StorePage: React.FC = () => {
  const [quantity, setQuantity] = useState(1);

  const totalPrice = useMemo(() => unitPrice * quantity, [quantity]);

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
          <Cpu className="w-4 h-4" />
          Single product storefront
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Store</h1>
        <p className="max-w-3xl mx-auto text-gray-600 text-lg leading-7">
          A focused product page for one core shelter device. The layout is ready for a future checkout flow, order history, shipping details, and live inventory.
        </p>
      </section>

      <section className="max-w-5xl mx-auto bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_0.95fr]">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-10 flex flex-col justify-between min-h-[520px]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium mb-6">
                IoT Device
              </div>
              <h2 className="text-4xl font-bold mb-4">Smart Shelter IoT Device</h2>
              <p className="text-slate-200 text-lg leading-8 max-w-xl">
                A compact environmental monitoring unit built for shelters and adopters who want reliable room-level visibility into comfort and air quality.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-10">
              <div className="rounded-2xl bg-white/10 p-4">
                <Thermometer className="w-5 h-5 mb-3" />
                <div className="font-semibold">Climate tracking</div>
                <div className="text-sm text-slate-300">Temperature and humidity monitoring</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Wifi className="w-5 h-5 mb-3" />
                <div className="font-semibold">Wi-Fi connected</div>
                <div className="text-sm text-slate-300">Ready for dashboard sync and alerts</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <ShieldCheck className="w-5 h-5 mb-3" />
                <div className="font-semibold">Shelter-ready</div>
                <div className="text-sm text-slate-300">Designed for daily operational use</div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 flex flex-col">
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">Unit price</div>
              <div className="text-4xl font-bold text-gray-900">€{unitPrice}</div>
            </div>

            <div className="rounded-3xl bg-gray-50 p-5 mb-6">
              <div className="text-sm text-gray-500 mb-3">Quantity</div>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white transition-colors"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 min-w-10 text-center">{quantity}</span>
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white transition-colors"
                    onClick={() => setQuantity((current) => current + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total price</div>
                  <div className="text-2xl font-bold text-gray-900">€{totalPrice}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full px-6 py-4 rounded-2xl bg-primary-600 text-white text-base font-semibold hover:bg-primary-700 transition-colors mb-8"
            >
              Buy
            </button>

            <div className="space-y-6 text-gray-600 leading-7">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Why this device matters</h3>
                <p>
                  The device helps shelters maintain safer conditions by making environmental changes visible sooner. It supports daily operations, pet comfort, and future alerting workflows.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommended use</h3>
                <p>
                  Use it in adoption rooms, cat zones, dog rooms, medical spaces, or home environments where air quality and temperature consistency matter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Installation recommendations</h3>
          <ul className="space-y-3">
            {installationTips.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-gray-600">
                <ShieldCheck className="w-5 h-5 text-primary-600 mt-1" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">What is included</h3>
          <div className="space-y-4 text-gray-600 leading-7">
            <p>The box includes the IoT device, wall-mount accessories, power adapter, and quick-start setup guide.</p>
            <p>The page is intentionally structured so stock availability, checkout, shipping status, and installation services can be added later without redesigning the store.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorePage;
