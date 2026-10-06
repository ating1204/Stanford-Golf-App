import { StyleSheet, View } from 'react-native';

import { Chart, Radius, Spacing } from '@/constants/theme';

/**
 * Per-round sparkbars. No axis and no labels by design -- this shows shape
 * (are you steady or streaky), not values. The number above it carries those.
 */
export function MiniBars({ values, height = 44 }: { values: number[]; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <View style={[styles.row, { height }]}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: Math.max(3, (v / max) * height), backgroundColor: Chart.positive },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one, marginTop: Spacing.two },
  bar: { flex: 1, borderRadius: Radius.sm, opacity: 0.55 },
});
