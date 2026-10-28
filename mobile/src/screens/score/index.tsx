import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/choice-grid';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRound } from '@/state/round';
import { getHole } from '@/utils/course';

const COUNTS = [0, 1, 2, 3, 4] as const;

export function ScoreScreen({ holeNumber }: { holeNumber: number }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const hole = getHole(holeNumber);
  const { scoreFor, setScore } = useRound();
  const s = scoreFor(holeNumber);

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
          value={s.strokes}
          onChange={(v) => setScore(holeNumber, { strokes: v })}
          columns={3}
          render={(v) => (v === hole.par ? `${v}  Par` : `${v}`)}
        />

        <ChoiceGrid
          label="Putts"
          options={COUNTS}
          value={s.putts}
          onChange={(v) => setScore(holeNumber, { putts: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        {hole.par > 3 && (
          <ChoiceGrid
            label="Fairway Hit"
            options={[true, false] as const}
            value={s.fairwayHit}
            onChange={(v) => setScore(holeNumber, { fairwayHit: v })}
            render={(v) => (v ? '✓' : '✕')}
          />
        )}

        <ChoiceGrid
          label="Green in Regulation"
          options={[true, false] as const}
          value={s.gir}
          onChange={(v) => setScore(holeNumber, { gir: v })}
          render={(v) => (v ? '✓' : '✕')}
        />

        <ChoiceGrid
          label="Chip Shots"
          options={COUNTS}
          value={s.chips}
          onChange={(v) => setScore(holeNumber, { chips: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        <ChoiceGrid
          label="Greenside Sand Shots"
          options={COUNTS}
          value={s.sandShots}
          onChange={(v) => setScore(holeNumber, { sandShots: v })}
          render={(v) => (v === 4 ? '≥4' : `${v}`)}
        />

        <ChoiceGrid
          label="Penalties"
          options={COUNTS}
          value={s.penalties}
          onChange={(v) => setScore(holeNumber, { penalties: v })}
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
