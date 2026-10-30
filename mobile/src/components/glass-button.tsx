import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Brand, Radius, Type } from '@/constants/theme';

const LIQUID = isLiquidGlassAvailable();

/**
 * Green glass button. On iOS 26+ it's Apple's Liquid Glass tinted accent green
 * (the same material as the tab bar, and it reacts to touch). Everywhere else it
 * falls back to frosted glass: a light blur, a thin green tint, a sheen and a soft edge.
 */
export function GlassButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" tintColor={Brand.liquidTint} isInteractive style={[styles.button, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.hit}>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.clip, pressed && styles.pressed, style]}
    >
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Brand.glassTint }]} />
      <LinearGradient colors={[Brand.glassSheen, 'transparent']} style={styles.sheen} />
      {/* edge drawn as its own layer: a border on the button itself sits under the fills */}
      <View style={[StyleSheet.absoluteFill, styles.edge]} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  edge: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Brand.glassEdge,
  },
  label: {
    ...Type.headline,
    color: Brand.onGlass,
    letterSpacing: 0.3,
    textShadowColor: Brand.textShadow,
    textShadowRadius: 4,
  },
});
