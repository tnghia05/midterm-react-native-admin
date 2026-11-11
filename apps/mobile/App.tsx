import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { api, API_URL } from './src/api';
import type { Product, ProductDraft } from './src/types';

const colors = { ink: '#16332F', forest: '#176B58', mint: '#DFF3EA', paper: '#F8F7F2', white: '#FFFFFF', line: '#D9E3DD', coral: '#D95D4F', muted: '#6D7E78', amber: '#F3C677' };
const emptyDraft: ProductDraft = { name: '', price: 0, soluong: 0, image: '' };
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setLoading(true); setError('');
    try { onLogin((await api.login(email, password)).token); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.loginPage}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginWrap}>
      <View style={styles.mark}><Feather name="package" size={28} color={colors.white} /></View>
      <Text style={styles.loginTitle}>Quản lý kho, không rối.</Text>
      <Text style={styles.loginCopy}>Đăng nhập để thêm, sửa và kiểm soát sản phẩm từ một màn hình.</Text>
      <View style={styles.loginCard}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Đăng nhập</Text>}
        </Pressable>
      </View>
      <Text style={styles.endpoint}>API: {API_URL}</Text>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#91A09B" /></View>;
}

function ProductForm({ visible, initial, onClose, onSave }: { visible: boolean; initial?: Product; onClose: () => void; onSave: (draft: ProductDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const next = initial ? { name: initial.name, price: initial.price, soluong: initial.soluong, image: initial.image } : emptyDraft;
    setDraft(next); setPrice(next.price ? String(next.price) : ''); setQuantity(next.soluong ? String(next.soluong) : ''); setError('');
  }, [initial, visible]);
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, base64: true });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
      if (uri) { setDraft((current) => ({ ...current, image: uri })); setError(''); }
    }
  };
  const submit = async () => {
    const normalized = { ...draft, name: draft.name.trim(), price: Number(price), soluong: Number(quantity), image: draft.image.trim() };
    if (!normalized.name || !Number.isSafeInteger(normalized.price) || normalized.price < 0 || !Number.isSafeInteger(normalized.soluong) || normalized.soluong < 0 || !normalized.image) {
      setError('Vui lòng nhập đúng tên, giá nguyên không âm, số lượng nguyên không âm và chọn ảnh sản phẩm.');
      return;
    }
    setSaving(true); setError('');
    try { await onSave(normalized); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm'); }
    finally { setSaving(false); }
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalShade}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{initial ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text><Text style={styles.sheetHint}>Chỉ lưu 4 trường: name, price, soluong, image</Text></View><Pressable onPress={onClose} style={styles.iconButton}><Feather name="x" size={21} color={colors.ink} /></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>
        <Pressable style={styles.imagePicker} onPress={pickImage}>{draft.image ? <Image source={{ uri: draft.image }} style={styles.preview} /> : <><Feather name="image" size={30} color={colors.forest} /><Text style={styles.imagePickerText}>Chọn ảnh từ thiết bị</Text></>}</Pressable>
        <Field label="Hoặc dán URL hình ảnh (https://...)" value={draft.image.startsWith('data:') ? '' : draft.image} onChangeText={(image) => setDraft((current) => ({ ...current, image }))} placeholder={draft.image.startsWith('data:') ? 'Đã chọn ảnh từ thiết bị (bấm khung trên để đổi)' : 'https://...'} />
        <Field label="Tên sản phẩm (name)" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="Ví dụ: Serum dưỡng ẩm" />
        <Field label="Giá sản phẩm VNĐ (price)" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="299000" />
        <Field label="Số lượng (soluong)" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="20" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={submit} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Lưu sản phẩm</Text>}</Pressable>
      </ScrollView>
    </KeyboardAvoidingView></View>
  </Modal>;
}

export default function App() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [editor, setEditor] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [deleting, setDeleting] = useState<Product | null>(null);
  const load = async (currentToken = token) => {
    setLoading(true); setBannerError('');
    try { setProducts(await api.products(currentToken)); }
    catch (cause) { setBannerError(cause instanceof Error ? cause.message : 'Không kết nối được API'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (token) void load(token); }, [token]);
  const filtered = useMemo(() => products.filter((item) => item.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))), [products, query]);
  if (!token) return <Login onLogin={setToken} />;
  const save = async (draft: ProductDraft) => { editor.product ? await api.update(token, editor.product._id, draft) : await api.create(token, draft); await load(); };
  const confirmRemove = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try { await api.remove(token, target._id); await load(); }
    catch (cause) { setBannerError(cause instanceof Error ? cause.message : 'Không xóa được sản phẩm'); }
  };
  return <SafeAreaView style={styles.page}>
    <StatusBar style="dark" />
    <View style={styles.header}><View><Text style={styles.kicker}>Kho sản phẩm</Text><Text style={styles.title}>{products.length} mặt hàng</Text></View><Pressable onPress={() => setToken('')} style={styles.iconButton}><Feather name="log-out" size={20} color={colors.ink} /></Pressable></View>
    <View style={styles.search}><Feather name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên sản phẩm" placeholderTextColor="#91A09B" style={styles.searchInput} /></View>
    {!!bannerError && <View style={styles.banner}><Text style={styles.error}>{bannerError}</Text><Pressable onPress={() => void load()}><Text style={styles.retryText}>Thử lại</Text></Pressable></View>}
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View> : <FlatList data={filtered} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><Feather name="archive" size={38} color={colors.forest} /><Text style={styles.emptyTitle}>Kho đang trống</Text><Text style={styles.emptyCopy}>Thêm sản phẩm đầu tiên để bắt đầu quản lý.</Text></View>} renderItem={({ item }) => <View style={styles.row}>
      <Image source={{ uri: item.image }} style={styles.thumbnail} />
      <View style={styles.rowBody}><Text numberOfLines={2} style={styles.productName}>{item.name}</Text><Text style={styles.price}>{money.format(item.price)}</Text><View style={[styles.stock, item.soluong === 0 && styles.stockOut]}><View style={[styles.stockDot, item.soluong === 0 && styles.stockDotOut]} /><Text style={styles.stockText}>{item.soluong === 0 ? 'Hết hàng' : `Số lượng: ${item.soluong}`}</Text></View></View>
      <View style={styles.actions}><Pressable style={styles.smallButton} onPress={() => setEditor({ open: true, product: item })}><Feather name="edit-2" size={17} color={colors.forest} /></Pressable><Pressable style={[styles.smallButton, styles.deleteButton]} onPress={() => setDeleting(item)}><Feather name="trash-2" size={17} color={colors.coral} /></Pressable></View>
    </View>} />}
    <Pressable style={styles.fab} onPress={() => setEditor({ open: true })}><Feather name="plus" size={23} color={colors.white} /><Text style={styles.fabText}>Thêm sản phẩm</Text></Pressable>
    <ProductForm visible={editor.open} initial={editor.product} onClose={() => setEditor({ open: false })} onSave={save} />
    <Modal visible={!!deleting} animationType="fade" transparent onRequestClose={() => setDeleting(null)}>
      <View style={styles.confirmShade}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Xóa sản phẩm?</Text>
          <Text style={styles.confirmCopy}>Bạn sắp xóa "{deleting?.name}" khỏi cơ sở dữ liệu.</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.cancelBtn} onPress={() => setDeleting(null)}><Text style={styles.cancelBtnText}>Hủy</Text></Pressable>
            <Pressable style={styles.dangerBtn} onPress={confirmRemove}><Text style={styles.primaryText}>Xóa</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper }, loginPage: { flex: 1, backgroundColor: colors.mint }, loginWrap: { flex: 1, justifyContent: 'center', padding: 28, maxWidth: 520, width: '100%', alignSelf: 'center' }, mark: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginBottom: 30 }, loginTitle: { color: colors.ink, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1.4 }, loginCopy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12, marginBottom: 28 }, loginCard: { backgroundColor: colors.white, padding: 22, borderRadius: 22, borderWidth: 1, borderColor: colors.line, gap: 16 }, endpoint: { color: colors.muted, fontSize: 12, marginTop: 18, textAlign: 'center' }, field: { gap: 7 }, label: { color: colors.ink, fontSize: 13, fontWeight: '700' }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, paddingHorizontal: 15, color: colors.ink, fontSize: 16 }, error: { color: colors.coral, fontSize: 14 }, primaryButton: { minHeight: 52, backgroundColor: colors.forest, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' }, header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 860, width: '100%', alignSelf: 'center' }, kicker: { color: colors.forest, fontSize: 14, fontWeight: '700' }, title: { color: colors.ink, fontSize: 31, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 }, iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, search: { marginHorizontal: 20, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, maxWidth: 820, width: '92%', alignSelf: 'center' }, searchInput: { flex: 1, color: colors.ink, fontSize: 15 }, banner: { marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#FBEAE7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 820, width: '92%', alignSelf: 'center' }, retryText: { color: colors.forest, fontWeight: '800' }, list: { padding: 20, gap: 12, paddingBottom: 100, maxWidth: 860, width: '100%', alignSelf: 'center' }, row: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: 'row', gap: 13, alignItems: 'center' }, thumbnail: { width: 82, height: 92, borderRadius: 13, backgroundColor: colors.mint }, rowBody: { flex: 1, minWidth: 0 }, productName: { color: colors.ink, fontWeight: '800', fontSize: 16, lineHeight: 21 }, price: { color: colors.forest, fontWeight: '800', fontSize: 15, marginTop: 5 }, stock: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }, stockOut: { opacity: 0.75 }, stockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forest }, stockDotOut: { backgroundColor: colors.coral }, stockText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, actions: { gap: 8 }, smallButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, deleteButton: { backgroundColor: '#FBEAE7' }, fab: { position: 'absolute', right: 20, bottom: 22, minHeight: 54, borderRadius: 18, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, shadowColor: '#0B342C', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 7 }, fabText: { color: colors.white, fontWeight: '800', fontSize: 15 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 30 }, emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 20, marginTop: 14 }, emptyCopy: { color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 21 }, modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,51,47,0.32)' }, sheet: { maxHeight: '92%', maxWidth: 620, width: '100%', alignSelf: 'center', backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10 }, sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 }, sheetHeader: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: '800' }, sheetHint: { color: colors.muted, fontSize: 13, marginTop: 4 }, formBody: { paddingHorizontal: 20, paddingBottom: 34, gap: 16 }, imagePicker: { height: 190, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.forest, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 10 }, imagePickerText: { color: colors.forest, fontWeight: '800' }, preview: { width: '100%', height: '100%' }, confirmShade: { flex: 1, backgroundColor: 'rgba(22,51,47,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 }, confirmBox: { backgroundColor: colors.white, borderRadius: 22, padding: 22, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.line, gap: 12 }, confirmTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, confirmCopy: { color: colors.muted, fontSize: 15, lineHeight: 22 }, confirmRow: { flexDirection: 'row', gap: 12, marginTop: 8 }, cancelBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, cancelBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 }, dangerBtn: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
});
