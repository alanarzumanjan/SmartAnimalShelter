import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/Button";
import {
  Heart,
  Wifi,
  BarChart3,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="py-12 space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 px-8 py-12 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-primary-500/15 via-cyan-400/10 to-emerald-400/15 dark:from-indigo-500/15 dark:via-cyan-500/10 dark:to-emerald-500/10" />
        <div className="relative text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50/90 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400/20 dark:bg-primary-500/10 dark:text-primary-200">
            <span role="img" aria-label="paw">
              🐾
            </span>
            Unified shelter workspace
          </div>
          <h1 className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-6xl">
            Smart Shelter IoT
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300 md:text-xl">
            A modern platform for shelters with pet records, environmental IoT
            monitoring, communication tools, and an equipment store in one
            place.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button
                  variant="primary"
                  className="flex items-center gap-2 px-6 py-3"
                >
                  Open dashboard <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="primary" className="px-6 py-3">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" className="px-6 py-3">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.82)]">
          <Heart className="mb-4 h-10 w-10 text-pink-500" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            Animal Records
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Pet profiles, health history, status tracking, and room for future
            data imports from rescue and shelter workflows.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.82)]">
          <Wifi className="mb-4 h-10 w-10 text-blue-500" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            IoT Monitoring
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            CO2, temperature, and humidity tracking with alerting logic that can
            later connect directly to medical and enclosure history.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.82)]">
          <MessageSquare className="mb-4 h-10 w-10 text-emerald-500" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            Chat and Support
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            A shared space for adopters and shelter teams, ready for contextual
            messaging around requests, visits, and future orders.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.82)]">
          <BarChart3 className="mb-4 h-10 w-10 text-amber-500" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            Equipment Store
          </h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            A preview of shelter-ready devices and accessories with space for
            future pricing, stock, ordering, and delivery statuses.
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-primary-200/70 bg-gradient-to-r from-primary-100 via-white to-cyan-50 p-10 text-center shadow-[0_20px_70px_-30px_rgba(37,99,235,0.3)] dark:border-primary-400/15 dark:from-slate-900 dark:via-slate-900/95 dark:to-cyan-950/40 dark:shadow-[0_30px_90px_-40px_rgba(37,99,235,0.5)]">
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          Build a smarter shelter workflow
        </h2>
        <p className="mb-5 text-slate-600 dark:text-slate-300">
          Track care, explore animals, and prepare for connected operations from
          one platform.
        </p>
        {isAuthenticated ? (
          <Link to="/dashboard">
            <Button variant="primary" className="text-lg px-8 py-3">
              Go to dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/register">
            <Button variant="primary" className="text-lg px-8 py-3">
              Start for free
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
