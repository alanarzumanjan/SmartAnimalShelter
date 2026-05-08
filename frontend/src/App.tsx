import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { store } from "@/store/store";
import type { RootState } from "@/store/store";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, useTheme } from "@/components/layout/ThemeContext";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import DeviceDetailPage from "@/pages/dashboard/DeviceDetailPage";
import HistoryPage from "@/pages/dashboard/HistoryPage";
import AdminPage from "@/pages/admin/AdminPage";
import AnimalsPage from "@/pages/animals/AnimalsPage";
import AnimalDetailsPage from "@/pages/animals/AnimalDetailsPage";
import CreateAnimalPage from "@/pages/animals/CreateAnimalPage";
import EditAnimalPage from "@/pages/animals/EditAnimalPage";
import AdoptionFormPage from "@/pages/animals/AdoptionFormPage";
import ShelterPage from "@/pages/animals/ShelterPage";
import ShelterManagementPage from "@/pages/shelter/ShelterManagementPage";
import EnclosurePage from "@/pages/shelter/EnclosurePage";
import ChatPage from "@/pages/chat/ChatPage";
import ProfilePage from "@/pages/profile/ProfilePage";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== "admin")
    return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100">
      <Header />
      <main className="relative flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
          <Route path="/shelters/:shelterId" element={<ShelterPage />} />

          <Route
            path="/shelter"
            element={
              <ProtectedRoute>
                <ShelterManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enclosures/:enclosureId"
            element={
              <ProtectedRoute>
                <EnclosurePage />
              </ProtectedRoute>
            }
          />

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
          <Route
            path="/dashboard/chat"
            element={<Navigate to="/dashboard/chats" replace />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "18px",
            padding: "14px 16px",
            border:
              theme === "dark"
                ? "1px solid rgba(148, 163, 184, 0.18)"
                : "1px solid rgba(148, 163, 184, 0.22)",
            background:
              theme === "dark"
                ? "rgba(15, 23, 42, 0.92)"
                : "rgba(255, 255, 255, 0.94)",
            color: theme === "dark" ? "#e2e8f0" : "#0f172a",
            boxShadow:
              theme === "dark"
                ? "0 24px 60px -28px rgba(2, 6, 23, 0.8)"
                : "0 24px 50px -28px rgba(15, 23, 42, 0.3)",
            backdropFilter: "blur(18px)",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}
