import { Colors } from '@/constants/theme';

/**
 * The app is light-only for now -- the visual design is built around a
 * green-tinted off-white, and a dark variant has not been designed.
 * The hole map is always dark regardless; it uses MapColors, not these.
 *
 * To re-enable dark mode: return Colors[scheme] here and set
 * userInterfaceStyle back to "automatic" in app.json.
 */
export function useTheme() {
  return Colors.light;
}
