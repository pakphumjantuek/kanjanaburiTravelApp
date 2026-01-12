import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  value: number; // 0..5
  onChange: (v: number) => void;
};

export function RatingStars({ value, onChange }: Props) {
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} style={s.starBtn}>
            <Text style={[s.star, active ? s.starActive : s.starIdle]}>★</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  starBtn: { paddingVertical: 2, paddingHorizontal: 2 },
  star: { fontSize: 22, fontWeight: "900" },
  starActive: { color: "#f59e0b" }, // amber
  starIdle: { color: "#cbd5e1" }, // slate-300
});
