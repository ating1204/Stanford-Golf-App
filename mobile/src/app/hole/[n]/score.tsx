import { useLocalSearchParams } from 'expo-router';

import { ScoreScreen } from '@/screens/score';

export default function ScoreRoute() {
  const { n } = useLocalSearchParams<{ n: string }>();
  return <ScoreScreen holeNumber={Number(n)} />;
}
