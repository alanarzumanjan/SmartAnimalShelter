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
      <div className="max-w-lg mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Application submitted</h1>
        <p className="text-gray-600">A shelter team member will contact you to confirm the next steps.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Adoption Request</h1>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-gray-700 mb-1">Your name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Phone number</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Animal name (optional)</label>
          <input
            type="text"
            name="animal"
            value={form.animal}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Comment</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>
        <Button type="submit" variant="primary" className="w-full">Submit request</Button>
      </form>
    </div>
  );
};

export default AdoptionFormPage;
