export type LatLng = { lat: number; lng: number };

/** Georeference of one hole image, straight from course.json. */
export type HoleMapMeta = {
  center: LatLng;
  bearingDeg: number;      // tee -> green, clockwise from north
  metersPerPixel: number;
  widthPx: number;
  heightPx: number;
};

const EARTH_R_M = 6371008.8;
const M_PER_DEG_LAT = 111195;
const YARDS_PER_M = 1.0936133;

const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineYards(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * YARDS_PER_M;
}

/**
 * Where a coordinate falls on the hole image, in the image's own pixel space.
 * Each image is rotated by bearingDeg so the hole plays bottom-to-top, so the
 * ground offset is rotated onto the image's axes before scaling to pixels.
 */
export function latLngToImagePx(m: HoleMapMeta, p: LatLng): { x: number; y: number } {
  const north = (p.lat - m.center.lat) * M_PER_DEG_LAT;
  const east = (p.lng - m.center.lng) * M_PER_DEG_LAT * Math.cos(rad(m.center.lat));
  const t = rad(m.bearingDeg);
  const across = east * Math.cos(t) - north * Math.sin(t); // rightward in image
  const along = east * Math.sin(t) + north * Math.cos(t); // toward the green
  return {
    x: m.widthPx / 2 + across / m.metersPerPixel,
    y: m.heightPx / 2 - along / m.metersPerPixel,
  };
}

/** Inverse of latLngToImagePx — which coordinate sits under an image pixel. */
export function imagePxToLatLng(m: HoleMapMeta, x: number, y: number): LatLng {
  const across = (x - m.widthPx / 2) * m.metersPerPixel;
  const along = (m.heightPx / 2 - y) * m.metersPerPixel;
  const t = rad(m.bearingDeg);
  const east = across * Math.cos(t) + along * Math.sin(t);
  const north = -across * Math.sin(t) + along * Math.cos(t);
  return {
    lat: m.center.lat + north / M_PER_DEG_LAT,
    lng: m.center.lng + east / (M_PER_DEG_LAT * Math.cos(rad(m.center.lat))),
  };
}