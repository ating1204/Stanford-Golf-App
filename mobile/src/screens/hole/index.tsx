import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoleHeader } from '@/components/hole-header';
import { HoleMap } from '@/components/hole-map';
import { MapColors, Radius, Spacing, Type } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';
import { useTheme } from '@/hooks/use-theme';
import { useRound } from '@/state/round';
import { FIRST_HOLE, getHole, greenOf, LAST_HOLE, teeOf } from '@/utils/course';
import { haversineYards, type LatLng } from '@/utils/geo';

const YARDS_PER_M = 1.0936133;

/** Aim points between tee and green: par 3 gets none, par 4 one, par 5 two. */
function defaultWaypoints(tee: LatLng, green: LatLng, par: number): LatLng[] {
  const n = Math.max(0, par - 3);
  return Array.from({ length: n }, (_, i) => {
    const f = (i + 1) / (n + 1);
    return { lat: tee.lat + (green.lat - tee.lat) * f, lng: tee.lng + (green.lng - tee.lng) * f };
  });
}

export function HoleScreen({ holeNumber, teeName }: { holeNumber: number; teeName: string }) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const hole = getHole(holeNumber);
  const tee = teeOf(hole, teeName);
  const green = greenOf(hole);
  const { position, accuracyM, error } = useLocation();
  const { scoreFor, shotsForHole } = useRound();

  const [waypoints, setWaypoints] = useState<LatLng[]>(() =>
    defaultWaypoints(tee.position, green, hole.par),
  );

  const path = useMemo(() => [tee.position, ...waypoints, green], [tee.position, waypoints, green]);
  const toGreen = position ? Math.round(haversineYards(position, green)) : null;
  const score = scoreFor(holeNumber);
  const shotCount = shotsForHole(holeNumber).length;

  const onMoveWaypoint = useCallback((index: number, p: LatLng) => {
    setWaypoints((prev) => {
      const next = [...prev];
      next[index] = p;
      return next;
    });
  }, []);

  // replace, not push -- walking 18 holes shouldn't build an 18-deep stack
  const goTo = (n: number) => router.replace(`/hole/${n}?tee=${teeName}`);

  return (
    <View style={styles.root}>
      <HoleMap
        holeNumber={holeNumber}
        teeName={teeName}
        position={position}
        path={path}
        onMoveWaypoint={onMoveWaypoint}
      />

      <HoleHeader
        holeNumber={holeNumber}
        toGreen={toGreen}
        par={hole.par}
        teeName={tee.name}
        teeYards={tee.yards}
        onBack={() => router.replace('/')}
      />

      <Text style={[styles.gps, { top: insets.top + 78 }]}>
        {error ??
          (accuracyM != null ? `GPS ±${Math.round(accuracyM * YARDS_PER_M)} yds` : 'Locating…')}
      </Text>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track shot"
          onPress={() => router.push(`/hole/${holeNumber}/track?tee=${teeName}`)}
          style={({ pressed }) => [styles.track, pressed && styles.pressed]}
        >
          <Text style={styles.trackText}>
            ⌖ Track Shot{shotCount > 0 ? `  ·  ${shotCount}` : ''}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous hole"
            disabled={holeNumber === FIRST_HOLE}
            onPress={() => goTo(holeNumber - 1)}
            style={({ pressed }) => [
              styles.side,
              holeNumber === FIRST_HOLE && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sideGlyph}>‹</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hole ${holeNumber}, enter score`}
            onPress={() => router.push(`/hole/${holeNumber}/score?tee=${teeName}`)}
            style={({ pressed }) => [
              styles.enter,
              { backgroundColor: pressed ? c.accentDeep : c.accent },
            ]}
          >
            <Text style={[styles.enterTitle, { color: c.onAccent }]}>Hole {holeNumber}</Text>
            <Text style={[styles.enterSub, { color: c.onAccent }]}>
              {score.strokes != null ? `Score ${score.strokes}` : 'Enter Score'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next hole"
            disabled={holeNumber === LAST_HOLE}
            onPress={() => goTo(holeNumber + 1)}
            style={({ pressed }) => [
              styles.side,
              holeNumber === LAST_HOLE && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sideGlyph}>›</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MapColors.backdrop },
  gps: {
    position: 'absolute',
    right: Spacing.three,
    ...Type.caption,
    fontSize: 10,
    color: MapColors.hudText,
    backgroundColor: MapColors.hud,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  track: {
    alignSelf: 'center',
    backgroundColor: MapColors.hudStrong,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  trackText: { ...Type.headline, color: MapColors.hudText },
  pressed: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  side: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: MapColors.hudStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  sideGlyph: { color: MapColors.hudText, fontSize: 28, lineHeight: 30, marginTop: -2 },
  enter: {
    flex: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  enterTitle: { ...Type.headline },
  enterSub: { ...Type.caption },
});
