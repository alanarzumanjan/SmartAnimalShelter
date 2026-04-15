import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { RootState, AppDispatch } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Shield,
  PawPrint,
  Heart,
  ShoppingBag,
  Trash2,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  Calendar,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

// --- Types ---
interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  createdAt: string;
}

interface AdoptionRecord {
  id: string;
  petId: string;
  petName?: string;
  userId: string;
  message?: string;
  status: string;
  createdAt: string;
}

interface OrderRecord {
  id: string;
  userId: string;
  productName: string;
  productType: string;
  quantity: number;
  currency: string;
  amountTotal: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  shippingAddress?: string;
  customerEmail?: string;
}

interface AnimalItem {
  id: string;
  name: string;
  species?: { name: string };
  breed?: { name: string };
  status?: { name: string };
  description?: string;
  imageUrl?: string;
  shelter?: { name: string };
  createdAt: string;
}

type TabKey = 'profile' | 'password' | 'animals' | 'adoptions' | 'orders' | 'danger';

// Helpers
const formatCurrency = (amountCents: number, currency: string): string => {
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
    case 'approved':
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'rejected':
    case 'failed':
    case 'refunded':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300';
    case 'available':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300';
    case 'adopted':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300';
    case 'quarantine':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300';
  }
};

const getRoleBadge = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
    case 'veterinarian':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300';
    case 'shelter':
      return 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300';
  }
};

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });

  // Password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Data state
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab === 'animals' && animals.length === 0 && (user?.role === 'veterinarian' || user?.role === 'shelter')) loadAnimals();
    if (activeTab === 'adoptions' && adoptions.length === 0) loadAdoptions();
    if (activeTab === 'orders' && orders.length === 0) loadOrders();
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile(response.data);
      setEditForm({
        name: response.data.username ?? '',
        email: response.data.email ?? '',
        phone: response.data.phone ?? '',
        address: response.data.address ?? '',
      });
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const loadAnimals = async () => {
    if (!user?.id) return;
    setIsLoadingData(true);
    try {
      const response = await api.get(`/pets?shelterId=${user.id}&page=1&pageSize=50`);
      const items = response.data?.pets ?? [];
      setAnimals(items);
    } catch {
      toast.error('Failed to load animals');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAdoptions = async () => {
    if (!user?.id) return;
    setIsLoadingData(true);
    try {
      const response = await api.get(`/pets/adoption/user/${user.id}`);
      const items = response.data?.data ?? response.data ?? [];
      setAdoptions(Array.isArray(items) ? items : []);
    } catch {
      toast.error('Failed to load adoptions');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadOrders = async () => {
    if (!token) return;
    setIsLoadingData(true);
    try {
      const response = await api.get('/payments/my-orders');
      const items = response.data?.data ?? [];
      setOrders(Array.isArray(items) ? items : []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    try {
      await api.patch(`/users/${profile.id}`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      toast.error(error?.response?.data?.toString() ?? 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!profile) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await api.patch(`/users/${profile.id}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    if (!profile) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${profile.id}`);
      dispatch(logout());
      navigate('/login');
      toast.success('Account deleted successfully');
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { key: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    ...(user?.role === 'veterinarian' || user?.role === 'shelter'
      ? [{ key: 'animals' as TabKey, label: 'My Animals', icon: <PawPrint className="w-4 h-4" /> }]
      : []),
    { key: 'adoptions', label: 'My Adoptions', icon: <Heart className="w-4 h-4" /> },
    { key: 'orders', label: 'My Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (!profile) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1">
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

      {/* Tabs */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Tab navigation */}
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

        {/* Tab content */}
        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          name: profile.username ?? '',
                          email: profile.email ?? '',
                          phone: profile.phone ?? '',
                          address: profile.address ?? '',
                        });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white">
                      {profile.username}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white">
                      {profile.email}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="+371 ..."
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white">
                      {profile.phone || 'Not set'}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Your address"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white">
                      {profile.address || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Role
                </label>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(profile.role)}`}>
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h2>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-12 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-12 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-12 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          )}

          {/* My Animals Tab */}
          {activeTab === 'animals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Animals</h2>
                {(user?.role === 'veterinarian' || user?.role === 'shelter') && (
                  <Link
                    to="/animals/create"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    <PawPrint className="w-4 h-4" />
                    Add Animal
                  </Link>
                )}
              </div>

              {isLoadingData ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading animals...</div>
              ) : animals.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                  <PawPrint className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">No animals yet</p>
                  <p className="text-gray-500 dark:text-slate-400 mt-2">
                    {user?.role === 'veterinarian' || user?.role === 'shelter'
                      ? 'Create your first animal profile to get started.'
                      : 'You don\'t have any animals associated yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {animals.map((animal) => (
                    <Link
                      key={animal.id}
                      to={`/animals/${animal.id}`}
                      className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{animal.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(animal.status?.name ?? animal.status?.name ?? 'available')}`}>
                          {animal.status?.name ?? 'Available'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                        {animal.species?.name} {animal.breed?.name ? `• ${animal.breed.name}` : ''}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-slate-500">
                        Created {formatDate(animal.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Adoptions Tab */}
          {activeTab === 'adoptions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Adoption Requests</h2>

              {isLoadingData ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading adoptions...</div>
              ) : adoptions.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">No adoption requests yet</p>
                  <p className="text-gray-500 dark:text-slate-400 mt-2">
                    Browse available animals and submit an adoption request.
                  </p>
                  <Link
                    to="/animals"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    <PawPrint className="w-4 h-4" />
                    Browse Animals
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {adoptions.map((adoption) => (
                    <div
                      key={adoption.id}
                      className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            <PawPrint className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {adoption.petName || `Pet ${adoption.petId.slice(0, 8)}`}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                              <Calendar className="w-4 h-4" />
                              {formatDate(adoption.createdAt)}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(adoption.status)}`}>
                          {adoption.status}
                        </span>
                      </div>
                      {adoption.message && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-gray-600 dark:text-slate-300 italic">"{adoption.message}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Orders</h2>

              {isLoadingData ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">No orders yet</p>
                  <p className="text-gray-500 dark:text-slate-400 mt-2">
                    Visit our store to purchase IoT monitoring devices.
                  </p>
                  <Link
                    to="/store"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Visit Store
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{order.productName}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(order.createdAt)}
                              </span>
                              {order.quantity > 1 && <span>• Qty: {order.quantity}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(order.amountTotal, order.currency)}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      {order.shippingAddress && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            <span className="font-medium">Shipping:</span> {order.shippingAddress}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h2>

              <div className="rounded-2xl border-2 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Delete Account</h3>
                    <p className="text-gray-600 dark:text-slate-400 mt-1 text-sm leading-relaxed">
                      This action is <strong className="text-red-600 dark:text-red-400">irreversible</strong>. All your data, including your profile, animals, adoption requests, and order history will be permanently deleted.
                    </p>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Type <strong className="text-red-600 dark:text-red-400">DELETE</strong> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className="w-full rounded-xl border-2 border-red-300 dark:border-red-500/50 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="DELETE"
                      />
                    </div>

                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirm !== 'DELETE' || isDeleting}
                      className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Delete My Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
