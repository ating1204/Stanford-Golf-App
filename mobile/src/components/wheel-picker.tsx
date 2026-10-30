import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ITEM_H = 56;
const VISIBLE = 3; // the picked row plus one neighbour above and below

/**
 * A scroll wheel. Each row scales and fades with its distance from the centre as
 * you scroll (on the UI thread, so it tracks the finger), the centred row is the
 * value, and a light tick fires at each detent. Scroll or tap a neighbour.
 * An optional `placeholder` sits above the options as a prompt ("Select Club"):
 * it's where the wheel starts, and resting on it means no value (null).
 */
export function WheelPicker<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  onSpinStart,
  onSettle,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  placeholder?: string;
  /** the finger started moving the wheel */
  onSpinStart?: () => void;
  /** the wheel came to rest on a value (after a drag, a flick, or a tap on a row) */
  onSettle?: () => void;
}) {
  const c = useTheme();
  const offset = placeholder ? 1 : 0;
  const rowCount = options.length + offset;
  const index = value === null ? 0 : Math.max(0, options.indexOf(value)) + offset;
  // only the starting offset; after that the scroll position is the source of truth
  const [initialOffset] = useState({ x: 0, y: index * ITEM_H });
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(index * ITEM_H);
  const lastIndex = useSharedValue(index);

  const select = (i: number) => {
    Haptics.selectionAsync(); // the detent tick of a native picker
    onChange(i < offset ? null : options[i - offset]);
  };

  const spinStart = () => onSpinStart?.();
  const settle = () => onSettle?.();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
      const i = Math.min(rowCount - 1, Math.max(0, Math.round(e.contentOffset.y / ITEM_H)));
      if (i !== lastIndex.get()) {
        lastIndex.set(i);
        scheduleOnRN(select, i);
      }
    },
    onBeginDrag: () => {
      scheduleOnRN(spinStart);
    },
    onEndDrag: (e) => {
      // released without a flick: it's already at rest
      if (Math.abs(e.velocity?.y ?? 0) < 0.05) scheduleOnRN(settle);
    },
    onMomentumEnd: () => {
      scheduleOnRN(settle);
    },
  });

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: c.fill }]} />
      <Animated.ScrollView
        ref={scroller}
        contentOffset={initialOffset}
        contentContainerStyle={styles.content}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        {placeholder && (
          <WheelRow key="placeholder" label={placeholder} index={0} scrollY={scrollY} selected={false} color={c.textSecondary} muted />
        )}
        {options.map((o, n) => {
          const i = n + offset;
          return (
            <WheelRow
              key={o}
              label={o}
              index={i}
              scrollY={scrollY}
              selected={i === index}
              color={i === index ? c.accentFill : c.text}
              onPress={() => scroller.current?.scrollTo({ y: i * ITEM_H, animated: true })}
            />
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

function WheelRow({
  label,
  index,
  scrollY,
  selected,
  color,
  onPress,
  muted = false,
}: {
  label: string;
  index: number;
  scrollY: SharedValue<number>;
  selected: boolean;
  color: string;
  /** the placeholder prompt: smaller, lighter, and not tappable */
  onPress?: () => void;
  muted?: boolean;
}) {
  // 0 at the centre, 1 one row away; scale and fade follow it continuously
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollY.get() / ITEM_H - index);
    return {
      opacity: interpolate(d, [0, 1, 1.6], [1, 0.4, 0.25], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1], [1, 0.78], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Pressable
      accessibilityRole={muted ? 'text' : 'button'}
      accessibilityLabel={label}
      accessibilityState={muted ? undefined : { selected }}
      onPress={onPress}
      disabled={!onPress}
      style={styles.item}
    >
      <Animated.View style={style}>
        <Text style={[muted ? styles.placeholder : styles.text, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { height: ITEM_H * VISIBLE },
  highlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 0,
    right: 0,
    height: ITEM_H,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  // one row of padding top and bottom so the first and last options can reach the centre
  content: { paddingVertical: ITEM_H },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { ...Type.numeral },
  placeholder: { ...Type.headline, fontSize: 20 },
});
