import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from '@/store/store';
import type { RootState } from '@/store/store';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/layout/ThemeContext';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomePage from '@/pages/home/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DeviceDetailPage from '@/pages/dashboard/DeviceDetailPage';
import HistoryPage from '@/pages/dashboard/HistoryPage';
import AdminPage from '@/pages/admin/AdminPage';
import AnimalsPage from '@/pages/animals/AnimalsPage';
import AnimalDetailsPage from '@/pages/animals/AnimalDetailsPage';
import CreateAnimalPage from '@/pages/animals/CreateAnimalPage';
import EditAnimalPage from '@/pages/animals/EditAnimalPage';
import AdoptionFormPage from '@/pages/animals/AdoptionFormPage';
import ChatPage from '@/pages/chat/ChatPage';
import StorePage from '@/pages/store/StorePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/animals" element={<AnimalsPage />} />
          <Route path="/animals/:animalId" element={<AnimalDetailsPage />} />
          <Route
            path="/animals/create"
            element={
              <ProtectedRoute>
                <CreateAnimalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals/:animalId/edit"
            element={
              <ProtectedRoute>
                <EditAnimalPage />
              </ProtectedRoute>
            }
          />
          <Route path="/adoption" element={<AdoptionFormPage />} />
          <Route path="/store" element={<StorePage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/devices/:deviceId"
            element={
              <ProtectedRoute>
                <DeviceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/chats"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/chat" element={<Navigate to="/dashboard/chats" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
