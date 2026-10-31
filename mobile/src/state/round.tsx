import { randomUUID } from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { course, SIDE_HOLES, type Side } from '@/utils/course';

/**
 * The round in progress, shaped like the backend's upload (POST /api/v1/rounds)
 * so it can be sent as-is at the end.
 *
 * Everything is created empty at Tee Off and stays editable until upload;
 * the upload sends only holes with something entered, empty fields as null.
 *
 * Saved on the device after every change, so it survives the app closing.
 * It stays saved until the server confirms the upload (201 or 200), then it's deleted.
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

/** Lowercase on purpose: these are the exact values the backend's CHECK constraints accept. */
export const LIES = ['tee', 'fairway', 'rough', 'sand', 'green', 'recovery'] as const;
export type Lie = (typeof LIES)[number];

export const GIR_RESULTS = ['hit', 'long', 'short', 'left', 'right', 'no_chance'] as const;
export type GirResult = (typeof GIR_RESULTS)[number];

export const FAIRWAY_RESULTS = ['hit', 'long', 'short', 'left', 'right'] as const;
export type FairwayResult = (typeof FAIRWAY_RESULTS)[number];

/** Display text for the lowercase values above. */
export function label(value: string): string {
  return value === 'no_chance' ? 'No Chance' : value[0].toUpperCase() + value.slice(1);
}

/** shotNumber isn't stored: it's the shot's position in its hole's list. */
export type Shot = {
  club: Club;
  startDist: number; // yards to the hole before the shot
  endDist: number; // yards to the hole after it; 0 = holed
  startLie: Lie;
  endLie: Lie;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  penalties: number;
};

/** null = not entered; 0 = entered as zero. */
export type HoleEntry = {
  score: number | null;
  gir: GirResult | null;
  fairway: FairwayResult | null;
  putts: number | null;
  chips: number | null;
  sandShots: number | null;
  penalties: number | null;
  shots: Shot[];
};

export type HoleStats = Omit<HoleEntry, 'shots'>;

export type Round = {
  clientId: string; // made once at Tee Off; every upload retry reuses it so the server can spot duplicates
  courseId: number;
  tee: string;
  side: Side;
  startedAt: string; // ISO timestamp of Tee Off; its local date becomes playedOn
  holes: Record<number, HoleEntry>; // every hole on the side, created empty at Tee Off
  currentHole: number; // where Resume Round takes you; not uploaded
};

const EMPTY_HOLE: HoleEntry = {
  score: null,
  gir: null,
  fairway: null,
  putts: null,
  chips: null,
  sandShots: null,
  penalties: null,
  shots: [],
};

/** Adds an empty entry for any hole on the side that doesn't have one; never removes data. */
function withHolesFor(side: Side, holes: Record<number, HoleEntry>): Record<number, HoleEntry> {
  const next = { ...holes };
  for (const n of SIDE_HOLES[side]) next[n] ??= EMPTY_HOLE;
  return next;
}

const STORAGE_KEY = 'round-in-progress';

/** The saved round, or null. Anything unreadable or from an older shape is ignored. */
function loadSaved(): Round | null {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Round;
    return r.clientId && r.holes && r.currentHole ? r : null;
  } catch {
    return null;
  }
}

type RoundState = {
  round: Round | null;
  startRound: (tee: string, side: Side) => void;
  /** Deletes the round from the phone: on Discard, and after the server confirms the upload. */
  clearRound: () => void;
  setCurrentHole: (holeNumber: number) => void;
  setTee: (tee: string) => void;
  setSide: (side: Side) => void;
  hole: (holeNumber: number) => HoleEntry;
  updateHole: (holeNumber: number, patch: Partial<HoleStats>) => void;
  addShot: (holeNumber: number, shot: Shot) => void;
  updateShot: (holeNumber: number, index: number, patch: Partial<Shot>) => void;
  removeShot: (holeNumber: number, index: number) => void;
};

const RoundContext = createContext<RoundState | null>(null);

export function RoundProvider({ children }: { children: ReactNode }) {
  // read synchronously so a saved round is there on the first render (no flash of Start Round)
  const [round, setRound] = useState<Round | null>(loadSaved);

  // save after every change; no round = nothing saved
  useEffect(() => {
    try {
      if (round) Storage.setItemSync(STORAGE_KEY, JSON.stringify(round));
      else Storage.removeItemSync(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not save the round', e);
    }
  }, [round]);

  /** Starting a round replaces whatever the last one left behind. */
  const startRound = useCallback((tee: string, side: Side) => {
    setRound({
      clientId: randomUUID(),
      courseId: course.courseId,
      tee,
      side,
      startedAt: new Date().toISOString(),
      holes: withHolesFor(side, {}),
      currentHole: SIDE_HOLES[side][0],
    });
  }, []);

  const clearRound = useCallback(() => setRound(null), []);

  const setCurrentHole = useCallback((n: number) => {
    setRound((r) => (r && r.currentHole !== n ? { ...r, currentHole: n } : r));
  }, []);

  const setTee = useCallback((tee: string) => {
    setRound((r) => (r ? { ...r, tee } : r));
  }, []);

  // 9 -> 18 adds the missing empty holes. Shrinking keeps the data; the upload
  // only sends holes on the current side (what to do with the rest is undecided).
  const setSide = useCallback((side: Side) => {
    setRound((r) => (r ? { ...r, side, holes: withHolesFor(side, r.holes) } : r));
  }, []);

  const hole = useCallback((n: number) => round?.holes[n] ?? EMPTY_HOLE, [round]);

  /** Applies a change to one hole; does nothing if there's no round or no such hole. */
  const changeHole = useCallback((n: number, change: (h: HoleEntry) => HoleEntry) => {
    setRound((r) => (r && r.holes[n] ? { ...r, holes: { ...r.holes, [n]: change(r.holes[n]) } } : r));
  }, []);

  const updateHole = useCallback(
    (n: number, patch: Partial<HoleStats>) => changeHole(n, (h) => ({ ...h, ...patch })),
    [changeHole],
  );

  const addShot = useCallback(
    (n: number, shot: Shot) => changeHole(n, (h) => ({ ...h, shots: [...h.shots, shot] })),
    [changeHole],
  );

  const updateShot = useCallback(
    (n: number, index: number, patch: Partial<Shot>) =>
      changeHole(n, (h) => ({ ...h, shots: h.shots.map((s, i) => (i === index ? { ...s, ...patch } : s)) })),
    [changeHole],
  );

  const removeShot = useCallback(
    (n: number, index: number) => changeHole(n, (h) => ({ ...h, shots: h.shots.filter((_, i) => i !== index) })),
    [changeHole],
  );

  const value = useMemo(
    () => ({
      round,
      startRound,
      clearRound,
      setCurrentHole,
      setTee,
      setSide,
      hole,
      updateHole,
      addShot,
      updateShot,
      removeShot,
    }),
    [round, startRound, clearRound, setCurrentHole, setTee, setSide, hole, updateHole, addShot, updateShot, removeShot],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound(): RoundState {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error('useRound must be used inside a RoundProvider');
  return ctx;
}

// ---------- totals ----------

/**
 * Strokes relative to par over the holes on the side that have a score; holes
 * without one are left out of both sides of the sum. null until something is scored.
 */
export function scoreToPar(round: Round, parOf: (holeNumber: number) => number): number | null {
  const scored = SIDE_HOLES[round.side].filter((n) => round.holes[n]?.score != null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, n) => sum + (round.holes[n].score as number) - parOf(n), 0);
}

/** The numbers a finished round is summed up with; each covers only what was entered. */
export type RoundSummary = {
  holesScored: number;
  holesTotal: number;
  /** holes on the side with no score, in order */
  missing: number[];
  strokes: number;
  toPar: number | null;
  putts: number | null;
  fairways: { hit: number; of: number };
  greens: { hit: number; of: number };
};

export function summarizeRound(round: Round, parOf: (holeNumber: number) => number): RoundSummary {
  const numbers = SIDE_HOLES[round.side];
  const holes = numbers.map((n) => round.holes[n]).filter((h) => h != null);
  const count = (vals: (string | null)[]) => {
    const entered = vals.filter((v) => v !== null);
    return { hit: entered.filter((v) => v === 'hit').length, of: entered.length };
  };
  const puttCounts = holes.map((h) => h.putts).filter((p) => p !== null);
  const scored = holes.filter((h) => h.score !== null);
  return {
    holesScored: scored.length,
    holesTotal: numbers.length,
    missing: numbers.filter((n) => round.holes[n]?.score == null),
    strokes: scored.reduce((sum, h) => sum + (h.score as number), 0),
    toPar: scoreToPar(round, parOf),
    putts: puttCounts.length > 0 ? puttCounts.reduce((sum, p) => sum + p, 0) : null,
    fairways: count(holes.map((h) => h.fairway)),
    greens: count(holes.map((h) => h.gir)),
  };
}

/** "E", "+3", "−2" -- the way golfers write a score to par (a real minus sign, not a hyphen). */
export function formatToPar(diff: number | null): string {
  if (diff === null) return '–';
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `−${-diff}`;
}

// ---------- upload ----------

function hasData(h: HoleEntry): boolean {
  return (
    h.shots.length > 0 ||
    [h.score, h.gir, h.fairway, h.putts, h.chips, h.sandShots, h.penalties].some((v) => v !== null)
  );
}

/** The phone's local date (YYYY-MM-DD). toISOString() would give the UTC date -- the next day in a California evening. */
function localDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The JSON body for POST /api/v1/rounds (backend's UploadRoundRequest). */
export function toUploadRequest(round: Round) {
  return {
    clientId: round.clientId,
    courseId: round.courseId,
    tee: round.tee,
    holes: round.side, // the backend still calls it "holes"
    playedOn: localDate(round.startedAt),
    holesPlayed: SIDE_HOLES[round.side]
      .filter((n) => round.holes[n] && hasData(round.holes[n]))
      .map((n) => {
        const { shots, ...stats } = round.holes[n];
        return {
          holeNumber: n,
          ...stats,
          shots: shots.map((s, i) => ({ shotNumber: i + 1, ...s })),
        };
      }),
  };
}
