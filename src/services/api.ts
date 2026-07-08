import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabaseClient';
import { toastEmitter } from '../lib/toastEmitter';

const DEV_API_PORT = 8000;

/**
 * Resolve the API base URL.
 *
 * The trap this avoids: on a physical device, `localhost` means the *phone*, not
 * the dev machine — so a hardcoded `http://localhost:8000` can never reach a
 * backend running on your computer. In dev we instead derive the dev machine's
 * LAN IP from the Expo packager host (e.g. `192.168.31.112:8081` → API at
 * `http://192.168.31.112:8000`), which works on web, simulators, and real phones
 * on the same Wi-Fi without any per-device config.
 *
 * Precedence:
 *   1. EXPO_PUBLIC_API_BASE_URL when it points at a real/remote host (prod, staging).
 *   2. In dev native builds: the Expo host's LAN IP + DEV_API_PORT.
 *   3. Fallback: the env var, else localhost (correct for web + iOS simulator).
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  const isLocalish = explicit ? /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(explicit) : true;

  // A real remote URL (not localhost) is always authoritative — that's prod/staging.
  if (explicit && !isLocalish) return explicit;

  // Web and the iOS simulator share the host's network, so localhost is correct.
  if (Platform.OS === 'web') return explicit ?? `http://localhost:${DEV_API_PORT}`;

  // Native dev: pull the dev machine's host from the Expo packager.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Expo Go / older manifests expose it here as `host:port`.
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEV_API_PORT}`;
  }

  return explicit ?? `http://localhost:${DEV_API_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

/**
 * Shared axios instance for all BatchBook API calls.
 *
 * - Base URL resolved by `resolveBaseUrl` (auto-detects LAN IP on real devices).
 * - Request interceptor auto-attaches the Supabase JWT.
 * - Response interceptor shows a global error toast for non-401 failures.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (__DEV__) {
  // Surfaces the resolved URL in the Metro logs so device networking is debuggable.
  console.log(`[api] base URL → ${API_BASE_URL} (platform: ${Platform.OS})`);
}

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

  // Pre-login calls (generate_otp, verify_otp, …) legitimately have no session
  // yet — only attach the header when we actually have a token. Don't reject
  // here: this instance is shared with unauthenticated endpoints too.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isMissingAuthHeaderError(error: any): boolean {
  const detail = error.response?.data?.detail;
  return (
    error.response?.status === 422 &&
    Array.isArray(detail) &&
    detail.some((d) => d.loc?.includes('header') && d.loc?.includes('authorization'))
  );
}

function extractErrorMessage(error: any): string {
  if (isMissingAuthHeaderError(error)) return 'Session expired — please log in again.';
  // FastAPI errors come back as { detail: "..." } for HTTPException, or
  // { detail: [{ loc, msg, type }, ...] } for pydantic validation errors —
  // never `message`, so reading `data.message` here always misses.
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join('.')}: ${d.msg}`).join('; ');
  }
  return error.message || 'Failed to load data. Please try again.';
}

// Show a global error toast for any non-401 failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.log(
        `[api] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response?.status ?? 'NETWORK ERROR'}`,
        error.response?.data ?? error.message,
      );
    }
    if (error.response?.status !== 401) {
      toastEmitter.emit(extractErrorMessage(error), 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
