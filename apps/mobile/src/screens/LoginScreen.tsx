import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, API_URL } from '../api';
import { colors, font, radius, space } from '../theme';
import { Brand, Button, Field } from '../ui';

export function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) { setError('Nhập email và mật khẩu để tiếp tục.'); return; }
    setLoading(true); setError('');
    try { onLogin((await api.login(email.trim(), password)).token); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.banner}><Text style={styles.bannerText}>Kênh người bán · Bài giữa kỳ Lập trình đa nền tảng</Text></View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, wide && styles.scrollWide]} keyboardShouldPersistTaps="handled">
          <View style={[styles.layout, wide && styles.layoutWide]}>
            <View style={[styles.intro, wide && styles.introWide]}>
              <Text style={styles.introMark}>mây.</Text>
              <Text style={[styles.introTitle, !wide && styles.introTitleSmall]}>Quản lý sản phẩm{'\n'}của shop, gọn gàng.</Text>
              <Text style={styles.introCopy}>Thêm, sửa, xóa sản phẩm và tải ảnh trực tiếp từ máy tính hoặc điện thoại. Dữ liệu lưu trên MongoDB Atlas, ảnh lưu trên Cloudflare R2.</Text>
              {wide && (
                <View style={styles.introList}>
                  {[['database', 'Chỉ 4 trường: name, price, soluong, image'], ['smartphone', 'Chạy trên Web, Android và iOS'], ['image', 'Ảnh tải lên R2, hiển thị mọi thiết bị']].map(([iconName, text]) => (
                    <View key={text} style={styles.introItem}>
                      <View style={styles.introIcon}><Feather name={iconName as 'database'} size={15} color={colors.purple} /></View>
                      <Text style={styles.introItemText}>{text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.panel, wide && styles.panelWide]}>
              {!wide && <Brand size={30} />}
              <Text style={styles.panelTitle}>Đăng nhập kênh người bán</Text>
              <Text style={styles.panelMuted}>Dùng tài khoản quản trị được cấu hình trên máy chủ.</Text>
              <View style={styles.form}>
                <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
                <View>
                  <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
                  <Text accessibilityRole="button" onPress={() => setShowPassword((v) => !v)} style={styles.toggle}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
                </View>
                {!!error && (
                  <View accessibilityRole="alert" style={styles.error}>
                    <Feather name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                <Button label="Đăng nhập" iconName="arrow-right" onPress={submit} loading={loading} />
              </View>
              <Text style={styles.endpoint}>Máy chủ API: {API_URL}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  banner: { backgroundColor: colors.banner, paddingVertical: 9, paddingHorizontal: 16 },
  bannerText: { fontFamily: font.regular, fontSize: 11, color: colors.bannerText, textAlign: 'center' },
  scroll: { flexGrow: 1, padding: space.lg },
  scrollWide: { justifyContent: 'center', padding: space.xxxl },
  layout: { gap: space.xl, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  layoutWide: { flexDirection: 'row', gap: 70, alignItems: 'stretch' },
  intro: { backgroundColor: colors.lilac, borderRadius: radius.md, padding: space.xl },
  introWide: { flex: 1, padding: 40, minHeight: 520 },
  introMark: { fontFamily: font.extrabold, fontSize: 22, color: colors.purple, marginBottom: space.xl },
  introTitle: { fontFamily: font.bold, fontSize: 40, lineHeight: 52, letterSpacing: -1.4, color: colors.ink },
  introTitleSmall: { fontSize: 28, lineHeight: 38, letterSpacing: -0.8 },
  introCopy: { fontFamily: font.regular, fontSize: 14, lineHeight: 25, color: colors.muted, marginTop: space.lg, maxWidth: 420 },
  introList: { marginTop: 'auto', gap: space.md, paddingTop: space.xxl },
  introItem: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  introIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  introItemText: { fontFamily: font.medium, fontSize: 13, color: '#55506A' },
  panel: { gap: space.sm },
  panelWide: { flex: 1, paddingTop: 30, maxWidth: 460 },
  panelTitle: { fontFamily: font.semibold, fontSize: 24, lineHeight: 34, color: colors.ink, marginTop: space.sm },
  panelMuted: { fontFamily: font.regular, fontSize: 13, lineHeight: 22, color: colors.muted },
  form: { gap: 18, marginTop: space.xl },
  toggle: { fontFamily: font.medium, fontSize: 12, color: colors.purple, alignSelf: 'flex-end', marginTop: space.sm, paddingVertical: 4 },
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.sm },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 20, color: colors.danger },
  endpoint: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: space.xl },
});
