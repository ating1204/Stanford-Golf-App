import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Label above a large value -- the unit this dashboard is built from.
 * The label is primary ink, not secondary: in the reference it reads as a
 * heading for the number, not as a caption beneath it.
 */
export function Metric({
  label,
  value,
  suffix,
  note,
  color,
  style,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[styles.root, style]}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <View style={styles.line}>
        <Text style={[styles.value, { color: color ?? c.text }]}>{value}</Text>
        {suffix ? <Text style={[styles.suffix, { color: c.textSecondary }]}>{suffix}</Text> : null}
        {note ? <Text style={[styles.note, { color: c.textSecondary }]}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.half },
  label: { ...Type.footnote },
  line: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 40 },
  suffix: { ...Type.footnote, marginLeft: 1 },
  note: { ...Type.caption, marginLeft: Spacing.half },
});
