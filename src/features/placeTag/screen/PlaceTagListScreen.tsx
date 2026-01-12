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
import {
  useDeletePlaceTagMutation,
  useGetAllPlaceTagQuery,
} from "../placeTagApi";
import type { PlaceTagDto } from "../placeTagTypes";
import { AppButton, ListControls, PaginationBar } from "../../../components";
import PlaceTagListItem from "../components/PlaceTagListItem";

export default function PlaceTagListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch, error } =
    useGetAllPlaceTagQuery({
      page,
      pageSize,
      search: debouncedSearch,
    });

  const [deletePlaceTag, { isLoading: isDeleting }] =
    useDeletePlaceTagMutation();

  const tags = data?.items ?? [];
  const total = data?.total ?? 0;

  const onAdd = () => navigation.navigate("PlaceTagForm", { mode: "add" });

  const onEdit = (placeTag: PlaceTagDto) => {
    navigation.navigate("PlaceTagForm", { mode: "edit", placeTag });
  };

  const onDelete = (placeTag: PlaceTagDto) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบแท็ก "${placeTag.tagName}" ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlaceTag(placeTag.tagId).unwrap();
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
          <Text style={styles.title}>จัดการแท็กสถานที่ท่องเที่ยว</Text>
          <Text style={styles.subTitle}>จำนวนแท็กทั้งหมด: {total} แห่ง</Text>
        </View>

        <AppButton title="เพิ่มแท็ก" variant="success" onPress={onAdd} />
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
          placeholder="ค้นหาชื่อแท็ก..."
          pageSizes={[10, 20, 50]}
        />
      </View>

      {/* States */}
      {isLoading ? (
        <CenterState text="กำลังโหลด..." loading />
      ) : error ? (
        <CenterState
          text="โหลดข้อมูลไม่สำเร็จ"
          actionLabel="ลองใหม่"
          onAction={refetch}
        />
      ) : tags.length === 0 ? (
        <CenterState text="ไม่มีแท็กสถานที่" />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => String(t.tagId)}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <PlaceTagListItem
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              deleting={isDeleting}
            />
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  muted: { color: "#6B7280", fontWeight: "700" },
});
