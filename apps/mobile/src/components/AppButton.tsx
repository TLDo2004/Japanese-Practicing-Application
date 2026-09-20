import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, fonts, radius, space, touch } from "../theme";

type Variant = "primary" | "secondary" | "quiet";

type Props = PressableProps & {
  label: string;
  variant?: Variant;
};

export function AppButton({ label, variant = "primary", style, disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? pressedStyles[variant] : null,
        disabled ? styles.disabled : null,
        style as object,
      ]}
      {...rest}
    >
      <Text style={[styles.label, variant === "primary" ? styles.labelOn : styles.labelDark]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    paddingHorizontal: space[5],
    paddingVertical: space[2],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  quiet: { backgroundColor: "transparent", paddingHorizontal: space[3] },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15 },
  labelOn: { color: colors.onPrimary },
  labelDark: { color: colors.text },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surfaceSubtle },
  quiet: { backgroundColor: colors.surfaceSubtle },
});
