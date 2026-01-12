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

import {
  useDeleteTripMutation,
  useGetAllTripsQuery,
  useGenerateAutoTripMutation,
} from "../features/trip/tripApi";

import type { TripDto } from "../features/trip/tripTypes";
import AutoTripModal from "../features/trip/components/AutoTripModal";
import { useGetAllPlaceTagQuery } from "../features/placeTag/placeTagApi";

const { width } = Dimensions.get("window");

export default function TripListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [search, setSearch] = useState("");
  const [autoTripOpen, setAutoTripOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching, refetch } = useGetAllTripsQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deleteTrip] = useDeleteTripMutation();
  const [generateAutoTrip, { isLoading: isAutoTripLoading }] =
    useGenerateAutoTripMutation();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const trips: TripDto[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSearch = debouncedSearch.trim().length > 0;

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
            <Ionicons name="airplane" size={24} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>ทริปของฉัน</Text>
          <Text style={styles.heroSubtitle}>
            วางแผนการเดินทางที่น่าจดจำของคุณ
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={20} color="#2A4D50" />
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>ทริปทั้งหมด</Text>
            </View>
            {hasSearch && (
              <View style={[styles.statCard, styles.searchStatCard]}>
                <Ionicons name="search-outline" size={20} color="#FF7754" />
                <Text style={styles.statSearchText}>
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
          <Ionicons name="search-outline" size={20} color="#83829A" />
          <TextInput
            value={search}
            onChangeText={(t) => setSearch(t)}
            placeholder="ค้นหาชื่อทริป..."
            placeholderTextColor="#C1C0C8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color="#83829A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AutoTripCreateScreen")}
          disabled={isAutoTripLoading}
          style={[
            styles.actionBtn,
            styles.autoTripBtn,
            isAutoTripLoading && styles.btnDisabled,
          ]}
        >
          <MaterialCommunityIcons
            name="robot-happy-outline"
            size={20}
            color="#fff"
          />
          <Text style={styles.actionBtnText}>
            {isAutoTripLoading ? "กำลังสร้าง..." : "AI สร้างให้"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goCreateTrip}
          style={[styles.actionBtn, styles.createBtn]}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>สร้างทริป</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.refreshIconBtn}
        >
          <Ionicons name="refresh-outline" size={22} color="#2A4D50" />
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
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading Indicator */}
      {(isLoading || isFetching) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2A4D50" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      )}
    </View>
  );

  const Empty = (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="map-outline" size={64} color="#C1C0C8" />
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
        <TouchableOpacity onPress={() => setSearch("")} style={styles.emptyBtn}>
          <Ionicons name="trash-outline" size={18} color="#2A4D50" />
          <Text style={styles.emptyBtnText}>ล้างคำค้นหา</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={goCreateTrip} style={styles.emptyBtnPrimary}>
          <Ionicons name="add-circle" size={18} color="#fff" />
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
          renderItem={({ item }) => (
            <View style={styles.tripCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.tripIconBadge}>
                    <Ionicons name="location" size={16} color="#2A4D50" />
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
                  <Ionicons name="calendar" size={16} color="#2A4D50" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateLabel}>เริ่มต้น</Text>
                    <Text style={styles.dateValue}>
                      {formatThaiDate(item.startDateTime)}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateDivider} />
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#FF7754" />
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
                    <Ionicons name="navigate" size={14} color="#2A4D50" />
                    <Text style={styles.locationText}>
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
                >
                  <Ionicons name="information-circle" size={18} color="#fff" />
                  <Text style={styles.cardActionBtnText}>รายละเอียด</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => goTripPlanner(item.tripId)}
                  style={[styles.cardActionBtn, styles.btnSecondary]}
                >
                  <Ionicons name="calendar" size={18} color="#2A4D50" />
                  <Text style={styles.cardActionBtnTextSecondary}>วางเเผน</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => goTripMap(item.tripId)}
                  style={[styles.cardActionBtn, styles.btnMap]}
                >
                  <Ionicons name="map" size={18} color="#FF7754" />
                  <Text style={styles.cardActionBtnTextMap}>ดูเเผนที่</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteTrip(item.tripId)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#cc3300" />
                </TouchableOpacity>
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
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={page <= 1 ? "#C1C0C8" : "#fff"}
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
              style={[
                styles.pageBtn,
                page >= totalPages && styles.pageBtnDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={page >= totalPages ? "#C1C0C8" : "#fff"}
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
    backgroundColor: "#F3F4F8",
  },
  page: {
    flex: 1,
  },

  // Header & Hero
  headerWrap: {
    paddingBottom: 16,
  },
  heroSection: {
    backgroundColor: "#2A4D50",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchStatCard: {
    backgroundColor: "#FFF5F2",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2A4D50",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#83829A",
    marginTop: 4,
  },
  statSearchText: {
    fontSize: 12,
    color: "#FF7754",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
  },
  clearBtn: {
    padding: 4,
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
    backgroundColor: "#7c3aed",
  },
  createBtn: {
    backgroundColor: "#2A4D50",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  refreshIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: "700",
    color: "#83829A",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#83829A",
  },
  filterChipTextActive: {
    color: "#fff",
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
    color: "#83829A",
  },

  // Trip Cards
  tripCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
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
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  tripNumber: {
    fontSize: 11,
    color: "#83829A",
    fontWeight: "600",
    marginBottom: 4,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    lineHeight: 24,
  },

  // Date Container
  dateContainer: {
    backgroundColor: "#F3F4F8",
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
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 11,
    color: "#83829A",
    fontWeight: "600",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
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
    fontSize: 12,
    color: "#2A4D50",
    fontWeight: "600",
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
    gap: 4,
  },
  btnPrimary: {
    backgroundColor: "#2A4D50",
  },
  btnSecondary: {
    backgroundColor: "#F3F4F8",
  },
  btnMap: {
    backgroundColor: "#FFF5F2",
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  cardActionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A4D50",
  },
  cardActionBtnTextMap: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF7754",
  },
  deleteBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
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
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#83829A",
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
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2A4D50",
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A4D50",
  },
  emptyBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
  },
  emptyBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: {
    backgroundColor: "#F3F4F8",
  },
  pageIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
  },
  pageText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  pageSeparator: {
    fontSize: 13,
    fontWeight: "600",
    color: "#83829A",
  },
});
