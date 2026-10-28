/// <reference types="jest" />
import { haversineYards, imagePxToLatLng, latLngToImagePx, type HoleMapMeta } from './geo';

const HOLE_1: HoleMapMeta = {
  center: { lat: 37.423502, lng: -122.1838125 },
  bearingDeg: 351.9424,
  metersPerPixel: 0.2,
  widthPx: 2196,
  heightPx: 4392,
};

const CARDINAL_TEE = { lat: 37.421442, lng: -122.183438 };

test('0.001 deg of latitude is about 122 yards', () => {
  const d = haversineYards({ lat: 37.419, lng: -122.1834 }, { lat: 37.42, lng: -122.1834 });
  expect(d).toBeCloseTo(121.6, 0);
});

test('the image centre maps to the middle pixel', () => {
  const p = latLngToImagePx(HOLE_1, HOLE_1.center);
  expect(p.x).toBeCloseTo(1098, 0);
  expect(p.y).toBeCloseTo(2196, 0);
});

test('pixel and coordinate conversions round-trip', () => {
  const px = latLngToImagePx(HOLE_1, CARDINAL_TEE);
  const back = imagePxToLatLng(HOLE_1, px.x, px.y);
  expect(back.lat).toBeCloseTo(CARDINAL_TEE.lat, 6);
  expect(back.lng).toBeCloseTo(CARDINAL_TEE.lng, 6);
});