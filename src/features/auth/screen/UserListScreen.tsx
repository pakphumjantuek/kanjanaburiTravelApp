// UserListScreen.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useGetAllUserQuery } from "../authApi";
import type { UserProfile } from "../authTypes";
import { useDebounce } from "../../../utils/useDebounce";
import { BASE_URL } from "../../../config/env";

export default function UserListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch } = useGetAllUserQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const renderItem = ({ item }: { item: UserProfile }) => {
    const firstChar = item.displayName?.charAt(0)?.toUpperCase() ?? "?";
    const avatarUri = item.avatarUrl ? `${BASE_URL}${item.avatarUrl}` : null;

    return (
      <View style={styles.card}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{firstChar}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.displayName} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              📧 {item.email}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              📱 {item.phoneNumber || "ไม่ระบุ"}
            </Text>
          </View>

          {/* Role Badge */}
          <View style={styles.roleContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{item.roleName}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.btnProfile,
              pressed && styles.btnPressed,
            ]}
            onPress={() =>
              navigation.navigate("UserProfileScreen", { userId: item.userId })
            }
          >
            <Text style={styles.actionBtnText}>👤 โปรไฟล์</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.btnInterest,
              pressed && styles.btnPressed,
            ]}
            onPress={() =>
              navigation.navigate("UserInterestDetailsScreen", {
                userId: item.userId,
              })
            }
          >
            <Text style={styles.actionBtnText}>📊 ความสนใจ</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>👥 จัดการผู้ใช้งาน</Text>
          <Text style={styles.subtitle}>
            ทั้งหมด {total} {total === 1 ? "คน" : "คน"}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={refetch}
          disabled={isFetching}
        >
          <Text style={styles.refreshText}>
            {isFetching ? "⏳" : "🔄 รีเฟรช"}
          </Text>
        </Pressable>
      </View>

      {/* Search & Filter Section */}
      <View style={styles.controlsCard}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหา ชื่อ หรือ อีเมล..."
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Page Size Selector */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>📄 แสดงต่อหน้า:</Text>
          <View style={styles.chipGroup}>
            {[10, 20, 50].map((n) => (
              <Pressable
                key={n}
                onPress={() => setPageSize(n)}
                style={({ pressed }) => [
                  styles.chip,
                  pageSize === n && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    pageSize === n && styles.chipTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            {search ? "ไม่พบผู้ใช้ที่ค้นหา" : "ไม่มีข้อมูลผู้ใช้"}
          </Text>
          {search && (
            <Pressable
              style={styles.clearSearchBtn}
              onPress={() => setSearch("")}
            >
              <Text style={styles.clearSearchText}>ล้างการค้นหา</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.userId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Pagination */}
      {!isLoading && users.length > 0 && (
        <View style={styles.pagination}>
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={({ pressed }) => [
              styles.pageBtn,
              styles.pageBtnPrev,
              page <= 1 && styles.pageBtnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.pageBtnText}>← ก่อนหน้า</Text>
          </Pressable>

          <View style={styles.pageInfo}>
            <Text style={styles.pageText}>
              หน้า {page} / {totalPages}
            </Text>
            <Text style={styles.pageSubtext}>
              ({(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, total)} จาก {total})
            </Text>
          </View>

          <Pressable
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={({ pressed }) => [
              styles.pageBtn,
              styles.pageBtnNext,
              page >= totalPages && styles.pageBtnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.pageBtnText}>ถัดไป →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  refreshText: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 13,
  },

  // Controls
  controlsCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  clearBtn: {
    color: "#9CA3AF",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 8,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 13,
  },
  chipGroup: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  chip: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipActive: {
    backgroundColor: "#1E40AF",
    borderColor: "#1E40AF",
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  chipText: {
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 13,
  },
  chipTextActive: {
    color: "white",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  avatarContainer: {
    width: 52,
    height: 52,
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    color: "white",
    fontWeight: "900",
    fontSize: 20,
  },

  infoSection: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
  },
  email: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  phone: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  roleContainer: {
    alignItems: "flex-end",
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  roleText: {
    color: "#1E40AF",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // Actions
  actionSection: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  btnProfile: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
  },
  btnInterest: {
    backgroundColor: "#3B82F6",
    borderColor: "#2563EB",
  },
  actionBtnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Empty & Loading
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  clearSearchBtn: {
    marginTop: 8,
    backgroundColor: "#1E40AF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearSearchText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  // Pagination
  pagination: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pageBtnPrev: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  pageBtnNext: {
    backgroundColor: "#1E40AF",
    borderColor: "#1E40AF",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontWeight: "900",
    fontSize: 13,
    color: "#111827",
  },
  pageInfo: {
    alignItems: "center",
    flex: 1,
  },
  pageText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 15,
  },
  pageSubtext: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
