import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api } from '../api';
import type { Product, ProductDraft } from '../types';
import { colors, font, money, number, radius, space, stockLevel, type StockLevel } from '../theme';
import { Brand, Button, Chip, IconButton, SectionNote } from '../ui';
import { ProductCard } from '../components/ProductCard';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ConfirmDialog, Toast } from '../components/Feedback';

type Sort = 'new' | 'priceAsc' | 'priceDesc' | 'stock';
type Filter = 'all' | StockLevel;
const SORTS: { key: Sort; label: string }[] = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'priceAsc', label: 'Giá tăng' },
  { key: 'priceDesc', label: 'Giá giảm' },
  { key: 'stock', label: 'Tồn kho ít' },
];

export function ProductsScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const tablet = width >= 640;
  const pad = desktop ? 44 : tablet ? 28 : 18;
  const gap = tablet ? 22 : 14;
  const contentWidth = Math.min(width, 1320) - pad * 2 - (desktop ? 250 : 0);
  const columns = contentWidth >= 900 ? 4 : contentWidth >= 600 ? 3 : 2;
  const cardWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [detail, setDetail] = useState<Product>();
  const [deleting, setDeleting] = useState<Product>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    setLoadError('');
    try { setProducts(await api.products(token)); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không kết nối được máy chủ';
      if (/đăng nhập|hết hạn/i.test(message)) onLogout();
      setLoadError(message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token, onLogout]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    total: products.length,
    units: products.reduce((s, p) => s + p.soluong, 0),
    value: products.reduce((s, p) => s + p.price * p.soluong, 0),
    low: products.filter((p) => stockLevel(p.soluong) !== 'ok').length,
    counts: {
      all: products.length,
      ok: products.filter((p) => stockLevel(p.soluong) === 'ok').length,
      low: products.filter((p) => stockLevel(p.soluong) === 'low').length,
      out: products.filter((p) => stockLevel(p.soluong) === 'out').length,
    } as Record<Filter, number>,
  }), [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi');
    const list = products.filter((p) => (filter === 'all' || stockLevel(p.soluong) === filter) && (!q || p.name.toLocaleLowerCase('vi').includes(q)));
    if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
    if (sort === 'stock') list.sort((a, b) => a.soluong - b.soluong);
    return list;
  }, [products, query, sort, filter]);

  const save = async (draft: ProductDraft) => {
    if (editor.product) await api.update(token, editor.product._id, draft);
    else await api.create(token, draft);
    setToast(editor.product ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
    await load('refresh');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.remove(token, deleting._id);
      setToast(`Đã xóa “${deleting.name}”`);
      setDeleting(undefined); setDetail(undefined);
      await load('refresh');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không xóa được sản phẩm');
      setDeleting(undefined);
    } finally { setDeleteBusy(false); }
  };

  const openEdit = useCallback((p: Product) => { setDetail(undefined); setEditor({ open: true, product: p }); }, []);
  const openDelete = useCallback((p: Product) => setDeleting(p), []);
  const hideToast = useCallback(() => setToast(''), []);

  const header = (
    <View style={{ gap: tablet ? space.xl : space.lg, paddingBottom: space.lg }}>
      <View style={[styles.heading, !tablet && styles.headingStack]}>
        <View style={{ flex: 1, gap: 6 }}>
          <SectionNote>Kho hàng của shop</SectionNote>
          <Text accessibilityRole="header" style={[styles.h1, !tablet && styles.h1Small]}>Quản lý sản phẩm</Text>
          <Text style={styles.lead}>Thêm, sửa, xóa và theo dõi tồn kho trong một nơi.</Text>
        </View>
        <View style={styles.headingActions}>
          <Button label="Làm mới" variant="secondary" iconName="refresh-cw" onPress={() => load('refresh')} disabled={refreshing} compact />
          <Button label="Thêm sản phẩm" iconName="plus" onPress={() => setEditor({ open: true })} compact />
        </View>
      </View>

      <View style={styles.stats}>
        {[
          ['Tổng sản phẩm', number.format(stats.total), 'mặt hàng đang bán'],
          ['Tổng tồn kho', number.format(stats.units), 'đơn vị sản phẩm'],
          ['Giá trị kho', money.format(stats.value), 'giá × số lượng'],
          ['Cần nhập thêm', number.format(stats.low), 'sắp hết hoặc hết hàng'],
        ].map(([label, value, note], i) => (
          <View key={label} style={[styles.stat, { flexBasis: tablet ? '22%' : '45%' }, i === 3 && stats.low > 0 && styles.statWarn]}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, !tablet && styles.statValueSmall, i === 3 && stats.low > 0 && { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            <Text style={styles.statNote}>{note}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.toolbar, !tablet && styles.toolbarStack]}>
        <View style={styles.search}>
          <Feather name="search" size={16} color="#928B9C" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên sản phẩm" placeholderTextColor="#A39DAD" style={styles.searchInput} accessibilityLabel="Tìm sản phẩm" returnKeyType="search" />
          {!!query && <IconButton name="x" label="Xóa tìm kiếm" onPress={() => setQuery('')} tone="plain" size={28} />}
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sắp xếp</Text>
          {SORTS.map((s) => <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />)}
        </View>
      </View>

      <View style={styles.filterRow}>
        {([['all', 'Tất cả'], ['ok', 'Còn hàng'], ['low', 'Sắp hết'], ['out', 'Hết hàng']] as [Filter, string][]).map(([key, label]) => (
          <Chip key={key} label={label} count={stats.counts[key]} selected={filter === key} onPress={() => setFilter(key)} />
        ))}
        <Text style={styles.resultCount}>{visible.length} kết quả</Text>
      </View>

      {!!loadError && (
        <View accessibilityRole="alert" style={styles.alert}>
          <Feather name="wifi-off" size={16} color={colors.danger} />
          <Text style={styles.alertText}>{loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => load()} hitSlop={8}><Text style={styles.alertAction}>Thử lại</Text></Pressable>
        </View>
      )}
    </View>
  );

  const empty = loading ? (
    <View style={styles.empty}><ActivityIndicator size="large" color={colors.purple} /><Text style={styles.emptyCopy}>Đang tải sản phẩm…</Text></View>
  ) : (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Feather name={products.length ? 'search' : 'package'} size={26} color="#9E8CAF" /></View>
      <Text style={styles.emptyTitle}>{products.length ? 'Không có sản phẩm phù hợp' : 'Shop chưa có sản phẩm'}</Text>
      <Text style={styles.emptyCopy}>{products.length ? 'Thử đổi từ khóa hoặc bộ lọc tồn kho.' : 'Thêm sản phẩm đầu tiên kèm ảnh, giá và số lượng.'}</Text>
      {products.length ? <Button label="Xóa bộ lọc" variant="secondary" onPress={() => { setQuery(''); setFilter('all'); }} compact />
        : <Button label="Thêm sản phẩm" iconName="plus" onPress={() => setEditor({ open: true })} compact />}
    </View>
  );

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <View style={styles.banner}><Text style={styles.bannerText} numberOfLines={1}>Kênh người bán · Dữ liệu lưu trên MongoDB Atlas, ảnh trên Cloudflare R2</Text></View>
      <View style={styles.siteHeader}>
        <View style={[styles.headerInner, { paddingHorizontal: pad }]}>
          <Brand size={tablet ? 34 : 28} />
          <Text style={styles.headerLabel}>Kênh người bán</Text>
          <View style={{ flex: 1 }} />
          {tablet && <Text style={styles.headerUser}>admin@example.com</Text>}
          <Button label={tablet ? 'Đăng xuất' : ''} variant="ghost" iconName="log-out" onPress={onLogout} compact />
        </View>
      </View>

      <View style={[styles.layout, { paddingHorizontal: pad }]}>
        {desktop && (
          <View style={styles.sidebar}>
            <View style={styles.monogram}><Text style={styles.monogramText}>M</Text></View>
            <Text style={styles.shopName}>Shop của bạn</Text>
            <Text style={styles.shopMuted}>Không gian người bán</Text>
            <View style={styles.nav}>
              <View style={[styles.navItem, styles.navActive]}><Feather name="box" size={16} color={colors.purple} /><Text style={[styles.navText, styles.navTextActive]}>Sản phẩm</Text></View>
              <Pressable onPress={() => setEditor({ open: true })} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (pressed || hovered) && styles.navHover]}><Feather name="plus-square" size={16} color={colors.muted} /><Text style={styles.navText}>Thêm sản phẩm</Text></Pressable>
              <Pressable onPress={() => setFilter('low')} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (pressed || hovered) && styles.navHover]}><Feather name="alert-triangle" size={16} color={colors.muted} /><Text style={styles.navText}>Sắp hết hàng</Text></Pressable>
            </View>
            <View style={styles.sideNote}><Text style={styles.sideNoteText}>Cơ sở dữ liệu chỉ gồm các trường name, price, soluong, image theo yêu cầu đề bài.</Text></View>
          </View>
        )}
        <FlatList
          key={columns}
          style={{ flex: 1 }}
          data={loading ? [] : visible}
          keyExtractor={(item) => item._id}
          numColumns={columns}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={{ paddingTop: desktop ? 36 : 22, paddingBottom: 60 }}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.purple} colors={[colors.purple]} />}
          renderItem={({ item }) => <ProductCard product={item} width={cardWidth} onOpen={setDetail} onEdit={openEdit} onDelete={openDelete} />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {!tablet && (
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm sản phẩm" onPress={() => setEditor({ open: true })} style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.purpleDark }]}>
          <Feather name="plus" size={24} color={colors.surface} />
        </Pressable>
      )}

      <ProductFormModal visible={editor.open} initial={editor.product} onClose={() => setEditor({ open: false })} onSave={save} />
      <ProductDetailModal product={detail} onClose={() => setDetail(undefined)} onEdit={openEdit} onDelete={openDelete} />
      <ConfirmDialog visible={!!deleting} title="Xóa sản phẩm này?" message={`“${deleting?.name ?? ''}” sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.`} confirmLabel="Xóa sản phẩm" onCancel={() => setDeleting(undefined)} onConfirm={confirmDelete} loading={deleteBusy} />
      <Toast message={toast} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  banner: { backgroundColor: colors.banner, paddingVertical: 9, paddingHorizontal: 16 },
  bannerText: { fontFamily: font.regular, fontSize: 11, color: colors.bannerText, textAlign: 'center' },
  siteHeader: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  headerInner: { width: '100%', maxWidth: 1320, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: 14 },
  headerLabel: { fontFamily: font.regular, fontSize: 13, color: colors.muted, borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: space.lg },
  headerUser: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  layout: { flex: 1, flexDirection: 'row', gap: 40, width: '100%', maxWidth: 1320, alignSelf: 'center' },
  sidebar: { width: 210, paddingTop: 36, paddingRight: 25, borderRightWidth: 1, borderRightColor: colors.line },
  monogram: { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.lilacDeep, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontFamily: font.bold, fontSize: 22, color: colors.purple },
  shopName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 14 },
  shopMuted: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4 },
  nav: { marginTop: 26, gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingHorizontal: 12, borderRadius: radius.sm },
  navActive: { backgroundColor: '#EEE8F7' },
  navHover: { backgroundColor: colors.canvas },
  navText: { fontFamily: font.medium, fontSize: 13, color: '#726C7B' },
  navTextActive: { color: colors.purple, fontFamily: font.semibold },
  sideNote: { marginTop: 30, backgroundColor: '#F6F4F8', padding: 16, borderRadius: 7 },
  sideNoteText: { fontFamily: font.regular, fontSize: 11, lineHeight: 19, color: '#81758D' },
  heading: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg },
  headingStack: { flexDirection: 'column', alignItems: 'stretch' },
  headingActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  h1: { fontFamily: font.bold, fontSize: 30, letterSpacing: -0.9, color: colors.ink },
  h1Small: { fontSize: 24 },
  lead: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexGrow: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: 6, backgroundColor: colors.surface },
  statWarn: { backgroundColor: '#FCFAF6', borderColor: '#EDE3D2' },
  statLabel: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  statValue: { fontFamily: font.semibold, fontSize: 26, color: colors.ink, letterSpacing: -0.6 },
  statValueSmall: { fontSize: 20 },
  statNote: { fontFamily: font.regular, fontSize: 10, color: '#928B9C' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.lg, justifyContent: 'space-between' },
  toolbarStack: { flexDirection: 'column', alignItems: 'stretch', gap: space.md },
  search: { flex: 1, maxWidth: 380, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingLeft: 13, paddingRight: 6 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 13, color: colors.ink, paddingVertical: 10, outlineStyle: 'none' } as never,
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sortLabel: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginRight: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.lg },
  resultCount: { marginLeft: 'auto', fontFamily: font.regular, fontSize: 11, color: colors.muted },
  alert: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  alertText: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.danger },
  alertAction: { fontFamily: font.semibold, fontSize: 13, color: colors.purple, textDecorationLine: 'underline' },
  empty: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: radius.md, paddingVertical: 52, paddingHorizontal: space.xl, gap: space.md },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  emptyCopy: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: space.sm },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: colors.purpleDark, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
