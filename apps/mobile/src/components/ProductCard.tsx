import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Product } from '../types';
import { colors, font, money, radius, space, stockLevel, stockMeta } from '../theme';
import { IconButton } from '../ui';

type Props = { product: Product; width: number; onOpen: (p: Product) => void; onEdit: (p: Product) => void; onDelete: (p: Product) => void };

export const ProductCard = memo(function ProductCard({ product, width, onOpen, onEdit, onDelete }: Props) {
  const level = stockLevel(product.soluong);
  const meta = stockMeta[level];
  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${product.name}`}
        onPress={() => onOpen(product)}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.art, (pressed || hovered) && styles.artActive]}
      >
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <View style={[styles.dot, { backgroundColor: meta.fg }]} />
          <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.meta}>Tồn kho: <Text style={styles.metaStrong}>{product.soluong}</Text></Text>
        <Text numberOfLines={2} style={styles.title} onPress={() => onOpen(product)}>{product.name}</Text>
        <View style={styles.bottom}>
          <Text style={styles.price}>{money.format(product.price)}</Text>
          <View style={styles.actions}>
            <IconButton name="edit-2" label={`Sửa ${product.name}`} onPress={() => onEdit(product)} size={36} />
            <IconButton name="trash-2" label={`Xóa ${product.name}`} onPress={() => onDelete(product)} tone="danger" size={36} />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: space.xl },
  art: { aspectRatio: 1.05, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#F8ECEF' },
  artActive: { opacity: 0.92 },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: font.semibold, fontSize: 10 },
  info: { paddingTop: 14, gap: 6 },
  meta: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  metaStrong: { fontFamily: font.semibold, color: colors.ink },
  title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.ink, minHeight: 44 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginTop: 2 },
  price: { flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: colors.purple },
  actions: { flexDirection: 'row', gap: 6 },
});
