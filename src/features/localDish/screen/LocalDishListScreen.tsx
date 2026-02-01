import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useDebounce } from "../../../utils/useDebounce";
import { useDeleteLocalDishMutation, useGetAllLocalDishQuery } from "../LocalDishApi";
import type { LocalDishType } from "../LocalDishType";
import { AppButton, ListControls, PaginationBar } from "../../../components";

function LocalDishListItem({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: LocalDishType;
  onEdit: (dish: LocalDishType) => void;
  onDelete: (dish: LocalDishType) => void;
  deleting: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.nameTH}>{item.nameTH}</Text>
        <Text style={styles.rowText}>EN: {item.nameEN}</Text>
        <Text style={styles.rowText}>ความเผ็ด: {item.spicyLevel}</Text>
        <Text style={styles.rowText}>ฮาลาล: {item.isHalal ? "ใช่" : "ไม่ใช่"}</Text>
        <Text style={styles.rowText}>มังสวิรัติ: {item.isVegetarian ? "ใช่" : "ไม่ใช่"}</Text>
      </View>

      <View style={styles.actions}>
        <AppButton title="แก้ไข" variant="warning" onPress={() => onEdit(item)} />
        <AppButton title="ลบ" variant="danger" onPress={() => onDelete(item)} disabled={deleting} />
      </View>
    </View>
  );
}

export default function LocalDishListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllLocalDishQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deleteLocalDish, { isLoading: isDeleting }] = useDeleteLocalDishMutation();

  const dishes = data?.items ?? [];
  const total = data?.total ?? 0;

  const onAdd = () => navigation.navigate("LocalDishFormScreen", { mode: "add" });

  const onEdit = (dish: LocalDishType) => {
    navigation.navigate("LocalDishFormScreen", { mode: "edit", dish ,dishId: dish.dishId });
  };

  const onDelete = (dish: LocalDishType) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบ "${dish.nameTH}" ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            // ถ้า dishId อาจเป็น undefined ให้กันไว้
            if (!dish.dishId) return;

            await deleteLocalDish(dish.dishId).unwrap();
            Alert.alert("สำเร็จ", "ลบข้อมูลสำเร็จ!");
            refetch();
          } catch {
            Alert.alert("ผิดพลาด", "ลบข้อมูลไม่สำเร็จ");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>จัดการอาหารท้องถิ่น</Text>
          <Text style={styles.subTitle}>จำนวนอาหารท้องถิ่นทั้งหมด: {total} รายการ</Text>
        </View>

        <AppButton title="เพิ่มอาหาร" variant="success" onPress={onAdd} />
      </View>

      {/* Controls */}
      <View style={styles.controlsWrap}>
        <ListControls
          search={search}
          onSearchChange={setSearch}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onRefresh={refetch}
          isRefreshing={isFetching}
          placeholder="ค้นหาชื่ออาหารท้องถิ่น..."
          pageSizes={[10, 20, 50]}
        />
      </View>

      {/* States */}
      {isLoading ? (
        <CenterState text="กำลังโหลด..." loading />
      ) : error ? (
        <CenterState text="โหลดข้อมูลไม่สำเร็จ" actionLabel="ลองใหม่" onAction={refetch} />
      ) : dishes.length === 0 ? (
        <CenterState text="ไม่มีอาหารท้องถิ่น" />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(d) => String(d.dishId)}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <LocalDishListItem item={item} onEdit={onEdit} onDelete={onDelete} deleting={isDeleting} />
          )}
        />
      )}

      {/* Pagination */}
      <PaginationBar
        page={page}
        total={total}
        pageSize={pageSize}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </SafeAreaView>
  );
}

function CenterState({
  text,
  loading,
  actionLabel,
  onAction,
}: {
  text: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      {loading ? <ActivityIndicator /> : null}
      <Text style={styles.muted}>{text}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 10 }}>
          <AppButton title={actionLabel} variant="primary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subTitle: { marginTop: 4, color: "#6B7280", fontWeight: "700", fontSize: 12 },

  controlsWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 90 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  nameTH: { fontSize: 14, fontWeight: "900", color: "#111827" },
  rowText: { fontSize: 12, color: "#374151", fontWeight: "700" },

  actions: { justifyContent: "center", gap: 8 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  muted: { color: "#6B7280", fontWeight: "700" },
});