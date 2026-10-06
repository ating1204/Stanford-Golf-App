import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Metric } from '@/components/metric';
import { MiniBars } from '@/components/mini-bars';
import { RangeBar } from '@/components/range-bar';
import { SgChart } from '@/components/sg-chart';
import { CardDivider, StatCard } from '@/components/stat-card';
import { TrendLine } from '@/components/trend-line';
import { Chart, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSg, sampleStats } from '@/utils/stats';

export function StatisticsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = sampleStats();
  const g = s.scoringGoal;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.two, paddingBottom: Spacing.six },
      ]}
    >
      <Text style={[styles.h1, { color: c.text }]}>Course &amp; Round Stats</Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>
        Stanford Golf Course · last {s.rounds} rounds
      </Text>

      <StatCard>
        <Text style={[styles.goalTitle, { color: c.text }]}>
          Scoring Goal <Text style={{ color: c.textSecondary }}>({g.name})</Text>
        </Text>
        <Text style={[styles.goalLine, { color: c.textSecondary }]}>
          Birdies {g.birdies[0]}/{g.birdies[1]} · Pars {g.pars[0]}/{g.pars[1]} · GIR {g.gir[0]}/
          {g.gir[1]} · Fairways {g.fairways[0]}/{g.fairways[1]}
        </Text>
      </StatCard>

      <StatCard>
        <View style={styles.split}>
          <Metric label="Avg. Score" value={s.avgScore.toFixed(1)} style={styles.half} />
          <View style={styles.half}>
            <TrendLine values={s.scoreTrend} />
          </View>
        </View>
        <CardDivider />
        <View style={styles.split}>
          <Metric label="Par or Better" value={s.parOrBetter.toFixed(1)} style={styles.half} />
          <Metric label="Double or Worse" value={s.doubleOrWorse.toFixed(1)} style={styles.half} />
        </View>
        <CardDivider />
        <View style={styles.split}>
          <Metric label="Par 3" value={s.byPar.par3.toFixed(1)} style={styles.third} />
          <Metric label="Par 4" value={s.byPar.par4.toFixed(1)} style={styles.third} />
          <Metric label="Par 5" value={s.byPar.par5.toFixed(1)} style={styles.third} />
        </View>
      </StatCard>

      <StatCard>
        <View style={styles.split}>
          <View style={styles.half}>
            <Metric
              label="Fairways Hit"
              value={s.fairwaysHit.pct.toFixed(1)}
              suffix="%"
              note={`(${s.fairwaysHit.of})`}
            />
            <MiniBars values={s.fairwaysHit.perRound} />
          </View>
          <View style={styles.half}>
            <Metric
              label="Greens in Regulation"
              value={s.gir.pct.toFixed(1)}
              suffix="%"
              note={`(${s.gir.of})`}
            />
            <MiniBars values={s.gir.perRound} />
          </View>
        </View>
      </StatCard>

      <StatCard title="Strokes Gained">
        <View style={styles.split}>
          <Metric
            label="Total"
            value={formatSg(s.sg.total)}
            color={s.sg.total >= 0 ? Chart.positive : Chart.negative}
            style={styles.half}
          />
          <Metric
            label="Tee to Green"
            value={formatSg(s.sg.teeToGreen)}
            color={s.sg.teeToGreen >= 0 ? Chart.positive : Chart.negative}
            style={styles.half}
          />
        </View>
        <SgChart byCategory={s.sg.byCategory} />
        <Text style={[styles.baseline, { color: c.textSecondary }]}>
          Baseline: scratch golfer
        </Text>
      </StatCard>

      <StatCard title="Insights from Strokes Gained">
        <View style={styles.stack}>
          <RangeBar
            label="Avg 1st Putt"
            value={s.avgFirstPuttFt}
            min={0}
            max={50}
            ticks={[0, 25, 50]}
            unit="ft"
          />
          <RangeBar
            label="Avg Approach"
            value={s.avgApproachYds}
            min={50}
            max={200}
            ticks={[50, 100, 150, 200]}
            unit="yds"
          />
        </View>
      </StatCard>

      <StatCard>
        <View style={styles.split}>
          <Metric label="Putts Per Round" value={s.puttsPerRound.toFixed(1)} style={styles.half} />
          <View style={styles.half}>
            <TrendLine values={s.puttsTrend} />
          </View>
        </View>
        <CardDivider />
        <View style={styles.split}>
          <Metric label="Putts per Hole" value={s.puttsPerHole.toFixed(1)} style={styles.half} />
          <Metric label="# of ≥ 3 Putts" value={s.threePutts.toFixed(1)} style={styles.half} />
        </View>
      </StatCard>

      <StatCard>
        <View style={styles.split}>
          <View style={styles.half}>
            <Metric label="Sand Saves" value={s.sandSaves.pct.toFixed(0)} suffix="%" />
            <MiniBars values={s.sandSaves.perRound} />
          </View>
          <View style={styles.half}>
            <Metric label="Up &amp; Down" value={s.upAndDown.pct.toFixed(1)} suffix="%" />
            <MiniBars values={s.upAndDown.perRound} />
          </View>
        </View>
      </StatCard>

      <Text style={[styles.sample, { color: c.textSecondary }]}>
        Sample data — real figures appear once you log a round.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  h1: { ...Type.title, textAlign: 'center' },
  sub: { ...Type.caption, textAlign: 'center', marginTop: -Spacing.two },
  goalTitle: { ...Type.headline },
  goalLine: { ...Type.caption },
  split: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  stack: { gap: Spacing.four, marginTop: Spacing.one },
  half: { flex: 1 },
  third: { flex: 1 },
  baseline: { ...Type.caption, textAlign: 'center', marginTop: Spacing.two },
  sample: { ...Type.caption, textAlign: 'center' },
});
