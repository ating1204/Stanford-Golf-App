import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '@/utils/geo';

export type LocationState = {
  position: LatLng | null;
  accuracyM: number | null;
  error: string | null;
};

/**
 * Watches the device position while the screen is mounted.
 *
 * setState here runs at roughly 1 Hz, not per frame, so it does not belong in a
 * shared value -- React re-rendering once a second is fine, and keeping the
 * position in state lets plain components read it.
 */
export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    position: null,
    accuracyM: null,
    error: null,
  });

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setState((s) => ({ ...s, error: 'Location permission denied' }));
        }
        return;
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          if (cancelled) return;
          setState({
            position: { lat: loc.coords.latitude, lng: loc.coords.longitude },
            accuracyM: loc.coords.accuracy,
            error: null,
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return state;
}
