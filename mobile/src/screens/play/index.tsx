import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Shadows, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRound } from '@/state/round';
import {
  course,
  coursePar,
  courseYards,
  DEFAULT_TEE,
  FIRST_HOLE,
  TEE_NAMES,
} from '@/utils/course';

export function PlayScreen() {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const [tee, setTee] = useState<string>(DEFAULT_TEE);
  const { startRound } = useRound();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.six }}>
        {/* hero: the course you play, no picker -- there is only one */}
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/images/course-hero.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroText, { paddingTop: insets.top + Spacing.four }]}>
            <Text style={styles.heroLocation}>
              {course.city}, {course.state}
            </Text>
            <Text style={styles.heroTitle}>{course.name}</Text>
            <Text style={styles.heroMeta}>
              Par {coursePar()} · {courseYards(tee).toLocaleString()} yds from {tee}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>TEES</Text>
          <View style={[styles.teeGroup, { backgroundColor: c.surface }]}>
            {TEE_NAMES.map((name, i) => {
              const selected = name === tee;
              return (
                <Pressable
                  key={name}
                  onPress={() => setTee(name)}
                  style={({ pressed }) => [
                    styles.teeRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <View
                    style={[
                      styles.teeDot,
                      { borderColor: selected ? c.accent : c.separator },
                      selected && { backgroundColor: c.accent },
                    ]}
                  />
                  <Text style={[styles.teeName, { color: c.text }]}>{name}</Text>
                  <Text style={[styles.teeYards, { color: c.textSecondary }]}>
                    {courseYards(name).toLocaleString()} yds
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start round"
            onPress={() => {
              startRound(tee);
              router.push(`/hole/${FIRST_HOLE}?tee=${tee}`);
            }}
            style={({ pressed }) => [
              styles.start,
              { backgroundColor: pressed ? c.accentDeep : c.accent },
            ]}
          >
            <Text style={[styles.startText, { color: c.onAccent }]}>Start Round</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 320, justifyContent: 'flex-end', backgroundColor: '#000' },
  heroText: { padding: Spacing.three },
  heroLocation: { ...Type.footnote, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { ...Type.largeTitle, color: '#FFFFFF', marginTop: Spacing.half },
  heroMeta: { ...Type.subhead, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.one },
  body: { padding: Spacing.three, gap: Spacing.two },
  sectionLabel: { ...Type.caption, letterSpacing: 0.8, marginTop: Spacing.two },
  teeGroup: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: Shadows.card,
  },
  teeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  teeDot: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 2 },
  teeName: { ...Type.headline, flex: 1 },
  teeYards: { ...Type.subhead },
  start: {
    marginTop: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  startText: { ...Type.headline },
});
