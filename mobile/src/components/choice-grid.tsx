import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NumberPad } from '@/components/number-pad';
import { Radius, Selected, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A labelled row of mutually exclusive chips -- the unit the score sheet is made of.
 * Tapping the selected chip again clears it (onChange(undefined)), so any stat can be removed.
 *
 * With `fillIn`, a last "?" chip covers everything past the options: it opens a
 * number pad, and once a number is entered the "?" shows that number instead.
 */
export function ChoiceGrid<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
  render,
  columns,
  fillIn,
}: {
  label?: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  render?: (v: T) => string;
  columns?: number;
  /** numeric rows only: the number pad's wording and the smallest value it accepts */
  fillIn?: { what: string; holeNumber: number; min: number };
}) {
  const c = useTheme();
  const [padOpen, setPadOpen] = useState(false);
  // a percentage width plus a gap overflows the row, so columns get padded cells instead of a gap
  const cellWidth = columns ? `${100 / columns}%` : undefined;
  const custom = fillIn && value !== undefined && !options.includes(value) ? value : undefined;

  const chip = (key: string, selected: boolean, text: string, onPress: () => void, hint?: string) => {
    const element = (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityHint={hint ?? (selected ? 'Tap again to clear' : undefined)}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => [
          styles.chip,
          !cellWidth && { flex: 1 },
          selected ? styles.selected : { backgroundColor: c.fill },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.chipText, { color: c.text }, selected && styles.selectedText]} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
    );
    return cellWidth ? (
      <View key={key} style={[styles.cell, { width: cellWidth as never }]}>
        {element}
      </View>
    ) : (
      element
    );
  };

  return (
    <View style={styles.root}>
      {label ? <Text style={[styles.label, { color: c.text }]}>{label}</Text> : null}
      <View style={cellWidth ? styles.grid : styles.row}>
        {options.map((o) => {
          const selected = value === o;
          return chip(String(o), selected, render ? render(o) : String(o), () =>
            onChange(selected ? undefined : o),
          );
        })}
        {fillIn &&
          chip(
            'fill-in',
            custom !== undefined,
            custom !== undefined ? String(custom) : '?',
            () => setPadOpen(true),
            'Enter a number',
          )}
      </View>

      {fillIn && padOpen && (
        <NumberPad
          what={fillIn.what}
          holeNumber={fillIn.holeNumber}
          initial={typeof custom === 'number' ? custom : null}
          min={fillIn.min}
          onClose={() => setPadOpen(false)}
          onConfirm={(v) => {
            setPadOpen(false);
            onChange(v as T);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  label: { ...Type.headline },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -Spacing.one },
  cell: { padding: Spacing.one },
  chip: {
    minHeight: 46,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderWidth: Selected.edgeWidth,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: Selected.fill, borderColor: Selected.edge },
  chipText: { ...Type.headline },
  selectedText: { color: Selected.text, fontWeight: '800' },
});
