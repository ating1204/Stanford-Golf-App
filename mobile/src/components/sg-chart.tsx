import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { Chart, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSg, SG_CATEGORIES, type SgCategory } from '@/utils/stats';

const PLOT_H = 170;
const PAD_TOP = 18; // room for the value label above a positive bar
const PAD_BOTTOM = 18; // ...and below a negative one
const CAP = 4; // rounded data-end
const BAR_FRACTION = 0.52;

/**
 * Bar path with only the data end rounded. The baseline end stays square so the
 * bar visibly sits on the axis rather than floating above it.
 */
function barPath(x: number, w: number, yBase: number, yData: number) {
  const up = yData < yBase;
  const r = Math.min(CAP, Math.abs(yBase - yData) / 2, w / 2);
  return up
    ? `M ${x} ${yBase} L ${x} ${yData + r} Q ${x} ${yData} ${x + r} ${yData}
       L ${x + w - r} ${yData} Q ${x + w} ${yData} ${x + w} ${yData + r}
       L ${x + w} ${yBase} Z`
    : `M ${x} ${yBase} L ${x} ${yData - r} Q ${x} ${yData} ${x + r} ${yData}
       L ${x + w - r} ${yData} Q ${x + w} ${yData} ${x + w} ${yData - r}
       L ${x + w} ${yBase} Z`;
}

/**
 * Diverging column chart. Strokes gained is signed and zero -- playing to the
 * baseline -- is the meaningful midpoint, so bars grow up or down from a drawn
 * zero axis rather than from the bottom of the plot.
 *
 * The axis sits where zero actually falls in the data range, not at the middle
 * of the box: with values from +0.6 to -2.1, centring it would waste half the
 * plot on empty space above the line.
 *
 * Every bar is labelled -- the fills are below 3:1 contrast on a white card, so
 * colour cannot be the only carrier of the value.
 */
export function SgChart({ byCategory }: { byCategory: Record<SgCategory, number> }) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = SG_CATEGORIES.map((k) => byCategory[k]);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const plotTop = PAD_TOP;
  const plotBottom = PLOT_H - PAD_BOTTOM;
  const zeroY = plotTop + (max / span) * (plotBottom - plotTop);
  const yFor = (v: number) => plotTop + ((max - v) / span) * (plotBottom - plotTop);

  const col = width / SG_CATEGORIES.length;
  const barW = col * BAR_FRACTION;

  return (
    <View onLayout={onLayout} style={styles.root}>
      {width > 0 && (
        <Svg width={width} height={PLOT_H}>
          {/* the zero axis: the reference every bar is measured against */}
          <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={c.textSecondary} strokeWidth={1} />
          <SvgText x={2} y={zeroY - 5} fontSize={9} fill={c.textSecondary}>
            0
          </SvgText>

          {SG_CATEGORIES.map((key, i) => {
            const v = byCategory[key];
            const x = col * i + (col - barW) / 2;
            const yData = yFor(v);
            const positive = v >= 0;
            return (
              <Path
                key={key}
                d={barPath(x, barW, zeroY, yData)}
                fill={positive ? Chart.positive : Chart.negative}
              />
            );
          })}

          {SG_CATEGORIES.map((key, i) => {
            const v = byCategory[key];
            const positive = v >= 0;
            const yData = yFor(v);
            return (
              <SvgText
                key={`v-${key}`}
                x={col * i + col / 2}
                y={positive ? yData - 6 : yData + 14}
                fontSize={11}
                fontWeight="600"
                fill={positive ? Chart.positive : Chart.negative}
                textAnchor="middle"
              >
                {formatSg(v)}
              </SvgText>
            );
          })}
        </Svg>
      )}

      {/* category axis, on the same six-column grid as the bars */}
      <View style={styles.axis}>
        {SG_CATEGORIES.map((key) => (
          <View key={key} style={styles.axisCol}>
            <Text style={[styles.axisLabel, { color: c.textSecondary }]} numberOfLines={2}>
              {key}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: Spacing.two },
  axis: { flexDirection: 'row', marginTop: Spacing.one },
  axisCol: { flex: 1, alignItems: 'center' },
  axisLabel: { ...Type.caption, fontSize: 10, textAlign: 'center' },
});
