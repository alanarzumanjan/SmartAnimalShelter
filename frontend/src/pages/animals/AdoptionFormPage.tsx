import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';

const AdoptionFormPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    animal: '',
    comment: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/adoptions', form);
      setSubmitted(true);
    } catch {
      alert('Failed to submit the application. Please try again later.');
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-8 text-center shadow-[0_20px_70px_-32px_rgba(16,185,129,0.28)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:shadow-[0_28px_80px_-40px_rgba(5,46,22,0.75)]">
          <h1 className="mb-4 text-2xl font-bold text-emerald-900 dark:text-emerald-200">Application submitted</h1>
          <p className="text-emerald-800 dark:text-emerald-100">A shelter team member will contact you to confirm the next steps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.84)]">
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">Adoption Request</h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">Your name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">Phone number</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">Animal name (optional)</label>
            <input
              type="text"
              name="animal"
              value={form.animal}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-700 dark:text-slate-300">Comment</label>
            <textarea
              name="comment"
              value={form.comment}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">Submit request</Button>
        </form>
      </div>
    </div>
  );
};

export default AdoptionFormPage;
