import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { PlaceDto } from "../placeTypes";
import { AppButton } from "../../../components";

export default function PlaceListItem({
  item,
  onEdit,
  onDelete,
  onOpening,
  deleting,
}: {
  item: PlaceDto;
  onEdit: (p: PlaceDto) => void;
  onDelete: (p: PlaceDto) => void;
  onOpening: (p: PlaceDto) => void;
  deleting?: boolean;
}) {
  const address =
    item.address && item.address.length > 35
      ? item.address.slice(0, 35) + "..."
      : item.address || "-";

  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 8 }}>
        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Category + Price */}
        <View style={styles.row}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{item.categoryName || "-"}</Text>
          </View>

          <Text style={styles.price}>
            {item.priceRange ? `฿${item.priceRange}` : "-"}
          </Text>
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>

        {/* Opening time button */}
        <Pressable
          onPress={() => onOpening(item)}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>ตั้งเวลาเปิด-ปิด</Text>
        </Pressable>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton
          title="แก้ไข"
          variant="warning"
          onPress={() => onEdit(item)}
        />
        <AppButton
          title="ลบ"
          variant="danger"
          onPress={() => onDelete(item)}
          disabled={deleting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },

  name: { fontWeight: "900", color: "#111827", fontSize: 14 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pill: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: "#1D4ED8", fontWeight: "900", fontSize: 12 },

  price: { color: "#16A34A", fontWeight: "900", fontSize: 12 },

  address: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
  },

  linkBtn: { alignSelf: "flex-start" },
  linkText: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  pressed: { opacity: 0.85 },

  actions: { gap: 8, alignItems: "flex-end" },
});
