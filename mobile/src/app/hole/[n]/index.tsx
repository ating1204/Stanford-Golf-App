import { useLocalSearchParams } from 'expo-router';

import { HoleScreen } from '@/screens/hole';
import { DEFAULT_TEE } from '@/utils/course';

export default function HoleRoute() {
  const { n, tee } = useLocalSearchParams<{ n: string; tee?: string }>();
  // key forces a remount per hole, so aim points reset to their defaults
  return <HoleScreen key={n} holeNumber={Number(n)} teeName={tee ?? DEFAULT_TEE} />;
}
