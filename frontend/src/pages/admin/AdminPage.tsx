import React from 'react';

const AdminPage: React.FC = () => {
  return (
    <div className="py-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          Admin workspace
        </div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
        <p className="max-w-2xl text-slate-600 dark:text-slate-300">
          Administrative controls and system settings will live here. The page now follows the same surface and contrast rules as the rest of the dark theme, so future admin tools will drop into a ready-made layout.
        </p>
      </section>
    </div>
  );
};

export default AdminPage;
