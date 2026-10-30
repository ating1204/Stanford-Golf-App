import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { BottomTabInset, Brand, Spacing, Type } from '@/constants/theme';
import { useRound, type Round } from '@/state/round';

import { StartRoundSheet } from './start-round-sheet';

const SIDE_NAMES = { front: 'Front 9', back: 'Back 9', full: '18 Holes' } as const;

/** e.g. "Front 9 · White · Oct 30, 8:12 AM" */
function describe(round: Round): string {
  const started = new Date(round.startedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${SIDE_NAMES[round.side]} · ${round.tee} · ${started}`;
}

/**
 * Full-bleed course photo, the logo up top, one button. With no saved round it's
 * Start Round (tee and nine are picked in the sheet). While a round is saved and
 * not uploaded, it's Resume / Discard instead -- a new round can't start until then.
 */
export function PlayScreen() {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { round, clearRound } = useRound();

  const confirmDiscard = () =>
    Alert.alert('Discard this round?', 'It hasn’t been uploaded, so it will be gone for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: clearRound },
    ]);

  return (
    <View style={styles.root}>
      {/* landscape photo cropped to portrait; nudged left so the fairway and bunker stay in frame */}
      <Image
        source={require('../../../assets/images/course-hero.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: '40%' }}
      />
      {/* soft fades so the status bar, logo and button read against the photo */}
      <LinearGradient colors={[Brand.fadeTop, 'transparent']} style={[styles.fade, styles.fadeTop]} />
      <LinearGradient colors={['transparent', Brand.fadeBottom]} style={[styles.fade, styles.fadeBottom]} />

      {/* kept in the sky band of the photo, where cardinal has the most contrast */}
      <View style={[styles.logoWrap, { paddingTop: insets.top + Spacing.five }]}>
        <Image
          source={require('../../../assets/images/stanford-golf-logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Stanford Golf Course"
        />
      </View>

      <View style={[styles.bottom, { bottom: insets.bottom + BottomTabInset + Spacing.four }]}>
        {round ? (
          <>
            <Text style={styles.roundInfo}>{describe(round)}</Text>
            <GlassButton
              label={`Resume Round · Hole ${round.currentHole}`}
              onPress={() => router.push(`/hole/${round.currentHole}?tee=${round.tee}`)}
            />
            <Pressable accessibilityRole="button" onPress={confirmDiscard} hitSlop={10} style={styles.discard}>
              <Text style={styles.discardText}>Discard Round</Text>
            </Pressable>
          </>
        ) : (
          <GlassButton label="Start Round" onPress={() => setSheetOpen(true)} />
        )}
      </View>

      <StartRoundSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fade: { position: 'absolute', left: 0, right: 0 },
  fadeTop: { top: 0, height: '25%' },
  fadeBottom: { bottom: 0, height: '45%' },
  logoWrap: { alignItems: 'center' },
  logo: { width: 240, aspectRatio: 300 / 210 },
  bottom: { position: 'absolute', left: Spacing.four, right: Spacing.four, gap: Spacing.three },
  roundInfo: {
    ...Type.subhead,
    color: Brand.onGlass,
    textAlign: 'center',
    textShadowColor: Brand.textShadow,
    textShadowRadius: 4,
  },
  discard: { alignSelf: 'center' },
  discardText: {
    ...Type.subhead,
    fontWeight: '600',
    color: Brand.onGlassSecondary,
    textShadowColor: Brand.textShadow,
    textShadowRadius: 4,
  },
});
