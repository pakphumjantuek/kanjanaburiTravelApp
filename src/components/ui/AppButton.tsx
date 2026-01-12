import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";

type Variant = "primary" | "secondary" | "success" | "warning" | "danger";

export default function AppButton({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={textStyles[variant]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: "#2563EB" },
  secondary: { backgroundColor: "#D1D5DB" },
  success: { backgroundColor: "#16A34A" },
  warning: { backgroundColor: "#CA8A04" },
  danger: { backgroundColor: "#E11D48" },
});

const textStyles = StyleSheet.create({
  primary: { color: "white", fontWeight: "900" },
  secondary: { color: "#111827", fontWeight: "900" },
  success: { color: "white", fontWeight: "900" },
  warning: { color: "white", fontWeight: "900" },
  danger: { color: "white", fontWeight: "900" },
});
