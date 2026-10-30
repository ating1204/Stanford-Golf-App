import { Stack } from 'expo-router/stack';

// a link straight to /hole/3/score still opens with the map underneath,
// so the sheet presents as a sheet instead of a bare full screen
export const unstable_settings = { initialRouteName: 'index' };

export default function HoleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* fixed-height glass sheet over the map, swipe down to close. One detent on purpose:
          at full height iOS turns the sheet opaque, so it never expands. Numeric, not
          'fitToContents' -- flex:1 content only lays out with numbers. Transparent so
          iOS 26 draws its glass sheet background. */}
      <Stack.Screen
        name="score"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.6], // tall enough for the 3x3 and putts without scrolling; swipe down closes
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
