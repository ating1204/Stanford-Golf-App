import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HudSurface } from '@/components/hud-surface';
import { MapColors, Radius, Spacing, Type } from '@/constants/theme';

/**
 * The bar across the top of the map: a back control, then one glass pill holding
 * the facts you glance at between shots -- hole, distance to the middle of the
 * green, par, and the tee you are playing.
 */
export function HoleHeader({
  holeNumber,
  toGreen,
  targetLabel = 'Mid Green',
  par,
  teeName,
  teeYards,
  onBack,
  onPickHole,
  pickerOpen = false,
  onPillLayout,
}: {
  holeNumber: number;
  toGreen: number | null;
  /** names what `toGreen` measures to */
  targetLabel?: string;
  par: number;
  teeName: string;
  teeYards: number;
  onBack: () => void;
  onPickHole?: () => void;
  /** flips the chevron while the hole list hangs below */
  pickerOpen?: boolean;
  /** where the glass pill sits on screen, so the hole list can attach right under it */
  onPillLayout?: (frame: { x: number; y: number; width: number; height: number }) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.one }]} pointerEvents="box-none">
      <HudSurface interactive style={styles.back}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={4}
          style={styles.fill}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            weight="semibold"
            tintColor={MapColors.hudText}
          />
        </Pressable>
      </HudSurface>

      <HudSurface style={styles.pill} onLayout={(e) => onPillLayout?.(e.nativeEvent.layout)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hole ${holeNumber}, choose hole`}
          accessibilityState={{ expanded: pickerOpen }}
          onPress={onPickHole}
          hitSlop={8}
          style={styles.holeCell}
        >
          <Text style={styles.holeNumber}>{holeNumber}</Text>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
            size={10}
            weight="bold"
            tintColor={MapColors.hudMuted}
            style={{ transform: [{ rotate: pickerOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>

        <Field label={targetLabel} value={toGreen != null ? `${toGreen}` : '—'} unit="Yds" strong />
        <Field label="Par" value={`${par}`} />
        <Field label={teeName} value={`${teeYards}`} />
      </HudSurface>
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
  back: { width: 44, height: 44, borderRadius: Radius.full },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  holeCell: { alignItems: 'center', minWidth: 28, minHeight: 44, justifyContent: 'center' },
  holeNumber: { ...Type.numeral, color: MapColors.hudText, lineHeight: 30 },
  field: { flex: 1 },
  fieldLabel: { ...Type.caption, color: MapColors.hudMuted },
  fieldLine: { flexDirection: 'row', alignItems: 'baseline' },
  fieldValue: { ...Type.numeralSmall, color: MapColors.hudText },
  fieldValueStrong: { ...Type.numeral, color: MapColors.hudText },
  fieldUnit: { ...Type.caption, color: MapColors.hudMuted, marginLeft: 2 },
});
