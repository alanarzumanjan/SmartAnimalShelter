import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface Props {
  onSubmit: (currentPassword: string, newPassword: string) => void;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-12 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2";
const toggleClass =
  "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors";

export default function PasswordTab({ onSubmit }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const toggle = (field: keyof typeof show) =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const canSubmit = current && next && confirm;

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Change Password
      </h2>

      <div>
        <label className={labelClass}>Current Password</label>
        <div className="relative">
          <input
            type={show.current ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Enter your current password"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => toggle("current")}
            className={toggleClass}
          >
            {show.current ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>New Password</label>
        <div className="relative">
          <input
            type={show.next ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => toggle("next")}
            className={toggleClass}
          >
            {show.next ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Confirm New Password</label>
        <div className="relative">
          <input
            type={show.confirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the new password"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => toggle("confirm")}
            className={toggleClass}
          >
            {show.confirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <button
        onClick={() => onSubmit(current, next)}
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Lock className="w-4 h-4" />
        Change Password
      </button>
    </div>
  );
}
