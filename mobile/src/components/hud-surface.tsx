import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { MapColors } from '@/constants/theme';

const LIQUID = isLiquidGlassAvailable();

/**
 * Background for controls floating over the satellite map: dark Liquid Glass on
 * iOS 26+ with one fixed tint (always dark so white text reads on bright fairways,
 * and the same shade on every screen), the solid dark HUD pill elsewhere.
 * `interactive` gives buttons the native press shimmer.
 */
export function HudSurface({
  style,
  interactive = false,
  tint = MapColors.hudTint,
  onLayout,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  /** override for big panels, which iOS renders darker than small pills */
  tint?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  children?: ReactNode;
}) {
  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={tint}
        isInteractive={interactive}
        style={style}
        onLayout={onLayout}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ backgroundColor: MapColors.hudStrong }, style]} onLayout={onLayout}>
      {children}
    </View>
  );
}
