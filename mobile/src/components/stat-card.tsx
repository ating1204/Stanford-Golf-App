import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PAD = Spacing.three + Spacing.one; // 20

/**
 * A surface that groups one idea. Takes children rather than content props --
 * a Card with twelve content props outlives nothing.
 */
export function StatCard({
  title,
  caption,
  children,
  style,
}: {
  title?: string;
  caption?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface }, style]}>
      {title ? <Text style={[styles.title, { color: c.text }]}>{title}</Text> : null}
      {caption ? <Text style={[styles.caption, { color: c.textSecondary }]}>{caption}</Text> : null}
      {children}
    </View>
  );
}

/**
 * Runs edge to edge inside a card. Negative margins cancel the card padding --
 * an inset rule reads as a gap between two things, a full-bleed rule reads as
 * one thing divided.
 */
export function CardDivider() {
  const c = useTheme();
  return <View style={[styles.divider, { backgroundColor: c.separator }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: PAD,
    gap: Spacing.two,
    boxShadow: Shadows.card,
  },
  title: { ...Type.headline },
  caption: { ...Type.caption, marginTop: -Spacing.one },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -PAD,
    marginVertical: Spacing.two,
  },
});
