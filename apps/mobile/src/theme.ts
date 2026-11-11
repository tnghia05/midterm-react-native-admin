// Design tokens dùng chung với đồ án chính "mây." (frontend/src/store/style.css)
export const colors = {
  purple: '#6846AC',
  purpleDark: '#54388E',
  purpleSoft: '#9672D2',
  ink: '#292637',
  muted: '#716D7B',
  line: '#EAE7EF',
  lineStrong: '#D1C5E2',
  lilac: '#F1EDF8',
  lilacDeep: '#ECE5F5',
  hero: '#EFEAF8',
  surface: '#FFFFFF',
  canvas: '#FAF9FC',
  banner: '#F2EFF6',
  bannerText: '#645A78',
  success: '#487356',
  successSoft: '#EAF3EC',
  warning: '#8B7145',
  warningSoft: '#F5F1E9',
  danger: '#993C3C',
  dangerSoft: '#FFF0F0',
  dangerSolid: '#B4483F',
  scrim: 'rgba(41,38,55,0.45)',
} as const;

export const font = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extrabold: 'BeVietnamPro_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 5, md: 8, lg: 12, xl: 16, pill: 999 } as const;
export const icon = { sm: 16, md: 20, lg: 24 } as const;

export const LOW_STOCK = 5;

export const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const number = new Intl.NumberFormat('vi-VN');

export type StockLevel = 'out' | 'low' | 'ok';
export function stockLevel(soluong: number): StockLevel {
  if (soluong <= 0) return 'out';
  if (soluong <= LOW_STOCK) return 'low';
  return 'ok';
}
export const stockMeta: Record<StockLevel, { label: string; fg: string; bg: string }> = {
  ok: { label: 'Còn hàng', fg: colors.success, bg: colors.successSoft },
  low: { label: 'Sắp hết', fg: colors.warning, bg: colors.warningSoft },
  out: { label: 'Hết hàng', fg: colors.danger, bg: colors.dangerSoft },
};
