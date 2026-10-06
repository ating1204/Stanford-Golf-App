import { Stack } from 'expo-router/stack';

export default function HoleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* 'modal' rather than 'formSheet': a formSheet measures its own content,
          and a flex:1 child inside one lays out as zero height on iOS. */}
      <Stack.Screen name="score" options={{ presentation: 'modal' }} />
      <Stack.Screen name="track" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
