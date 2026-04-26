import api from "@/services/api";

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

interface CreateCheckoutInput {
  quantity: number;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
}

export async function getStoreProduct(): Promise<StoreProduct> {
  const { data } = await api.get("/payments/store-product");
  return data?.data ?? data;
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutSession> {
  const { data } = await api.post("/payments/checkout-session", input);
  return data?.data ?? data;
}

export async function getCheckoutSessionStatus(
  sessionId: string,
): Promise<CheckoutSessionStatus> {
  const { data } = await api.get(
    `/payments/checkout-session/${encodeURIComponent(sessionId)}`,
  );
  return data?.data ?? data;
}
