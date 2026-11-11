import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Product } from '../types';
import { colors, font, money, number, radius, space, stockLevel, stockMeta } from '../theme';
import { Button } from '../ui';
import { Sheet } from './Sheet';

type Props = {
  product?: Product;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onDelete: (p: Product) => void;
  onAdjustStock: (p: Product, delta: number) => void;
};

export function ProductDetailModal({ product, onClose, onEdit, onDuplicate, onDelete, onAdjustStock }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  if (!product) return null;
  const meta = stockMeta[stockLevel(product.soluong)];
  const isR2 = /r2\.dev|cloudflarestorage/i.test(product.image);
  const rows: [string, string, string][] = [
    ['Tên sản phẩm', 'name', product.name],
    ['Giá sản phẩm', 'price', money.format(product.price)],
    ['Số lượng tồn', 'soluong', `${number.format(product.soluong)} sản phẩm`],
    ['Tổng giá trị tồn', 'price × soluong', money.format(product.price * product.soluong)],
  ];
  return (
    <Sheet
      visible={!!product}
      onClose={onClose}
      title="Thông tin chi tiết sản phẩm"
      subtitle="Ý 3: Hiển thị đầy đủ hình ảnh và 4 trường thông tin sản phẩm trên di động & web"
      maxWidth={860}
      footer={<>
        <Button label="Xóa" variant="secondary" iconName="trash-2" onPress={() => onDelete(product)} compact />
        <Button label="Nhân bản" variant="secondary" iconName="copy" onPress={() => onDuplicate(product)} compact />
        <Button label="Sửa sản phẩm" iconName="edit-2" onPress={() => onEdit(product)} compact />
      </>}
    >
      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide]}>
        <View style={[styles.art, wide && styles.artWide]}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" accessibilityLabel={`Ảnh ${product.name}`} />
          <View style={styles.cloudBadge}>
            <Feather name="cloud" size={12} color={colors.purple} />
            <Text style={styles.cloudBadgeText}>{isR2 ? 'Cloudflare R2' : 'Ảnh trực tuyến'}</Text>
          </View>
        </View>
        <View style={styles.copy}>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text></View>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{money.format(product.price)}</Text>

          <View style={styles.quickStockBox}>
            <Text style={styles.quickStockTitle}>Điều chỉnh nhanh tồn kho (soluong)</Text>
            <View style={styles.quickStockRow}>
              {[-5, -1, 1, 5, 10].map((delta) => {
                const disabled = product.soluong + delta < 0;
                return (
                  <Pressable
                    key={delta}
                    disabled={disabled}
                    onPress={() => onAdjustStock(product, delta)}
                    style={({ pressed }) => [styles.deltaBtn, disabled && styles.deltaDisabled, pressed && styles.deltaPressed]}
                  >
                    <Text style={styles.deltaText}>{delta > 0 ? `+${delta}` : String(delta)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.table}>
            {rows.map(([label, field, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.dt}>{label} <Text style={styles.field}>{field}</Text></Text>
                <Text style={styles.dd} numberOfLines={3}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note} numberOfLines={2}>Nguồn ảnh (image): {product.image.startsWith('data:') ? 'Dữ liệu ảnh thiết bị (base64)' : product.image}</Text>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl },
  bodyWide: { flexDirection: 'row', gap: 30 },
  art: { aspectRatio: 1.15, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#F8ECEF' },
  artWide: { width: 350, aspectRatio: 0.92 },
  image: { width: '100%', height: '100%' },
  cloudBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  cloudBadgeText: { fontFamily: font.semibold, fontSize: 11, color: colors.purple },
  copy: { flex: 1, gap: space.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  name: { fontFamily: font.bold, fontSize: 23, lineHeight: 33, letterSpacing: -0.5, color: colors.ink, marginTop: 2 },
  price: { fontFamily: font.semibold, fontSize: 23, color: colors.purple },
  quickStockBox: { backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 8, marginTop: 4 },
  quickStockTitle: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  quickStockRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  deltaBtn: { minWidth: 48, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  deltaPressed: { backgroundColor: colors.lilac },
  deltaDisabled: { opacity: 0.35 },
  deltaText: { fontFamily: font.semibold, fontSize: 13, color: colors.purple },
  table: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: space.xs },
  row: { flexDirection: 'row', gap: space.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  dt: { width: '44%', fontFamily: font.regular, fontSize: 12, color: colors.muted },
  field: { fontFamily: font.medium, fontSize: 10, color: '#A39DAD' },
  dd: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  note: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: space.xs, lineHeight: 16 },
});
