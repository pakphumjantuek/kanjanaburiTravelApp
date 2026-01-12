import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function ListControls({
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  onRefresh,
  isRefreshing,
  placeholder = "ค้นหา...",
  pageSizes = [10, 20, 50],
}: {
  search: string;
  onSearchChange: (v: string) => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  placeholder?: string;
  pageSizes?: number[];
}) {
  return (
    <View style={styles.controls}>
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.searchInput}
      />

      <View style={styles.row}>
        <Text style={styles.label}>ต่อหน้า</Text>

        {pageSizes.map((n) => (
          <Pressable
            key={n}
            onPress={() => onPageSizeChange(n)}
            style={({ pressed }) => [
              styles.chip,
              pageSize === n && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, pageSize === n && styles.chipTextActive]}>
              {n}
            </Text>
          </Pressable>
        ))}

        {!!onRefresh && (
          <Pressable onPress={onRefresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{isRefreshing ? "..." : "รีเฟรช"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 10 },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  label: { color: "#6B7280", fontWeight: "800", marginRight: 6 },
  chip: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: { borderColor: "#111827" },
  chipPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  chipText: { color: "#6B7280", fontWeight: "900" },
  chipTextActive: { color: "#111827" },
  refreshBtn: {
    marginLeft: "auto",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshText: { color: "#111827", fontWeight: "900" },
});
