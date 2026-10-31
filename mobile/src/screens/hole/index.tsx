import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, LayoutAnimationConfig, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { HoleHeader } from '@/components/hole-header';
import { HudSurface } from '@/components/hud-surface';
import { HoleMap } from '@/components/hole-map';
import { HolePicker } from '@/components/hole-picker';
import { TrackPanel, type TrackDraft } from '@/components/track-panel';
import { MapColors, Radius, Spacing, Type } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';
import { formatToPar, scoreToPar, useRound, type Club, type Lie } from '@/state/round';
import { getHole, greenOf, SIDE_HOLES, teeOf } from '@/utils/course';
import { haversineYards, latLngToImagePx, type LatLng } from '@/utils/geo';

const YARDS_PER_M = 1.0936133;

/** Aim points between tee and green: par 3 gets none, par 4 one, par 5 two. */
function defaultWaypoints(tee: LatLng, green: LatLng, par: number): LatLng[] {
  const n = Math.max(0, par - 3);
  return Array.from({ length: n }, (_, i) => {
    const f = (i + 1) / (n + 1);
    return { lat: tee.lat + (green.lat - tee.lat) * f, lng: tee.lng + (green.lng - tee.lng) * f };
  });
}

/** ‹ / › inside the Hole box: no border, just a circle that lights up under your finger. */
function HoleArrow({
  direction,
  disabled,
  onPress,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? 'Previous hole' : 'Next hole'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed, disabled && styles.arrowOff]}
    >
      <SymbolView
        name={
          direction === 'left'
            ? { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }
            : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
        }
        size={18}
        weight="semibold"
        tintColor={MapColors.hudText}
      />
    </Pressable>
  );
}

export function HoleScreen({ holeNumber, teeName }: { holeNumber: number; teeName: string }) {
  const insets = useSafeAreaInsets();
  // the Hole box keeps its original width: the screen less a 56pt circle and gutters on each side
  const { width: screenW } = useWindowDimensions();
  const holeBoxWidth = screenW - 2 * (Spacing.three + 56 + Spacing.two);
  const hole = getHole(holeNumber);
  const tee = teeOf(hole, teeName);
  const green = greenOf(hole);
  const { position, accuracyM, error } = useLocation();
  const { round, hole: holeEntry, setCurrentHole, addShot, updateShot, removeShot } = useRound();

  // remembered so Resume Round brings you back here
  useEffect(() => setCurrentHole(holeNumber), [holeNumber, setCurrentHole]);

  const [waypoints, setWaypoints] = useState<LatLng[]>(() => defaultWaypoints(tee.position, green, hole.par));

  // dragged spots for today's tee and pin; null = the course default
  const [teeSpot, setTeeSpot] = useState<LatLng | null>(null);
  const [pinSpot, setPinSpot] = useState<LatLng | null>(null);
  const start = teeSpot ?? tee.position;
  const pin = pinSpot ?? green;
  const home = useMemo(() => ({ start: tee.position, end: green }), [tee.position, green]);

  const path = useMemo(() => [start, ...waypoints, pin], [start, waypoints, pin]);
  // farther than this you're not on the hole (parking lot, home), so show — instead
  const MAX_SHOWN_YARDS = 1000;

  const yardsToGreen = position ? Math.round(haversineYards(position, pin)) : null;
  const toGreen = yardsToGreen != null && yardsToGreen <= MAX_SHOWN_YARDS ? yardsToGreen : null;
  const entry = holeEntry(holeNumber);
  const shotCount = entry.shots.length;
  // the arrows and the hole list stay within the nine you're playing
  const sideHoles = SIDE_HOLES[round?.side ?? 'full'];
  const firstHole = sideHoles[0];
  const lastHole = sideHoles[sideHoles.length - 1];
  const toPar = round ? formatToPar(scoreToPar(round, (n) => getHole(n).par)) : '–';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMounted, setPickerMounted] = useState(false);
  const [pill, setPill] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const togglePicker = () => {
    if (pickerOpen) return setPickerOpen(false);
    setPickerMounted(true);
    setPickerOpen(true);
  };
  const onPickerClosed = useCallback(() => setPickerMounted(false), []);

  const onMovePathPoint = useCallback(
    (index: number, p: LatLng) => {
      if (index === 0) return setTeeSpot(p);
      if (index === waypoints.length + 1) return setPinSpot(p);
      setWaypoints((prev) => {
        const next = [...prev];
        next[index - 1] = p;
        return next;
      });
    },
    [waypoints.length],
  );

  const onSnapHome = useCallback((end: 'start' | 'end') => {
    if (end === 'start') setTeeSpot(null);
    else setPinSpot(null);
  }, []);

  // --- shot tracking: two draggable pins on the map, the panel underneath ---
  const [shot, setShot] = useState<{ start: LatLng; end: LatLng } | null>(null);
  // what the map zooms to when tracking opens; pins dragged later don't re-zoom it
  const [shotFocus, setShotFocus] = useState<LatLng[]>([]);
  const [panelHeight, setPanelHeight] = useState(0);
  const lastShot = entry.shots.at(-1);
  // a shot swiped away half-done: its pins and picks come back next time (this hole only)
  const [savedDraft, setDraft] = useState<(TrackDraft & { hole: number; start: LatLng; end: LatLng }) | null>(
    null,
  );
  const draft = savedDraft?.hole === holeNumber ? savedDraft : null;
  // which logged shot the card is changing; null = tracking a new one
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editingShot = editingIndex !== null ? entry.shots[editingIndex] : null;

  // logged shots stay on the map, except the one being edited (its pins are live)
  const savedShots = entry.shots.flatMap((s, index) =>
    index !== editingIndex && s.startLat != null && s.startLng != null && s.endLat != null && s.endLng != null
      ? [
          {
            index,
            club: s.club,
            start: { lat: s.startLat, lng: s.startLng },
            end: { lat: s.endLat, lng: s.endLng },
          },
        ]
      : [],
  );

  const editShot = (index: number) => {
    const s = entry.shots[index];
    if (s.startLat == null || s.startLng == null || s.endLat == null || s.endLng == null) return;
    const points = { start: { lat: s.startLat, lng: s.startLng }, end: { lat: s.endLat, lng: s.endLng } };
    setEditingIndex(index);
    setShot(points);
    setShotFocus([points.start, points.end]);
  };

  const closeCard = () => {
    setShot(null);
    setEditingIndex(null);
  };

  const deleteShot = () => {
    if (editingIndex === null) return;
    removeShot(holeNumber, editingIndex);
    // the next shot now starts where the one before the deleted shot ended
    if (entry.shots[editingIndex + 1]) {
      updateShot(holeNumber, editingIndex, {
        startLie: entry.shots[editingIndex - 1]?.endLie ?? 'tee',
      });
    }
    closeCard();
  };

  const startTracking = () => {
    if (draft) {
      setShot({ start: draft.start, end: draft.end });
      setShotFocus([draft.start, draft.end]);
      return;
    }
    // start where you're standing if you're on this hole's map; otherwise where the
    // last shot ended, or the tee. The end starts on the pin -- drag it to where the ball went.
    const meOnMap =
      position != null &&
      (() => {
        const px = latLngToImagePx(hole.map, position);
        return px.x >= 0 && px.y >= 0 && px.x <= hole.map.widthPx && px.y <= hole.map.heightPx;
      })();
    const fallback =
      lastShot?.endLat != null && lastShot.endLng != null
        ? { lat: lastShot.endLat, lng: lastShot.endLng }
        : start;
    const shotStart = meOnMap ? position! : fallback;
    setShot({ start: shotStart, end: pin });
    setShotFocus([shotStart, pin]);
  };

  const onMoveShot = useCallback(
    (index: 0 | 1, p: LatLng) => {
      setShot((s) => (s ? (index === 0 ? { ...s, start: p } : { ...s, end: p }) : s));
    },
    [setShot],
  );

  const saveShot = (club: Club, startLie: Lie, endLie: Lie) => {
    if (!shot) return;
    // both ends are stored as distance to the green, the unit strokes gained uses
    const placed = {
      club,
      startDist: Math.round(haversineYards(shot.start, pin)),
      endDist: Math.round(haversineYards(shot.end, pin)),
      startLie,
      endLie,
      startLat: shot.start.lat,
      startLng: shot.start.lng,
      endLat: shot.end.lat,
      endLng: shot.end.lng,
    };
    if (editingIndex !== null) {
      updateShot(holeNumber, editingIndex, placed);
      // the next shot starts from wherever this one ended up
      if (entry.shots[editingIndex + 1]) {
        updateShot(holeNumber, editingIndex + 1, { startLie: endLie });
      }
      closeCard();
      return;
    }
    addShot(holeNumber, { ...placed, penalties: 0 });
    setShot(null);
    setDraft(null);
  };

  // replace, not push -- walking 18 holes shouldn't build an 18-deep stack
  const goTo = (n: number) => router.replace(`/hole/${n}?tee=${teeName}`);

  return (
    <View style={styles.root}>
      <HoleMap
        holeNumber={holeNumber}
        teeName={teeName}
        position={position}
        path={path}
        onMovePathPoint={onMovePathPoint}
        home={home}
        onSnapHome={onSnapHome}
        shot={shot}
        onMoveShot={onMoveShot}
        savedShots={savedShots}
        onEditShot={editShot}
        focus={shot ? { points: shotFocus, top: insets.top + 110, bottom: panelHeight } : null}
      />

      {/* under the header, so the header stays sharp above the dim and the list hangs off its pill */}
      {pickerMounted && !shot && pill && (
        <HolePicker
          open={pickerOpen}
          anchor={pill}
          current={holeNumber}
          playable={sideHoles}
          scored={(n) => round?.holes[n]?.score != null}
          onPick={(n) => {
            setPickerOpen(false);
            if (n !== holeNumber) goTo(n);
          }}
          onFinish={() => {
            setPickerOpen(false);
            router.push('/scorecard');
          }}
          onRequestClose={() => setPickerOpen(false)}
          onClosed={onPickerClosed}
        />
      )}

      <HoleHeader
        holeNumber={holeNumber}
        toGreen={toGreen}
        targetLabel={pinSpot ? 'To Pin' : 'Mid Green'}
        par={hole.par}
        teeName={tee.name}
        teeYards={tee.yards}
        onBack={() => router.replace('/')}
        onPickHole={togglePicker}
        pickerOpen={pickerOpen}
        onPillLayout={setPill}
      />

      {!pickerMounted && (
        <HudSurface style={[styles.gps, { top: insets.top + 78 }]}>
          <Text style={styles.gpsText}>
            {error ?? (accuracyM != null ? `GPS ±${Math.round(accuracyM * YARDS_PER_M)} yds` : 'Locating…')}
          </Text>
        </HudSurface>
      )}

      {/* skipEntering: a new hole mounts with its controls in place; they only slide around the card */}
      <LayoutAnimationConfig skipEntering>
        {shot ? (
          <TrackPanel
            key={editingIndex ?? 'new'}
            shotNumber={editingIndex !== null ? editingIndex + 1 : shotCount + 1}
            yards={Math.round(haversineYards(shot.start, shot.end))}
            onHeightChange={setPanelHeight}
            defaultStartLie={lastShot?.endLie ?? 'tee'}
            draft={
              editingShot
                ? { club: editingShot.club, startLie: editingShot.startLie, lie: editingShot.endLie }
                : draft
            }
            editing={editingIndex !== null}
            onSave={saveShot}
            onDelete={editingIndex !== null ? deleteShot : undefined}
            onCancel={() => {
              closeCard();
              if (editingIndex === null) setDraft(null);
            }}
            onDismiss={(picks) => {
              // swiping away an edit just leaves the shot as it was
              if (editingIndex === null) {
                setDraft({ ...picks, hole: holeNumber, start: shot.start, end: shot.end });
              }
              closeCard();
            }}
          />
        ) : (
          <Animated.View
            // slides, never fades: iOS drops the glass material inside a fading view, which
            // left these boxes without their backgrounds after switching holes
            entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
            style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.two }]}
          >
            <HudSurface interactive style={styles.track}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={shotCount > 0 ? `Track shot, ${shotCount} tracked` : 'Track shot'}
                onPress={startTracking}
                style={styles.trackHit}
              >
                <SymbolView
                  name={{ ios: 'scope', android: 'my_location', web: 'my_location' }}
                  size={18}
                  weight="semibold"
                  tintColor={MapColors.hudText}
                />
                <Text style={styles.trackText}>Track Shot</Text>
                {shotCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{shotCount}</Text>
                  </View>
                )}
              </Pressable>
            </HudSurface>

            {/* the Hole box sits dead centre; To Par is centred in the space to its left */}
            <View style={styles.holeRow}>
              <View style={styles.sideColumn}>
                {/* running score against par over the holes scored so far on this nine (or 18) */}
                <HudSurface style={styles.toParBox}>
                  <View accessible accessibilityLabel={`To par ${toPar}`} style={styles.fill}>
                    <Text style={styles.toParLabel}>To Par</Text>
                    <Text style={styles.toPar}>{toPar}</Text>
                  </View>
                </HudSurface>
              </View>

              {/* the one primary action on this screen; ‹ › inside it switch holes */}
              <GlassButton
                label={`Hole ${holeNumber}`}
                subtitle={entry.score != null ? `Score ${entry.score}` : 'Enter Score'}
                accessibilityLabel={`Hole ${holeNumber}, ${entry.score != null ? `score ${entry.score}` : 'enter score'}`}
                onPress={() => router.push(`/hole/${holeNumber}/score?tee=${teeName}`)}
                style={[styles.enter, { width: holeBoxWidth }]}
                leading={
                  <HoleArrow
                    direction="left"
                    disabled={holeNumber === firstHole}
                    onPress={() => goTo(holeNumber - 1)}
                  />
                }
                trailing={
                  <HoleArrow
                    direction="right"
                    disabled={holeNumber === lastHole}
                    onPress={() => goTo(holeNumber + 1)}
                  />
                }
              />
              <View style={styles.sideColumn}>
                {/* mirrors To Par on the right; notes per hole are coming later */}
                <HudSurface interactive style={styles.toParBox}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notes, coming soon"
                    onPress={() => Alert.alert('Notes', 'Hole notes are coming soon.')}
                    style={styles.fill}
                  >
                    <SymbolView
                      name={{ ios: 'note.text', android: 'sticky_note_2', web: 'sticky_note_2' }}
                      size={22}
                      weight="semibold"
                      tintColor={MapColors.hudText}
                    />
                  </Pressable>
                </HudSurface>
              </View>
            </View>
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MapColors.backdrop },
  gps: {
    position: 'absolute',
    right: Spacing.three,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
  },
  gpsText: { ...Type.caption, color: MapColors.hudText },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  track: { alignSelf: 'center', borderRadius: Radius.full },
  trackHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
  },
  trackText: { ...Type.headline, color: MapColors.hudText },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    backgroundColor: MapColors.hudText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...Type.footnote, color: MapColors.backdrop },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toParLabel: { ...Type.caption, fontWeight: '600', color: MapColors.hudMuted },
  toPar: { ...Type.headline, fontSize: 19, color: MapColors.hudText, fontVariant: ['tabular-nums'] },
  // full width, no side padding: the side columns run from the screen edge to the Hole box
  holeRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -Spacing.three },
  sideColumn: { flex: 1, alignItems: 'center' },
  enter: { height: 56 },
  // same shape and height as the Hole box beside it
  // same height and corner as the Hole box beside it (To Par on the left, Notes on the right)
  toParBox: { width: 64, height: 56, borderRadius: Radius.xl, borderCurve: 'continuous' },
  arrow: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  arrowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  arrowOff: { opacity: 0.3 },
});
