import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import { LogOut, User, Home, MessageSquare, PawPrint, ShoppingBag } from 'lucide-react';

const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-xl text-gray-900">Smart Shelter</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {/* Store always visible */}
            <Link
              to="/animals"
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <PawPrint className="w-5 h-5" />
              <span className="hidden sm:inline">Animals</span>
            </Link>

            <Link
              to="/store"
              className="text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline">Store</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                <Link
                  to="/dashboard/chats"
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="hidden sm:inline">Chats</span>
                </Link>

                {user?.role === 'Admin' && (
                  <Link
                    to="/admin"
                    className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1 font-medium"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>

                <span className="text-sm text-gray-500 hidden md:inline">
                  {user?.name}
                </span>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
