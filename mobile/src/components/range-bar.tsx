import { StyleSheet, Text, View } from 'react-native';

import { Chart, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A value placed on a fixed scale, with the scale's ends labelled. */
export function RangeBar({
  label,
  value,
  min,
  max,
  ticks,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  ticks: number[];
  unit?: string;
}) {
  const c = useTheme();
  const fraction = Math.min(1, Math.max(0, (value - min) / (max - min)));

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        <Text style={[styles.value, { color: c.text }]}>
          {value}
          {unit ? <Text style={{ color: c.textSecondary }}> {unit}</Text> : null}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: Chart.grid }]}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: Chart.positive }]} />
      </View>
      <View style={styles.ticks}>
        {ticks.map((t) => (
          <Text key={t} style={[styles.tick, { color: c.textSecondary }]}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.one },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...Type.subhead },
  value: { ...Type.headline },
  track: { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: 10, borderRadius: Radius.full },
  ticks: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { ...Type.caption },
});
