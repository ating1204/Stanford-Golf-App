import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.accent } }}
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="dashboard" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="courses">
        <NativeTabs.Trigger.Icon sf="flag.fill" md="golf_course" />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* index is Play, so "/" resolves to the screen you open the app on */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="figure.golf" md="sports_golf" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="statistics">
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="insights" />
        <NativeTabs.Trigger.Label>Statistics</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
