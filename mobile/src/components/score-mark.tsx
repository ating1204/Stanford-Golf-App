import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';

// `gap` is the space between the two rings of a double circle/square
const SIZES = { regular: { outer: 44, gap: 4 }, small: { outer: 27, gap: 2.5 } } as const;

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
  size = 'regular',
}: {
  score: number;
  par: number;
  color: string;
  lineColor: string;
  /** shown instead of the number (e.g. "?"), still framed as `score` would be */
  label?: string;
  /** `small` fits a scorecard row: smaller marks, and par stays a plain number */
  size?: keyof typeof SIZES;
}) {
  const { outer, gap } = SIZES[size];
  const small = size === 'small';
  const diff = score - par;
  const round = diff < 0;
  const double = Math.abs(diff) >= 2;
  const text = <Text style={[small ? styles.smallNumber : styles.number, { color }]}>{label ?? score}</Text>;

  if (diff === 0 && small) return text;
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

  const ring = (ringSize: number, children: ReactNode) => (
    <View
      style={[
        styles.ring,
        { width: ringSize, height: ringSize, borderColor: lineColor, borderRadius: round ? Radius.full : 2 },
      ]}
    >
      {children}
    </View>
  );

  return double ? ring(outer, ring(outer - gap * 2, text)) : ring(outer - gap, text);
}

const styles = StyleSheet.create({
  ring: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  number: { ...Type.title, fontVariant: ['tabular-nums'] },
  smallNumber: { ...Type.footnote, fontSize: 14, fontVariant: ['tabular-nums'] },
  par: {
    width: SIZES.regular.outer - SIZES.regular.gap,
    height: SIZES.regular.outer - SIZES.regular.gap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parLabel: {
    ...Type.caption,
    position: 'absolute',
    top: SIZES.regular.outer - SIZES.regular.gap - 3,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
