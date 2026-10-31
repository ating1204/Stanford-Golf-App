import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { HudSurface } from '@/components/hud-surface';
import { Green, MapColors, Radius, Spacing, Type } from '@/constants/theme';
import { getHole, greenOf, HOLE_IMAGES, teeOf } from '@/utils/course';
import { haversineYards, imagePxToLatLng, latLngToImagePx, type LatLng } from '@/utils/geo';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SPRING = { duration: 400, dampingRatio: 0.85 } as const;
/** how close a touch must land (container px) to grab a point */
const GRAB_RADIUS = 30;
/**
 * While dragging, the tee or pin snaps to its home spot inside this many screen
 * points, and jumps back out to your finger past it, so you can feel the edge.
 * It's measured on the screen, not the map, so zoomed in it covers only a few yards
 * and you can still place a point just off its default.
 */
const SNAP_RADIUS = 12;
/** how quickly a flicked map coasts to a stop: closer to 1 glides further (the default is 0.998) */
const PAN_DECELERATION = 0.99;

/** one logged shot as the map needs it; `index` is its place in the hole's shot list */
type Point = { x: number; y: number };

export type SavedShot = { index: number; start: LatLng; end: LatLng; club: string };

export function HoleMap({
  holeNumber,
  teeName,
  position,
  path,
  onMovePathPoint,
  home,
  onSnapHome,
  shot,
  onMoveShot,
  savedShots = [],
  onEditShot,
  focus,
}: {
  holeNumber: number;
  /** only this tee is marked -- showing all four clutters the line */
  teeName: string;
  position?: LatLng | null;
  /** tee -> waypoints -> pin; drawn with a yardage label per segment */
  path?: LatLng[];
  /** fired while dragging any point on the path: index within `path` */
  onMovePathPoint?: (index: number, p: LatLng) => void;
  /** where the path's two ends belong; dropping one near its home snaps it back */
  home?: { start: LatLng; end: LatLng };
  onSnapHome?: (end: 'start' | 'end') => void;
  /** shot tracking: two draggable green pins (start, end) replace the aim line */
  shot?: { start: LatLng; end: LatLng } | null;
  onMoveShot?: (index: 0 | 1, p: LatLng) => void;
  /** shots already logged on this hole; they stay on the map with an edit chip */
  savedShots?: SavedShot[];
  onEditShot?: (index: number) => void;
  /**
   * zoom to fit these points inside the part of the map not covered by overlays
   * (`top` / `bottom` = how much the header and bottom panel cover); re-fits when it changes
   */
  focus?: { points: LatLng[]; top: number; bottom: number } | null;
}) {
  const reduced = useReducedMotion();
  const hole = useMemo(() => getHole(holeNumber), [holeNumber]);
  const meta = hole.map;

  const [box, setBox] = useState({ w: 0, h: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const contW = useSharedValue(0);
  const contH = useSharedValue(0);
  const dispW = useSharedValue(0);
  const dispH = useSharedValue(0);

  // Size the image to cover the container ourselves rather than using
  // contentFit="cover", so the SVG overlay can sit on exactly the same rect.
  // Cover, not contain: the hole images are 1:2 and phones are taller, so
  // contain left black bars top and bottom. The cropped side strips can be panned to.
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const aspect = meta.widthPx / meta.heightPx;
      const w = width / height > aspect ? width : height * aspect;
      const h = w / aspect;
      contW.set(width);
      contH.set(height);
      dispW.set(w);
      dispH.set(h);
      setBox({ w, h });
    },
    [meta.widthPx, meta.heightPx, contW, contH, dispW, dispH],
  );

  const boundsFor = (s: number) => {
    'worklet';
    return {
      x: Math.max(0, (dispW.get() * s - contW.get()) / 2),
      y: Math.max(0, (dispH.get() * s - contH.get()) / 2),
    };
  };

  const settleInBounds = () => {
    'worklet';
    const b = boundsFor(scale.get());
    const cx = Math.min(b.x, Math.max(-b.x, tx.get()));
    const cy = Math.min(b.y, Math.max(-b.y, ty.get()));
    if (cx !== tx.get()) tx.set(withSpring(cx, SPRING));
    if (cy !== ty.get()) ty.set(withSpring(cy, SPRING));
  };

  // Runs in JS so it can use the geo helpers; the worklet only undoes the
  // transform and hands over image pixels.
  const reportMove = useCallback(
    (index: number, imgX: number, imgY: number) => {
      const p = imagePxToLatLng(meta, imgX, imgY);
      if (shot) onMoveShot?.(index as 0 | 1, p);
      else onMovePathPoint?.(index, p);
    },
    [meta, shot, onMoveShot, onMovePathPoint],
  );

  const snapHome = useCallback(
    (index: number) => {
      Haptics.selectionAsync();
      onSnapHome?.(index === 0 ? 'start' : 'end');
    },
    [onSnapHome],
  );

  // draggable points in image pixels, readable from the gesture worklet
  const wpPx = useSharedValue<{ x: number; y: number }[]>([]);
  // each point's home spot, if it has one (only the tee and pin do)
  const homePx = useSharedValue<({ x: number; y: number } | null)[]>([]);
  const dragIndex = useSharedValue(-1);
  // the grabbed point stays this far from the finger instead of jumping under it
  const grabOffset = useSharedValue({ x: 0, y: 0 });
  const snapped = useSharedValue(false);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.set(scale.get());
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.get() * e.scale));
      const k = next / scale.get();
      const fx = e.focalX - contW.get() / 2;
      const fy = e.focalY - contH.get() / 2;
      tx.set(k * tx.get() + (1 - k) * fx);
      ty.set(k * ty.get() + (1 - k) * fy);
      scale.set(next);
    })
    .onEnd(settleInBounds);

  // container point -> image pixels (undo translate + scale)
  const toImagePx = (cx: number, cy: number) => {
    'worklet';
    const s = scale.get();
    const ux = (cx - contW.get() / 2 - tx.get()) / s;
    const uy = (cy - contH.get() / 2 - ty.get()) / s;
    return {
      x: (ux + dispW.get() / 2) * (meta.widthPx / dispW.get()),
      y: (uy + dispH.get() / 2) * (meta.heightPx / dispH.get()),
    };
  };

  // image pixels -> container point, so hit-testing happens in screen space
  const toContainerPx = (ix: number, iy: number) => {
    'worklet';
    const s = scale.get();
    const vx = ix * (dispW.get() / meta.widthPx) - dispW.get() / 2;
    const vy = iy * (dispH.get() / meta.heightPx) - dispH.get() / 2;
    return { x: contW.get() / 2 + tx.get() + vx * s, y: contH.get() / 2 + ty.get() + vy * s };
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onBegin((e) => {
      // grabbing an aim point takes precedence over panning the map
      dragIndex.set(-1);
      const pts = wpPx.get();
      let best = GRAB_RADIUS;
      for (let i = 0; i < pts.length; i++) {
        const c = toContainerPx(pts[i].x, pts[i].y);
        const d = Math.hypot(c.x - e.x, c.y - e.y);
        if (d < best) {
          best = d;
          dragIndex.set(i);
          grabOffset.set({ x: c.x - e.x, y: c.y - e.y });
          // grabbed while sitting at home: no tick until it leaves and comes back
          const h = homePx.get()[i];
          snapped.set(h != null && Math.hypot(h.x - pts[i].x, h.y - pts[i].y) < 0.5);
        }
      }
    })
    .onChange((e) => {
      const i = dragIndex.get();
      if (i < 0) {
        tx.set(tx.get() + e.changeX);
        ty.set(ty.get() + e.changeY);
        return;
      }
      const at = { x: e.x + grabOffset.get().x, y: e.y + grabOffset.get().y };
      const h = homePx.get()[i];
      if (h) {
        const c = toContainerPx(h.x, h.y);
        const inside = Math.hypot(c.x - at.x, c.y - at.y) < SNAP_RADIUS;
        if (inside && !snapped.get()) scheduleOnRN(snapHome, i);
        snapped.set(inside);
        if (inside) return; // held at home until the finger leaves the radius
      }
      const p = toImagePx(at.x, at.y);
      scheduleOnRN(reportMove, i, p.x, p.y);
    })
    .onEnd((e) => {
      if (dragIndex.get() >= 0) {
        dragIndex.set(-1);
        return; // dragging a point: no map momentum
      }
      if (reduced) {
        settleInBounds();
        return;
      }
      const b = boundsFor(scale.get());
      const coast = { deceleration: PAN_DECELERATION, rubberBandEffect: true };
      tx.set(withDecay({ ...coast, velocity: e.velocityX, clamp: [-b.x, b.x] }));
      ty.set(withDecay({ ...coast, velocity: e.velocityY, clamp: [-b.y, b.y] }));
    });

  // zoom so every focus point sits inside the uncovered part of the map, with room around it
  const focusKey = focus ? JSON.stringify(focus) : '';
  useEffect(() => {
    if (!focus || focus.points.length === 0 || box.w === 0) return;
    const w = contW.get();
    const h = contH.get();
    const local = focus.points.map((p) => {
      const px = latLngToImagePx(meta, p);
      return { x: px.x * (box.w / meta.widthPx) - box.w / 2, y: px.y * (box.h / meta.heightPx) - box.h / 2 };
    });
    const xs = local.map((p) => p.x);
    const ys = local.map((p) => p.y);
    const pad = 70;
    const visibleH = Math.max(1, h - focus.top - focus.bottom);
    const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const s = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((w - pad * 2) / spanX, (visibleH - pad * 2) / spanY)),
    );
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    // centre of the uncovered band, measured from the container centre
    const bandCentre = (focus.top - focus.bottom) / 2;
    const b = { x: Math.max(0, (box.w * s - w) / 2), y: Math.max(0, (box.h * s - h) / 2) };
    const clamp = (v: number, lim: number) => Math.min(lim, Math.max(-lim, v));
    const timing = { duration: reduced ? 0 : 450, easing: Easing.out(Easing.cubic) };
    scale.set(withTiming(s, timing));
    tx.set(withTiming(clamp(-cx * s, b.x), timing));
    ty.set(withTiming(clamp(-cy * s + bandCentre, b.y), timing));
    // focus is compared by value through focusKey; the shared values are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, box.w, box.h, meta]);

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  const green = latLngToImagePx(meta, path?.at(-1) ?? greenOf(hole));
  const tee = latLngToImagePx(meta, path?.[0] ?? teeOf(hole, teeName).position);
  // may fall outside the image when you are not on this hole -- SVG clips it
  const me = position ? latLngToImagePx(meta, position) : null;

  // in shot mode the aim line steps aside for the two shot pins
  const aimPath = shot ? [] : (path ?? []);
  const pts = aimPath.map((p) => latLngToImagePx(meta, p));
  const shotPx = shot ? [latLngToImagePx(meta, shot.start), latLngToImagePx(meta, shot.end)] : null;
  const shotYards = shot ? Math.round(haversineYards(shot.start, shot.end)) : 0;
  const savedPx = savedShots.map((p) => ({
    index: p.index,
    club: p.club,
    yards: Math.round(haversineYards(p.start, p.end)),
    a: latLngToImagePx(meta, p.start),
    b: latLngToImagePx(meta, p.end),
  }));
  // what a drag can grab: the shot pins, or every point on the aim line
  wpPx.set(shotPx ?? (onMovePathPoint ? pts : []));
  homePx.set(
    !shot && home
      ? pts.map((_, i) =>
          i === 0
            ? latLngToImagePx(meta, home.start)
            : i === pts.length - 1
              ? latLngToImagePx(meta, home.end)
              : null,
        )
      : [],
  );
  const legs = aimPath.slice(0, -1).map((p, i) => {
    const a = pts[i];
    const b = pts[i + 1];
    return {
      key: i,
      a,
      b,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      yards: Math.round(haversineYards(p, aimPath[i + 1])),
    };
  });

  // everything a dot needs to find its spot on screen
  const view: MapView = {
    tx,
    ty,
    scale,
    contW,
    contH,
    dispW,
    dispH,
    imgW: meta.widthPx,
    imgH: meta.heightPx,
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout} collapsable={false}>
        <Animated.View style={[{ width: box.w, height: box.h }, animatedStyle]}>
          <Image source={HOLE_IMAGES[holeNumber]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {/* lines, dots and labels ride on top of the map instead of inside it, so zooming moves
            them without scaling them with the map: lines keep their thinness, and markers only
            grow gently, so zooming in still gains precision */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {savedPx.map((p) => (
              <MapLine
                key={`saved-${p.index}`}
                a={p.a}
                b={p.b}
                view={view}
                color={MapColors.shot}
                width={SHOT_LINE}
              />
            ))}
            {shotPx && (
              <MapLine a={shotPx[0]} b={shotPx[1]} view={view} color={MapColors.shot} width={SHOT_LINE} />
            )}
          </Svg>
          {me && (
            <MapDot
              at={me}
              view={view}
              size={DOT.me}
              fill={MapColors.me}
              ring={MapColors.line}
              ringWidth={HAIRLINE}
            />
          )}
          {savedPx.flatMap((p) => [
            <MapPin key={`saved-a-${p.index}`} at={p.a} view={view} />,
            <MapPin key={`saved-b-${p.index}`} at={p.b} view={view} />,
          ])}
          {shotPx?.map((p, i) => (
            <MapPin key={`pin-${i}`} at={p} view={view} />
          ))}
          {/* each logged shot keeps its distance and club on the map; tap to edit */}
          {savedPx.map((p) => (
            <ShotChip
              key={`chip-${p.index}`}
              at={{ x: (p.a.x + p.b.x) / 2, y: (p.a.y + p.b.y) / 2 }}
              yards={p.yards}
              club={p.club}
              view={view}
              onPress={() => onEditShot?.(p.index)}
            />
          ))}
          {shotPx && (
            <MapDot
              at={{ x: (shotPx[0].x + shotPx[1].x) / 2, y: (shotPx[0].y + shotPx[1].y) / 2 }}
              view={view}
              size={SHOT_LABEL.h}
              width={SHOT_LABEL.w}
              fill={MapColors.shot}
            >
              <Text style={[styles.label, styles.shotLabel, { color: MapColors.line }]}>{shotYards}</Text>
            </MapDot>
          )}
          {/* white lines, markers and labels draw last, so they sit in front of the pins and chips */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {legs.map((l) => (
              <MapLine key={`seg-${l.key}`} a={l.a} b={l.b} view={view} />
            ))}
          </Svg>
          <MapDot at={tee} view={view} size={DOT.tee} fill={MapColors.labelFill} />
          <MapDot
            at={green}
            view={view}
            size={DOT.green}
            fill="transparent"
            ring={MapColors.line}
            ringWidth={HAIRLINE}
          >
            <View style={styles.greenCentre} />
          </MapDot>
          {pts.slice(1, -1).map((p, i) => (
            <MapDot
              key={`wp-${i}`}
              at={p}
              view={view}
              size={DOT.aim}
              fill={MapColors.aimFill}
              ring={MapColors.aimStroke}
              ringWidth={HAIRLINE}
            >
              {/* pinpoints the exact spot inside the shaded circle */}
              <View style={styles.aimCentre} />
            </MapDot>
          ))}
          {legs.map((l) => (
            <MapDot
              key={`lbl-${l.key}`}
              at={l.mid}
              view={view}
              size={LEG_LABEL.h}
              width={LEG_LABEL.w}
              fill={MapColors.labelFill}
            >
              <Text style={[styles.label, { color: MapColors.labelText }]}>{l.yards}</Text>
            </MapDot>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

/** on-screen sizes (points) for the yardage pills at the starting zoom */
const LEG_LABEL = { w: 46, h: 26 } as const;
const SHOT_LABEL = { w: 56, h: 30 } as const;
/** marker sizes at the starting zoom, in points */
const DOT = { tee: 10, green: 16, greenCentre: 6, aim: 37, aimCentre: 5, me: 15, pin: 21 } as const;
/** every line and ring on the map, in points; drawn on the overlay so it never changes with zoom */
const HAIRLINE = 2;
/** shot lines are heavier: a 1pt green line would disappear on the grass */
const SHOT_LINE = 3;
/** the map pin, drawn in a 30x40 box with its tip at the bottom centre */
const PIN = { w: 30, h: 40, tip: 1 } as const;
const PIN_PATH = 'M15 39C15 39 2 24.5 2 14A13 13 0 1 1 28 14C28 24.5 15 39 15 39Z';

const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * Markers grow gently with zoom instead of with the map: readable and easy to grab
 * up close, while still covering far less ground. 8x map zoom -> at most 1.35x marker.
 */
const MARKER_GROW_MAX = 1.35;
const MARKER_GROW_RATE = 0.15;

function markerGrowth(mapScale: number) {
  'worklet';
  return Math.min(MARKER_GROW_MAX, Math.pow(mapScale, MARKER_GROW_RATE));
}

/** A hairline between two image-pixel spots, redrawn in screen space as the map moves. */
function MapLine({
  a,
  b,
  view,
  color = MapColors.line,
  width = HAIRLINE,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
  view: MapView;
  color?: string;
  width?: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const start = toScreen(a, view);
    const end = toScreen(b, view);
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  });
  return <AnimatedLine stroke={color} strokeWidth={width} animatedProps={animatedProps} />;
}

type MapView = {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  scale: SharedValue<number>;
  contW: SharedValue<number>;
  contH: SharedValue<number>;
  dispW: SharedValue<number>;
  dispH: SharedValue<number>;
  imgW: number;
  imgH: number;
};

/** image pixels -> container point, the same mapping the gestures use */
function toScreen(p: { x: number; y: number }, view: MapView) {
  'worklet';
  const s = view.scale.get();
  return {
    x:
      view.contW.get() / 2 +
      view.tx.get() +
      (p.x * (view.dispW.get() / view.imgW) - view.dispW.get() / 2) * s,
    y:
      view.contH.get() / 2 +
      view.ty.get() +
      (p.y * (view.dispH.get() / view.imgH) - view.dispH.get() / 2) * s,
  };
}

/**
 * A marker pinned to an image-pixel spot: it follows the map's pan and zoom on the
 * UI thread and grows only by markerGrowth. Drawn at its largest size and scaled
 * down, so text stays sharp; the outline is thickened to cancel that scale, so it
 * stays HAIRLINE on screen at every zoom.
 */
function MapDot({
  at,
  view,
  size,
  width = size,
  fill,
  ring = 'transparent',
  ringWidth = 0,
  children,
}: {
  at: { x: number; y: number };
  view: MapView;
  /** height (and width, for a round dot) in points */
  size: number;
  /** wider than tall for a pill label */
  width?: number;
  fill: string;
  ring?: string;
  ringWidth?: number;
  children?: ReactNode;
}) {
  const { x, y } = at;
  const drawnW = width * MARKER_GROW_MAX;
  const drawnH = size * MARKER_GROW_MAX;
  const style = useAnimatedStyle(() => {
    const { x: cx, y: cy } = toScreen({ x, y }, view);
    const shrink = markerGrowth(view.scale.get()) / MARKER_GROW_MAX;
    return {
      borderWidth: ringWidth / shrink,
      transform: [{ translateX: cx - drawnW / 2 }, { translateY: cy - drawnH / 2 }, { scale: shrink }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dot,
        {
          width: drawnW,
          height: drawnH,
          borderRadius: drawnH / 2,
          backgroundColor: fill,
          borderColor: ring,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A map pin whose tip marks the exact spot; grows with zoom around that tip. */
function MapPin({ at, view }: { at: { x: number; y: number }; view: MapView }) {
  const { x, y } = at;
  const drawnW = PIN.w * MARKER_GROW_MAX;
  const drawnH = PIN.h * MARKER_GROW_MAX;
  const tipBelowCentre = drawnH / 2 - PIN.tip * MARKER_GROW_MAX;
  const style = useAnimatedStyle(() => {
    const { x: cx, y: cy } = toScreen({ x, y }, view);
    const shrink = markerGrowth(view.scale.get()) / MARKER_GROW_MAX;
    return {
      transform: [
        { translateX: cx - drawnW / 2 },
        { translateY: cy - tipBelowCentre * shrink - drawnH / 2 },
        { scale: shrink },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.dot, { width: drawnW, height: drawnH }, style]}>
      <Svg width={drawnW} height={drawnH} viewBox={`0 0 ${PIN.w} ${PIN.h}`}>
        <Path d={PIN_PATH} fill={MapColors.shot} />
        <Circle cx={15} cy={14} r={6.5} fill={MapColors.labelFill} />
      </Svg>
    </Animated.View>
  );
}

const CHIP_GAP = 14;

/** "168 Yds Dr ✎" beside a logged shot: sits left of it, or right if that would leave the screen. */
function ShotChip({
  at,
  yards,
  club,
  view,
  onPress,
}: {
  at: Point;
  yards: number;
  club: string;
  view: MapView;
  onPress: () => void;
}) {
  const { x, y } = at;
  const size = useSharedValue({ w: 120, h: 36 });
  const style = useAnimatedStyle(() => {
    const { x: cx, y: cy } = toScreen({ x, y }, view);
    const { w, h } = size.get();
    const left = cx - w - CHIP_GAP;
    return {
      transform: [{ translateX: left < CHIP_GAP ? cx + CHIP_GAP : left }, { translateY: cy - h / 2 }],
    };
  });

  return (
    <Animated.View
      style={[styles.chipWrap, style]}
      onLayout={(e) => size.set({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <HudSurface style={styles.chip}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${yards} yards, ${club}. Edit shot`}
          onPress={() => {
            Haptics.selectionAsync();
            onPress();
          }}
          hitSlop={6}
          style={styles.chipHit}
        >
          <Text style={styles.chipYards}>{yards}</Text>
          <Text style={styles.chipUnit}>Yds</Text>
          <Text style={styles.chipClub}>{club}</Text>
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={14}
            weight="semibold"
            tintColor={Green.bright}
          />
        </Pressable>
      </HudSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { position: 'absolute', top: 0, left: 0 },
  chip: { borderRadius: Radius.md, borderCurve: 'continuous' },
  chipHit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two,
  },
  chipYards: { ...Type.numeralSmall, fontSize: 19, color: MapColors.hudText },
  chipUnit: { ...Type.caption, color: MapColors.hudMuted, marginRight: Spacing.one },
  chipClub: { ...Type.headline, color: MapColors.hudText, marginRight: Spacing.one },
  // sizes are multiplied by MARKER_GROW_MAX because MapDot draws at its largest, then scales down
  label: { fontSize: 15 * MARKER_GROW_MAX, fontWeight: '700', fontVariant: ['tabular-nums'] },
  shotLabel: { fontSize: 17 * MARKER_GROW_MAX },
  aimCentre: {
    width: DOT.aimCentre * MARKER_GROW_MAX,
    height: DOT.aimCentre * MARKER_GROW_MAX,
    borderRadius: (DOT.aimCentre * MARKER_GROW_MAX) / 2,
    backgroundColor: MapColors.labelFill,
  },
  greenCentre: {
    width: DOT.greenCentre * MARKER_GROW_MAX,
    height: DOT.greenCentre * MARKER_GROW_MAX,
    borderRadius: (DOT.greenCentre * MARKER_GROW_MAX) / 2,
    backgroundColor: MapColors.labelFill,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: MapColors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
