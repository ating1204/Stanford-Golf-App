import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { BottomTabInset, Brand, Spacing } from '@/constants/theme';

import { StartRoundSheet } from './start-round-sheet';

/** Full-bleed course photo, the logo up top, one button; tee and nine are picked in the sheet. */
export function PlayScreen() {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={styles.root}>
      {/* landscape photo cropped to portrait; nudged left so the fairway and bunker stay in frame */}
      <Image
        source={require('../../../assets/images/course-hero.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: '40%' }}
      />
      {/* soft fades so the status bar, logo and button read against the photo */}
      <LinearGradient colors={[Brand.fadeTop, 'transparent']} style={[styles.fade, styles.fadeTop]} />
      <LinearGradient colors={['transparent', Brand.fadeBottom]} style={[styles.fade, styles.fadeBottom]} />

      {/* kept in the sky band of the photo, where cardinal has the most contrast */}
      <View style={[styles.logoWrap, { paddingTop: insets.top + Spacing.five }]}>
        <Image
          source={require('../../../assets/images/stanford-golf-logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Stanford Golf Course"
        />
      </View>

      <GlassButton
        label="Start Round"
        onPress={() => setSheetOpen(true)}
        style={[styles.start, { bottom: insets.bottom + BottomTabInset + Spacing.four }]}
      />

      <StartRoundSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fade: { position: 'absolute', left: 0, right: 0 },
  fadeTop: { top: 0, height: '25%' },
  fadeBottom: { bottom: 0, height: '45%' },
  logoWrap: { alignItems: 'center' },
  logo: { width: 240, aspectRatio: 300 / 210 },
  start: { position: 'absolute', left: Spacing.four, right: Spacing.four },
});
