import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Product } from '../types';
import { colors, font, money, number, radius, space, stockLevel, stockMeta } from '../theme';
import { IconButton } from '../ui';

type Props = {
  product: Product;
  width: number;
  listMode?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onDelete: (p: Product) => void;
  onAdjustStock: (p: Product, delta: number) => void;
};

export const ProductCard = memo(function ProductCard({
  product,
  width,
  listMode,
  selectable,
  selected,
  onToggleSelect,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onAdjustStock,
}: Props) {
  const level = stockLevel(product.soluong);
  const meta = stockMeta[level];
  const handlePress = () => (selectable && onToggleSelect ? onToggleSelect(product._id) : onOpen(product));

  if (listMode) {
    return (
      <View style={[styles.rowCard, selected && styles.cardSelected]}>
        {selectable && (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!selected }} onPress={() => onToggleSelect?.(product._id)} style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected && <Feather name="check" size={14} color={colors.surface} />}
          </Pressable>
        )}
        <Pressable onPress={handlePress} style={styles.rowThumbWrap}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        </Pressable>
        <Pressable onPress={handlePress} style={styles.rowBody}>
          <Text numberOfLines={1} style={styles.rowTitle}>{product.name}</Text>
          <Text numberOfLines={1} style={styles.rowPrice}>{money.format(product.price)}</Text>
          <View style={styles.rowMeta}>
            <View style={[styles.inlineBadge, { backgroundColor: meta.bg }]}>
              <View style={[styles.dot, { backgroundColor: meta.fg }]} />
              <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
            </View>
            <Text style={styles.meta}>Tồn: <Text style={styles.metaStrong}>{number.format(product.soluong)}</Text></Text>
          </View>
        </Pressable>
        <View style={styles.rightCol}>
          <View style={styles.stepper}>
            <Pressable accessibilityLabel="Giảm 1" disabled={product.soluong <= 0} onPress={() => onAdjustStock(product, -1)} style={[styles.stepBtn, product.soluong <= 0 && styles.stepDisabled]}>
              <Feather name="minus" size={13} color={colors.ink} />
            </Pressable>
            <Text style={styles.stepVal}>{number.format(product.soluong)}</Text>
            <Pressable accessibilityLabel="Tăng 1" onPress={() => onAdjustStock(product, 1)} style={styles.stepBtn}>
              <Feather name="plus" size={13} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.actions}>
            <IconButton name="copy" label={`Nhân bản ${product.name}`} onPress={() => onDuplicate(product)} size={32} />
            <IconButton name="edit-2" label={`Sửa ${product.name}`} onPress={() => onEdit(product)} size={32} />
            <IconButton name="trash-2" label={`Xóa ${product.name}`} onPress={() => onDelete(product)} tone="danger" size={32} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { width }, selected && styles.cardSelectedGrid]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${product.name}`}
        onPress={handlePress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.art, (pressed || hovered) && styles.artActive]}
      >
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <View style={[styles.dot, { backgroundColor: meta.fg }]} />
          <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
        {selectable && (
          <View style={[styles.cornerCheck, selected && styles.checkboxChecked]}>
            {selected && <Feather name="check" size={14} color={colors.surface} />}
          </View>
        )}
      </Pressable>

      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.title} onPress={handlePress}>{product.name}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.price}>{money.format(product.price)}</Text>

        <View style={styles.footerRow}>
          <View style={styles.compactStepper}>
            <Pressable
              accessibilityLabel={`Giảm số lượng ${product.name}`}
              hitSlop={6}
              disabled={product.soluong <= 0}
              onPress={() => onAdjustStock(product, -1)}
              style={[styles.compactStepBtn, product.soluong <= 0 && styles.stepDisabled]}
            >
              <Feather name="minus" size={12} color={colors.ink} />
            </Pressable>
            <Text style={styles.compactStepText}>{number.format(product.soluong)}</Text>
            <Pressable
              accessibilityLabel={`Tăng số lượng ${product.name}`}
              hitSlop={6}
              onPress={() => onAdjustStock(product, 1)}
              style={styles.compactStepBtn}
            >
              <Feather name="plus" size={12} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <IconButton name="edit-2" label={`Sửa ${product.name}`} onPress={() => onEdit(product)} size={32} />
            <IconButton name="trash-2" label={`Xóa ${product.name}`} onPress={() => onDelete(product)} tone="danger" size={32} />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardSelectedGrid: { borderColor: colors.purple, borderWidth: 2, backgroundColor: colors.lilac },
  art: { aspectRatio: 1, backgroundColor: '#F8ECEF', overflow: 'hidden' },
  artActive: { opacity: 0.92 },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  inlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: font.semibold, fontSize: 10 },
  cornerCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.purple, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  info: { padding: 10, gap: 6 },
  title: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, minHeight: 38 },
  price: { fontFamily: font.bold, fontSize: 15, color: colors.purple },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  compactStepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.canvas, height: 30 },
  compactStepBtn: { width: 24, height: '100%', alignItems: 'center', justifyContent: 'center' },
  compactStepText: { minWidth: 24, textAlign: 'center', fontFamily: font.semibold, fontSize: 12, color: colors.ink, paddingHorizontal: 2 },
  meta: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  metaStrong: { fontFamily: font.semibold, color: colors.ink },
  actions: { flexDirection: 'row', gap: 5 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginBottom: 10 },
  cardSelected: { borderColor: colors.purple, backgroundColor: colors.lilac },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.purple, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.purple, borderColor: colors.purple },
  rowThumbWrap: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: '#F8ECEF' },
  rowBody: { flex: 1, minWidth: 110, gap: 3 },
  rowTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  rowPrice: { fontFamily: font.bold, fontSize: 14, color: colors.purple },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.sm, height: 30, backgroundColor: colors.canvas },
  stepBtn: { width: 26, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  stepVal: { minWidth: 26, textAlign: 'center', fontFamily: font.semibold, fontSize: 12, color: colors.ink },
});
