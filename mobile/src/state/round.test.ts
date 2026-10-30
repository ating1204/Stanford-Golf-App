import { formatToPar, scoreToPar, toUploadRequest, type HoleEntry, type Round } from './round';

const empty: HoleEntry = {
  score: null,
  gir: null,
  fairway: null,
  putts: null,
  chips: null,
  sandShots: null,
  penalties: null,
  shots: [],
};

function frontNine(): Round {
  const holes: Record<number, HoleEntry> = {};
  for (let n = 1; n <= 9; n++) holes[n] = empty;
  return {
    clientId: '11111111-2222-4333-8444-555555555555',
    courseId: 1,
    tee: 'Blue',
    side: 'front',
    // 6pm local time: the UTC date is already the next day
    startedAt: new Date(2026, 9, 29, 18, 0).toISOString(),
    holes,
    currentHole: 1,
  };
}

describe('toUploadRequest', () => {
  it('sends the round fields under the backend names, with the local date', () => {
    const body = toUploadRequest(frontNine());
    expect(body).toMatchObject({
      clientId: '11111111-2222-4333-8444-555555555555',
      courseId: 1,
      tee: 'Blue',
      holes: 'front',
      playedOn: '2026-10-29',
    });
  });

  it('skips holes with nothing entered', () => {
    expect(toUploadRequest(frontNine()).holesPlayed).toEqual([]);
  });

  it('sends a hole with any value, keeping unentered fields as null', () => {
    const round = frontNine();
    round.holes[3] = { ...empty, putts: 0 };
    expect(toUploadRequest(round).holesPlayed).toEqual([
      { holeNumber: 3, ...empty, putts: 0, shots: [] },
    ]);
  });

  it('numbers shots by their order in the hole', () => {
    const round = frontNine();
    const shot = {
      club: 'Dr' as const,
      startDist: 480,
      endDist: 250,
      startLie: 'tee' as const,
      endLie: 'fairway' as const,
      startLat: null,
      startLng: null,
      endLat: null,
      endLng: null,
      penalties: 0,
    };
    round.holes[1] = { ...empty, score: 5, shots: [shot, { ...shot, startDist: 250, endDist: 0, endLie: 'green' }] };
    const [hole] = toUploadRequest(round).holesPlayed;
    expect(hole.shots.map((s) => s.shotNumber)).toEqual([1, 2]);
    expect(hole.score).toBe(5);
  });

  it('only sends holes on the current side', () => {
    const round = frontNine();
    round.holes[12] = { ...empty, score: 4 }; // left over from playing 18, then switching to front
    expect(toUploadRequest(round).holesPlayed).toEqual([]);
  });
});

describe('scoreToPar', () => {
  const par = (n: number) => (n === 1 ? 5 : 4); // hole 1 is a par 5, the rest par 4

  it('is null until something is scored', () => {
    expect(scoreToPar(frontNine(), par)).toBeNull();
  });

  it('only counts holes that have a score', () => {
    const round = frontNine();
    round.holes[1] = { ...empty, score: 7 }; // +2 on the par 5
    round.holes[2] = { ...empty, score: 3 }; // -1
    round.holes[3] = { ...empty, putts: 2 }; // no score: ignored
    expect(scoreToPar(round, par)).toBe(1);
  });

  it('ignores scored holes that are not on the side', () => {
    const round = frontNine();
    round.holes[2] = { ...empty, score: 4 };
    round.holes[12] = { ...empty, score: 9 }; // left over from an 18-hole round
    expect(scoreToPar(round, par)).toBe(0);
  });

  it('formats like a scorecard', () => {
    expect(formatToPar(null)).toBe('–');
    expect(formatToPar(0)).toBe('E');
    expect(formatToPar(25)).toBe('+25');
    expect(formatToPar(-2)).toBe('−2');
  });
});
