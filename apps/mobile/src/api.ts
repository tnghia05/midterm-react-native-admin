import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { Product, ProductDraft } from './types';

function extractHostIp(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/^[a-zA-Z0-9+.-]+:\/\/([^/:]+)(?::\d+)?/i);
  const host = match?.[1];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return null;
}

function getCandidateApiUrls(): string[] {
  const urls: string[] = [];
  const add = (url?: string | null) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  // 1. On Web, match the current browser hostname (works for both localhost and LAN IP)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    add(`http://${window.location.hostname}:3001/api`);
  }

  // 2. On Native Mobile (Expo Go SDK 58 Bridgeless + legacy), read scriptURL from SourceCode TurboModule
  try {
    const turboSourceCode = TurboModuleRegistry.get<{ getConstants?: () => { scriptURL?: string } }>('SourceCode');
    const scriptURL = turboSourceCode?.getConstants?.()?.scriptURL ?? NativeModules?.SourceCode?.scriptURL;
    const host = extractHostIp(scriptURL);
    if (host) add(`http://${host}:3001/api`);
  } catch {
    // Ignore if TurboModule is unavailable
  }

  // 3. Configured EXPO_PUBLIC_API_URL (skip 127.0.0.1/localhost on physical phone)
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    if (Platform.OS === 'web' || (!envUrl.includes('127.0.0.1') && !envUrl.includes('localhost'))) {
      add(envUrl);
    }
  }

  // 4. Current LAN IP fallback
  add('http://192.168.1.13:3001/api');
  if (Platform.OS === 'web') {
    add('http://localhost:3001/api');
  }

  return urls;
}

const CANDIDATE_URLS = getCandidateApiUrls();
export let API_URL = CANDIDATE_URLS[0] ?? 'http://192.168.1.13:3001/api';

async function fetchWithFallback(path: string, init: RequestInit): Promise<Response> {
  const ordered = [API_URL, ...CANDIDATE_URLS.filter((u) => u !== API_URL)];
  let lastError: unknown;

  for (const baseUrl of ordered) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      API_URL = baseUrl;
      return response;
    } catch (cause) {
      lastError = cause;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không kết nối được máy chủ');
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithFallback(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ (${API_URL}). Hãy kiểm tra điện thoại và máy tính đang cùng mạng Wi‑Fi.`);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? 'Không kết nối được máy chủ');
  return data as T;
}

export type HealthInfo = {
  status: string;
  database: string;
  r2: boolean;
  lanIps?: string[];
};

export const api = {
  health: () => request<HealthInfo>('/health'),
  login: (email: string, password: string) => request<{ token: string }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  products: (token: string) => request<Product[]>('/products', {}, token),
  create: (token: string, value: ProductDraft) => request<Product>('/products', {
    method: 'POST', body: JSON.stringify(value),
  }, token),
  bulkCreate: (token: string, items: ProductDraft[]) => request<Product[]>('/products/bulk', {
    method: 'POST', body: JSON.stringify(items),
  }, token),
  update: (token: string, id: string, value: ProductDraft) => request<Product>(`/products/${id}`, {
    method: 'PATCH', body: JSON.stringify(value),
  }, token),
  remove: (token: string, id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }, token),
};
