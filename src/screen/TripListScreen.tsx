import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useDebounce } from "../utils/useDebounce";
import { formatThaiDate } from "../utils/dateUtils";

import { useDeleteTripMutation, useGetAllTripsQuery } from "../features/trip/tripApi";

import type { TripDto } from "../features/trip/tripTypes";

const { width } = Dimensions.get("window");

// Theme (สี/ระยะ) เพื่อให้ทั้งหน้าสม่ำเสมอ
const THEME = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E5E7EB",
  primary: "#2A4D50",
  primary2: "#1F3B3D",
  accent: "#FF7754",
  muted: "#F1F5F9",
  dangerBg: "#FEF2F2",
  danger: "#B42318",
  white: "#FFFFFF",
};

const TRIP_ACCENTS = ["#2A4D50", "#FF7754", "#7C3AED", "#0EA5E9", "#16A34A", "#F59E0B"];

export default function TripListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching, refetch } = useGetAllTripsQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deleteTrip] = useDeleteTripMutation();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const trips: TripDto[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSearch = debouncedSearch.trim().length > 0;

  const getTripAccent = useMemo(() => {
    return (tripId: number) => TRIP_ACCENTS[Math.abs(tripId) % TRIP_ACCENTS.length];
  }, []);

  const handleDeleteTrip = (tripId: number) => {
    Alert.alert("ยืนยันการลบ", "คุณต้องการลบทริปนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(tripId).unwrap();
            refetch();
          } catch (err: any) {
            console.error(err);
            Alert.alert(
              "ผิดพลาด",
              err?.data?.errorMessages?.[0] ?? "ลบทริปไม่สำเร็จ"
            );
          }
        },
      },
    ]);
  };

  const goCreateTrip = () => {
    navigation.navigate("TripCreateScreen");
  };

  const goTripDetail = (tripId: number) => {
    navigation.navigate("TripDetailScreen", { tripId });
  };

  const goTripPlanner = (tripId: number) => {
    navigation.navigate("TripPlannerScreen", { tripId });
  };

  const goTripMap = (tripId: number) => {
    navigation.navigate("TripMapScreen", { tripId });
  };

  const pageSizeOptions = useMemo(() => [6, 9, 12, 18], []);

  const Header = (
    <View style={styles.headerWrap}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <View style={styles.iconBadge}>
            <Ionicons name="airplane" size={24} color={THEME.white} />
          </View>
          <Text style={styles.heroTitle}>ทริปของฉัน</Text>
          <Text style={styles.heroSubtitle}>วางแผนการเดินทางที่น่าจดจำของคุณ</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={20} color={THEME.primary} />
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>ทริปทั้งหมด</Text>
            </View>

            {hasSearch && (
              <View style={[styles.statCard, styles.searchStatCard]}>
                <Ionicons name="search-outline" size={20} color={THEME.accent} />
                <Text style={styles.statSearchText} numberOfLines={1}>
                  ค้นหา: {debouncedSearch}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={THEME.subtext} />
          <TextInput
            value={search}
            onChangeText={(t) => setSearch(t)}
            placeholder="ค้นหาชื่อทริป..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="ล้างคำค้นหา"
            >
              <Ionicons name="close-circle" size={20} color={THEME.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AutoTripCreateScreen")}
          style={[styles.actionBtn, styles.autoTripBtn]}
          accessibilityRole="button"
          accessibilityLabel="ให้ AI สร้างทริปอัตโนมัติ"
        >
          <MaterialCommunityIcons name="robot-happy-outline" size={20} color={THEME.white} />
          <Text style={styles.actionBtnText}>AI สร้างให้</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goCreateTrip}
          style={[styles.actionBtn, styles.createBtn]}
          accessibilityRole="button"
          accessibilityLabel="สร้างทริปใหม่"
        >
          <Ionicons name="add-circle-outline" size={20} color={THEME.white} />
          <Text style={styles.actionBtnText}>สร้างทริป</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.refreshIconBtn}
          accessibilityRole="button"
          accessibilityLabel="รีเฟรชรายการทริป"
        >
          <Ionicons name="refresh-outline" size={22} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>แสดง:</Text>
        {pageSizeOptions.map((n) => {
          const active = n === pageSize;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => setPageSize(n)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`แสดง ${n} รายการต่อหน้า`}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading Indicator */}
      {(isLoading || isFetching) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={THEME.primary} />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      )}
    </View>
  );

  const Empty = (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="map-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>
        {hasSearch ? "ไม่พบทริปที่ค้นหา" : "ยังไม่มีทริป"}
      </Text>
      <Text style={styles.emptyDesc}>
        {hasSearch
          ? "ลองเปลี่ยนคำค้นหาหรือล้างคำค้นหา"
          : "เริ่มต้นสร้างทริปแรกของคุณเพื่อวางแผนการเดินทาง"}
      </Text>

      {hasSearch ? (
        <TouchableOpacity onPress={() => setSearch("")} style={styles.emptyBtn} accessibilityRole="button">
          <Ionicons name="close-circle-outline" size={18} color={THEME.primary} />
          <Text style={styles.emptyBtnText}>ล้างคำค้นหา</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={goCreateTrip} style={styles.emptyBtnPrimary} accessibilityRole="button">
          <Ionicons name="add-circle" size={18} color={THEME.white} />
          <Text style={styles.emptyBtnPrimaryText}>สร้างทริปแรก</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <FlatList
          data={trips}
          keyExtractor={(item: any) => String(item.tripId)}
          ListHeaderComponent={Header}
          ListEmptyComponent={!isLoading && !isFetching ? Empty : null}
          contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <View style={styles.tripCard}>
              <View
                style={[
                  styles.tripAccent,
                  { backgroundColor: getTripAccent(item.tripId) },
                ]}
              />
              <View style={styles.tripCardBody}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.tripIconBadge}>
                      <Ionicons name="location" size={16} color={THEME.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripNumber}>ทริป #{item.tripId}</Text>
                      <Text style={styles.tripTitle} numberOfLines={2}>
                        {item.title ?? `ทริป #${item.tripId}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Date Info */}
                <View style={styles.dateContainer}>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar" size={16} color={THEME.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dateLabel}>เริ่มต้น</Text>
                      <Text style={styles.dateValue}>
                        {formatThaiDate(item.startDateTime)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={16} color={THEME.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dateLabel}>สิ้นสุด</Text>
                      <Text style={styles.dateValue}>
                        {formatThaiDate(item.endDateTime)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location Badge */}
                {typeof (item as any).startLat === "number" &&
                  typeof (item as any).startLng === "number" && (
                    <View style={styles.locationBadge}>
                      <Ionicons name="navigate" size={14} color={THEME.primary} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        จุดเริ่มต้น: {(item as any).startLat.toFixed(4)},{" "}
                        {(item as any).startLng.toFixed(4)}
                      </Text>
                    </View>
                  )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => goTripDetail(item.tripId)}
                    style={[styles.cardActionBtn, styles.btnPrimary]}
                    accessibilityRole="button"
                    accessibilityLabel={`ดูรายละเอียดทริป ${item.tripId}`}
                  >
                    <Ionicons name="information-circle" size={18} color={THEME.white} />
                    <Text style={styles.cardActionBtnText}>รายละเอียด</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => goTripPlanner(item.tripId)}
                    style={[styles.cardActionBtn, styles.btnSecondary]}
                    accessibilityRole="button"
                    accessibilityLabel={`วางแผนทริป ${item.tripId}`}
                  >
                    <Ionicons name="calendar" size={18} color={THEME.primary} />
                    <Text style={styles.cardActionBtnTextSecondary}>วางแผน</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => goTripMap(item.tripId)}
                    style={[styles.cardActionBtn, styles.btnMap]}
                    accessibilityRole="button"
                    accessibilityLabel={`ดูแผนที่ทริป ${item.tripId}`}
                  >
                    <Ionicons name="map" size={18} color={THEME.accent} />
                    <Text style={styles.cardActionBtnTextMap}>ดูแผนที่</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteTrip(item.tripId)}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`ลบทริป ${item.tripId}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={THEME.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="หน้าก่อนหน้า"
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={page <= 1 ? "#CBD5E1" : THEME.white}
              />
            </TouchableOpacity>

            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>
                {page} <Text style={styles.pageSeparator}>of</Text> {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="หน้าถัดไป"
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={page >= totalPages ? "#CBD5E1" : THEME.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  page: {
    flex: 1,
  },

  // Header & Hero
  headerWrap: {
    paddingBottom: 16,
  },
  heroSection: {
    backgroundColor: THEME.primary,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    alignItems: "center",
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.white,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.82)",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  searchStatCard: {
    backgroundColor: "#FFF5F2",
    borderColor: "rgba(255, 119, 84, 0.22)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.subtext,
    marginTop: 4,
  },
  statSearchText: {
    fontSize: 12,
    color: THEME.accent,
    marginTop: 8,
    textAlign: "center",
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
  },
  clearBtn: {
    padding: 6, // เพิ่มพื้นที่กด
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  autoTripBtn: {
    backgroundColor: "#6D28D9",
  },
  createBtn: {
    backgroundColor: THEME.primary,
  },
  actionBtnText: {
    color: THEME.white,
    fontWeight: "800",
    fontSize: 14,
  },
  refreshIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },

  // Filter
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.subtext,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.subtext,
  },
  filterChipTextActive: {
    color: THEME.white,
  },

  // Loading
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.subtext,
    fontWeight: "600",
  },

  // Trip Cards
  tripCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  tripAccent: {
    width: 6,
  },
  tripCardBody: {
    flex: 1,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  tripIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tripNumber: {
    fontSize: 11,
    color: THEME.subtext,
    fontWeight: "700",
    marginBottom: 4,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: THEME.text,
    lineHeight: 24,
  },

  // Date Container
  dateContainer: {
    backgroundColor: THEME.muted,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateDivider: {
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 11,
    color: THEME.subtext,
    fontWeight: "700",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.text,
  },

  // Location Badge
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: THEME.primary,
    fontWeight: "700",
  },

  // Card Actions
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: THEME.primary,
  },
  btnSecondary: {
    backgroundColor: THEME.muted,
    borderWidth: 1,
    borderColor: "rgba(42, 77, 80, 0.18)",
  },
  btnMap: {
    backgroundColor: "#FFF5F2",
    borderWidth: 1,
    borderColor: "rgba(255, 119, 84, 0.25)",
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.white,
  },
  cardActionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  cardActionBtnTextMap: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.accent,
  },
  deleteBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: THEME.dangerBg,
    borderWidth: 1,
    borderColor: "rgba(180, 35, 24, 0.15)",
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: THEME.subtext,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.card,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.primary,
  },
  emptyBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  emptyBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.white,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 14,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: {
    backgroundColor: THEME.muted,
  },
  pageIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.muted,
  },
  pageText: {
    fontSize: 15,
    fontWeight: "900",
    color: THEME.text,
  },
  pageSeparator: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.subtext,
  },
});
