import raw from '../../assets/course.json';
import type { HoleMapMeta, LatLng } from './geo';

export type Tee = { name: string; position: LatLng; yards: number };
export type Hole = { holeNumber: number; par: number; map: HoleMapMeta; tees: Tee[] };
export type Course = { courseId: number; name: string; city: string; state: string; holes: Hole[] };

export const course = raw as unknown as Course;

export const TEE_NAMES = ['Cardinal', 'Black', 'White', 'Blue'] as const;
export const DEFAULT_TEE = 'White';
export const FIRST_HOLE = 1;
export const LAST_HOLE = 18;

export function getHole(n: number): Hole {
  const hole = course.holes.find((h) => h.holeNumber === n);
  // a missing or malformed route param would otherwise render a blank screen
  if (!hole) throw new Error(`No hole ${n} (got ${JSON.stringify(n)})`);
  return hole;
}

export function teeOf(hole: Hole, teeName: string): Tee {
  return hole.tees.find((t) => t.name === teeName) ?? hole.tees[0];
}

/** Carded length of the whole course from one tee set. */
export function courseYards(teeName: string): number {
  return course.holes.reduce((sum, h) => sum + teeOf(h, teeName).yards, 0);
}

export function coursePar(): number {
  return course.holes.reduce((sum, h) => sum + h.par, 0);
}

/**
 * TEMPORARY: course.json has no green centre yet. The image centre is the
 * midpoint of the back tee and the green, so the green is the tee reflected
 * through it. Replace once green_lat/green_lng exist on the hole table.
 */
export function greenOf(hole: Hole): LatLng {
  const back = hole.tees[0].position;
  return {
    lat: 2 * hole.map.center.lat - back.lat,
    lng: 2 * hole.map.center.lng - back.lng,
  };
}

// require() must be statically analysable, so the images are listed explicitly.
export const HOLE_IMAGES: Record<number, number> = {
  1: require('../../assets/holes/hole01.jpg'),
  2: require('../../assets/holes/hole02.jpg'),
  3: require('../../assets/holes/hole03.jpg'),
  4: require('../../assets/holes/hole04.jpg'),
  5: require('../../assets/holes/hole05.jpg'),
  6: require('../../assets/holes/hole06.jpg'),
  7: require('../../assets/holes/hole07.jpg'),
  8: require('../../assets/holes/hole08.jpg'),
  9: require('../../assets/holes/hole09.jpg'),
  10: require('../../assets/holes/hole10.jpg'),
  11: require('../../assets/holes/hole11.jpg'),
  12: require('../../assets/holes/hole12.jpg'),
  13: require('../../assets/holes/hole13.jpg'),
  14: require('../../assets/holes/hole14.jpg'),
  15: require('../../assets/holes/hole15.jpg'),
  16: require('../../assets/holes/hole16.jpg'),
  17: require('../../assets/holes/hole17.jpg'),
  18: require('../../assets/holes/hole18.jpg'),
};