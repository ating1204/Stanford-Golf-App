import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapColors, Radius, Spacing, Type } from '@/constants/theme';

/**
 * The bar across the top of the map: a back control, then one dark pill holding
 * the facts you glance at between shots -- hole, distance to the middle of the
 * green, par, and the tee you are playing.
 */
export function HoleHeader({
  holeNumber,
  toGreen,
  par,
  teeName,
  teeYards,
  onBack,
  onPickHole,
}: {
  holeNumber: number;
  toGreen: number | null;
  par: number;
  teeName: string;
  teeYards: number;
  onBack: () => void;
  onPickHole?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.one }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={10}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>

      <View style={styles.pill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hole ${holeNumber}, choose hole`}
          onPress={onPickHole}
          hitSlop={8}
          style={styles.holeCell}
        >
          <Text style={styles.holeNumber}>{holeNumber}</Text>
          <Text style={styles.caret}>▾</Text>
        </Pressable>

        <Field label="Mid Green" value={toGreen != null ? `${toGreen}` : '—'} unit="Yds" strong />
        <Field label="Par" value={`${par}`} />
        <Field label={teeName} value={`${teeYards}`} />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  unit,
  strong,
}: {
  label: string;
  value: string;
  unit?: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.fieldLine}>
        <Text style={[styles.fieldValue, strong && styles.fieldValueStrong]}>{value}</Text>
        {unit ? <Text style={styles.fieldUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: MapColors.hudStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  backGlyph: { color: MapColors.hudText, fontSize: 26, lineHeight: 28, marginTop: -2 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MapColors.hudStrong,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  holeCell: { alignItems: 'center', minWidth: 22 },
  holeNumber: { ...Type.title, color: MapColors.hudText, lineHeight: 26 },
  caret: { color: MapColors.hudMuted, fontSize: 9, marginTop: -2 },
  field: { flex: 1 },
  fieldLabel: { ...Type.caption, fontSize: 10, color: MapColors.hudMuted },
  fieldLine: { flexDirection: 'row', alignItems: 'baseline' },
  fieldValue: { ...Type.headline, color: MapColors.hudText },
  fieldValueStrong: { ...Type.title, color: MapColors.hudText },
  fieldUnit: { ...Type.caption, fontSize: 10, color: MapColors.hudMuted, marginLeft: 1 },
});
