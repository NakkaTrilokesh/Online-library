import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';
import axios from 'axios';

const API_URL = '/auth';
const LOCAL_AUTH_ENABLED = import.meta.env.VITE_LOCAL_AUTH !== 'false';
const LOCAL_USERS_KEY = 'localUsers';

const getLocalUsers = () => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

const saveLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const createLocalUser = ({ fullName, email, password, phone }) => {
  const id = Date.now().toString();
  return {
    id,
    fullName,
    email,
    password,
    phone,
    role: 'USER',
    token: `local-${id}-${Math.random().toString(36).slice(2)}`,
  };
};

const findLocalUserByToken = (token) => {
  const users = getLocalUsers();
  return users.find((user) => user.token === token || user.token === token);
};

const findLocalUserByEmail = (email) => {
  const users = getLocalUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
};

const ensureDefaultLocalUser = () => {
  const users = getLocalUsers();
  if (users.length === 0) {
    const admin = {
      id: '1',
      fullName: 'Admin User',
      email: 'admin@admin.com',
      password: 'admin123',
      phone: '0000000000',
      role: 'ROLE_ADMIN',
      token: 'local-admin-token',
    };
    const user = {
      id: '2',
      fullName: 'Demo User',
      email: 'user@user.com',
      password: 'user123',
      phone: '1111111111',
      role: 'USER',
      token: 'local-user-token',
    };
    saveLocalUsers([admin, user]);
    return [admin, user];
  }
  return users;
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    if (LOCAL_AUTH_ENABLED) {
      const users = ensureDefaultLocalUser();
      const existingUser = findLocalUserByEmail(email);
      if (!existingUser || existingUser.password !== password) {
        return rejectWithValue('Invalid email or password');
      }
      localStorage.setItem('jwt', existingUser.token);
      localStorage.setItem('token', existingUser.token);
      return { token: existingUser.token, user: { ...existingUser, password: undefined } };
    }

    try {
      const response = await api.post(`${API_URL}/login`, { email, password });
      const { jwt, ...user } = response.data;
      // Store token consistently
      localStorage.setItem('jwt', jwt);
      localStorage.setItem('token', jwt); // Also store as 'token' for consistency
      return { token: jwt, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (userData, { rejectWithValue }) => {
    if (LOCAL_AUTH_ENABLED) {
      const users = ensureDefaultLocalUser();
      const existingUser = findLocalUserByEmail(userData.email);
      if (existingUser) {
        return rejectWithValue('Email is already registered');
      }
      const newUser = createLocalUser(userData);
      users.push(newUser);
      saveLocalUsers(users);
      localStorage.setItem('jwt', newUser.token);
      localStorage.setItem('token', newUser.token);
      return { token: newUser.token, user: { ...newUser, password: undefined } };
    }

    try {
      const response = await api.post(`${API_URL}/signup`, userData);
      const { jwt, ...user } = response.data;
      // Store token consistently
      localStorage.setItem('jwt', jwt);
      localStorage.setItem('token', jwt); // Also store as 'token' for consistency
      return { token: jwt, user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Signup failed');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('jwt');
    if (LOCAL_AUTH_ENABLED && token) {
      const user = findLocalUserByToken(token);
      if (user) {
        return { ...user, password: undefined };
      }
    }

    try {
      const token = localStorage.getItem('jwt');
      const response = await api.get(`/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("fetch current user -- ", response.data);
      return response.data;
    } catch (error) {
      console.log("fetch current user error -- ", error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/forgot-password`, { email });
      console.log("forgot password", response)
      return response.data;
    } catch (error) {
      console.log("error ", error)
      return rejectWithValue(error.response?.data?.message || 'Failed to send reset link');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/reset-password`, { token, password });
      console.log("reset password", response)
      return response.data;
    } catch (error) {
      console.log("error ", error)
      return rejectWithValue(error.response?.data?.message || 'Failed to reset password');
    }
  }
);

/**
 * Get all users list (Admin only)
 * GET /users/list
 */
export const getUsersList = createAsyncThunk(
  'auth/getUsersList',
  async (_, { rejectWithValue }) => {
    try {

      const response = await axios.get('http://localhost:5000/users/list');
      console.log("users list", response.data)
      return response.data;
    } catch (error) {
      console.log("error ", error)
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users list');
    }
  }
);
