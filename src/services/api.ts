import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { toastEmitter } from '../lib/toastEmitter';

/**
 * Shared axios instance for all BatchBook API calls.
 *
 * - Base URL reads from EXPO_PUBLIC_API_BASE_URL (defaults to localhost:8000 for dev).
 * - Request interceptor auto-attaches the Supabase JWT.
 * - Response interceptor shows a global error toast for non-401 failures.
 */
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache the access token in memory so the request interceptor doesn't have to
// hit AsyncStorage / acquire the Supabase auth lock on every call. Without this,
// bursts of parallel requests (e.g. the dashboard's Promise.all) serialize on
// that lock. Supabase fires onAuthStateChange on INITIAL_SESSION, SIGNED_IN,
// TOKEN_REFRESHED and SIGNED_OUT, so the cache stays fresh across refreshes.
let cachedToken: string | null = null;
let cachedExpiresAt = 0; // unix seconds

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
  cachedExpiresAt = session?.expires_at ?? 0;
});

// Attach Supabase JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const now = Math.floor(Date.now() / 1000);

  // Fast path: use the in-memory token. Fall back to getSession() — which
  // auto-refreshes — only when we have no token or it's within 60s of expiry.
  let token = cachedToken;
  if (!token || now >= cachedExpiresAt - 60) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
    cachedToken = token;
    cachedExpiresAt = session?.expires_at ?? 0;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Show a global error toast for any non-401 failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || error.message || 'Failed to load data. Please try again.';
      toastEmitter.emit(message, 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
