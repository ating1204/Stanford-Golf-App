import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ChoiceGrid } from '@/components/choice-grid';
import { GlassButton } from '@/components/glass-button';
import { GLIDE, HitOrMiss } from '@/components/hit-or-miss';
import { NumberPad } from '@/components/number-pad';
import { ScoreMark } from '@/components/score-mark';
import { Green, Radius, Selected, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRound, type FairwayResult, type GirResult, type HoleStats } from '@/state/round';
import { getHole, SIDE_HOLES } from '@/utils/course';

// the last chip of every row is a "?" fill-in for anything bigger
const COUNTS = [0, 1, 2, 3] as const;
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PAGES = ['Score', 'Stats'] as const;
const RELATIVE: Record<number, string> = {
  [-3]: 'albatross',
  [-2]: 'eagle',
  [-1]: 'birdie',
  0: 'par',
  1: 'bogey',
  2: 'double bogey',
  3: 'triple bogey',
};
const relativeName = (v: number, par: number) =>
  v === 1 ? 'hole in one' : (RELATIVE[v - par] ?? `${v - par} over par`);

/** a little bounce at the end of a swipe, settling quickly */
const PAGE_SPRING = { damping: 20, stiffness: 200, mass: 0.9 } as const;

// iOS 26 draws the sheet's glass behind a transparent screen; older iOS needs a solid one
const LIQUID = isLiquidGlassAvailable();

/**
 * Two pages side by side that follow your finger: page 1 is what you enter
 * every hole (score as scorecard marks, putts), page 2 the rest; swipe between
 * them. The last chip of every row is a "?" that opens a number pad; every value
 * can be cleared by tapping it again.
 */
export function ScoreScreen({ holeNumber }: { holeNumber: number }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const hole = getHole(holeNumber);
  const { round, hole: holeEntry, updateHole } = useRound();
  const s = holeEntry(holeNumber);
  const set = (patch: Partial<HoleStats>) => updateHole(holeNumber, patch);

  const tee = round?.tee ?? 'White';
  const sideHoles = SIDE_HOLES[round?.side ?? 'full'];
  const next = sideHoles[sideHoles.indexOf(holeNumber) + 1];

  // --- pager: a two-page strip moved by a pan gesture (an iOS sheet drew a paging
  // ScrollView offset under its content, so this one is hand-rolled) ---
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pageWidth = useSharedValue(0);
  const current = useSharedValue(0);
  const x = useSharedValue(0);

  const goToPage = (p: number) => {
    current.set(p);
    x.set(withSpring(-p * pageWidth.get(), PAGE_SPRING));
    setPage(p);
  };

  const pan = usePanGesture({
    // horizontal drags only; a vertical drag is left to the stats page's scroll
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      const w = pageWidth.get();
      let next = -current.get() * w + e.translationX;
      // rubber-band past the first and last page
      if (next > 0) next *= 0.3;
      if (next < -w) next = -w + (next + w) * 0.3;
      x.set(next);
    },
    onDeactivate: (e) => {
      'worklet';
      const w = pageWidth.get();
      let p = current.get();
      if (e.translationX < -w * 0.25 || e.velocityX < -500) p = 1;
      else if (e.translationX > w * 0.25 || e.velocityX > 500) p = 0;
      current.set(p);
      x.set(withSpring(-p * w, { ...PAGE_SPRING, velocity: e.velocityX }));
      scheduleOnRN(setPage, p);
    },
  });

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  // --- entering values ---
  const [scorePadOpen, setScorePadOpen] = useState(false);

  const pickScore = (v: number | null) => set({ score: v });

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // "Finish Hole" moves you on: straight to the next hole's map, or back to the map on the last
    if (next) router.dismissTo(`/hole/${next}?tee=${tee}`);
    else router.back();
  };

  const customScore = s.score != null && s.score > SCORES.length ? s.score : null;
  const fillIn = (what: string, min = 0) => ({ what, holeNumber, min });

  return (
    <View style={[styles.root, !LIQUID && { backgroundColor: c.background }]}>
      {LIQUID && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Green.sheetTint }]} />}
      <GestureDetector gesture={pan}>
        <View
          style={styles.pager}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            pageWidth.set(w);
            x.set(-current.get() * w);
            setWidth(w);
          }}
        >
          {width > 0 && (
            <Animated.View style={[styles.strip, { width: width * 2 }, stripStyle]}>
              {/* page 1: score as scorecard marks, then putts -- what you enter every hole */}
              <View style={[styles.page, { width }]}>
                <Text style={[styles.label, styles.sectionLabel, { color: c.text }]}>Score</Text>
                <View style={styles.grid}>
                  {SCORES.map((v) => {
                    const selected = s.score === v;
                    return (
                      <View key={v} style={styles.cell}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${v}, ${relativeName(v, hole.par)}`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            Haptics.selectionAsync();
                            pickScore(selected ? null : v);
                          }}
                          style={({ pressed }) => [
                            styles.scoreChip,
                            selected ? styles.selected : { backgroundColor: c.fill },
                            pressed && styles.pressed,
                          ]}
                        >
                          <ScoreMark
                            score={v}
                            par={hole.par}
                            color={selected ? Selected.text : c.text}
                            lineColor={selected ? Selected.edge : c.textSecondary}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                  {/* fill in the blank: "?" until a bigger score is entered, then that score */}
                  <View style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={customScore ? `${customScore}, change` : 'Enter a score'}
                      accessibilityState={{ selected: customScore !== null }}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setScorePadOpen(true);
                      }}
                      style={({ pressed }) => [
                        styles.scoreChip,
                        customScore ? styles.selected : { backgroundColor: c.fill },
                        pressed && styles.pressed,
                      ]}
                    >
                      {/* anything past 8 is at least a double bogey, so "?" wears the double square too */}
                      <ScoreMark
                        score={customScore ?? Math.max(SCORES.length + 1, hole.par + 2)}
                        par={hole.par}
                        label={customScore ? undefined : '?'}
                        color={customScore ? Selected.text : c.text}
                        lineColor={customScore ? Selected.edge : c.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: c.separator }]} />

                <ChoiceGrid
                  label="Putts"
                  options={COUNTS}
                  value={s.putts ?? undefined}
                  onChange={(v) => set({ putts: v ?? null })}
                  fillIn={fillIn('Putts')}
                />
              </View>

              {/* page 2: the rest of the stats */}
              <ScrollView
                style={{ width }}
                contentContainerStyle={styles.page}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
              >
                <View style={styles.stats}>
                  {hole.par > 3 && (
                    <HitOrMiss<FairwayResult>
                      label="Fairway"
                      value={s.fairway}
                      onChange={(fairway) => set({ fairway })}
                    />
                  )}
                  <HitOrMiss<GirResult>
                    label="Green in Regulation"
                    value={s.gir}
                    onChange={(gir) => set({ gir })}
                    extra={['no_chance']}
                  />
                  {/* each row glides down when a miss row opens above it */}
                  <Animated.View layout={GLIDE}>
                    <ChoiceGrid
                      label="Chip Shots"
                      options={COUNTS}
                      value={s.chips ?? undefined}
                      onChange={(v) => set({ chips: v ?? null })}
                      fillIn={fillIn('Chip Shots')}
                    />
                  </Animated.View>
                  <Animated.View layout={GLIDE}>
                    <ChoiceGrid
                      label="Greenside Sand Shots"
                      options={COUNTS}
                      value={s.sandShots ?? undefined}
                      onChange={(v) => set({ sandShots: v ?? null })}
                      fillIn={fillIn('Sand Shots')}
                    />
                  </Animated.View>
                  <Animated.View layout={GLIDE}>
                    <ChoiceGrid
                      label="Penalties"
                      options={COUNTS}
                      value={s.penalties ?? undefined}
                      onChange={(v) => set({ penalties: v ?? null })}
                      fillIn={fillIn('Penalties')}
                    />
                  </Animated.View>
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      <View
        style={[
          styles.footer,
          !LIQUID && { backgroundColor: c.surface },
          { paddingBottom: insets.bottom + Spacing.two },
        ]}
      >
        {/* tappable too, so changing page never depends on the swipe alone */}
        <View style={styles.dots}>
          {PAGES.map((name, i) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={name}
              accessibilityState={{ selected: page === i }}
              onPress={() => goToPage(i)}
              hitSlop={12}
            >
              <View style={[styles.dot, { backgroundColor: c.text, opacity: page === i ? 0.85 : 0.25 }]} />
            </Pressable>
          ))}
        </View>
        <GlassButton
          label={`Finish Hole ${holeNumber}`}
          subtitle={next ? `Next: Hole ${next}` : 'Back to the map'}
          onPress={finish}
        />
      </View>

      {scorePadOpen && (
        <NumberPad
          what="Score"
          holeNumber={holeNumber}
          initial={customScore}
          min={1}
          onClose={() => setScorePadOpen(false)}
          onConfirm={(v) => {
            setScorePadOpen(false);
            pickScore(v);
          }}
        />
      )}
    </View>
  );
}

// the sheet's corners are large and round, so content sits well in from the edges
const INSET = Spacing.four + Spacing.one;

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  strip: { flex: 1, flexDirection: 'row' },
  page: { paddingHorizontal: INSET, paddingTop: INSET, paddingBottom: Spacing.four },
  label: { ...Type.headline },
  sectionLabel: { marginBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -Spacing.one },
  cell: { width: '33.333%', padding: Spacing.one },
  selected: { backgroundColor: Selected.fill, borderColor: Selected.edge },
  scoreChip: {
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
    height: 60,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.three },
  stats: { gap: Spacing.four },
  footer: { paddingHorizontal: INSET, paddingTop: Spacing.two, gap: Spacing.three },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 7, height: 7, borderRadius: Radius.full },
});
