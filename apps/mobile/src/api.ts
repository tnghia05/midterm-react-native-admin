import type { Product, ProductDraft } from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api';

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

export const api = {
  login: (email: string, password: string) => request<{ token: string }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  products: (token: string) => request<Product[]>('/products', {}, token),
  create: (token: string, value: ProductDraft) => request<Product>('/products', {
    method: 'POST', body: JSON.stringify(value),
  }, token),
  update: (token: string, id: string, value: ProductDraft) => request<Product>(`/products/${id}`, {
    method: 'PATCH', body: JSON.stringify(value),
  }, token),
  remove: (token: string, id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }, token),
};
