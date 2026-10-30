import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/choice-grid';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FAIRWAY_RESULTS, GIR_RESULTS, label, useRound } from '@/state/round';
import { getHole } from '@/utils/course';

const COUNTS = [0, 1, 2, 3, 4] as const;

export function ScoreScreen({ holeNumber }: { holeNumber: number }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const hole = getHole(holeNumber);
  const { hole: holeEntry, updateHole } = useRound();
  const s = holeEntry(holeNumber);
  const setScore = (patch: Parameters<typeof updateHole>[1]) => updateHole(holeNumber, patch);

  // a sensible range around par rather than a fixed 2-10
  const strokeOptions = Array.from({ length: 9 }, (_, i) => hole.par - 3 + i).filter((n) => n >= 1);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: c.text }]}>Score</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.close, { color: c.textSecondary }]}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ChoiceGrid
          label="Score"
          options={strokeOptions}
          value={s.score ?? undefined}
          onChange={(v) => setScore({ score: v })}
          columns={3}
          render={(v) => (v === hole.par ? `${v}  Par` : `${v}`)}
        />

        <ChoiceGrid
          label="Putts"
          options={COUNTS}
          value={s.putts ?? undefined}
          onChange={(v) => setScore({ putts: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        {hole.par > 3 && (
          <ChoiceGrid
            label="Fairway"
            options={FAIRWAY_RESULTS}
            value={s.fairway ?? undefined}
            onChange={(v) => setScore({ fairway: v })}
            render={label}
            columns={3}
          />
        )}

        <ChoiceGrid
          label="Green in Regulation"
          options={GIR_RESULTS}
          value={s.gir ?? undefined}
          onChange={(v) => setScore({ gir: v })}
          render={label}
          columns={3}
        />

        <ChoiceGrid
          label="Chip Shots"
          options={COUNTS}
          value={s.chips ?? undefined}
          onChange={(v) => setScore({ chips: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        <ChoiceGrid
          label="Greenside Sand Shots"
          options={COUNTS}
          value={s.sandShots ?? undefined}
          onChange={(v) => setScore({ sandShots: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        <ChoiceGrid
          label="Penalties"
          options={COUNTS}
          value={s.penalties ?? undefined}
          onChange={(v) => setScore({ penalties: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.two }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.finish,
            { backgroundColor: pressed ? c.accentDeep : c.accent },
          ]}
        >
          <Text style={[styles.finishText, { color: c.onAccent }]}>Finish Hole {holeNumber}</Text>
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
  footer: { padding: Spacing.three, paddingTop: Spacing.two },
  finish: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  finishText: { ...Type.headline },
});
