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
import { useDeletePlaceMutation, useGetAllPlaceQuery } from "../placeApi";
import type { PlaceDto } from "../placeTypes";
import { AppButton, ListControls, PaginationBar } from "../../../components";
import PlaceListItem from "../Components/PlaceListItem";

export default function PlaceListAdminScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllPlaceQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deletePlace, { isLoading: isDeleting }] = useDeletePlaceMutation();

  const places = data?.items ?? [];
  const total = data?.total ?? 0;

  const onAdd = () => {
    navigation.navigate("PlaceFormScreen", { mode: "add" }); 
  };

  const onEdit = (place: PlaceDto) => {
    navigation.navigate("PlaceFormScreen", { mode: "edit", place , placeId: place.placeId}); 
  };

  const onOpening = (place: PlaceDto) => {
    navigation.navigate("PlaceOpeningScreen", {
      placeId: place.placeId,
      placeName: place.name,
    });
  };

  const onDelete = (place: PlaceDto) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบ "${place.name}" ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlace(place.placeId).unwrap();
            Alert.alert("สำเร็จ", "ลบข้อมูลสำเร็จ!");
            refetch();
          } catch (e) {
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
          <Text style={styles.title}>จัดการสถานที่ท่องเที่ยว</Text>
          <Text style={styles.subTitle}>จำนวนสถานที่ทั้งหมด: {total} แห่ง</Text>
        </View>

        <AppButton title="เพิ่มสถานที่" variant="success" onPress={onAdd} />
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
          placeholder="ค้นหาชื่อสถานที่..."
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
      ) : places.length === 0 ? (
        <CenterState text="ไม่มีสถานที่ท่องเที่ยว" />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => String(p.placeId)}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <PlaceListItem
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpening={onOpening}
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
