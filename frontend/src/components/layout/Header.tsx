import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LogOut,
  User,
  Home,
  MessageSquare,
  PawPrint,
  Menu,
  X,
} from "lucide-react";

import type { RootState, AppDispatch } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import { ThemeToggle } from "./ThemeToggle";

const navLink =
  "text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors";
const mobileLink =
  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors";

export default function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    dispatch(logout());
    setMenuOpen(false);
    navigate("/login");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  // Close menu on route change
  React.useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-white text-lg">🐾</span>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              Smart Shelter
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={navLink}>
              <Home className="w-4 h-4 inline mr-1" />
              Home
            </Link>
            <Link to="/animals" className={navLink}>
              <PawPrint className="w-4 h-4 inline mr-1" />
              Animals
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={navLink}>
                  Dashboard
                </Link>
                <Link to="/dashboard/chats" className={navLink}>
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Chats
                </Link>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {user?.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile: theme + burger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          <Link to="/" className={mobileLink} onClick={closeMenu}>
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link to="/animals" className={mobileLink} onClick={closeMenu}>
            <PawPrint className="w-4 h-4" /> Animals
          </Link>

          {isAuthenticated && (
            <>
              <Link to="/dashboard" className={mobileLink} onClick={closeMenu}>
                Dashboard
              </Link>
              <Link
                to="/dashboard/chats"
                className={mobileLink}
                onClick={closeMenu}
              >
                <MessageSquare className="w-4 h-4" /> Chats
              </Link>
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className={`${mobileLink} text-indigo-600 dark:text-indigo-400`}
                  onClick={closeMenu}
                >
                  Admin
                </Link>
              )}
            </>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className={mobileLink} onClick={closeMenu}>
                  <User className="w-4 h-4" /> {user?.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className={`w-full text-left ${mobileLink} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10`}
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={mobileLink} onClick={closeMenu}>
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  onClick={closeMenu}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
