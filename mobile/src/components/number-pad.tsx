import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassButton } from '@/components/glass-button';
import { Brand, Radius, Shadows, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_DIGITS = 2; // 99 is plenty for anything on one hole
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;
// the iOS sheet feel: the dim fades in place while only the panel slides
const OPEN = { duration: 340, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 240, easing: Easing.in(Easing.cubic) };

/**
 * Fill-in-the-blank for any count the chips don't cover: "Enter Score for
 * Hole 6", a big number, Confirm, and a phone-style keypad. Two digits max.
 * Mount it when needed; it starts from `initial` each time it opens.
 */
export function NumberPad({
  what,
  holeNumber,
  initial,
  min,
  onConfirm,
  onClose,
}: {
  /** "Score", "Putts", ... -- reads "Enter {what} for Hole N" */
  what: string;
  holeNumber: number;
  initial: number | null;
  min: number;
  onConfirm: (v: number) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState(initial != null ? String(initial) : '');
  const value = digits === '' ? null : Number(digits);
  const valid = value !== null && value >= min;

  // 0 = hidden (panel below the screen, no dim), 1 = shown
  const shown = useSharedValue(0);
  const [panelHeight, setPanelHeight] = useState(600);
  useEffect(() => {
    shown.set(withTiming(1, OPEN));
  }, [shown]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - shown.get()) * panelHeight }] }));

  // play the slide-down / fade-out, then let the parent unmount it
  const dismiss = (then: () => void) => {
    shown.set(
      withTiming(0, CLOSE, (finished) => {
        if (finished) scheduleOnRN(then);
      }),
    );
  };
  const close = () => dismiss(onClose);

  const press = (key: (typeof KEYS)[number]) => {
    if (key === '') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'del') return setDigits((d) => d.slice(0, -1));
    // no leading zeros: typing after a lone 0 replaces it
    setDigits((d) => (d === '0' ? key : d.length < MAX_DIGITS ? d + key : d));
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Brand.scrim }, scrimStyle]}>
        <Pressable accessibilityLabel="Close" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
        style={[styles.panel, { backgroundColor: c.surface }, panelStyle]}
      >
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={6}
            style={[styles.close, { backgroundColor: c.backgroundElement }]}
          >
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={15} weight="bold" tintColor={c.text} />
          </Pressable>

          <Text style={[styles.title, { color: c.text }]}>
            Enter {what} for <Text style={{ color: c.accent }}>Hole {holeNumber}</Text>
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.number, { color: value === null ? c.textSecondary : c.text }]}
          >
            {value ?? '–'}
          </Text>

          <GlassButton
            label="Confirm"
            disabled={!valid}
            onPress={() => {
              if (value === null || !valid) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              dismiss(() => onConfirm(value));
            }}
          />
        </View>

        <View style={[styles.pad, { backgroundColor: c.backgroundElement, paddingBottom: insets.bottom + Spacing.two }]}>
          {KEYS.map((key, i) => (
            <View key={i} style={styles.keyCell}>
              {key !== '' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={key === 'del' ? 'Delete' : key}
                  onPress={() => press(key)}
                  style={({ pressed }) => [
                    styles.key,
                    key !== 'del' && { backgroundColor: c.surface, boxShadow: Shadows.card },
                    pressed && { backgroundColor: c.backgroundSelected },
                  ]}
                >
                  {key === 'del' ? (
                    <SymbolView name={{ ios: 'delete.left', android: 'backspace', web: 'backspace' }} size={22} tintColor={c.text} />
                  ) : (
                    <Text style={[styles.keyText, { color: c.text }]}>{key}</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl + Spacing.two,
    borderTopRightRadius: Radius.xl + Spacing.two,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  top: { paddingHorizontal: Spacing.four + Spacing.one, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  // floats in the corner so the title can sit right at the top of the panel
  close: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Type.headline, fontSize: 18, textAlign: 'center', marginTop: Spacing.one },
  number: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  pad: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.one + Spacing.half },
  keyCell: { width: '33.333%', padding: Spacing.one - 1 },
  key: {
    height: 50,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontWeight: '400' },
});
