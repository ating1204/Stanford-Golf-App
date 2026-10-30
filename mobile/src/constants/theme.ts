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

/**
 * The one green. Every green in the app -- glass buttons, selected chips, accent
 * text, tab highlight -- comes from here, so they always match.
 * `base` carries white text at 4.9:1; `glass` is the same green as a Liquid Glass
 * tint -- see-through enough to read as glass; button labels are bold 19pt (large
 * text) so white stays readable on it.
 */
export const Green = {
  base: '#00815F',
  deep: '#006B4F',
  glass: 'rgba(0, 129, 95, 0.7)',
  /** brighter variant for green text/marks on dark backgrounds */
  bright: '#1FB88E',
  soft: '#A9E5D2',
  softDark: '#134336',
  /** a faint wash over the light glass sheets: reads as clear white, but on-brand */
  sheetTint: 'rgba(0, 129, 95, 0.07)',
  /** a picked chip: see-through green with a solid green edge and bold green text */
  selectedFill: 'rgba(0, 129, 95, 0.16)',
} as const;

/**
 * How every selected chip / button looks: translucent green, a 2pt green edge,
 * and the text and any marks inside in bold deep green.
 * Unselected chips carry a clear 2pt edge so nothing shifts.
 */
export const Selected = {
  fill: Green.selectedFill,
  edge: Green.base,
  text: Green.deep,
  edgeWidth: 2,
} as const;

export const Colors = {
  light: {
    text: '#111418',
    textSecondary: '#60646C',
    background: '#F0F5F1',
    surface: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    separator: '#E3E8E4',
    accent: Green.base,
    accentDeep: Green.deep,
    accentSoft: Green.soft,
    onAccent: '#FFFFFF',
    /** solid fill behind white text (selected chips) */
    accentFill: Green.base,
    // controls sitting on a glass sheet: translucent so the glass still reads through
    fill: 'rgba(255, 255, 255, 0.6)',
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
    accent: Green.bright,
    accentDeep: Green.base,
    accentSoft: Green.softDark,
    onAccent: '#FFFFFF',
    accentFill: Green.base,
    fill: 'rgba(255, 255, 255, 0.12)',
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
  /**
   * fixed tint for every dark glass control on the map. Liquid Glass otherwise
   * re-adapts to whatever is behind it each time a screen mounts, so the same
   * control looked lighter or darker from one screen to the next.
   */
  hudTint: 'rgba(24, 28, 26, 0.38)',
  /**
   * the same look for big glass panels (the hole list): iOS renders large glass
   * as thicker and darker than small pills, so a lighter tint evens them out
   */
  hudTintLarge: 'rgba(110, 114, 108, 0.32)',
  hudStrong: 'rgba(0,0,0,0.78)',
  hudText: '#FFFFFF',
  hudMuted: '#A8AFAC',
  /** the two draggable shot pins and the line between them */
  shot: Green.base,
} as const;

/**
 * Chart colours. The strokes-gained breakdown is DIVERGING, not categorical:
 * values are signed and zero is meaningful, so it needs two poles and a neutral
 * midpoint -- never a categorical ramp.
 *
 * Validated: CVD separation dE 8.8 (deutan), normal-vision dE 32.4. Contrast
 * against a white card is below 3:1, so every mark carries a visible label.
 */
/**
 * Frosted-glass layers that sit on top of photos: a light blur, a thin accent
 * green tint so the photo still glows through, a sheen toward the top and a
 * soft light edge. Static like MapColors: the Play screen is a photo, so it
 * ignores the light/dark palette. The only cardinal on that screen is the logo.
 */
export const Brand = {
  accent: Green.base,
  /** every green button, Liquid Glass and frosted fallback alike */
  greenGlass: Green.glass,
  liquidSheetTint: 'rgba(0, 120, 90, 0.25)',
  sheetTint: 'rgba(0, 120, 90, 0.22)',
  glassSheen: 'rgba(255, 255, 255, 0.22)',
  glassFill: 'rgba(255, 255, 255, 0.12)',
  glassEdge: 'rgba(255, 255, 255, 0.35)',
  onGlass: '#FFFFFF',
  onGlassSecondary: 'rgba(255, 255, 255, 0.75)',
  textShadow: 'rgba(0, 0, 0, 0.25)',
  scrim: 'rgba(0, 0, 0, 0.45)', // 40-60% keeps the sheet clearly in front
  fadeTop: 'rgba(0, 0, 0, 0.18)',
  fadeBottom: 'rgba(0, 0, 0, 0.6)',
} as const;

export const Chart = {
  positive: Green.base,
  negative: '#FF5A4E',
  zeroLine: '#D4DAD6',
  grid: '#EDF1EE',
  trend: Green.deep,
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
  /** hole numbers, distances in the map header, the picked club; tabular so digits don't jitter */
  numeral: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numeralSmall: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
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
