import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Chart, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSg } from '@/utils/stats';

const HEIGHT = 120;
const PAD = 6;

/**
 * One series, so no legend -- the card title names it. The latest point is
 * direct-labelled; the rest are not, because a number on every point is noise.
 */
export function TrendLine({ values }: { values: number[] }) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (values.length < 2) {
    return <Text style={[styles.empty, { color: c.textSecondary }]}>Not enough rounds yet.</Text>;
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (values.length - 1)) * (width - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (HEIGHT - PAD * 2);

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values[values.length - 1];

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {/* zero reference, recessive */}
          {min < 0 && max > 0 && (
            <Line
              x1={PAD}
              y1={y(0)}
              x2={width - PAD}
              y2={y(0)}
              stroke={Chart.zeroLine}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          )}
          <Polyline
            points={points}
            fill="none"
            stroke={Chart.trend}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* surface ring keeps the marker legible where it overlaps the line */}
          <Circle cx={x(values.length - 1)} cy={y(last)} r={5} fill={Chart.trend} stroke={c.surface} strokeWidth={2} />
        </Svg>
      )}
      <Text style={[styles.latest, { color: c.textSecondary }]}>
        Latest <Text style={{ color: c.text }}>{formatSg(last)}</Text> · best{' '}
        <Text style={{ color: c.text }}>{formatSg(Math.max(...values))}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...Type.subhead, paddingVertical: Spacing.four, textAlign: 'center' },
  latest: { ...Type.caption, marginTop: Spacing.one },
});
