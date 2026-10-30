import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { MapColors } from '@/constants/theme';
import { getHole, greenOf, HOLE_IMAGES, teeOf } from '@/utils/course';
import { haversineYards, imagePxToLatLng, latLngToImagePx, type LatLng } from '@/utils/geo';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SPRING = { duration: 400, dampingRatio: 0.85 } as const;
/** how close a touch must land (container px) to grab an aim point */
const GRAB_RADIUS = 48;

export function HoleMap({
  holeNumber,
  teeName,
  position,
  path,
  onMoveWaypoint,
  shot,
  onMoveShot,
  focus,
}: {
  holeNumber: number;
  /** only this tee is marked -- showing all four clutters the line */
  teeName: string;
  position?: LatLng | null;
  /** tee -> waypoints -> green; drawn with a yardage label per segment */
  path?: LatLng[];
  /** fired while dragging an aim point: index within the waypoint list */
  onMoveWaypoint?: (index: number, p: LatLng) => void;
  /** shot tracking: two draggable green pins (start, end) replace the aim line */
  shot?: { start: LatLng; end: LatLng } | null;
  onMoveShot?: (index: 0 | 1, p: LatLng) => void;
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
      else onMoveWaypoint?.(index, p);
    },
    [meta, shot, onMoveShot, onMoveWaypoint],
  );

  // aim-point positions in image pixels, readable from the gesture worklet
  const wpPx = useSharedValue<{ x: number; y: number }[]>([]);
  const dragIndex = useSharedValue(-1);

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
      const p = toImagePx(e.x, e.y);
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
      tx.set(withDecay({ velocity: e.velocityX, clamp: [-b.x, b.x], rubberBandEffect: true }));
      ty.set(withDecay({ velocity: e.velocityY, clamp: [-b.y, b.y], rubberBandEffect: true }));
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
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min((w - pad * 2) / spanX, (visibleH - pad * 2) / spanY)));
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

  const green = latLngToImagePx(meta, greenOf(hole));
  const tee = latLngToImagePx(meta, teeOf(hole, teeName).position);
  // may fall outside the image when you are not on this hole -- SVG clips it
  const me = position ? latLngToImagePx(meta, position) : null;

  // in shot mode the aim line steps aside for the two shot pins
  const aimPath = shot ? [] : (path ?? []);
  const pts = aimPath.map((p) => latLngToImagePx(meta, p));
  const shotPx = shot ? [latLngToImagePx(meta, shot.start), latLngToImagePx(meta, shot.end)] : null;
  const shotYards = shot ? Math.round(haversineYards(shot.start, shot.end)) : 0;
  // what a drag can grab: the shot pins, or the aim line's interior nodes (the tee anchor is fixed)
  wpPx.set(shotPx ?? (onMoveWaypoint ? pts.slice(1, -1) : []));
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

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout} collapsable={false}>
        <Animated.View style={[{ width: box.w, height: box.h }, animatedStyle]}>
          <Image source={HOLE_IMAGES[holeNumber]} style={StyleSheet.absoluteFill} />
          {/* viewBox is the image's own pixel space, so markers plot directly */}
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${meta.widthPx} ${meta.heightPx}`}
            pointerEvents="none"
          >
            {legs.map((l) => (
              <Line
                key={`seg-${l.key}`}
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke={MapColors.line}
                strokeWidth={9}
              />
            ))}

            {/* green: small target dot. tee: ring, matching the aim points */}
            <Circle cx={green.x} cy={green.y} r={30} fill="none" stroke={MapColors.line} strokeWidth={9} />
            <Circle cx={green.x} cy={green.y} r={13} fill={MapColors.labelFill} />
            <Circle cx={tee.x} cy={tee.y} r={30} fill={MapColors.labelFill} stroke={MapColors.line} strokeWidth={8} />

            {/* aim points: the interior path nodes, tappable in measure mode */}
            {pts.slice(1, -1).map((p, i) => (
              <Circle
                key={`wp-${i}`}
                cx={p.x}
                cy={p.y}
                r={52}
                fill={MapColors.aimFill}
                stroke={MapColors.aimStroke}
                strokeWidth={8}
              />
            ))}

            {legs.map((l) => (
              <Rect
                key={`lbl-${l.key}`}
                x={l.mid.x - 70}
                y={l.mid.y - 40}
                width={140}
                height={80}
                rx={40}
                fill={MapColors.labelFill}
              />
            ))}
            {legs.map((l) => (
              <SvgText
                key={`txt-${l.key}`}
                x={l.mid.x}
                y={l.mid.y + 20}
                fontSize={56}
                fontWeight="bold"
                fill={MapColors.labelText}
                textAnchor="middle"
              >
                {l.yards}
              </SvgText>
            ))}

            {me && (
              <Circle cx={me.x} cy={me.y} r={30} fill={MapColors.me} stroke={MapColors.line} strokeWidth={12} />
            )}

            {shotPx && (
              <>
                <Line
                  x1={shotPx[0].x}
                  y1={shotPx[0].y}
                  x2={shotPx[1].x}
                  y2={shotPx[1].y}
                  stroke={MapColors.line}
                  strokeWidth={9}
                  strokeDasharray="28 18"
                />
                {shotPx.map((p, i) => (
                  <Circle
                    key={`pin-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={44}
                    fill={MapColors.shot}
                    stroke={MapColors.line}
                    strokeWidth={12}
                  />
                ))}
                <Rect
                  x={(shotPx[0].x + shotPx[1].x) / 2 - 95}
                  y={(shotPx[0].y + shotPx[1].y) / 2 - 42}
                  width={190}
                  height={84}
                  rx={42}
                  fill={MapColors.shot}
                />
                <SvgText
                  x={(shotPx[0].x + shotPx[1].x) / 2}
                  y={(shotPx[0].y + shotPx[1].y) / 2 + 20}
                  fontSize={56}
                  fontWeight="bold"
                  fill={MapColors.line}
                  textAnchor="middle"
                >
                  {shotYards}
                </SvgText>
              </>
            )}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: MapColors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
