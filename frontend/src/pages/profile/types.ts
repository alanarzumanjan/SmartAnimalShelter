export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  createdAt: string;
}

export interface AdoptionRecord {
  id: string;
  petId: string;
  petName?: string;
  userId: string;
  message?: string;
  status: string;
  createdAt: string;
}

export interface OrderRecord {
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

export interface AnimalItem {
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

export type TabKey = 'profile' | 'password' | 'animals' | 'adoptions' | 'orders' | 'danger';

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':    return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
    case 'approved':
    case 'paid':       return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'rejected':
    case 'failed':
    case 'refunded':   return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300';
    case 'available':  return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300';
    case 'adopted':    return 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300';
    case 'quarantine': return 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300';
    default:           return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getRoleBadge(role: string) {
  switch (role.toLowerCase()) {
    case 'admin':        return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
    case 'veterinarian': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300';
    case 'shelter':      return 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300';
    default:             return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300';
  }
}
