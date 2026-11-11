import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, icon, radius, space } from './theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

export function Brand({ size = 30 }: { size?: number }) {
  return (
    <Text accessibilityRole="header" style={[styles.brand, { fontSize: size, letterSpacing: -size * 0.055 }]}>
      mây<Text style={{ color: colors.purple }}>.</Text>
    </Text>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  iconName?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({ label, onPress, variant = 'primary', iconName, loading, disabled, style, compact }: ButtonProps) {
  const fg = variant === 'primary' || variant === 'danger' ? colors.surface : colors.purple;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={{ color: 'rgba(104,70,172,0.15)' }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        compact && styles.buttonCompact,
        styles[variant],
        (pressed || hovered) && styles[`${variant}Active` as const],
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <>
        {iconName && <Feather name={iconName} size={icon.sm} color={fg} />}
        <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, tone = 'default', size = 40 }: { name: FeatherName; label: string; onPress: () => void; tone?: 'default' | 'danger' | 'plain'; size?: number }) {
  const color = tone === 'danger' ? colors.dangerSolid : tone === 'plain' ? colors.ink : colors.purple;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.iconButton,
        { width: size, height: size },
        tone === 'danger' ? styles.iconDanger : tone === 'plain' ? styles.iconPlain : styles.iconDefault,
        (pressed || hovered) && (tone === 'danger' ? styles.iconDangerActive : styles.iconActive),
      ]}
    >
      <Feather name={name} size={icon.sm + 1} color={color} />
    </Pressable>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string; hint?: string; error?: string; suffix?: string };

export function Field({ label, hint, error, suffix, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          placeholderTextColor="#A39DAD"
          style={[styles.input, style]}
          {...input}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text>
        : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, count }: { label: string; selected: boolean; onPress: () => void; count?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && !selected && styles.chipPressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {count !== undefined && <Text style={[styles.chipCount, selected && styles.chipCountSelected]}>{count}</Text>}
    </Pressable>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionNote}>{children}</Text>;
}

const styles = StyleSheet.create({
  brand: { fontFamily: font.extrabold, color: colors.ink, lineHeight: undefined },
  button: { minHeight: 46, borderRadius: radius.sm, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  buttonCompact: { minHeight: 40, paddingHorizontal: 14 },
  buttonText: { fontFamily: font.semibold, fontSize: 13 },
  primary: { backgroundColor: colors.purple },
  primaryActive: { backgroundColor: colors.purpleDark },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  secondaryActive: { backgroundColor: colors.lilac },
  ghost: { backgroundColor: 'transparent' },
  ghostActive: { backgroundColor: colors.lilac },
  danger: { backgroundColor: colors.dangerSolid },
  dangerActive: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  iconButton: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconDefault: { backgroundColor: colors.lilac },
  iconPlain: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  iconDanger: { backgroundColor: colors.dangerSoft },
  iconActive: { backgroundColor: colors.lilacDeep },
  iconDangerActive: { backgroundColor: '#F7DEDE' },
  field: { gap: 7 },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderColor: '#C9C3D3', borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 13 },
  inputError: { borderColor: colors.dangerSolid },
  input: { flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 15, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as never,
  suffix: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginLeft: space.sm },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  fieldError: { fontFamily: font.medium, fontSize: 12, color: colors.danger, lineHeight: 18 },
  chip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.lilac, borderColor: '#B49DCF' },
  chipPressed: { backgroundColor: colors.canvas },
  chipText: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  chipTextSelected: { color: colors.purple, fontFamily: font.semibold },
  chipCount: { fontFamily: font.medium, fontSize: 10, color: colors.muted, backgroundColor: '#F0EDF3', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  chipCountSelected: { backgroundColor: '#DDD1ED', color: colors.purple },
  sectionNote: { fontFamily: font.medium, fontSize: 12, color: colors.purple },
});
