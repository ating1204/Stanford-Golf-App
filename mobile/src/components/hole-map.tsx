import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withSpring,
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
}: {
  holeNumber: number;
  /** only this tee is marked -- showing all four clutters the line */
  teeName: string;
  position?: LatLng | null;
  /** tee -> waypoints -> green; drawn with a yardage label per segment */
  path?: LatLng[];
  /** fired while dragging an aim point: index within the waypoint list */
  onMoveWaypoint?: (index: number, p: LatLng) => void;
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

  // Fit the image inside the container ourselves rather than using
  // contentFit="contain", so the SVG overlay can sit on exactly the same rect.
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const aspect = meta.widthPx / meta.heightPx;
      const w = width / height > aspect ? height * aspect : width;
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
      onMoveWaypoint?.(index, imagePxToLatLng(meta, imgX, imgY));
    },
    [meta, onMoveWaypoint],
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
      if (!onMoveWaypoint) return;
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

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  const green = latLngToImagePx(meta, greenOf(hole));
  const tee = latLngToImagePx(meta, teeOf(hole, teeName).position);
  // may fall outside the image when you are not on this hole -- SVG clips it
  const me = position ? latLngToImagePx(meta, position) : null;

  const pts = (path ?? []).map((p) => latLngToImagePx(meta, p));
  // interior nodes only -- the tee anchor is not draggable
  wpPx.set(pts.slice(1, -1));
  const legs = (path ?? []).slice(0, -1).map((p, i) => {
    const a = pts[i];
    const b = pts[i + 1];
    return {
      key: i,
      a,
      b,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      yards: Math.round(haversineYards(p, path![i + 1])),
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
