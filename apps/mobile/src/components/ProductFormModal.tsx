import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import type { Product, ProductDraft } from '../types';
import { colors, font, money, number, radius, space, stockLevel, stockMeta } from '../theme';
import { Button, Chip, Field } from '../ui';
import { Sheet } from './Sheet';

type Errors = Partial<Record<keyof ProductDraft, string>>;
type Props = { visible: boolean; initial?: Product; onClose: () => void; onSave: (draft: ProductDraft) => Promise<void> };

const SAMPLE_IMAGES: { label: string; url: string }[] = [
  { label: 'Serum', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900' },
  { label: 'Kem dưỡng', url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900' },
  { label: 'Son môi', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=900' },
  { label: 'Sữa rửa mặt', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900' },
];

const QUICK_PRICES = [159000, 239000, 299000, 450000];
const QUICK_STOCKS = [5, 10, 25, 50];

function validate(name: string, price: string, soluong: string, image: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = 'Nhập tên sản phẩm.';
  else if (name.trim().length > 160) errors.name = 'Tên tối đa 160 ký tự.';
  const p = Number(price);
  if (price.trim() === '') errors.price = 'Nhập giá sản phẩm.';
  else if (!Number.isSafeInteger(p) || p < 0) errors.price = 'Giá phải là số nguyên không âm.';
  const q = Number(soluong);
  if (soluong.trim() === '') errors.soluong = 'Nhập số lượng.';
  else if (!Number.isSafeInteger(q) || q < 0) errors.soluong = 'Số lượng phải là số nguyên không âm.';
  if (!image.trim()) errors.image = 'Chọn ảnh từ điện thoại/máy tính, chụp ảnh hoặc dán URL.';
  else if (!/^https?:\/\//i.test(image) && !/^data:image\//i.test(image)) errors.image = 'Đường dẫn ảnh phải bắt đầu bằng http(s)://';
  return errors;
}

export function ProductFormModal({ visible, initial, onClose, onSave }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [soluong, setSoluong] = useState('');
  const [image, setImage] = useState('');
  const [mode, setMode] = useState<'device' | 'url'>('device');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setPrice(initial ? String(initial.price) : '');
    setSoluong(initial ? String(initial.soluong) : '');
    setImage(initial?.image ?? '');
    setMode('device');
    setErrors({}); setSubmitted(false); setServerError('');
  }, [visible, initial]);

  useEffect(() => { if (submitted) setErrors(validate(name, price, soluong, image)); }, [submitted, name, price, soluong, image]);

  const applyAsset = (asset?: ImagePicker.ImagePickerAsset) => {
    if (!asset) return;
    setImage(asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri);
    setServerError('');
  };

  const pickFromGallery = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setServerError('Vui lòng cấp quyền truy cập Thư viện ảnh trên điện thoại.'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.72, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) applyAsset(result.assets?.[0]);
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setServerError('Vui lòng cấp quyền Camera trên điện thoại để chụp ảnh sản phẩm.'); return; }
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.72, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!result.canceled) applyAsset(result.assets?.[0]);
    } catch {
      await pickFromGallery();
    }
  };

  const submit = async () => {
    setSubmitted(true);
    const next = validate(name, price, soluong, image);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true); setServerError('');
    try {
      await onSave({ name: name.trim(), price: Number(price), soluong: Number(soluong), image: image.trim() });
      onClose();
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm');
    } finally { setSaving(false); }
  };

  const isUpload = image.startsWith('data:');
  const previewPrice = Number.isSafeInteger(Number(price)) && Number(price) >= 0 ? Number(price) : 0;
  const previewQty = Number.isSafeInteger(Number(soluong)) && Number(soluong) >= 0 ? Number(soluong) : 0;
  const previewMeta = stockMeta[stockLevel(previewQty)];

  const preview = (
    <View style={[styles.previewCol, wide && styles.previewColWide]}>
      <Text style={styles.label}>Hình ảnh sản phẩm <Text style={styles.code}>image</Text></Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={image ? 'Đổi ảnh sản phẩm' : 'Chọn ảnh sản phẩm từ thiết bị'}
        onPress={pickFromGallery}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.drop, !!errors.image && styles.dropError, (pressed || hovered) && styles.dropActive]}
      >
        {image ? <>
          <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.changeTag}><Feather name="refresh-cw" size={12} color={colors.surface} /><Text style={styles.changeText}>Đổi ảnh</Text></View>
        </> : <>
          <View style={styles.dropIcon}><Feather name="upload-cloud" size={22} color={colors.purple} /></View>
          <Text style={styles.dropTitle}>Chạm để chọn ảnh từ thiết bị</Text>
          <Text style={styles.dropHint}>Hỗ trợ Thư viện ảnh, Camera di động hoặc URL · tự động đẩy lên Cloudflare R2</Text>
        </>}
      </Pressable>

      <View style={styles.sourceBtnRow}>
        <Pressable accessibilityRole="button" onPress={pickFromGallery} style={({ pressed }) => [styles.sourceBtn, pressed && styles.sourceBtnActive]}>
          <Feather name="image" size={15} color={colors.purple} />
          <Text style={styles.sourceBtnText}>Thư viện</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={takePhoto} style={({ pressed }) => [styles.sourceBtn, pressed && styles.sourceBtnActive]}>
          <Feather name="camera" size={15} color={colors.purple} />
          <Text style={styles.sourceBtnText}>Chụp ảnh</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setMode((m) => (m === 'url' ? 'device' : 'url'))} style={({ pressed }) => [styles.sourceBtn, mode === 'url' && styles.sourceBtnSelected, pressed && styles.sourceBtnActive]}>
          <Feather name="link" size={15} color={colors.purple} />
          <Text style={styles.sourceBtnText}>URL / Mẫu</Text>
        </Pressable>
      </View>

      {mode === 'url' && (
        <View style={{ gap: space.sm }}>
          <Field label="Đường dẫn ảnh (https://...)" value={isUpload ? '' : image} onChangeText={setImage} placeholder={isUpload ? 'Đang dùng ảnh từ thiết bị' : 'https://...'} autoCapitalize="none" keyboardType="url" />
          <View style={styles.quickRow}>
            {SAMPLE_IMAGES.map((item) => (
              <Chip key={item.label} label={item.label} selected={image === item.url} onPress={() => setImage(item.url)} />
            ))}
          </View>
        </View>
      )}

      {errors.image ? <Text style={styles.fieldError}>{errors.image}</Text>
        : isUpload ? <Text style={styles.hint}>Ảnh từ thiết bị đã sẵn sàng tải lên Cloudflare R2.</Text> : null}
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
      subtitle="Ý 1 & Ý 3: Nhập hình ảnh trên di động/web · chỉ lưu 4 trường name, price, soluong, image"
      maxWidth={840}
      footer={<>
        <Button label="Hủy" variant="secondary" onPress={onClose} compact />
        <Button label={saving ? (isUpload ? 'Đang tải lên R2…' : 'Đang lưu…') : initial ? 'Lưu thay đổi' : 'Thêm sản phẩm'} iconName="check" onPress={submit} loading={saving} compact />
      </>}
    >
      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide]} keyboardShouldPersistTaps="handled">
        {preview}
        <View style={styles.fields}>
          <Field label="Tên sản phẩm · name" value={name} onChangeText={setName} placeholder="Ví dụ: Son kem lì Velvet Mây" error={errors.name} maxLength={160} />

          <View style={{ gap: 8 }}>
            <Field label="Giá sản phẩm · price" value={price} onChangeText={(v) => setPrice(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="299000" suffix="VNĐ" error={errors.price} hint={price && !errors.price ? money.format(Number(price)) : undefined} />
            <View style={styles.quickRow}>
              {QUICK_PRICES.map((p) => (
                <Chip key={p} label={`${p / 1000}k`} selected={Number(price) === p} onPress={() => setPrice(String(p))} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Field label="Số lượng · soluong" value={soluong} onChangeText={(v) => setSoluong(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="20" suffix="sản phẩm" error={errors.soluong} />
            <View style={styles.quickRow}>
              {QUICK_STOCKS.map((q) => (
                <Chip key={q} label={`+${q}`} selected={false} onPress={() => setSoluong(String((Number(soluong) || 0) + q))} />
              ))}
              <Chip label="Đặt = 0" selected={soluong === '0'} onPress={() => setSoluong('0')} />
            </View>
          </View>

          <View style={styles.mobilePreviewCard}>
            <View style={styles.mobilePreviewHeader}>
              <Feather name="smartphone" size={13} color={colors.purple} />
              <Text style={styles.mobilePreviewHeaderText}>Xem trước hiển thị trên di động (Ý 3)</Text>
            </View>
            <View style={styles.mobilePreviewRow}>
              <View style={styles.mobileThumbWrap}>
                {image ? <Image source={{ uri: image }} style={styles.mobileThumb} resizeMode="cover" /> : <Feather name="image" size={18} color={colors.purpleSoft} />}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} style={styles.mobilePreviewName}>{name.trim() || 'Tên sản phẩm sẽ hiển thị tại đây'}</Text>
                <Text style={styles.mobilePreviewPrice}>{money.format(previewPrice)}</Text>
                <View style={styles.mobilePreviewMetaRow}>
                  <View style={[styles.miniBadge, { backgroundColor: previewMeta.bg }]}>
                    <Text style={[styles.miniBadgeText, { color: previewMeta.fg }]}>{previewMeta.label}</Text>
                  </View>
                  <Text style={styles.mobilePreviewStock}>SL: {number.format(previewQty)}</Text>
                </View>
              </View>
            </View>
          </View>

          {!!serverError && (
            <View accessibilityRole="alert" style={styles.serverError}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl },
  bodyWide: { flexDirection: 'row', gap: 28 },
  previewCol: { gap: space.md },
  previewColWide: { width: 290 },
  fields: { flex: 1, gap: 16 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  code: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  drop: { aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C4B3DE', backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: space.lg, overflow: 'hidden', gap: space.sm },
  dropActive: { backgroundColor: colors.lilac, borderColor: colors.purpleSoft },
  dropError: { borderColor: colors.dangerSolid },
  dropIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.purple, textAlign: 'center' },
  dropHint: { fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 17 },
  previewImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  changeTag: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(41,38,55,0.78)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  changeText: { fontFamily: font.medium, fontSize: 11, color: colors.surface },
  sourceBtnRow: { flexDirection: 'row', gap: space.sm },
  sourceBtn: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, paddingHorizontal: 8 },
  sourceBtnSelected: { backgroundColor: colors.lilac, borderColor: colors.purple },
  sourceBtnActive: { backgroundColor: colors.lilacDeep },
  sourceBtnText: { fontFamily: font.semibold, fontSize: 12, color: colors.purple },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  fieldError: { fontFamily: font.medium, fontSize: 12, color: colors.danger, lineHeight: 18 },
  mobilePreviewCard: { backgroundColor: colors.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm },
  mobilePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mobilePreviewHeaderText: { fontFamily: font.semibold, fontSize: 11, color: colors.purple },
  mobilePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  mobileThumbWrap: { width: 54, height: 54, borderRadius: radius.sm, backgroundColor: '#F8ECEF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mobileThumb: { width: '100%', height: '100%' },
  mobilePreviewName: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  mobilePreviewPrice: { fontFamily: font.semibold, fontSize: 13, color: colors.purple },
  mobilePreviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontFamily: font.semibold, fontSize: 10 },
  mobilePreviewStock: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  serverError: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  serverErrorText: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 20, color: colors.danger },
});
