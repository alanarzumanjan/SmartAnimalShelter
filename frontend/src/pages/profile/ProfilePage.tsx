import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, Lock, PawPrint, Heart, ShoppingBag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import { RootState, AppDispatch } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import api from '@/services/api';

import type { UserProfile, AdoptionRecord, OrderRecord, AnimalItem, TabKey } from './types';
import { formatDate, getRoleBadge } from './types';
import ProfileTab from './ProfileTab';
import PasswordTab from './PasswordTab';
import AnimalsTab from './AnimalsTab';
import AdoptionsTab from './AdoptionsTab';
import OrdersTab from './OrdersTab';
import DangerTab from './DangerTab';

type EditForm = { name: string; email: string; phone: string; address: string };

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', address: '' });

  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isShelter = user?.role === 'veterinarian' || user?.role === 'shelter';

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'animals' && animals.length === 0 && isShelter) loadAnimals();
    if (activeTab === 'adoptions' && adoptions.length === 0) loadAdoptions();
    if (activeTab === 'orders' && orders.length === 0) loadOrders();
  }, [activeTab]);

  async function loadProfile() {
    try {
      const { data } = await api.get('/users/me');
      setProfile(data);
      setEditForm({
        name: data.username ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
      });
    } catch {
      toast.error('Failed to load profile');
    }
  }

  async function loadAnimals() {
    if (!user?.id) return;
    setIsLoadingData(true);
    try {
      const { data } = await api.get(`/pets?shelterId=${user.id}&page=1&pageSize=50`);
      setAnimals(data?.pets ?? []);
    } catch {
      toast.error('Failed to load animals');
    } finally {
      setIsLoadingData(false);
    }
  }

  async function loadAdoptions() {
    if (!user?.id) return;
    setIsLoadingData(true);
    try {
      const { data } = await api.get(`/pets/adoption/user/${user.id}`);
      const items = data?.data ?? data ?? [];
      setAdoptions(Array.isArray(items) ? items : []);
    } catch {
      toast.error('Failed to load adoptions');
    } finally {
      setIsLoadingData(false);
    }
  }

  async function loadOrders() {
    if (!token) return;
    setIsLoadingData(true);
    try {
      const { data } = await api.get('/payments/my-orders');
      const items = data?.data ?? [];
      setOrders(Array.isArray(items) ? items : []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingData(false);
    }
  }

  async function handleUpdateProfile() {
    if (!profile) return;
    try {
      await api.patch(`/users/${profile.id}`, editForm);
      toast.success('Profile updated');
      setIsEditing(false);
      loadProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.toString() ?? 'Failed to update profile');
    }
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    if (!profile) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await api.patch(`/users/${profile.id}/password`, { currentPassword, newPassword });
      toast.success('Password changed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to change password');
    }
  }

  async function handleDeleteAccount(confirm: string) {
    if (confirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    if (!profile) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${profile.id}`);
      dispatch(logout());
      navigate('/login');
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',   label: 'Profile',      icon: <User className="w-4 h-4" /> },
    { key: 'password',  label: 'Password',      icon: <Lock className="w-4 h-4" /> },
    ...(isShelter ? [{ key: 'animals' as TabKey, label: 'My Animals', icon: <PawPrint className="w-4 h-4" /> }] : []),
    { key: 'adoptions', label: 'My Adoptions',  icon: <Heart className="w-4 h-4" /> },
    { key: 'orders',    label: 'My Orders',     icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'danger',    label: 'Danger Zone',   icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (!profile) {
    return <div className="py-12 text-center text-gray-500 dark:text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="py-8 space-y-8">
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(profile.role)}`}>
                {profile.role}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Member since {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              isEditing={isEditing}
              editForm={editForm}
              onEditToggle={() => setIsEditing(true)}
              onCancel={() => {
                setIsEditing(false);
                setEditForm({
                  name: profile.username,
                  email: profile.email,
                  phone: profile.phone ?? '',
                  address: profile.address ?? '',
                });
              }}
              onSave={handleUpdateProfile}
              onFormChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
            />
          )}
          {activeTab === 'password'  && <PasswordTab onSubmit={handleChangePassword} />}
          {activeTab === 'animals'   && <AnimalsTab animals={animals} isLoading={isLoadingData} canCreate={isShelter} />}
          {activeTab === 'adoptions' && <AdoptionsTab adoptions={adoptions} isLoading={isLoadingData} />}
          {activeTab === 'orders'    && <OrdersTab orders={orders} isLoading={isLoadingData} />}
          {activeTab === 'danger'    && <DangerTab isDeleting={isDeleting} onDelete={handleDeleteAccount} />}
        </div>
      </section>
    </div>
  );
}
