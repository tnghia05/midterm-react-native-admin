import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, radius, space } from '../theme';
import { Button } from '../ui';

export function ConfirmDialog({ visible, title, message, confirmLabel, onCancel, onConfirm, loading }: { visible: boolean; title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.shade}>
        <Pressable accessibilityLabel="Hủy" style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View accessibilityRole="alert" style={styles.box}>
          <View style={styles.icon}><Feather name="trash-2" size={20} color={colors.dangerSolid} /></View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <Button label="Hủy" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button label={confirmLabel} variant="danger" onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(onHide);
    }, 2600);
    return () => clearTimeout(timer);
  }, [message, onHide, opacity]);
  if (!message) return null;
  return (
    <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { opacity }]} pointerEvents="none">
      <Feather name="check-circle" size={16} color="#D0BEE9" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  box: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: 13, padding: space.xl, gap: space.sm },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { fontFamily: font.semibold, fontSize: 18, color: colors.ink },
  message: { fontFamily: font.regular, fontSize: 13, lineHeight: 21, color: colors.muted },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  toast: { position: 'absolute', bottom: 28, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.md - 1, maxWidth: '90%', shadowColor: colors.ink, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  toastText: { fontFamily: font.medium, fontSize: 13, color: colors.surface, flexShrink: 1 },
});
