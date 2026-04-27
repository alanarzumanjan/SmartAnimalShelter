import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, UserPlus, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";

import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Role = "user" | "shelter";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!name) next.name = "Name is required";
    if (!email) next.email = "Email is required";
    if (!password) next.password = "Password is required";
    if (!confirm) next.confirm = "Please confirm your password";
    if (password && confirm && password !== confirm)
      next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data } = await api.post("/register", {
        name,
        email,
        password,
        role,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 400) {
        const be = err.response.data?.errors;
        if (be) {
          setErrors({
            ...(be.email && { email: be.email }),
            ...(be.password && { password: be.password }),
            ...(be.username && { name: be.username }),
          });
          toast.error("Please fix the errors below");
        } else {
          const message = err.response.data?.message ?? err.response.data;
          toast.error(
            typeof message === "string"
              ? message
              : "Registration failed, please try again",
          );
        }
      } else {
        toast.error("Registration failed, please try again");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.84)]">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐾</div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Create Account
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join Smart Shelter IoT
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={<User className="w-5 h-5" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            icon={<Mail className="w-5 h-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Account Type
            </label>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="user">🐾 User — browse and adopt pets</option>
                <option value="shelter">
                  🏠 Shelter — publish profiles and manage animals
                </option>
              </select>
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            <UserPlus className="w-5 h-5" />
            Sign Up
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
