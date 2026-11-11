import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { IconButton } from '../ui';

type Props = { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; maxWidth?: number; footer?: ReactNode };

// Hộp thoại responsive: căn giữa trên màn hình rộng, bottom-sheet trên điện thoại.
export function Sheet({ visible, title, subtitle, onClose, children, maxWidth = 760, footer }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.shade, wide ? styles.shadeCenter : styles.shadeBottom]}>
        <Pressable accessibilityLabel="Đóng hộp thoại" style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.box, wide ? [styles.boxWide, { maxWidth }] : styles.boxSheet]}>
          {!wide && <View style={styles.handle} />}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <IconButton name="x" label="Đóng" onPress={onClose} tone="plain" />
          </View>
          {children}
          {footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: colors.scrim },
  shadeCenter: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  shadeBottom: { justifyContent: 'flex-end' },
  box: { backgroundColor: colors.surface, overflow: 'hidden' },
  boxWide: { width: '100%', maxHeight: '92%', borderRadius: 13, shadowColor: colors.ink, shadowOpacity: 0.2, shadowRadius: 40, shadowOffset: { width: 0, height: 20 } },
  boxSheet: { maxHeight: '94%', borderTopLeftRadius: radius.xl + 4, borderTopRightRadius: radius.xl + 4 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  title: { fontFamily: font.semibold, fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: space.md, justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingVertical: space.lg, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
