import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';

const OUTER = 44;
const GAP = 4; // between the two rings of a double circle/square

/**
 * A score drawn the way it's marked on a paper scorecard, relative to par:
 * double circle = eagle or better, circle = birdie, plain = par (labelled),
 * square = bogey, double square = double bogey or worse.
 */
export function ScoreMark({
  score,
  par,
  color,
  lineColor,
  label,
}: {
  score: number;
  par: number;
  color: string;
  lineColor: string;
  /** shown instead of the number (e.g. "?"), still framed as `score` would be */
  label?: string;
}) {
  const diff = score - par;
  const round = diff < 0;
  const double = Math.abs(diff) >= 2;
  const text = <Text style={[styles.number, { color }]}>{label ?? score}</Text>;

  if (diff === 0) {
    // same box as a single ring, so the number sits on the same line as its neighbours;
    // "Par" hangs underneath without pushing the number up
    return (
      <View style={styles.par}>
        {text}
        <Text style={[styles.parLabel, { color: lineColor }]}>Par</Text>
      </View>
    );
  }

  const ring = (size: number, children: ReactNode) => (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderColor: lineColor, borderRadius: round ? Radius.full : 2 },
      ]}
    >
      {children}
    </View>
  );

  return double ? ring(OUTER, ring(OUTER - GAP * 2, text)) : ring(OUTER - GAP, text);
}

const styles = StyleSheet.create({
  ring: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  number: { ...Type.title, fontVariant: ['tabular-nums'] },
  par: { width: OUTER - GAP, height: OUTER - GAP, alignItems: 'center', justifyContent: 'center' },
  parLabel: {
    ...Type.caption,
    position: 'absolute',
    top: OUTER - GAP - 3,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
