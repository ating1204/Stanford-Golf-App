/**
 * Round statistics.
 *
 * SAMPLE DATA for now -- no rounds have been logged yet. When shot logging
 * lands, replace `sampleStats()` with a query over the local shots table; the
 * types and every component consuming them stay exactly as they are.
 */

/**
 * Six categories rather than the classic four, matching the reference design.
 * Your baseline tables already distinguish sand from other lies, so Wedge and
 * Sand are derivable from shot distance + lie once real shots exist.
 */
export const SG_CATEGORIES = [
  'Tee',
  'Approach',
  'Wedge',
  'Around Green',
  'Sand',
  'Putting',
] as const;

export type SgCategory = (typeof SG_CATEGORIES)[number];

export type Stats = {
  rounds: number;

  scoringGoal: { name: string; birdies: [number, number]; pars: [number, number]; gir: [number, number]; fairways: [number, number] };

  avgScore: number;
  scoreTrend: number[];
  parOrBetter: number;
  doubleOrWorse: number;
  byPar: { par3: number; par4: number; par5: number };

  fairwaysHit: { pct: number; of: number; perRound: number[] };
  gir: { pct: number; of: number; perRound: number[] };

  sg: { total: number; teeToGreen: number; byCategory: Record<SgCategory, number> };

  avgFirstPuttFt: number;
  avgApproachYds: number;

  puttsPerRound: number;
  puttsTrend: number[];
  puttsPerHole: number;
  threePutts: number;

  sandSaves: { pct: number; perRound: number[] };
  upAndDown: { pct: number; perRound: number[] };
};

export function sampleStats(): Stats {
  return {
    rounds: 12,

    scoringGoal: {
      name: 'Break 90',
      birdies: [0, 1],
      pars: [4, 5],
      gir: [6, 5],
      fairways: [6, 7],
    },

    avgScore: 92.4,
    scoreTrend: [98, 95, 97, 91, 94, 89, 93, 88, 92, 87, 90, 86],
    parOrBetter: 5.2,
    doubleOrWorse: 4.1,
    byPar: { par3: 4.1, par4: 5.2, par5: 6.0 },

    fairwaysHit: { pct: 42.9, of: 6, perRound: [3, 6, 4, 7, 5, 2, 6, 8] },
    gir: { pct: 27.8, of: 5, perRound: [4, 2, 6, 3, 7, 5, 4, 6] },

    sg: {
      total: -4.8,
      teeToGreen: -2.9,
      byCategory: {
        Tee: 0.6,
        Approach: -2.1,
        Wedge: -0.7,
        'Around Green': -0.7,
        Sand: -0.4,
        Putting: -1.9,
      },
    },

    avgFirstPuttFt: 28,
    avgApproachYds: 142,

    puttsPerRound: 34.2,
    puttsTrend: [36, 35, 37, 33, 34, 32, 35, 33, 34, 32, 33, 31],
    puttsPerHole: 1.9,
    threePutts: 3.4,

    sandSaves: { pct: 25, perRound: [1, 0, 2, 1, 0, 1, 0, 2] },
    upAndDown: { pct: 31.8, perRound: [2, 3, 1, 4, 2, 3, 1, 2] },
  };
}

/** Signed display -- "+0.6" and "0.6" read very differently here. */
export function formatSg(value: number, digits = 1): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;
}
