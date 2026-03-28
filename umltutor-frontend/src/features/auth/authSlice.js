import { createSlice, } from '@reduxjs/toolkit';
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: true,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isGuest = false;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isGuest = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setUser, setToken, setLoading, logout } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsGuest = (state) => state.auth.isGuest;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;

export default authSlice.reducer;
