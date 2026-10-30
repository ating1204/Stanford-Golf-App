import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Radius, Selected, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { label as labelOf } from '@/state/round';

type Miss = 'long' | 'short' | 'left' | 'right';

// smooth, no bounce. Opening: the space opens and the rows below ease down while
// the misses fade in place -- one duration and curve for both, so nothing moves
// at a different speed. Closing: the misses fade out fast first, then the rows ease up.
const EASE = Easing.out(Easing.cubic);
export const GLIDE = LinearTransition.duration(360).easing(EASE);
const DROP_IN = FadeIn.duration(360).easing(EASE);
const DROP_OUT = FadeOut.duration(110);

const MISSES: readonly Miss[] = ['left', 'long', 'short', 'right'];

/**
 * ✓ or ✕ for fairway / green in regulation. ✓ saves "hit"; ✕ opens the miss
 * directions (plus any extras, e.g. GIR's "No Chance") and the direction is what
 * gets saved. Tapping the selected choice again clears it.
 */
export function HitOrMiss<T extends string>({
  label,
  value,
  onChange,
  extra = [],
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  extra?: readonly T[];
}) {
  const c = useTheme();
  const hit = value === 'hit';
  // ✕ can be open before a direction is picked; nothing is saved until one is
  const [missOpen, setMissOpen] = useState(value !== null && !hit);
  const missed = missOpen && !hit;

  const choose = (v: T | null) => {
    Haptics.selectionAsync();
    onChange(v);
  };

  const toggle = (on: boolean, accessibility: string, icon: SymbolViewProps['name'], onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${accessibility}`}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        on ? styles.selected : { backgroundColor: c.fill },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={18} weight="bold" tintColor={on ? Selected.text : c.text} />
    </Pressable>
  );

  return (
    // the layout transition lets everything below glide down when the misses open
    <Animated.View layout={GLIDE} style={styles.root}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        {toggle(hit, 'hit', { ios: 'checkmark', android: 'check', web: 'check' }, () => {
          setMissOpen(false);
          choose(hit ? null : ('hit' as T));
        })}
        {toggle(missed, 'missed', { ios: 'xmark', android: 'close', web: 'close' }, () => {
          if (missed) {
            setMissOpen(false);
            choose(null);
          } else {
            Haptics.selectionAsync();
            setMissOpen(true);
            if (hit) onChange(null);
          }
        })}
      </View>

      {missed && (
        // appears in place as the rows below make room; fades out quickly on close
        <Animated.View entering={DROP_IN} exiting={DROP_OUT} style={styles.misses}>
          {MISSES.map((m) => {
            const selected = value === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityLabel={`Missed ${labelOf(m)}`}
                accessibilityState={{ selected }}
                onPress={() => choose(selected ? null : (m as T))}
                style={({ pressed }) => [
                  styles.miss,
                  selected ? styles.selected : { backgroundColor: c.fill },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.missText, { color: c.text }, selected && styles.selectedText]}>{labelOf(m)}</Text>
              </Pressable>
            );
          })}
          {extra.map((x) => {
            const selected = value === x;
            return (
              <Pressable
                key={x}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => choose(selected ? null : x)}
                style={({ pressed }) => [
                  styles.miss,
                  styles.extra,
                  selected ? styles.selected : { backgroundColor: c.fill },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.missText, { color: c.text }, selected && styles.selectedText]}>{labelOf(x)}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { ...Type.headline, flex: 1 },
  selected: { backgroundColor: Selected.fill, borderColor: Selected.edge },
  selectedText: { color: Selected.text, fontWeight: '800' },
  toggle: {
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
    width: 64,
    height: 46,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  misses: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  miss: {
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  extra: { flexBasis: '100%' },
  missText: { ...Type.subhead, fontWeight: '600' },
});
