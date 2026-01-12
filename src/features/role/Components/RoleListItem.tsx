import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppButton } from "../../../components";
import { roleDto } from "../roleTypes";

export default function RoleListItem({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: roleDto;
  onEdit: (role: roleDto) => void;
  onDelete: (role: roleDto) => void;
  deleting?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.roleId} numberOfLines={1}>
          รหัส: {item.roleId}
        </Text>
        <Text style={styles.roleName} numberOfLines={1}>
          {item.roleName}
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
  row: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  left: { flex: 1, gap: 4 },
  roleId: { color: "#6B7280", fontWeight: "800", fontSize: 12 },
  roleName: { color: "#111827", fontWeight: "900", fontSize: 14 },

  actions: { flexDirection: "row", gap: 8 },
});
