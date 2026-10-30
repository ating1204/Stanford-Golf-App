import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Placeholder: the full scorecard comes later. For now it opens and closes. */
export default function ScorecardRoute() {
  const c = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Scorecard</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={6}
          style={[styles.close, { backgroundColor: c.backgroundElement }]}
        >
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={15} weight="bold" tintColor={c.text} />
        </Pressable>
      </View>
      <View style={styles.empty}>
        <Text style={[styles.note, { color: c.textSecondary }]}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four + Spacing.one,
    paddingTop: Spacing.four,
  },
  title: { ...Type.title, flex: 1 },
  close: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { ...Type.body },
});
