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
import { useGetAllRoleQuery, useDeleteRoleMutation } from "../roleApi";
import type { roleDto } from "../roleTypes";

import AppButton from "../../../components/ui/AppButton";
import { ListControls, PaginationBar } from "../../../components";
import RoleListItem from "../Components/RoleListItem";

export default function RoleListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllRoleQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const roles = data?.items ?? [];
  const total = data?.total ?? 0;

  const onAdd = () => navigation.navigate("RoleForm", { mode: "add" });

  const onEdit = (role: roleDto) => {
    navigation.navigate("RoleForm", { mode: "edit", role });
  };

  const onDelete = (role: roleDto) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบสิทธิ์ "${role.roleName}" ใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRole(role.roleId).unwrap();
            Alert.alert("สำเร็จ", "ลบข้อมูลสำเร็จ!");
            refetch();
          } catch (e) {
            Alert.alert("ผิดพลาด", "ลบข้อมูลไม่สำเร็จ");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: roleDto }) => (
    <RoleListItem
      item={item}
      onEdit={onEdit}
      onDelete={onDelete}
      deleting={isDeleting}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>สิทธิ์ผู้ใช้งาน</Text>
        <AppButton title="เพิ่มข้อมูล" variant="success" onPress={onAdd} />
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
          placeholder="ชื่อสิทธิ์ / รหัสสิทธิ์..."
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
      ) : roles.length === 0 ? (
        <CenterState text="ไม่มีข้อมูลสิทธิ์" />
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(r) => String(r.roleId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
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
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },

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
