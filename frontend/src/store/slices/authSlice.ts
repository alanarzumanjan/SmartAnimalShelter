import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Initialize state from localStorage (but DON'T expose token to JS - only user info)
// Access token is still stored for API calls, but it's now short-lived (15 min)
const storedUser = (() => {
  const raw = sessionStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
})();

// Note: We keep token in localStorage for API interceptor but it's now short-lived
// The real security improvement is the refresh token mechanism via httpOnly cookie
const storedToken = localStorage.getItem("access_token");

const initialState: AuthState = {
  user: storedUser,
  accessToken: storedToken,
  isAuthenticated: !!storedToken,
  isLoading: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action: PayloadAction<LoginResponse>) => {
      const { accessToken, id, name, email, role } = action.payload;
      const user: User = { id, name, email, role };

      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      // Store short-lived token in localStorage for API calls
      localStorage.setItem("access_token", accessToken);
      // Store user info in sessionStorage (cleared on browser close)
      sessionStorage.setItem("user", JSON.stringify(user));
    },
    loginFailure: (state) => {
      state.isLoading = false;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem("access_token", action.payload);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("user");
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, setAccessToken, logout } =
  authSlice.actions;
export default authSlice.reducer;
