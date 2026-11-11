import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../api';
import type { Product, ProductDraft } from '../types';
import { colors, font, radius, space } from '../theme';
import { Button, Chip } from '../ui';
import { Sheet } from './Sheet';

const PRESET_BATCH: ProductDraft[] = [
  {
    name: 'Son kem lì Velvet Cloud Mây #01 Đỏ Đất',
    price: 259000,
    soluong: 32,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=900',
  },
  {
    name: 'Tinh chất phục hồi B5 Calm Drop 30ml',
    price: 349000,
    soluong: 14,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900',
  },
  {
    name: 'Gel rửa mặt dịu nhẹ Amino Soft 150ml',
    price: 189000,
    soluong: 4,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900',
  },
];

export function DataToolsModal({
  visible,
  products,
  onClose,
  onBulkImport,
  onNotify,
}: {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onBulkImport: (items: ProductDraft[]) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState(() => JSON.stringify(PRESET_BATCH, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanJson = JSON.stringify(
    products.map(({ name, price, soluong, image }) => ({ name, price, soluong, image })),
    null,
    2,
  );

  const downloadJson = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([`${cleanJson}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.json';
      a.click();
      URL.revokeObjectURL(url);
      onNotify('Đã tải xuống file products.json');
    }
  };

  const copyJson = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(cleanJson);
      onNotify('Đã sao chép dữ liệu JSON');
    }
  };

  const runImport = async () => {
    setError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setError('Cú pháp JSON không hợp lệ.');
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setError('Dữ liệu nhập cần là một mảng chứa ít nhất 1 sản phẩm.');
      return;
    }
    setBusy(true);
    try {
      await onBulkImport(parsed as ProductDraft[]);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không nhập được dữ liệu');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Nhập & Xuất dữ liệu sản phẩm"
      subtitle="Sao lưu danh mục sản phẩm ra file JSON hoặc thêm nhanh theo lô"
      maxWidth={740}
      footer={
        tab === 'export' ? (
          <>
            <Button label="Sao chép" variant="secondary" iconName="copy" onPress={copyJson} compact />
            {Platform.OS === 'web' && <Button label="Tải xuống products.json" iconName="download" onPress={downloadJson} compact />}
          </>
        ) : (
          <>
            <Button label="Điền dữ liệu mẫu" variant="secondary" onPress={() => setImportText(JSON.stringify(PRESET_BATCH, null, 2))} compact />
            <Button label="Nhập sản phẩm" iconName="upload" onPress={runImport} loading={busy} compact />
          </>
        )
      }
    >
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tabs}>
          <Chip label={`Xuất dữ liệu (${products.length})`} selected={tab === 'export'} onPress={() => setTab('export')} />
          <Chip label="Nhập theo lô" selected={tab === 'import'} onPress={() => setTab('import')} />
        </View>

        {tab === 'export' ? (
          <View style={styles.section}>
            <TextInput value={cleanJson} editable={false} multiline style={styles.codeBox} />
          </View>
        ) : (
          <View style={styles.section}>
            <TextInput value={importText} onChangeText={setImportText} multiline style={styles.codeBox} />
            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={15} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

export function MobileConnectModal({
  visible,
  mobileFrame,
  onToggleMobileFrame,
  onClose,
}: {
  visible: boolean;
  mobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onClose: () => void;
}) {
  const [lanIps, setLanIps] = useState<string[]>(['192.168.1.13']);
  const [selectedIp, setSelectedIp] = useState('192.168.1.13');
  const [mode, setMode] = useState<'expo' | 'web'>('expo');

  useEffect(() => {
    if (!visible) return;
    api.health().then((info) => {
      if (info.lanIps?.length) {
        setLanIps(info.lanIps);
        setSelectedIp(info.lanIps[0] ?? '192.168.1.13');
      }
    }).catch(() => undefined);
  }, [visible]);

  const targetUrl = mode === 'expo' ? `exp://${selectedIp}:8081` : `http://${selectedIp}:8081`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(targetUrl)}`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Ứng dụng Di động"
      subtitle="Quét mã QR để quản lý sản phẩm và chụp ảnh trực tiếp trên điện thoại"
      maxWidth={640}
      footer={
        <>
          {Platform.OS === 'web' && (
            <Button
              label={mobileFrame ? 'Chế độ Màn hình rộng' : 'Xem giao diện Di động'}
              variant="secondary"
              iconName="smartphone"
              onPress={() => { onToggleMobileFrame(); onClose(); }}
              compact
            />
          )}
          <Button label="Đóng" onPress={onClose} compact />
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.qrLayout}>
          <View style={styles.qrCard}>
            <Image source={{ uri: qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
            <Text style={styles.qrUrl}>{targetUrl}</Text>
          </View>
          <View style={styles.qrSteps}>
            <Text style={styles.stepHeading}>Mở trên điện thoại</Text>
            <View style={styles.tabs}>
              <Chip label="Ứng dụng Expo Go" selected={mode === 'expo'} onPress={() => setMode('expo')} />
              <Chip label="Trình duyệt Web" selected={mode === 'web'} onPress={() => setMode('web')} />
            </View>
            {lanIps.length > 1 && (
              <View style={styles.tabs}>
                {lanIps.map((ip) => (
                  <Chip key={ip} label={ip} selected={selectedIp === ip} onPress={() => setSelectedIp(ip)} />
                ))}
              </View>
            )}
            <Text style={styles.helper}>
              Kết nối điện thoại cùng mạng Wi‑Fi với máy tính, sau đó dùng ứng dụng <Text style={styles.bold}>Expo Go</Text> hoặc Camera để quét mã QR bên cạnh.
            </Text>
            {Platform.OS === 'web' && (
              <Pressable onPress={() => { onToggleMobileFrame(); onClose(); }} style={styles.simBox}>
                <Feather name="smartphone" size={18} color={colors.purple} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simTitle}>Chuyển sang bố cục Di động</Text>
                  <Text style={styles.simCopy}>Thu gọn giao diện về kích thước điện thoại ngay trên trình duyệt.</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { gap: space.md },
  bold: { fontFamily: font.semibold, color: colors.ink },
  helper: { fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: colors.muted },
  codeBox: { fontFamily: Platform.select({ web: 'monospace', default: font.regular }), fontSize: 12, lineHeight: 19, color: colors.ink, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: space.md, minHeight: 230, textAlignVertical: 'top' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 12, color: colors.danger },
  qrLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xl, alignItems: 'flex-start' },
  qrCard: { alignItems: 'center', backgroundColor: colors.canvas, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, gap: space.sm },
  qrImage: { width: 190, height: 190, borderRadius: radius.sm, backgroundColor: colors.surface },
  qrUrl: { fontFamily: font.semibold, fontSize: 12, color: colors.purple },
  qrSteps: { flex: 1, minWidth: 240, gap: space.sm },
  stepHeading: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  simBox: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.lilac, padding: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong },
  simTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.purple },
  simCopy: { fontFamily: font.regular, fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 2 },
});
