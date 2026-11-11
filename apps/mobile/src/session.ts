import { Platform } from 'react-native';

const KEY = 'may-midterm-token';

// Web: giữ phiên qua localStorage. Native: phiên chỉ sống trong bộ nhớ (không thêm thư viện lưu trữ).
export const session = {
  load(): string {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return '';
    return localStorage.getItem(KEY) ?? '';
  },
  save(token: string) {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  },
};
