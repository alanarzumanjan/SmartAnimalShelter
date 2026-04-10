import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Gauge, MapPin, Thermometer, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  type DeviceRecord,
  type MeasurementRecord,
  getDevice,
  getDeviceMeasurements,
} from '@/services/device.service';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'No data yet';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'No data yet' : parsed.toLocaleString();
};

const DeviceDetailPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!deviceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [nextDevice, nextMeasurements] = await Promise.all([
          getDevice(deviceId),
          getDeviceMeasurements(deviceId, 50),
        ]);

        setDevice(nextDevice);
        setMeasurements(nextMeasurements);
      } catch {
        toast.error('Failed to load the device details.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [deviceId]);

  const latest = useMemo(() => measurements[0] ?? null, [measurements]);

  if (isLoading) {
    return <div className="py-16 text-center text-gray-400">Loading device details...</div>;
  }

  if (!device) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Device not found</h1>
        <Link to="/dashboard" className="text-primary-600 font-medium hover:text-primary-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
              <Gauge className="w-4 h-4" />
              Device overview
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{device.name}</h1>
            <div className="text-sm font-mono text-gray-500 mb-3">{device.deviceId}</div>
            <div className="inline-flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4" />
              {device.location}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Latest CO2</div>
              <div className="text-2xl font-bold text-gray-900">{latest ? `${latest.co2.toFixed(0)} ppm` : '—'}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Latest temp</div>
              <div className="text-2xl font-bold text-gray-900">{latest ? `${latest.temperature.toFixed(1)} °C` : '—'}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Latest humidity</div>
              <div className="text-2xl font-bold text-gray-900">{latest ? `${latest.humidity.toFixed(0)} %` : '—'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-3">
            <Gauge className="w-4 h-4" />
            Latest transmission
          </div>
          <div className="text-lg font-semibold text-gray-900">{formatDateTime(latest?.timestamp ?? device.lastSeenAt)}</div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-3">
            <Thermometer className="w-4 h-4" />
            Measurements loaded
          </div>
          <div className="text-lg font-semibold text-gray-900">{measurements.length}</div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-3">
            <Waves className="w-4 h-4" />
            Registered
          </div>
          <div className="text-lg font-semibold text-gray-900">{formatDateTime(device.registeredAt)}</div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest measurements</h2>

        {measurements.length === 0 ? (
          <div className="text-gray-500">No measurements have been received for this device yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 pr-4">CO2</th>
                  <th className="py-3 pr-4">Temperature</th>
                  <th className="py-3 pr-4">Humidity</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((measurement) => (
                  <tr key={measurement.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4 text-gray-500">{formatDateTime(measurement.timestamp)}</td>
                    <td className="py-4 pr-4">{measurement.co2.toFixed(0)} ppm</td>
                    <td className="py-4 pr-4">{measurement.temperature.toFixed(1)} °C</td>
                    <td className="py-4 pr-4">{measurement.humidity.toFixed(0)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DeviceDetailPage;
