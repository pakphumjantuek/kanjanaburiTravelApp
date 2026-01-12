import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlaceTagDto } from "../placeTagTypes";
import { AppButton } from "../../../components";


export default function PlaceTagListItem({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: PlaceTagDto;
  onEdit: (t: PlaceTagDto) => void;
  onDelete: (t: PlaceTagDto) => void;
  deleting?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.tagName}
        </Text>

        <Text style={styles.desc} numberOfLines={2}>
          {item.tagDescription || "-"}
        </Text>
      </View>

      <View style={styles.actions}>
        <AppButton title="แก้ไข" variant="warning" onPress={() => onEdit(item)} />
        <AppButton title="ลบ" variant="danger" onPress={() => onDelete(item)} disabled={deleting} />
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
  desc: { color: "#6B7280", fontWeight: "700", fontSize: 12, lineHeight: 16 },

  actions: { gap: 8, alignItems: "flex-end" },
});
