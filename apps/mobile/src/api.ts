import { NativeModules, Platform } from 'react-native';
import type { Product, ProductDraft } from './types';

function resolveDefaultApiUrl(): string {
  // 1. On Web, match the current browser hostname (works for both localhost and LAN IP on mobile browser)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3001/api`;
  }
  // 2. On Native Mobile (Expo Go / Dev Client), extract the Metro host IP automatically
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^/:]+):\d+/i) ?? scriptURL.match(/^exp:\/\/([^/:]+):\d+/i);
    if (match?.[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return `http://${match[1]}:3001/api`;
    }
  }
  // 3. Fallback to env or detected LAN IP
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && Platform.OS === 'web') return envUrl;
  if (envUrl && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) return envUrl;
  return 'http://192.168.1.13:3001/api';
}

export const API_URL = resolveDefaultApiUrl();

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
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
