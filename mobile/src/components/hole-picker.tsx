import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassButton } from '@/components/glass-button';
import { HudSurface } from '@/components/hud-surface';
import { Green, MapColors, Radius, Selected, Spacing, Type } from '@/constants/theme';

const ALL_HOLES = Array.from({ length: 18 }, (_, i) => i + 1);
/** space between the header pill and the list hanging under it */
const ATTACH_GAP = 6;
/** the hole number's centre, measured from the pill's left edge (its padding + half the cell) */
const ORIGIN_X = Spacing.three + 14;

// like an iOS long-press menu: springs open out of the hole number, tucks back fast
const OPEN = { damping: 19, stiffness: 260, mass: 0.8 } as const;
const CLOSE = { duration: 170, easing: Easing.in(Easing.cubic) };

/**
 * Hangs from the map header's glass pill: all 18 holes in a 6x3 grid, then
 * Finish Round. It grows out of the hole number (and shrinks back into it); the
 * map behind stays as it is, and it shares the pill's left and right edges.
 * The current hole is outlined, scored holes show in green, holes off the nine
 * you're playing are dimmed. Stays mounted until its close animation ends.
 */
export function HolePicker({
  open,
  anchor,
  current,
  playable,
  scored,
  onPick,
  onFinish,
  onRequestClose,
  onClosed,
}: {
  open: boolean;
  /** the header pill's frame on screen */
  anchor: { x: number; y: number; width: number; height: number };
  current: number;
  playable: readonly number[];
  scored: (holeNumber: number) => boolean;
  onPick: (holeNumber: number) => void;
  onFinish: () => void;
  onRequestClose: () => void;
  /** the close animation finished; safe to unmount */
  onClosed: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) progress.set(withSpring(1, OPEN));
    else
      progress.set(
        withTiming(0, CLOSE, (finished) => {
          if (finished) scheduleOnRN(onClosed);
        }),
      );
  }, [open, progress, onClosed]);

  // the glass only scales -- iOS drops the glass material on a view that's fading,
  // so the fade goes on the numbers inside instead. A spring past 1 gives the
  // small iOS overshoot as it lands.
  const menuStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.15 + 0.85 * progress.get() }] }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.25, 0.8], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      {/* invisible: just catches a tap outside the list to close it (no dim -- it darkened the glass) */}
      <Animated.View style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityLabel="Close hole list"
          onPress={onRequestClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.menuWrap,
          { top: anchor.y + anchor.height + ATTACH_GAP, left: anchor.x, width: anchor.width },
          // grow from the hole number at the top-left, where the tap was
          { transformOrigin: `${ORIGIN_X}px 0px` },
          menuStyle,
        ]}
      >
        {/* the same dark glass as the header pill it hangs from */}
        <HudSurface style={styles.menu} tint={MapColors.hudTintLarge}>
          <Animated.View style={[styles.grid, contentStyle]}>
            {ALL_HOLES.map((n) => {
              const isCurrent = n === current;
              const canPlay = playable.includes(n);
              const done = scored(n);
              return (
                <View key={n} style={styles.cell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Hole ${n}${done ? ', scored' : ''}${isCurrent ? ', current' : ''}`}
                    accessibilityState={{ selected: isCurrent, disabled: !canPlay }}
                    disabled={!canPlay}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onPick(n);
                    }}
                    style={({ pressed }) => [
                      styles.hole,
                      isCurrent && styles.current,
                      !canPlay && styles.off,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.holeText, { color: done ? Green.bright : MapColors.hudText }]}>
                      {n}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Animated.View>
          <GlassButton label="Finish Round" onPress={onFinish} style={styles.finish} />
        </HudSurface>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuWrap: { position: 'absolute' },
  // same corner family as the header pill it hangs from
  menu: {
    borderRadius: Radius.lg + Spacing.one,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two + Spacing.half,
    gap: Spacing.two,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 6}%`, padding: Spacing.half },
  hole: {
    height: 46,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: { backgroundColor: Selected.fill, borderColor: Green.bright },
  off: { opacity: 0.3 },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  holeText: { ...Type.title, fontSize: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  finish: { height: 50, borderRadius: Radius.full, marginHorizontal: Spacing.half },
});
