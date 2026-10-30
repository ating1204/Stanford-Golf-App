import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Brand, Radius, Spacing, Type } from '@/constants/theme';

const LIQUID = isLiquidGlassAvailable();

/**
 * Green glass button -- the app's primary action everywhere, always the same
 * green (theme Green.glass). On iOS 26+ it's Apple's Liquid Glass tinted that
 * green (the tab bar's material; reacts to touch). Elsewhere it falls back to
 * frosted glass: a light blur under the same green, a sheen and a soft edge.
 */
export function GlassButton({
  label,
  subtitle,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  leading,
  trailing,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** controls pinned inside the left / right ends (they take their own taps) */
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const text = (
    <>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel ?? (subtitle ? `${label}, ${subtitle}` : label),
    accessibilityState: { disabled },
  };

  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={Brand.greenGlass}
        isInteractive={!disabled}
        style={[styles.button, disabled && styles.disabled, style]}
      >
        <Pressable {...a11y} disabled={disabled} onPress={onPress} style={styles.hit}>
          {text}
        </Pressable>
        {leading ? <View style={[styles.end, styles.leading]}>{leading}</View> : null}
        {trailing ? <View style={[styles.end, styles.trailing]}>{trailing}</View> : null}
      </GlassView>
    );
  }

  return (
    <Pressable
      {...a11y}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.clip,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Brand.greenGlass }]} />
      <LinearGradient colors={[Brand.glassSheen, 'transparent']} style={styles.sheen} />
      {/* edge drawn as its own layer: a border on the button itself sits under the fills */}
      <View style={[StyleSheet.absoluteFill, styles.edge]} />
      {text}
      {leading ? <View style={[styles.end, styles.leading]}>{leading}</View> : null}
      {trailing ? <View style={[styles.end, styles.trailing]}>{trailing}</View> : null}
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
  hit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: { overflow: 'hidden' },
  end: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  leading: { left: Spacing.one },
  trailing: { right: Spacing.one },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  edge: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Brand.glassEdge,
  },
  // bold 19pt counts as large text, which keeps white readable on see-through green
  label: {
    ...Type.headline,
    fontSize: 19,
    fontWeight: '700',
    color: Brand.onGlass,
    letterSpacing: 0.3,
    textShadowColor: Brand.textShadow,
    textShadowRadius: 4,
  },
  subtitle: {
    ...Type.footnote,
    color: Brand.onGlass,
    opacity: 0.85,
    textShadowColor: Brand.textShadow,
    textShadowRadius: 4,
  },
});
