import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const storedUser = (() => {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
})();

const initialState: AuthState = {
  user: storedUser,
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
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
      const { token, id, name, email, role } = action.payload;
      const user: User = { id, name, email, role };

      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.isLoading = false;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    loginFailure: (state) => {
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } =
  authSlice.actions;
export default authSlice.reducer;
