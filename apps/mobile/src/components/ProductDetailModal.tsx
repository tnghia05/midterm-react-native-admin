import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const rows: [string, string][] = [
    ['Tên sản phẩm', product.name],
    ['Giá bán niêm yết', money.format(product.price)],
    ['Số lượng tồn kho', `${number.format(product.soluong)} sản phẩm`],
    ['Giá trị hàng tồn', money.format(product.price * product.soluong)],
  ];
  return (
    <Sheet
      visible={!!product}
      onClose={onClose}
      title="Thông tin sản phẩm"
      maxWidth={820}
      footer={<>
        <Button label="Xóa" variant="secondary" iconName="trash-2" onPress={() => onDelete(product)} compact />
        <Button label="Nhân bản" variant="secondary" iconName="copy" onPress={() => onDuplicate(product)} compact />
        <Button label="Chỉnh sửa" iconName="edit-2" onPress={() => onEdit(product)} compact />
      </>}
    >
      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide]}>
        <View style={[styles.art, wide && styles.artWide]}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" accessibilityLabel={`Ảnh ${product.name}`} />
        </View>
        <View style={styles.copy}>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text></View>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{money.format(product.price)}</Text>

          <View style={styles.quickStockBox}>
            <Text style={styles.quickStockTitle}>Điều chỉnh nhanh tồn kho</Text>
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
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.dt}>{label}</Text>
                <Text style={styles.dd} numberOfLines={3}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl },
  bodyWide: { flexDirection: 'row', gap: 30 },
  art: { aspectRatio: 1.15, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#F8ECEF' },
  artWide: { width: 340, aspectRatio: 0.95 },
  image: { width: '100%', height: '100%' },
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
  row: { flexDirection: 'row', gap: space.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  dt: { width: '42%', fontFamily: font.regular, fontSize: 12, color: colors.muted },
  dd: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
});
