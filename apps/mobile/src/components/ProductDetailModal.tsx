import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Product } from '../types';
import { colors, font, money, number, radius, space, stockLevel, stockMeta } from '../theme';
import { Button } from '../ui';
import { Sheet } from './Sheet';

type Props = { product?: Product; onClose: () => void; onEdit: (p: Product) => void; onDelete: (p: Product) => void };

export function ProductDetailModal({ product, onClose, onEdit, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  if (!product) return null;
  const meta = stockMeta[stockLevel(product.soluong)];
  const rows: [string, string, string][] = [
    ['Tên sản phẩm', 'name', product.name],
    ['Giá sản phẩm', 'price', money.format(product.price)],
    ['Số lượng', 'soluong', `${number.format(product.soluong)} sản phẩm`],
    ['Giá trị tồn kho', '—', money.format(product.price * product.soluong)],
  ];
  return (
    <Sheet
      visible={!!product}
      onClose={onClose}
      title="Chi tiết sản phẩm"
      maxWidth={850}
      footer={<>
        <Button label="Xóa" variant="secondary" iconName="trash-2" onPress={() => onDelete(product)} compact />
        <Button label="Sửa sản phẩm" iconName="edit-2" onPress={() => onEdit(product)} compact />
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
          <View style={styles.table}>
            {rows.map(([label, field, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.dt}>{label}{field !== '—' && <Text style={styles.field}>  {field}</Text>}</Text>
                <Text style={styles.dd} numberOfLines={3}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note} numberOfLines={2}>Ảnh: {product.image.startsWith('data:') ? 'lưu dạng base64' : product.image}</Text>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl },
  bodyWide: { flexDirection: 'row', gap: 30 },
  art: { aspectRatio: 1.3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#F8ECEF' },
  artWide: { width: 360, aspectRatio: 0.9 },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, gap: space.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  name: { fontFamily: font.bold, fontSize: 23, lineHeight: 34, letterSpacing: -0.5, color: colors.ink, marginTop: 4 },
  price: { fontFamily: font.semibold, fontSize: 23, color: colors.purple, marginVertical: space.sm },
  table: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: space.sm },
  row: { flexDirection: 'row', gap: space.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  dt: { width: '42%', fontFamily: font.regular, fontSize: 12, color: colors.muted },
  field: { fontFamily: font.medium, fontSize: 10, color: '#A39DAD' },
  dd: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  note: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: space.sm, lineHeight: 16 },
});
