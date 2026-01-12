import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function PaginationBar({
  page,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <View style={styles.pagination}>
      <Pressable
        onPress={onPrev}
        disabled={page <= 1}
        style={({ pressed }) => [
          styles.btn,
          page <= 1 && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.btnText}>ก่อนหน้า</Text>
      </Pressable>

      <Text style={styles.pageText}>
        หน้า {page} / {totalPages} ({total})
      </Text>

      <Pressable
        onPress={onNext}
        disabled={page >= totalPages}
        style={({ pressed }) => [
          styles.btn,
          page >= totalPages && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.btnText}>ถัดไป</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F6F7FB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  btn: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  btnText: { color: "white", fontWeight: "900" },
  pageText: { color: "#111827", fontWeight: "900" },
});
