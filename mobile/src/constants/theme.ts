/**
 * Design tokens. One source of truth -- screens import components, components
 * import tokens, and nothing outside this file hardcodes a colour or font size.
 *
 * The palette was sampled from the reference designs: an emerald accent on a
 * faintly green-tinted off-white. The green cast on the background is what makes
 * it read as a golf app rather than a generic dashboard.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111418',
    textSecondary: '#60646C',
    background: '#F0F5F1',
    surface: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    separator: '#E3E8E4',
    accent: '#00B88A',
    accentDeep: '#019A74',
    accentSoft: '#A9E5D2',
    onAccent: '#FFFFFF',
    danger: '#FF5A4E',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B4BA',
    background: '#0E1311',
    surface: '#171C1A',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    separator: '#2A302D',
    accent: '#0ACF9B',
    accentDeep: '#00B88A',
    accentSoft: '#134336',
    onAccent: '#04150F',
    danger: '#FF6B60',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * The hole map is always dark -- the aerial imagery is the content and should be
 * the brightest thing on screen, whatever the system colour scheme says.
 *
 * These are deliberately static hex strings: Reanimated cannot accept
 * PlatformColor, and the SVG overlay lives inside a Reanimated-transformed view.
 */
export const MapColors = {
  backdrop: '#000000',
  line: '#FFFFFF',
  tee: '#FFFFFF',
  green: '#FFFFFF',
  aimFill: 'rgba(255,255,255,0.18)',
  aimStroke: '#FFFFFF',
  me: '#1C7ED6',
  meStroke: '#FFFFFF',
  labelFill: '#FFFFFF',
  labelText: '#111418',
  hud: 'rgba(0,0,0,0.65)',
  hudStrong: 'rgba(0,0,0,0.78)',
  hudText: '#FFFFFF',
  hudMuted: '#A8AFAC',
} as const;

/**
 * Chart colours. The strokes-gained breakdown is DIVERGING, not categorical:
 * values are signed and zero is meaningful, so it needs two poles and a neutral
 * midpoint -- never a categorical ramp.
 *
 * Validated: CVD separation dE 8.8 (deutan), normal-vision dE 32.4. Contrast
 * against a white card is below 3:1, so every mark carries a visible label.
 */
export const Chart = {
  positive: '#00B88A',
  negative: '#FF5A4E',
  zeroLine: '#D4DAD6',
  grid: '#EDF1EE',
  trend: '#019A74',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Named text styles, mirroring the Apple ramp so sizes feel native. `yardage` is
 * the outlier on purpose: it has to be readable at arm's length in sunlight.
 * Colour is applied by the component, not baked in here.
 */
export const Type = {
  yardage: { fontSize: 44, fontWeight: '700', letterSpacing: -1 },
  largeTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

export type TypeVariant = keyof typeof Type;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** boxShadow strings, never the legacy shadow or elevation props. */
export const Shadows = {
  card: '0px 1px 3px rgba(17, 20, 24, 0.06)',
  raised: '0px 6px 18px rgba(17, 20, 24, 0.10)',
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

/** Durations, so motion across the app feels related. */
export const Motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
