import { useLocalSearchParams } from 'expo-router';

import { TrackScreen } from '@/screens/track';
import { DEFAULT_TEE } from '@/utils/course';

export default function TrackRoute() {
  const { n, tee } = useLocalSearchParams<{ n: string; tee?: string }>();
  return <TrackScreen holeNumber={Number(n)} teeName={tee ?? DEFAULT_TEE} />;
}
