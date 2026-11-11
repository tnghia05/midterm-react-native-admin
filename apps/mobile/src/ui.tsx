import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, icon, money, radius, space } from './theme';

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

export function PriceSlider({
  maxPrice,
  value,
  onChange,
  compact,
}: {
  maxPrice: number;
  value: number | null;
  onChange: (next: number | null) => void;
  compact?: boolean;
}) {
  const [trackWidth, setTrackWidth] = useState(160);
  const safeMax = Math.max(maxPrice, 500_000);
  const effectiveValue = value === null || value >= safeMax ? safeMax : Math.max(0, value);
  const isFiltered = value !== null && value < safeMax;

  // Smart two-zone scale so common cosmetic prices (0 - 500k) get 65% of the track even if a high-priced item exists
  const pivot = 500_000;
  const pivotRatio = safeMax > 1_000_000 ? 0.65 : pivot / safeMax;

  const priceToRatio = (price: number): number => {
    if (price >= safeMax) return 1;
    if (price <= 0) return 0;
    if (safeMax <= 1_000_000) return price / safeMax;
    if (price <= pivot) return (price / pivot) * pivotRatio;
    return pivotRatio + ((price - pivot) / (safeMax - pivot)) * (1 - pivotRatio);
  };

  const ratioToPrice = (r: number): number => {
    if (safeMax <= 1_000_000) {
      return Math.round((r * safeMax) / 10_000) * 10_000;
    }
    if (r <= pivotRatio) {
      const raw = (r / pivotRatio) * pivot;
      return Math.round(raw / 10_000) * 10_000;
    }
    const raw = pivot + ((r - pivotRatio) / (1 - pivotRatio)) * (safeMax - pivot);
    const step = raw > 5_000_000 ? 500_000 : 100_000;
    return Math.round(raw / step) * step;
  };

  const ratio = Math.min(1, Math.max(0, priceToRatio(effectiveValue)));

  const updateFromEvent = (evt: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const x = evt.nativeEvent.locationX;
    const r = Math.min(1, Math.max(0, x / trackWidth));
    if (r >= 0.98) {
      onChange(null);
      return;
    }
    onChange(ratioToPrice(r));
  };

  return (
    <View style={[styles.sliderBox, compact && styles.sliderBoxCompact, isFiltered && styles.sliderBoxActive]}>
      <Text style={[styles.sliderLabel, isFiltered && styles.sliderLabelActive]}>Giá:</Text>
      <View
        onLayout={(e) => setTrackWidth(Math.max(60, e.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={updateFromEvent}
        onResponderMove={updateFromEvent}
        style={[styles.sliderHitArea, compact ? { width: 120 } : { width: 165 }]}
      >
        <View pointerEvents="none" style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            { left: Math.max(0, Math.min(trackWidth - 16, ratio * trackWidth - 8)) },
          ]}
        />
      </View>
      <Text style={[styles.sliderValue, isFiltered && styles.sliderValueActive]} numberOfLines={1}>
        {isFiltered ? `≤ ${money.format(effectiveValue)}` : 'Mọi mức giá'}
      </Text>
      {isFiltered && (
        <Pressable accessibilityRole="button" accessibilityLabel="Đặt lại mức giá" onPress={() => onChange(null)} hitSlop={8} style={styles.sliderReset}>
          <Feather name="x" size={12} color={colors.purple} />
        </Pressable>
      )}
    </View>
  );
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
  sliderBox: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  sliderBoxCompact: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sliderBoxActive: {
    backgroundColor: colors.lilac,
    borderColor: '#B49DCF',
  },
  sliderLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.muted,
  },
  sliderLabelActive: {
    fontFamily: font.semibold,
    color: colors.purple,
  },
  sliderHitArea: {
    height: 28,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as object) : {}),
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E4DFEC',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.purple,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  sliderValue: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.muted,
    minWidth: 88,
  },
  sliderValueActive: {
    fontFamily: font.semibold,
    color: colors.purple,
  },
  sliderReset: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DDD1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
