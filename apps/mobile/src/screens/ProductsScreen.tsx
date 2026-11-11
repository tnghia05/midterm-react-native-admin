import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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
import { DataToolsModal, MobileConnectModal } from '../components/AdvancedModals';

type Sort = 'new' | 'priceAsc' | 'priceDesc' | 'stock' | 'valueDesc';
type Filter = 'all' | StockLevel;
type PriceRange = 'all' | 'under200' | 'mid' | 'over350';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'priceAsc', label: 'Giá ↑' },
  { key: 'priceDesc', label: 'Giá ↓' },
  { key: 'stock', label: 'Tồn ít' },
  { key: 'valueDesc', label: 'Giá trị cao' },
];

const PRICE_RANGES: { key: PriceRange; label: string }[] = [
  { key: 'all', label: 'Mọi mức giá' },
  { key: 'under200', label: '< 200k' },
  { key: 'mid', label: '200k – 350k' },
  { key: 'over350', label: '> 350k' },
];

export function ProductsScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
  const windowDim = useWindowDimensions();
  const [mobileFrame, setMobileFrame] = useState(false);

  const width = mobileFrame ? 390 : windowDim.width;
  const desktop = !mobileFrame && width >= 1024;
  const tablet = !mobileFrame && width >= 640;
  const pad = desktop ? 44 : tablet ? 28 : 14;
  const gap = tablet ? 20 : 12;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const contentWidth = Math.min(width, 1320) - pad * 2 - (desktop ? 250 : 0);
  const columns = viewMode === 'list' ? 1 : contentWidth >= 900 ? 4 : contentWidth >= 600 ? 3 : 2;
  const cardWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [filter, setFilter] = useState<Filter>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editor, setEditor] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [detail, setDetail] = useState<Product>();
  const [deleting, setDeleting] = useState<Product>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dataModal, setDataModal] = useState(false);
  const [mobileModal, setMobileModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    setLoadError('');
    try {
      const list = await api.products(token);
      setProducts(list);
      setDetail((curr) => (curr ? list.find((p) => p._id === curr._id) : undefined));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không kết nối được máy chủ';
      if (/đăng nhập|hết hạn/i.test(message)) onLogout();
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, onLogout]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const ok = products.filter((p) => stockLevel(p.soluong) === 'ok').length;
    const low = products.filter((p) => stockLevel(p.soluong) === 'low').length;
    const out = products.filter((p) => stockLevel(p.soluong) === 'out').length;
    return {
      total: products.length,
      units: products.reduce((s, p) => s + p.soluong, 0),
      value: products.reduce((s, p) => s + p.price * p.soluong, 0),
      low: low + out,
      counts: { all: products.length, ok, low, out } as Record<Filter, number>,
    };
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi');
    const list = products.filter((p) => {
      if (filter !== 'all' && stockLevel(p.soluong) !== filter) return false;
      if (priceRange === 'under200' && p.price >= 200_000) return false;
      if (priceRange === 'mid' && (p.price < 200_000 || p.price > 350_000)) return false;
      if (priceRange === 'over350' && p.price <= 350_000) return false;
      if (q && !p.name.toLocaleLowerCase('vi').includes(q)) return false;
      return true;
    });
    if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
    if (sort === 'stock') list.sort((a, b) => a.soluong - b.soluong);
    if (sort === 'valueDesc') list.sort((a, b) => b.price * b.soluong - a.price * a.soluong);
    return list;
  }, [products, query, sort, filter, priceRange]);

  const save = async (draft: ProductDraft) => {
    if (editor.product) await api.update(token, editor.product._id, draft);
    else await api.create(token, draft);
    setToast(editor.product ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
    await load('refresh');
  };

  const adjustStock = useCallback(async (p: Product, delta: number) => {
    const nextQty = Math.max(0, p.soluong + delta);
    if (nextQty === p.soluong) return;
    setProducts((curr) => curr.map((item) => (item._id === p._id ? { ...item, soluong: nextQty } : item)));
    setDetail((curr) => (curr && curr._id === p._id ? { ...curr, soluong: nextQty } : curr));
    try {
      await api.update(token, p._id, { name: p.name, price: p.price, soluong: nextQty, image: p.image });
      setToast(`Tồn kho “${p.name}”: ${nextQty}`);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không cập nhật được số lượng');
      await load('refresh');
    }
  }, [token, load]);

  const duplicateProduct = useCallback(async (p: Product) => {
    try {
      await api.create(token, {
        name: `${p.name} (Bản sao)`.slice(0, 160),
        price: p.price,
        soluong: p.soluong,
        image: p.image,
      });
      setToast(`Đã nhân bản “${p.name}”`);
      setDetail(undefined);
      await load('refresh');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không nhân bản được sản phẩm');
    }
  }, [token, load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.remove(token, deleting._id);
      setToast(`Đã xóa “${deleting.name}”`);
      setDeleting(undefined);
      setDetail(undefined);
      await load('refresh');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Không xóa được sản phẩm');
      setDeleting(undefined);
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }, []);

  const runBulkRestock = async (delta: number) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const targets = products.filter((p) => selectedIds.includes(p._id));
      await Promise.all(
        targets.map((p) =>
          api.update(token, p._id, { name: p.name, price: p.price, soluong: Math.max(0, p.soluong + delta), image: p.image }),
        ),
      );
      setToast(`Đã cộng +${delta} tồn kho cho ${targets.length} sản phẩm`);
      setSelectedIds([]);
      setSelectMode(false);
      await load('refresh');
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkDiscount = async (percent: number) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const targets = products.filter((p) => selectedIds.includes(p._id));
      await Promise.all(
        targets.map((p) =>
          api.update(token, p._id, {
            name: p.name,
            price: Math.max(0, Math.round((p.price * (100 - percent)) / 100000) * 1000),
            soluong: p.soluong,
            image: p.image,
          }),
        ),
      );
      setToast(`Đã điều chỉnh giá cho ${targets.length} sản phẩm`);
      setSelectedIds([]);
      setSelectMode(false);
      await load('refresh');
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      await Promise.all(selectedIds.map((id) => api.remove(token, id)));
      setToast(`Đã xóa ${selectedIds.length} sản phẩm`);
      setSelectedIds([]);
      setSelectMode(false);
      await load('refresh');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkImport = async (items: ProductDraft[]) => {
    await api.bulkCreate(token, items);
    setToast(`Đã nhập ${items.length} sản phẩm`);
    await load('refresh');
  };

  const openEdit = useCallback((p: Product) => { setDetail(undefined); setEditor({ open: true, product: p }); }, []);
  const openDelete = useCallback((p: Product) => setDeleting(p), []);
  const hideToast = useCallback(() => setToast(''), []);

  const okPct = stats.total ? (stats.counts.ok / stats.total) * 100 : 0;
  const lowPct = stats.total ? (stats.counts.low / stats.total) * 100 : 0;
  const outPct = stats.total ? (stats.counts.out / stats.total) * 100 : 0;

  const header = (
    <View style={{ gap: tablet ? space.lg : 12, paddingBottom: 14 }}>
      {tablet ? (
        <View style={styles.heading}>
          <View style={{ flex: 1, gap: 5 }}>
            <SectionNote>Kho hàng của shop</SectionNote>
            <Text accessibilityRole="header" style={styles.h1}>Quản lý sản phẩm</Text>
            <Text style={styles.lead}>Theo dõi danh mục, điều chỉnh tồn kho và cập nhật giá bán.</Text>
          </View>
          <View style={styles.headingActions}>
            <Button label="Nhập / Xuất" variant="secondary" iconName="download" onPress={() => setDataModal(true)} compact />
            <Button label="Thêm sản phẩm" iconName="plus" onPress={() => setEditor({ open: true })} compact />
          </View>
        </View>
      ) : null}

      <View style={styles.stats}>
        {[
          ['Sản phẩm', number.format(stats.total), 'mặt hàng'],
          ['Tồn kho', number.format(stats.units), 'đơn vị'],
          ['Giá trị kho', money.format(stats.value), 'tổng giá trị'],
          ['Cần nhập', number.format(stats.low), 'sắp/hết hàng'],
        ].map(([label, value, note], i) => (
          <View key={label} style={[styles.stat, !tablet && styles.statMobile, { flexBasis: tablet ? '22%' : '47%' }, i === 3 && stats.low > 0 && styles.statWarn]}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, !tablet && styles.statValueSmall, i === 3 && stats.low > 0 && { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {tablet && <Text style={styles.statNote}>{note}</Text>}
          </View>
        ))}
      </View>

      {stats.total > 0 && (
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>Tình trạng kho</Text>
            <Text style={styles.healthLegend}>
              <Text style={{ color: colors.success }}>● Còn ({stats.counts.ok})</Text>  <Text style={{ color: colors.warning }}>● Sắp hết ({stats.counts.low})</Text>  <Text style={{ color: colors.danger }}>● Hết ({stats.counts.out})</Text>
            </Text>
          </View>
          <View style={styles.healthTrack}>
            {okPct > 0 && <View style={{ width: `${okPct}%`, backgroundColor: colors.success, height: '100%' }} />}
            {lowPct > 0 && <View style={{ width: `${lowPct}%`, backgroundColor: '#D69E2E', height: '100%' }} />}
            {outPct > 0 && <View style={{ width: `${outPct}%`, backgroundColor: colors.dangerSolid, height: '100%' }} />}
          </View>
        </View>
      )}

      {tablet ? (
        <>
          <View style={styles.toolbar}>
            <View style={styles.search}>
              <Feather name="search" size={16} color="#928B9C" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên sản phẩm…" placeholderTextColor="#A39DAD" style={styles.searchInput} accessibilityLabel="Tìm sản phẩm" returnKeyType="search" />
              {!!query && <IconButton name="x" label="Xóa tìm kiếm" onPress={() => setQuery('')} tone="plain" size={28} />}
            </View>
            <View style={styles.sortRow}>
              {SORTS.map((s) => <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />)}
            </View>
          </View>

          <View style={styles.filterRow}>
            {([['all', 'Tất cả'], ['ok', 'Còn hàng'], ['low', 'Sắp hết'], ['out', 'Hết hàng']] as [Filter, string][]).map(([key, label]) => (
              <Chip key={key} label={label} count={stats.counts[key]} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
            <View style={styles.dividerDot} />
            {PRICE_RANGES.map((r) => (
              <Chip key={r.key} label={r.label} selected={priceRange === r.key} onPress={() => setPriceRange(r.key)} />
            ))}
            <View style={styles.rightControls}>
              <Chip
                label={selectMode ? `Đang chọn (${selectedIds.length})` : 'Chọn nhiều'}
                selected={selectMode}
                onPress={() => { setSelectMode((v) => !v); setSelectedIds([]); }}
              />
              <IconButton name={viewMode === 'grid' ? 'list' : 'grid'} label="Đổi kiểu hiển thị" onPress={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))} tone="plain" size={36} />
            </View>
          </View>
        </>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={styles.mobileSearchRow}>
            <View style={[styles.search, { maxWidth: '100%' }]}>
              <Feather name="search" size={16} color="#928B9C" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Tìm sản phẩm…" placeholderTextColor="#A39DAD" style={styles.searchInput} accessibilityLabel="Tìm sản phẩm" returnKeyType="search" />
              {!!query && <IconButton name="x" label="Xóa tìm kiếm" onPress={() => setQuery('')} tone="plain" size={26} />}
            </View>
            <IconButton
              name={selectMode ? 'check-square' : 'square'}
              label="Chọn nhiều sản phẩm"
              onPress={() => { setSelectMode((v) => !v); setSelectedIds([]); }}
              tone={selectMode ? 'default' : 'plain'}
              size={40}
            />
            <IconButton
              name={viewMode === 'grid' ? 'list' : 'grid'}
              label="Đổi kiểu hiển thị"
              onPress={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
              tone="plain"
              size={40}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileChipScroll}>
            {([['all', 'Tất cả'], ['ok', 'Còn hàng'], ['low', 'Sắp hết'], ['out', 'Hết hàng']] as [Filter, string][]).map(([key, label]) => (
              <Chip key={key} label={label} count={stats.counts[key]} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
            <View style={styles.dividerDot} />
            {SORTS.map((s) => (
              <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
            ))}
            <View style={styles.dividerDot} />
            {PRICE_RANGES.filter((r) => r.key !== 'all').map((r) => (
              <Chip key={r.key} label={r.label} selected={priceRange === r.key} onPress={() => setPriceRange((curr) => (curr === r.key ? 'all' : r.key))} />
            ))}
          </ScrollView>
        </View>
      )}

      {selectMode && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkTitle}>Đã chọn {selectedIds.length}/{visible.length}</Text>
          <View style={styles.bulkActions}>
            <Chip
              label={selectedIds.length === visible.length ? 'Bỏ chọn' : 'Tất cả'}
              selected={false}
              onPress={() => setSelectedIds(selectedIds.length === visible.length ? [] : visible.map((p) => p._id))}
            />
            <Button label="+10 kho" variant="secondary" onPress={() => runBulkRestock(10)} disabled={!selectedIds.length || bulkBusy} compact />
            <Button label="-10% giá" variant="secondary" onPress={() => runBulkDiscount(10)} disabled={!selectedIds.length || bulkBusy} compact />
            <Button label="Xóa" variant="danger" iconName="trash-2" onPress={runBulkDelete} disabled={!selectedIds.length || bulkBusy} loading={bulkBusy} compact />
          </View>
        </View>
      )}

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
      <Text style={styles.emptyCopy}>{products.length ? 'Thử đổi từ khóa, khoảng giá hoặc bộ lọc tồn kho.' : 'Thêm sản phẩm đầu tiên kèm ảnh, giá và số lượng.'}</Text>
      {products.length ? <Button label="Đặt lại bộ lọc" variant="secondary" onPress={() => { setQuery(''); setFilter('all'); setPriceRange('all'); }} compact />
        : <Button label="Thêm sản phẩm" iconName="plus" onPress={() => setEditor({ open: true })} compact />}
    </View>
  );

  const mainContent = (
    <SafeAreaView style={[styles.page, mobileFrame && styles.phoneScreen]} edges={['top', 'left', 'right']}>
      {mobileFrame && (
        <View style={styles.phoneNotchBar}>
          <Text style={styles.phoneTime}>09:41</Text>
          <View style={styles.phoneNotch} />
          <Pressable onPress={() => setMobileFrame(false)} style={styles.exitPhoneBtn}>
            <Feather name="maximize-2" size={12} color={colors.surface} />
            <Text style={styles.exitPhoneText}>Màn hình rộng</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.siteHeader}>
        <View style={[styles.headerInner, { paddingHorizontal: pad }]}>
          <Brand size={tablet ? 34 : 26} />
          <Text style={styles.headerLabel}>{tablet ? 'Kênh người bán' : `${stats.total} sản phẩm`}</Text>
          <View style={{ flex: 1 }} />
          {!tablet && (
            <IconButton name="download" label="Nhập / Xuất dữ liệu" onPress={() => setDataModal(true)} tone="plain" size={36} />
          )}
          {tablet && <Text style={styles.headerUser}>admin@example.com</Text>}
          {tablet ? (
            <Button label="Đăng xuất" variant="ghost" iconName="log-out" onPress={onLogout} compact />
          ) : (
            <IconButton name="log-out" label="Đăng xuất" onPress={onLogout} tone="plain" size={36} />
          )}
        </View>
      </View>

      <View style={[styles.layout, { paddingHorizontal: pad }]}>
        {desktop && (
          <View style={styles.sidebar}>
            <View style={styles.monogram}><Text style={styles.monogramText}>M</Text></View>
            <Text style={styles.shopName}>Shop của bạn</Text>
            <Text style={styles.shopMuted}>Không gian người bán</Text>
            <View style={styles.nav}>
              <View style={[styles.navItem, styles.navActive]}><Feather name="box" size={16} color={colors.purple} /><Text style={[styles.navText, styles.navTextActive]}>Sản phẩm ({stats.total})</Text></View>
              <Pressable onPress={() => setEditor({ open: true })} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (pressed || hovered) && styles.navHover]}><Feather name="plus-square" size={16} color={colors.muted} /><Text style={styles.navText}>Thêm sản phẩm</Text></Pressable>
              <Pressable onPress={() => setDataModal(true)} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (pressed || hovered) && styles.navHover]}><Feather name="download" size={16} color={colors.muted} /><Text style={styles.navText}>Nhập / Xuất dữ liệu</Text></Pressable>
              <Pressable onPress={() => setMobileModal(true)} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (pressed || hovered) && styles.navHover]}><Feather name="smartphone" size={16} color={colors.muted} /><Text style={styles.navText}>Ứng dụng di động</Text></Pressable>
            </View>
            <View style={styles.sideNote}><Text style={styles.sideNoteText}>Quản lý danh mục, hình ảnh và tồn kho đồng bộ trực tuyến.</Text></View>
          </View>
        )}
        <FlatList
          key={`${columns}-${viewMode}-${mobileFrame}`}
          style={{ flex: 1 }}
          data={loading ? [] : visible}
          keyExtractor={(item) => item._id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap } : undefined}
          contentContainerStyle={{ paddingTop: desktop ? 32 : 12, paddingBottom: 110 }}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.purple} colors={[colors.purple]} />}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              width={cardWidth}
              listMode={viewMode === 'list'}
              selectable={selectMode}
              selected={selectedIds.includes(item._id)}
              onToggleSelect={toggleSelect}
              onOpen={setDetail}
              onEdit={openEdit}
              onDuplicate={duplicateProduct}
              onDelete={openDelete}
              onAdjustStock={adjustStock}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {!tablet && (
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm sản phẩm" onPress={() => setEditor({ open: true })} style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.purpleDark }]}>
          <Feather name="plus" size={24} color={colors.surface} />
        </Pressable>
      )}

      <ProductFormModal visible={editor.open} initial={editor.product} onClose={() => setEditor({ open: false })} onSave={save} />
      <ProductDetailModal product={detail} onClose={() => setDetail(undefined)} onEdit={openEdit} onDuplicate={duplicateProduct} onDelete={openDelete} onAdjustStock={adjustStock} />
      <DataToolsModal visible={dataModal} products={products} onClose={() => setDataModal(false)} onBulkImport={handleBulkImport} onNotify={setToast} />
      <MobileConnectModal visible={mobileModal} mobileFrame={mobileFrame} onToggleMobileFrame={() => setMobileFrame((v) => !v)} onClose={() => setMobileModal(false)} />
      <ConfirmDialog visible={!!deleting} title="Xóa sản phẩm này?" message={`“${deleting?.name ?? ''}” sẽ bị xóa vĩnh viễn khỏi cửa hàng.`} confirmLabel="Xóa sản phẩm" onCancel={() => setDeleting(undefined)} onConfirm={confirmDelete} loading={deleteBusy} />
      <Toast message={toast} onHide={hideToast} />
    </SafeAreaView>
  );

  if (mobileFrame) {
    return (
      <View style={styles.simulatorBackdrop}>
        <View style={styles.phoneBezel}>{mainContent}</View>
      </View>
    );
  }

  return mainContent;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  simulatorBackdrop: { flex: 1, backgroundColor: '#1E1B29', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  phoneBezel: { width: 406, height: 860, maxHeight: '96%', borderRadius: 44, padding: 8, backgroundColor: '#2E2A3B', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 36, shadowOffset: { width: 0, height: 18 } },
  phoneScreen: { borderRadius: 36, overflow: 'hidden' },
  phoneNotchBar: { height: 34, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  phoneTime: { fontFamily: font.semibold, fontSize: 12, color: colors.surface },
  phoneNotch: { width: 96, height: 18, borderRadius: 10, backgroundColor: '#14121D' },
  exitPhoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.purple, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  exitPhoneText: { fontFamily: font.semibold, fontSize: 10, color: colors.surface },
  siteHeader: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  headerInner: { width: '100%', maxWidth: 1320, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  headerLabel: { fontFamily: font.medium, fontSize: 12, color: colors.muted, borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: 10 },
  headerUser: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  layout: { flex: 1, flexDirection: 'row', gap: 40, width: '100%', maxWidth: 1320, alignSelf: 'center' },
  sidebar: { width: 210, paddingTop: 32, paddingRight: 25, borderRightWidth: 1, borderRightColor: colors.line },
  monogram: { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.lilacDeep, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontFamily: font.bold, fontSize: 22, color: colors.purple },
  shopName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 14 },
  shopMuted: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4 },
  nav: { marginTop: 22, gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm },
  navActive: { backgroundColor: '#EEE8F7' },
  navHover: { backgroundColor: colors.canvas },
  navText: { fontFamily: font.medium, fontSize: 13, color: '#726C7B' },
  navTextActive: { color: colors.purple, fontFamily: font.semibold },
  sideNote: { marginTop: 26, backgroundColor: '#F6F4F8', padding: 14, borderRadius: 7 },
  sideNoteText: { fontFamily: font.regular, fontSize: 11, lineHeight: 18, color: '#81758D' },
  heading: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  headingActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  h1: { fontFamily: font.bold, fontSize: 28, letterSpacing: -0.8, color: colors.ink },
  lead: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 20 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, gap: 4, backgroundColor: colors.surface },
  statMobile: { paddingVertical: 10, paddingHorizontal: 12, gap: 2, backgroundColor: colors.canvas },
  statWarn: { backgroundColor: '#FCFAF6', borderColor: '#EDE3D2' },
  statLabel: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  statValue: { fontFamily: font.semibold, fontSize: 24, color: colors.ink, letterSpacing: -0.6 },
  statValueSmall: { fontSize: 17 },
  statNote: { fontFamily: font.regular, fontSize: 10, color: '#928B9C' },
  healthCard: { backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 6 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  healthTitle: { fontFamily: font.medium, fontSize: 11, color: colors.ink },
  healthLegend: { fontFamily: font.medium, fontSize: 10 },
  healthTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, flexDirection: 'row', overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.md, justifyContent: 'space-between' },
  mobileSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileChipScroll: { gap: 6, alignItems: 'center', paddingRight: 8 },
  search: { flex: 1, maxWidth: 360, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingLeft: 12, paddingRight: 6, backgroundColor: colors.canvas },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 13, color: colors.ink, paddingVertical: 8, outlineStyle: 'none' } as never,
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md },
  dividerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginHorizontal: 2 },
  rightControls: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulkBar: { backgroundColor: colors.lilac, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  bulkTitle: { fontFamily: font.semibold, fontSize: 12, color: colors.purple },
  bulkActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  alertText: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.danger },
  alertAction: { fontFamily: font.semibold, fontSize: 13, color: colors.purple, textDecorationLine: 'underline' },
  empty: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: radius.md, paddingVertical: 48, paddingHorizontal: space.xl, gap: space.md },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  emptyCopy: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: space.sm },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: colors.purpleDark, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
