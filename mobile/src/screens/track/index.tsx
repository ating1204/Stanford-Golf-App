import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/choice-grid';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';
import { useTheme } from '@/hooks/use-theme';
import { CLUBS, label, LIES, useRound, type Club, type Lie } from '@/state/round';
import { getHole, greenOf, teeOf } from '@/utils/course';
import { haversineYards } from '@/utils/geo';

export function TrackScreen({ holeNumber, teeName }: { holeNumber: number; teeName: string }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const hole = getHole(holeNumber);
  const { position } = useLocation();
  const { hole: holeEntry, addShot } = useRound();

  const previous = holeEntry(holeNumber).shots;
  const last = previous.at(-1);
  // the shot starts where the last one ended, or at the tee for your first
  const from =
    last?.endLat != null && last.endLng != null
      ? { lat: last.endLat, lng: last.endLng }
      : teeOf(hole, teeName).position;
  const startLie: Lie = last?.endLie ?? 'tee';
  const green = greenOf(hole);

  const [club, setClub] = useState<Club | undefined>(previous.length ? undefined : 'Dr');
  // the lie you pick is where the ball ended up
  const [lie, setLie] = useState<Lie | undefined>(undefined);

  const yards = position ? Math.round(haversineYards(from, position)) : null;
  const canSave = position != null && club != null && lie != null;

  const save = () => {
    if (!position || !club || !lie) return;
    // start/end are stored as distance to the green, the unit strokes gained uses
    addShot(holeNumber, {
      club,
      startDist: Math.round(haversineYards(from, green)),
      endDist: Math.round(haversineYards(position, green)),
      startLie,
      endLie: lie,
      startLat: from.lat,
      startLng: from.lng,
      endLat: position.lat,
      endLng: position.lng,
      penalties: 0,
    });
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: c.text }]}>Track Shot</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.close, { color: c.textSecondary }]}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headline}>
          <Text style={[styles.distance, { color: c.text }]}>{yards ?? '—'}</Text>
          <Text style={[styles.unit, { color: c.textSecondary }]}>yds</Text>
        </View>
        <Text style={[styles.note, { color: c.textSecondary }]}>
          {position
            ? `Shot ${previous.length + 1} · measured from ${previous.length ? 'your last shot' : 'the tee'} to where you are standing`
            : 'Waiting for GPS — stand at your ball'}
        </Text>

        <ChoiceGrid
          label="Club"
          options={CLUBS}
          value={club}
          onChange={setClub}
          columns={4}
        />

        <ChoiceGrid label="Lie Now" options={LIES} value={lie} onChange={setLie} render={label} columns={3} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.two }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: canSave ? (pressed ? c.accentDeep : c.accent) : c.accentSoft },
          ]}
        >
          <Text style={[styles.saveText, { color: canSave ? c.onAccent : c.textSecondary }]}>
            Save Shot
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  sheetTitle: { ...Type.title },
  close: { ...Type.title },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  distance: { fontSize: 56, fontWeight: '700', letterSpacing: -1.5 },
  unit: { ...Type.headline },
  note: { ...Type.caption, marginTop: -Spacing.three },
  footer: { padding: Spacing.three, paddingTop: Spacing.two },
  save: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveText: { ...Type.headline },
});
