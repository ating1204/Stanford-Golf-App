import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { LatLng } from '@/utils/geo';

/**
 * The round in progress.
 *
 * IN MEMORY ONLY -- this is lost when the app restarts. It lives here so the
 * screens can be built and the shape settled before committing to a schema;
 * swapping the implementation for expo-sqlite later should not change any
 * consumer, only this file.
 */

export const CLUBS = [
  'Dr',
  '4w',
  '5w',
  '4h',
  '5i',
  '6i',
  '7i',
  '8i',
  '9i',
  '44°',
  '50°',
  '54°',
  '58°',
  'Putter',
] as const;

export type Club = (typeof CLUBS)[number];

/** Matches the lies in the strokes-gained baseline tables, plus Recovery. */
export const LIES = ['Tee', 'Fairway', 'Sand', 'Rough', 'Green', 'Recovery'] as const;
export type Lie = (typeof LIES)[number];

export type Shot = {
  id: string;
  holeNumber: number;
  from: LatLng;
  to: LatLng;
  yards: number;
  club: Club;
  lie: Lie;
};

export type HoleScore = {
  strokes?: number;
  putts?: number;
  fairwayHit?: boolean;
  gir?: boolean;
  chips?: number;
  sandShots?: number;
  penalties?: number;
};

type RoundState = {
  teeName: string;
  startRound: (teeName: string) => void;
  shots: Shot[];
  scores: Record<number, HoleScore>;
  addShot: (shot: Omit<Shot, 'id'>) => void;
  shotsForHole: (holeNumber: number) => Shot[];
  setScore: (holeNumber: number, patch: HoleScore) => void;
  scoreFor: (holeNumber: number) => HoleScore;
};

const RoundContext = createContext<RoundState | null>(null);

export function RoundProvider({ children }: { children: ReactNode }) {
  const [teeName, setTeeName] = useState('White');
  const [shots, setShots] = useState<Shot[]>([]);
  const [scores, setScores] = useState<Record<number, HoleScore>>({});

  /** Starting a round clears whatever the last one left behind. */
  const startRound = useCallback((tee: string) => {
    setTeeName(tee);
    setShots([]);
    setScores({});
  }, []);

  const addShot = useCallback((shot: Omit<Shot, 'id'>) => {
    setShots((prev) => [...prev, { ...shot, id: `${Date.now()}-${prev.length}` }]);
  }, []);

  const shotsForHole = useCallback(
    (holeNumber: number) => shots.filter((s) => s.holeNumber === holeNumber),
    [shots],
  );

  const setScore = useCallback((holeNumber: number, patch: HoleScore) => {
    setScores((prev) => ({ ...prev, [holeNumber]: { ...prev[holeNumber], ...patch } }));
  }, []);

  const scoreFor = useCallback((holeNumber: number) => scores[holeNumber] ?? {}, [scores]);

  const value = useMemo(
    () => ({ teeName, startRound, shots, scores, addShot, shotsForHole, setScore, scoreFor }),
    [teeName, startRound, shots, scores, addShot, shotsForHole, setScore, scoreFor],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound(): RoundState {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error('useRound must be used inside a RoundProvider');
  return ctx;
}
