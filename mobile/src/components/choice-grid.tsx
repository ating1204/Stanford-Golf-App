import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labelled row of mutually exclusive chips -- the unit the score sheet is made of. */
export function ChoiceGrid<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
  render,
  columns,
}: {
  label?: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T) => void;
  render?: (v: T) => string;
  columns?: number;
}) {
  const c = useTheme();
  const basis = columns ? `${100 / columns}%` : undefined;

  return (
    <View style={styles.root}>
      {label ? <Text style={[styles.label, { color: c.text }]}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((o) => {
          const selected = value === o;
          return (
            <Pressable
              key={String(o)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(o)}
              style={({ pressed }) => [
                styles.chip,
                basis ? { flexBasis: basis as never, flexGrow: 0 } : { flex: 1 },
                { backgroundColor: selected ? c.accent : c.backgroundElement },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[styles.chipText, { color: selected ? c.onAccent : c.text }]}
                numberOfLines={1}
              >
                {render ? render(o) : String(o)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  label: { ...Type.headline },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: 46,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  chipText: { ...Type.headline },
});
