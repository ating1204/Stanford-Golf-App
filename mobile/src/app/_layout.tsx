import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { RoundProvider } from '@/state/round';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

// The app is light-only (see useTheme). app.json says so too, but Expo Go ignores
// that and follows the phone, which turned the native glass sheets dark in dark mode.
Appearance.setColorScheme('light');

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RoundProvider>
        <AnimatedSplashOverlay />
        {/* The hole screen sits outside the tabs: it is full-bleed and carries
            its own bottom controls, which would collide with a tab bar. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="hole/[n]" />
          {/* placeholder for now; the full scorecard comes later */}
          <Stack.Screen name="scorecard" options={{ presentation: 'modal' }} />
        </Stack>
        </RoundProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
