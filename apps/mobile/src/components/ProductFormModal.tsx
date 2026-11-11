import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import type { Product, ProductDraft } from '../types';
import { colors, font, money, radius, space } from '../theme';
import { Button, Chip, Field } from '../ui';
import { Sheet } from './Sheet';

type Errors = Partial<Record<keyof ProductDraft, string>>;
type Props = { visible: boolean; initial?: Product; onClose: () => void; onSave: (draft: ProductDraft) => Promise<void> };

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
  if (!image.trim()) errors.image = 'Chọn ảnh từ thiết bị hoặc dán đường dẫn ảnh.';
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setImage(asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri);
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
  const preview = (
    <View style={[styles.previewCol, wide && styles.previewColWide]}>
      <Text style={styles.label}>Hình ảnh <Text style={styles.code}>image</Text></Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={image ? 'Đổi ảnh sản phẩm' : 'Chọn ảnh sản phẩm từ thiết bị'}
        onPress={pickImage}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.drop, !!errors.image && styles.dropError, (pressed || hovered) && styles.dropActive]}
      >
        {image ? <>
          <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.changeTag}><Feather name="refresh-cw" size={12} color={colors.surface} /><Text style={styles.changeText}>Đổi ảnh</Text></View>
        </> : <>
          <View style={styles.dropIcon}><Feather name="upload-cloud" size={22} color={colors.purple} /></View>
          <Text style={styles.dropTitle}>Chọn ảnh từ thiết bị</Text>
          <Text style={styles.dropHint}>PNG, JPG hoặc WEBP · ảnh sẽ được tải lên Cloudflare R2</Text>
        </>}
      </Pressable>
      <View style={styles.modeRow}>
        <Chip label="Từ thiết bị" selected={mode === 'device'} onPress={() => setMode('device')} />
        <Chip label="Dán URL" selected={mode === 'url'} onPress={() => setMode('url')} />
      </View>
      {mode === 'url' && (
        <Field label="Đường dẫn ảnh" value={isUpload ? '' : image} onChangeText={setImage} placeholder={isUpload ? 'Đang dùng ảnh từ thiết bị' : 'https://...'} autoCapitalize="none" keyboardType="url" />
      )}
      {errors.image ? <Text style={styles.fieldError}>{errors.image}</Text>
        : isUpload ? <Text style={styles.hint}>Ảnh mới sẽ được tải lên R2 khi bạn lưu.</Text> : null}
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
      subtitle="Cơ sở dữ liệu chỉ lưu 4 trường: name, price, soluong, image"
      footer={<>
        <Button label="Hủy" variant="secondary" onPress={onClose} compact />
        <Button label={saving ? (isUpload ? 'Đang tải ảnh…' : 'Đang lưu…') : initial ? 'Lưu thay đổi' : 'Thêm sản phẩm'} iconName="check" onPress={submit} loading={saving} compact />
      </>}
    >
      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide]} keyboardShouldPersistTaps="handled">
        {preview}
        <View style={styles.fields}>
          <Field label="Tên sản phẩm · name" value={name} onChangeText={setName} placeholder="Ví dụ: Son kem lì Velvet" error={errors.name} maxLength={160} />
          <Field label="Giá sản phẩm · price" value={price} onChangeText={(v) => setPrice(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="299000" suffix="VNĐ" error={errors.price} hint={price && !errors.price ? money.format(Number(price)) : undefined} />
          <Field label="Số lượng · soluong" value={soluong} onChangeText={(v) => setSoluong(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="20" suffix="sản phẩm" error={errors.soluong} />
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
  previewColWide: { width: 280 },
  fields: { flex: 1, gap: 18 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  code: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  drop: { aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C4B3DE', backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: space.lg, overflow: 'hidden', gap: space.sm },
  dropActive: { backgroundColor: colors.lilac, borderColor: colors.purpleSoft },
  dropError: { borderColor: colors.dangerSolid },
  dropIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.purple },
  dropHint: { fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 17 },
  previewImage: { ...StyleSheet.absoluteFillObject },
  changeTag: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(41,38,55,0.78)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  changeText: { fontFamily: font.medium, fontSize: 11, color: colors.surface },
  modeRow: { flexDirection: 'row', gap: space.sm },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  fieldError: { fontFamily: font.medium, fontSize: 12, color: colors.danger, lineHeight: 18 },
  serverError: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  serverErrorText: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 20, color: colors.danger },
});
