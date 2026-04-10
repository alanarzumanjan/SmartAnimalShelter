import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Button } from '@/components/ui/Button';
import { Heart, Wifi, BarChart3, ArrowRight, MessageSquare } from 'lucide-react';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-2">
          <span role="img" aria-label="paw">🐾</span> Smart Shelter IoT
        </h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-8">
          A modern platform for shelters with pet records, environmental IoT monitoring, communication tools, and an equipment store in one place.
        </p>
        <div className="flex gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="primary" className="flex items-center gap-2">
                Open dashboard <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="primary">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Create Account</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto mb-20">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
          <Heart className="w-10 h-10 text-pink-500 mb-2" />
          <h3 className="font-bold text-lg mb-1">Animal Records</h3>
          <p className="text-gray-500 text-sm">Pet profiles, health history, status tracking, and room for future data imports from rescue and shelter workflows.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
          <Wifi className="w-10 h-10 text-blue-500 mb-2" />
          <h3 className="font-bold text-lg mb-1">IoT Monitoring</h3>
          <p className="text-gray-500 text-sm">CO2, temperature, and humidity tracking with alerting logic that can later connect directly to medical and enclosure history.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
          <MessageSquare className="w-10 h-10 text-green-500 mb-2" />
          <h3 className="font-bold text-lg mb-1">Chat and Support</h3>
          <p className="text-gray-500 text-sm">A shared space for adopters and shelter teams, ready for contextual messaging around requests, visits, and future orders.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
          <BarChart3 className="w-10 h-10 text-yellow-500 mb-2" />
          <h3 className="font-bold text-lg mb-1">Equipment Store</h3>
          <p className="text-gray-500 text-sm">A preview of shelter-ready devices and accessories with space for future pricing, stock, ordering, and delivery statuses.</p>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-gradient-to-r from-primary-100 to-primary-200 rounded-2xl p-10 text-center max-w-3xl mx-auto shadow">
        <h2 className="text-2xl font-bold mb-2">Build a smarter shelter workflow</h2>
        <p className="text-gray-700 mb-4">Track care, explore animals, and prepare for connected operations from one platform.</p>
        {isAuthenticated ? (
          <Link to="/dashboard">
            <Button variant="primary" className="text-lg px-8 py-3">Go to dashboard</Button>
          </Link>
        ) : (
          <Link to="/register">
            <Button variant="primary" className="text-lg px-8 py-3">Start for free</Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default HomePage;
