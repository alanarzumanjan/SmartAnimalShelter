import api from '@/services/api';

export interface StoreProduct {
  name: string;
  description: string;
  currency: string;
  unitAmount: number;
  stripeEnabled: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
  status?: string | null;
  paymentStatus?: string | null;
}

export interface CheckoutSessionStatus {
  id: string;
  status?: string | null;
  paymentStatus?: string | null;
  currency: string;
  amountTotal: number;
  amountSubtotal: number;
  isPaid: boolean;
  quantity: number;
  productName: string;
  customerEmail?: string | null;
  customerName?: string | null;
}

interface CreateCheckoutSessionInput {
  quantity: number;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
}

const unwrapData = <T>(payload: any): T => payload?.data ?? payload;

export async function getStoreProduct(): Promise<StoreProduct> {
  const response = await api.get('/payments/store-product');
  return unwrapData<StoreProduct>(response.data);
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  const response = await api.post('/payments/checkout-session', input);
  return unwrapData<CheckoutSession>(response.data);
}

export async function getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus> {
  const response = await api.get(`/payments/checkout-session/${encodeURIComponent(sessionId)}`);
  return unwrapData<CheckoutSessionStatus>(response.data);
}
