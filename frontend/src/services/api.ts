import axios, { type AxiosError } from "axios";
import { config } from "../config";
import { store } from "../store/store";
import { logout, setAccessToken } from "../store/slices/authSlice";
import { navigateTo } from "./navigator";

const api = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// --- Normalized error type ---
export interface ApiError {
  message: string;
  status: number | null;
  errors?: Record<string, string>;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: string; errors?: Record<string, string>; title?: string }>;
    const data = axiosErr.response?.data;
    return {
      message: data?.error ?? data?.title ?? axiosErr.message ?? "Request failed",
      status: axiosErr.response?.status ?? null,
      errors: data?.errors,
    };
  }
  if (err instanceof Error) return { message: err.message, status: null };
  return { message: "Unknown error", status: null };
}

// --- Retry logic ---
const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 2;

function shouldRetry(error: AxiosError, retryCount: number): boolean {
  if (retryCount >= MAX_RETRIES) return false;
  if (!error.response) return true; // network error
  return RETRY_STATUSES.has(error.response.status);
}

function retryDelay(retryCount: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 * 2 ** retryCount));
}

// Fetch and cache CSRF token from server
let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return;
  const res = await axios.get(`${config.api.baseUrl}/csrf-token`, {
    withCredentials: true,
  });
  csrfToken = res.headers["x-csrf-token"] ?? null;
}

export async function initCsrf(): Promise<void> {
  await ensureCsrfToken();
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(undefined);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers["X-CSRF-TOKEN"] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const retryCount: number = originalRequest._retryCount ?? 0;

    // Retry on network errors and 502/503/504 (skip if it's a 401 — handled below)
    if (axios.isAxiosError(error) && shouldRetry(error, retryCount) && error.response?.status !== 401) {
      originalRequest._retryCount = retryCount + 1;
      await retryDelay(retryCount);
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${config.api.baseUrl}/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = response.data;
        localStorage.setItem("access_token", accessToken);
        store.dispatch(setAccessToken(accessToken));

        processQueue(null);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        csrfToken = null; // reset so next session fetches a fresh token

        localStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        store.dispatch(logout());

        navigateTo("/login");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export default api;
