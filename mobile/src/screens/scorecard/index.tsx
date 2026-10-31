import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { ScoreMark } from '@/components/score-mark';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatToPar,
  summarizeRound,
  toUploadRequest,
  useRound,
  type Round,
  type RoundSummary,
} from '@/state/round';
import { uploadRound } from '@/utils/api';
import { getHole, SIDE_HOLES } from '@/utils/course';

const parOf = (n: number) => getHole(n).par;

const FAILURE_MESSAGES = {
  offline: "Couldn't reach the server. Your round is safe on this phone. Try again when you're connected.",
  server: 'The server had a problem. Your round is safe on this phone. Try again in a moment.',
  rejected: "The server wouldn't accept this round. It's still safe on this phone.",
} as const;

type Status = 'idle' | 'sending' | keyof typeof FAILURE_MESSAGES;

/**
 * Finishing a round: review the card, submit, see the summary. The round stays on
 * the phone until the server confirms it; only then is it cleared. A failed upload
 * can simply be retried, since the round's clientId stops any duplicate.
 */
export function ScorecardScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { round, clearRound } = useRound();
  const [status, setStatus] = useState<Status>('idle');
  const [submitted, setSubmitted] = useState<{ round: Round; summary: RoundSummary } | null>(null);

  const close = () => router.back();

  const submit = async () => {
    if (!round) return;
    setStatus('sending');
    const result = await uploadRound(toUploadRequest(round));
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted({ round, summary: summarizeRound(round, parOf) });
      clearRound();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus(result.reason);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{submitted ? 'Round Saved' : 'Scorecard'}</Text>
        {!submitted && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={6}
            style={[styles.close, { backgroundColor: c.backgroundElement }]}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={15}
              weight="bold"
              tintColor={c.text}
            />
          </Pressable>
        )}
      </View>

      {submitted ? (
        <Summary {...submitted} onDone={() => router.dismissTo('/')} />
      ) : round ? (
        <Review round={round} status={status} onSubmit={submit} bottomInset={insets.bottom} />
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.note, { color: c.textSecondary }]}>No round in progress</Text>
        </View>
      )}
    </View>
  );
}

function Review({
  round,
  status,
  onSubmit,
  bottomInset,
}: {
  round: Round;
  status: Status;
  onSubmit: () => void;
  bottomInset: number;
}) {
  const c = useTheme();
  const summary = summarizeRound(round, parOf);
  const nines = [SIDE_HOLES.front, SIDE_HOLES.back].filter((nine) =>
    SIDE_HOLES[round.side].includes(nine[0]),
  );
  const nothingEntered = toUploadRequest(round).holesPlayed.length === 0;
  const { missing } = summary;

  const openHole = (n: number) => router.dismissTo(`/hole/${n}?tee=${round.tee}`);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        {nines.map((nine) => (
          <NineCard
            key={nine[0]}
            round={round}
            holes={nine}
            totalLabel={nine[0] === 1 ? 'Out' : 'In'}
            onHole={openHole}
          />
        ))}

        <View style={[styles.totals, { backgroundColor: c.surface }]}>
          <Total label="Total" value={summary.holesScored > 0 ? `${summary.strokes}` : '–'} />
          <Total label="To Par" value={formatToPar(summary.toPar)} />
          <Total label="Putts" value={summary.putts != null ? `${summary.putts}` : '–'} />
        </View>

        {missing.length > 0 && !nothingEntered && (
          <Text style={[styles.warning, { color: c.textSecondary }]}>
            {missing.length === 1 ? 'Hole' : 'Holes'} {missing.join(', ')}{' '}
            {missing.length === 1 ? 'has' : 'have'} no score. This round won&apos;t count toward your stats.
            Tap a hole to go back to it.
          </Text>
        )}
        {status in FAILURE_MESSAGES && (
          <Text accessibilityLiveRegion="polite" style={[styles.warning, { color: c.danger }]}>
            {FAILURE_MESSAGES[status as keyof typeof FAILURE_MESSAGES]}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + Spacing.two }]}>
        <GlassButton
          label={
            nothingEntered
              ? 'Enter a Score First'
              : status === 'sending'
                ? 'Submitting…'
                : status === 'idle'
                  ? 'Submit Round'
                  : 'Try Again'
          }
          disabled={nothingEntered || status === 'sending'}
          onPress={onSubmit}
        />
      </View>
    </>
  );
}

/** One nine as a paper scorecard: Hole, Par, Score and Putts rows, then the nine's total. */
function NineCard({
  round,
  holes,
  totalLabel,
  onHole,
}: {
  round: Round;
  holes: readonly number[];
  totalLabel: string;
  onHole: (n: number) => void;
}) {
  const c = useTheme();
  const entries = holes.map((n) => round.holes[n]);
  const sum = (values: (number | null | undefined)[]) => {
    const entered = values.filter((v) => v != null);
    return entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;
  };
  const dash = (v: number | null | undefined) => v ?? '–';

  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <View style={styles.labels}>
        <Text style={[styles.rowLabel, styles.headRow, { color: c.textSecondary }]}>Hole</Text>
        <Text style={[styles.rowLabel, styles.parRow, { color: c.textSecondary }]}>Par</Text>
        <Text style={[styles.rowLabel, styles.scoreRowLabel, { color: c.text }]}>Score</Text>
        <Text style={[styles.rowLabel, styles.puttRow, { color: c.textSecondary }]}>Putts</Text>
      </View>

      {holes.map((n) => {
        const entry = round.holes[n];
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`Hole ${n}, par ${parOf(n)}, ${entry?.score != null ? `score ${entry.score}` : 'no score'}`}
            onPress={() => onHole(n)}
            style={({ pressed }) => [styles.column, pressed && { backgroundColor: c.backgroundElement }]}
          >
            <Text style={[styles.cell, styles.headRow, styles.holeNumber, { color: c.text }]}>{n}</Text>
            <Text style={[styles.cell, styles.parRow, { color: c.textSecondary }]}>{parOf(n)}</Text>
            <View style={styles.scoreCell}>
              {entry?.score != null ? (
                <ScoreMark
                  score={entry.score}
                  par={parOf(n)}
                  color={c.text}
                  lineColor={c.textSecondary}
                  size="small"
                />
              ) : (
                <Text style={[styles.cell, { color: c.textSecondary }]}>–</Text>
              )}
            </View>
            <Text style={[styles.cell, styles.puttRow, { color: c.textSecondary }]}>
              {dash(entry?.putts)}
            </Text>
          </Pressable>
        );
      })}

      <View style={[styles.column, styles.totalColumn, { backgroundColor: c.backgroundElement }]}>
        <Text style={[styles.cell, styles.headRow, styles.holeNumber, { color: c.text }]}>{totalLabel}</Text>
        <Text style={[styles.cell, styles.parRow, { color: c.textSecondary }]}>{sum(holes.map(parOf))}</Text>
        <View style={styles.scoreCell}>
          <Text style={[styles.cell, styles.holeNumber, { color: c.text }]}>
            {dash(sum(entries.map((e) => e?.score)))}
          </Text>
        </View>
        <Text style={[styles.cell, styles.puttRow, { color: c.textSecondary }]}>
          {dash(sum(entries.map((e) => e?.putts)))}
        </Text>
      </View>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  const c = useTheme();
  return (
    <View style={styles.total}>
      <Text style={[styles.totalLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.totalValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

function Summary({ round, summary, onDone }: { round: Round; summary: RoundSummary; onDone: () => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { strokes, toPar, putts, fairways, greens, holesScored, holesTotal } = summary;
  const rows = [
    { label: 'Holes', value: `${holesScored} of ${holesTotal}` },
    { label: 'Putts', value: putts != null ? `${putts}` : '–' },
    { label: 'Fairways', value: fairways.of > 0 ? `${fairways.hit} of ${fairways.of}` : '–' },
    { label: 'Greens', value: greens.of > 0 ? `${greens.hit} of ${greens.of}` : '–' },
  ];

  return (
    <>
      <View style={styles.summary}>
        <Text style={[styles.summaryScore, { color: c.text }]}>{holesScored > 0 ? strokes : '–'}</Text>
        <Text style={[styles.summaryToPar, { color: c.textSecondary }]}>
          {formatToPar(toPar)} · {round.tee} tees
        </Text>
        <View style={[styles.summaryRows, { backgroundColor: c.surface }]}>
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.summaryRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
              ]}
            >
              <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.summaryValue, { color: c.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <GlassButton label="Done" onPress={onDone} />
      </View>
    </>
  );
}

const INSET = Spacing.three;
const ROW = { head: 30, par: 26, score: 40, putts: 28 } as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four + Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  title: { ...Type.title, flex: 1 },
  close: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { ...Type.body },
  content: { padding: INSET, gap: Spacing.three },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  labels: { width: 42, paddingLeft: Spacing.two },
  column: { flex: 1, alignItems: 'center' },
  totalColumn: { flex: 1.3 },
  rowLabel: { ...Type.caption, fontWeight: '600', textAlignVertical: 'center' },
  headRow: { height: ROW.head, lineHeight: ROW.head },
  parRow: { height: ROW.par, lineHeight: ROW.par },
  scoreRowLabel: { height: ROW.score, lineHeight: ROW.score },
  puttRow: { height: ROW.putts, lineHeight: ROW.putts },
  scoreCell: { height: ROW.score, alignItems: 'center', justifyContent: 'center' },
  cell: { ...Type.caption, fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'center' },
  holeNumber: { fontWeight: '700' },
  totals: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
  },
  total: { flex: 1, alignItems: 'center', gap: Spacing.half },
  totalLabel: { ...Type.caption, fontWeight: '600' },
  totalValue: { ...Type.title, fontVariant: ['tabular-nums'] },
  warning: { ...Type.subhead, paddingHorizontal: Spacing.two, lineHeight: 21 },
  footer: { paddingHorizontal: INSET, paddingTop: Spacing.two },
  summary: { flex: 1, alignItems: 'center', paddingHorizontal: INSET, paddingTop: Spacing.five },
  summaryScore: { fontSize: 72, lineHeight: 80, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryToPar: { ...Type.headline, marginTop: Spacing.one },
  summaryRows: {
    alignSelf: 'stretch',
    marginTop: Spacing.five,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three },
  summaryLabel: { ...Type.body },
  summaryValue: { ...Type.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
