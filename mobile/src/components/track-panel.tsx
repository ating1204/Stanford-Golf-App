import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass-button';
import { WheelPicker } from '@/components/wheel-picker';
import { Green, Radius, Selected, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CLUBS, label, type Club, type Lie } from '@/state/round';

const LIQUID = isLiquidGlassAvailable();

/** share of the screen the card covers: picking a club, then the lies + Save */
const STAGE_HEIGHT = { club: 0.245, details: 0.62 } as const;
type Stage = keyof typeof STAGE_HEIGHT;
/** how long the wheel has to sit still on a club before the next step comes up */
const SETTLE_PAUSE_MS = 250;
/**
 * The wheel's top row is empty space above the highlight (rows are 56pt). Tuck
 * all but 18pt of it under the header: grabber->"Shot" is 12pt, so "Shot"->
 * highlight lands at about 1.5x that.
 */
const WHEEL_TOP_TUCK = 56 - 18;
/** inset from the screen edges, like the iOS sheets; corners follow the phone's */
const EDGE = 8;
const CARD_RADIUS = 44;

const LIE_LETTERS: Record<Lie, string | null> = {
  tee: 'T',
  fairway: 'F',
  sand: 'S',
  rough: 'R',
  green: 'G',
  recovery: null,
};
const LIE_ORDER: readonly Lie[] = ['tee', 'fairway', 'sand', 'rough', 'green', 'recovery'];

const SPRING = { damping: 22, stiffness: 200, mass: 0.9 } as const;
const ENTER = SlideInDown.duration(380).easing(Easing.out(Easing.cubic));
const EXIT = SlideOutDown.duration(280).easing(Easing.in(Easing.cubic));

/** what a half-finished shot remembers when the card is swiped away */
export type TrackDraft = { club: Club | null; startLie: Lie; lie: Lie | null };

/** a swipe down of at least this much (or a quick flick) counts */
const SWIPE_STEP = 60;
const SWIPE_CLOSE = 200;

/**
 * Shot tracking over the map, as a floating glass card. It slides up showing the
 * club wheel ("Select Club" highlighted, the first club underneath) and keeps its
 * size while you scroll; once the wheel has sat on a club for a quarter second it
 * springs up to the start and end lies and Save. Swipe the top down: from the lie
 * step it goes back to the wheel; from the wheel (or a long swipe) it closes but
 * remembers the picks (`onDismiss`). The ✕ throws the shot away.
 */
export function TrackPanel({
  shotNumber,
  yards,
  defaultStartLie,
  draft,
  editing = false,
  onHeightChange,
  onSave,
  onCancel,
  onDismiss,
  onDelete,
}: {
  shotNumber: number;
  /** distance between the two shot pins */
  yards: number;
  /** where the last shot ended, or the tee; starts selected for a new shot */
  defaultStartLie: Lie;
  /** how much of the map the card covers, so the map can keep the pins above it */
  onHeightChange: (height: number) => void;
  onSave: (club: Club, startLie: Lie, endLie: Lie) => void;
  /** ✕: discard this shot */
  onCancel: () => void;
  /** swiped away: close, but keep what was picked for next time */
  onDismiss: (draft: TrackDraft) => void;
  /** picks from last time the card was swiped away, if any */
  draft?: TrackDraft | null;
  /** changing a logged shot: `draft` holds its club and lies, and ✕ just leaves it as it was */
  editing?: boolean;
  /** shown while editing, behind a confirmation */
  onDelete?: () => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const [stage, setStage] = useState<Stage>(draft?.club ? 'details' : 'club');
  const [club, setClub] = useState<Club | null>(draft?.club ?? null);
  const [startLie, setStartLie] = useState<Lie>(draft?.startLie ?? defaultStartLie);
  const [lie, setLie] = useState<Lie | null>(draft?.lie ?? null);
  // read from the wheel's settle callback, which fires outside render
  const clubRef = useRef<Club | null>(draft?.club ?? null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = Math.round(screenH * STAGE_HEIGHT[stage]);
  const height = useSharedValue(target);

  useEffect(() => {
    height.set(withSpring(target, SPRING));
    onHeightChange(target + EDGE);
  }, [target, height, onHeightChange]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  // the card follows a downward drag on its top, then springs back or steps down
  const dragY = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    height: height.get(),
    transform: [{ translateY: dragY.get() }],
  }));

  const swipedDown = (distance: number) => {
    if (stage === 'details' && distance < SWIPE_CLOSE) setStage('club');
    else onDismiss({ club: clubRef.current, startLie, lie });
  };

  const swipe = usePanGesture({
    activeOffsetY: 8,
    failOffsetX: [-20, 20],
    onUpdate: (e) => {
      'worklet';
      // resistance grows as you pull, like a sheet
      dragY.set(Math.max(0, e.translationY) * 0.6);
    },
    onDeactivate: (e) => {
      'worklet';
      dragY.set(withSpring(0, SPRING));
      if (e.translationY > SWIPE_STEP || e.velocityY > 700) scheduleOnRN(swipedDown, e.translationY);
    },
  });

  const pickClub = (v: Club | null) => {
    clubRef.current = v;
    setClub(v);
  };
  const onSpinStart = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  };
  const onSettle = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (clubRef.current === null) return; // resting on "Select Club" isn't a pick
    settleTimer.current = setTimeout(() => setStage('details'), SETTLE_PAUSE_MS);
  };

  return (
    <Animated.View entering={ENTER} exiting={EXIT} style={[styles.card, cardStyle]}>
      {LIQUID ? (
        <GlassView glassEffectStyle="regular" colorScheme="light" style={styles.background} />
      ) : (
        <BlurView intensity={70} tint="light" style={styles.background} />
      )}
      <View pointerEvents="none" style={[styles.background, { backgroundColor: Green.sheetTint }]} />

      {/* the grabber and header are the swipe handle; the wheel keeps its own scroll */}
      <GestureDetector gesture={swipe}>
        <View>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: c.textSecondary }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Shot {shotNumber}</Text>
            <Text style={[styles.yards, { color: Green.deep }]}>{yards} yds</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Close without changes' : 'Cancel shot'}
              onPress={onCancel}
              hitSlop={8}
              style={[styles.close, { backgroundColor: c.fill }]}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={13}
                weight="bold"
                tintColor={c.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </GestureDetector>

      <View style={styles.wheel}>
        <View style={styles.wheelTuck}>
          <WheelPicker
            options={CLUBS}
            value={club}
            onChange={pickClub}
            placeholder="Select Club"
            onSpinStart={onSpinStart}
            onSettle={onSettle}
          />
        </View>
      </View>

      {stage === 'details' && (
        <View style={styles.details}>
          {/* only the rows fade in: the Save button is glass, which iOS drops inside a fading view */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.lieRows}>
            <LieRow title="Start Lie" value={startLie} onPick={setStartLie} />
            <LieRow title="End Lie" value={lie} onPick={(l) => setLie(l === lie ? null : l)} />
          </Animated.View>

          <View style={[styles.actions, { paddingBottom: Math.max(Spacing.three, insets.bottom - EDGE) }]}>
            {onDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete shot"
                onPress={() =>
                  Alert.alert(`Delete shot ${shotNumber}?`, 'This removes it from the hole.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: onDelete },
                  ])
                }
                style={({ pressed }) => [
                  styles.delete,
                  { backgroundColor: c.fill },
                  pressed && styles.deletePressed,
                ]}
              >
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  size={20}
                  weight="semibold"
                  tintColor={c.danger}
                />
              </Pressable>
            )}
            {/* says what's missing instead of sitting there disabled with no reason */}
            <GlassButton
              label={
                !club ? 'Select a Club' : !lie ? 'Pick an End Lie' : editing ? 'Save Changes' : 'Save Shot'
              }
              disabled={!club || !lie}
              style={styles.save}
              onPress={() => {
                if (!club || !lie) return;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(club, startLie, lie);
              }}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

/** A titled row of the six lies as round buttons. */
function LieRow({ title, value, onPick }: { title: string; value: Lie | null; onPick: (l: Lie) => void }) {
  const c = useTheme();
  return (
    <View style={styles.lieRow}>
      <Text style={[styles.detailsTitle, { color: c.text }]}>{title}</Text>
      <View style={styles.lies}>
        {LIE_ORDER.map((l) => {
          const selected = l === value;
          const fg = selected ? Selected.text : c.text;
          return (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${label(l)}`}
              accessibilityState={{ selected }}
              onPress={() => {
                Haptics.selectionAsync();
                onPick(l);
              }}
              style={styles.lie}
            >
              <View style={[styles.lieCircle, selected ? styles.selected : { backgroundColor: c.fill }]}>
                {LIE_LETTERS[l] ? (
                  <Text style={[styles.lieLetter, { color: fg }]}>{LIE_LETTERS[l]}</Text>
                ) : (
                  <SymbolView
                    name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
                    size={18}
                    weight="semibold"
                    tintColor={fg}
                  />
                )}
              </View>
              <Text style={[styles.lieLabel, { color: c.text }, selected && styles.lieLabelSelected]}>
                {label(l)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const INSET = Spacing.four + Spacing.one;

const styles = StyleSheet.create({
  // a floating card: inset from the edges with all four corners rounded, like the iOS sheets
  card: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
    bottom: EDGE,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
    borderCurve: 'continuous',
  },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CARD_RADIUS },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: INSET,
    paddingTop: Spacing.one,
  },
  grabberRow: { alignItems: 'center', paddingTop: Spacing.two + Spacing.half, paddingBottom: Spacing.two },
  grabber: { width: 36, height: 5, borderRadius: Radius.full, opacity: 0.35 },
  title: { ...Type.headline, fontSize: 18, flex: 1 },
  yards: { ...Type.headline, fontVariant: ['tabular-nums'] },
  close: {
    width: 28,
    height: 28,
    marginLeft: Spacing.one,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  delete: {
    width: 58,
    height: 58,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePressed: { opacity: 0.6 },
  save: { flex: 1 },
  wheel: { marginHorizontal: Spacing.three, overflow: 'hidden' },
  wheelTuck: { marginTop: -WHEEL_TOP_TUCK },
  details: { paddingHorizontal: INSET, paddingTop: Spacing.two, gap: Spacing.three },
  lieRows: { gap: Spacing.three },
  lieRow: { gap: Spacing.two },
  detailsTitle: { ...Type.headline },
  lies: { flexDirection: 'row' },
  // equal slots, so the two rows line up even when a selected label turns bold
  lie: { flex: 1, alignItems: 'center', gap: Spacing.one + Spacing.half },
  lieCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: Selected.fill, borderColor: Selected.edge },
  lieLetter: { fontSize: 18, fontWeight: '700' },
  lieLabel: { ...Type.caption, fontSize: 12 },
  lieLabelSelected: { color: Selected.text, fontWeight: '700' },
});
