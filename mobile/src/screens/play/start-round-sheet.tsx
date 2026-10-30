import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { Brand, Motion, Radius, Spacing, Type } from '@/constants/theme';
import { useRound } from '@/state/round';
import {
  DEFAULT_TEE,
  SIDE_HOLES,
  SIDES,
  sidePar,
  sideYards,
  TEE_NAMES,
  type Side,
} from '@/utils/course';

const LIQUID = isLiquidGlassAvailable();

const SIDE_LABELS: Record<Side, string> = { front: 'Front 9', back: 'Back 9', full: '18 Holes' };

/** Slides up after Start Round: pick the nine and the tees, then tee off. */
export function StartRoundSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { startRound } = useRound();
  const [tee, setTee] = useState<string>(DEFAULT_TEE);
  const [side, setSide] = useState<Side>('full');

  const teeOff = () => {
    // the round doesn't store the side yet (reshaping round.tsx is next);
    // for now it only decides which hole you start on
    startRound(tee);
    onClose();
    router.push(`/hole/${SIDE_HOLES[side][0]}?tee=${tee}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: Brand.scrim }]}
      />
      <Animated.View
        entering={SlideInDown.duration(Motion.slow)}
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}
      >
        {/* same glass as the button: Liquid Glass on iOS 26+, frosted fallback elsewhere */}
        {LIQUID ? (
          <GlassView glassEffectStyle="regular" tintColor={Brand.liquidSheetTint} style={styles.liquid} />
        ) : (
          <>
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Brand.sheetTint }]} />
            <LinearGradient colors={[Brand.glassSheen, 'transparent']} style={styles.sheen} />
            <View style={[StyleSheet.absoluteFill, styles.edge]} />
          </>
        )}
        <View style={styles.grabber} />

        <Text style={styles.title}>New Round</Text>
        <Text style={styles.meta}>
          Par {sidePar(side)} · {sideYards(tee, side).toLocaleString()} yds from {tee}
        </Text>

        <Text style={styles.label}>HOLES</Text>
        <View style={styles.segment}>
          {SIDES.map((s) => {
            const selected = s === side;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSide(s)}
                style={[styles.segmentItem, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.textOnGlass]}>{SIDE_LABELS[s]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>TEES</Text>
        <View style={styles.group}>
          {TEE_NAMES.map((name, i) => {
            const selected = name === tee;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTee(name)}
                style={({ pressed }) => [styles.teeRow, i > 0 && styles.teeDivider, pressed && { opacity: 0.6 }]}
              >
                <View style={[styles.teeDot, selected && styles.teeDotSelected]} />
                <Text style={styles.teeName}>{name}</Text>
                <Text style={styles.teeYards}>{sideYards(name, side).toLocaleString()} yds</Text>
              </Pressable>
            );
          })}
        </View>

        <GlassButton label="Tee Off" onPress={teeOff} style={{ marginTop: Spacing.four }} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: Radius.xl + Spacing.two,
    borderTopRightRadius: Radius.xl + Spacing.two,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  liquid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.xl + Spacing.two, borderCurve: 'continuous' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  edge: {
    borderTopLeftRadius: Radius.xl + Spacing.two,
    borderTopRightRadius: Radius.xl + Spacing.two,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Brand.glassEdge,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Brand.glassEdge,
    marginBottom: Spacing.three,
  },
  title: { ...Type.title, color: Brand.onGlass, textShadowColor: Brand.textShadow, textShadowRadius: 4 },
  meta: { ...Type.subhead, color: Brand.onGlassSecondary, marginTop: Spacing.one },
  label: {
    ...Type.caption,
    color: Brand.onGlassSecondary,
    letterSpacing: 0.8,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    backgroundColor: Brand.glassFill,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm + 1,
    borderCurve: 'continuous',
  },
  segmentSelected: { backgroundColor: Brand.accent },
  segmentText: { ...Type.subhead, fontWeight: '600', color: Brand.onGlassSecondary },
  textOnGlass: { color: Brand.onGlass },
  group: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Brand.glassFill,
  },
  teeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  teeDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.glassEdge },
  teeDot: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Brand.glassEdge,
  },
  teeDotSelected: { backgroundColor: Brand.accent, borderColor: Brand.onGlass },
  teeName: { ...Type.headline, color: Brand.onGlass, flex: 1 },
  teeYards: { ...Type.subhead, color: Brand.onGlassSecondary },
});
