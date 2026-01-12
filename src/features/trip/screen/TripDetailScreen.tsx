import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useGetTripDetailQuery, useDeleteTripMutation } from "../tripApi";
import { usePlacesByIds } from "../hooks/usePlacesByIds";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto, PlaceType } from "../../placeOpening/placetype";

import { formatThaiDateTime } from "../../../utils/dateUtils";

// ---------- helpers ----------
const toHHMM = (t?: string | null) => {
  if (!t) return "-";
  return t.length >= 5 ? t.substring(0, 5) : t;
};

const getTripDayOfWeek = (tripStart?: string | null, dayIndex?: number | null) => {
  if (!tripStart) return null;
  const start = new Date(tripStart);
  if (Number.isNaN(start.getTime())) return null;

  const offsetDays = Math.max((dayIndex ?? 1) - 1, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + offsetDays);
  return d.getDay(); // 0-6
};

// ---------- minimal types ----------
type TripItem = {
  tripItemId: number;
  placeId: number;
  dayIndex: number;
  orderIndex: number;
};

type TripSegment = {
  tripSegmentId?: number;
  fromTripItemId: number;
  toTripItemId: number;
  distanceKm?: number;
  travelMinutes?: number;
  transportMode?: string;
};

type TripDetail = {
  tripId?: number;
  title: string;
  description?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  items: TripItem[];
  segments: TripSegment[];
};

type RouteParams = { tripId: number };

export default function TripDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const tripId = Number((route.params as RouteParams)?.tripId);

  const { data, isLoading, isError, error, refetch } = useGetTripDetailQuery(tripId, {
    skip: !Number.isFinite(tripId) || tripId <= 0,
  }) as {
    data?: TripDetail;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch?: () => any;
  };

  const [deleteTrip, { isLoading: isDeleting }] = useDeleteTripMutation();

  const [tab, setTab] = useState<"items" | "segments">("items");
  const [dayFilter, setDayFilter] = useState<number>(0); // 0 = all

  // ---- sort items ----
  const itemsSorted = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .slice()
      .sort(
        (a, b) =>
          (a.dayIndex ?? 1) - (b.dayIndex ?? 1) ||
          (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
  }, [data?.items]);

  // ---- days ----
  const days = useMemo(() => {
    const max = itemsSorted.length ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1)) : 1;
    return Array.from({ length: Math.max(max, 1) }, (_, i) => i + 1);
  }, [itemsSorted]);

  // ---- filtered items ----
  const filteredItems = useMemo(() => {
    if (dayFilter === 0) return itemsSorted;
    return itemsSorted.filter((x) => x.dayIndex === dayFilter);
  }, [itemsSorted, dayFilter]);

  // unique placeIds
  const placeIds = useMemo(() => Array.from(new Set(itemsSorted.map((x) => x.placeId))), [itemsSorted]);

  // places map
  const { map: placeMap, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  // openingHours per place
  const [triggerOpening] = useLazyGetPlaceOpeningQuery();
  const [openingByPlace, setOpeningByPlace] = useState<Map<number, OpeningHourDto[]>>(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!placeIds.length) {
        if (!cancelled) setOpeningByPlace(new Map());
        return;
      }

      const results = await Promise.all(
        placeIds.map(async (pid) => {
          try {
            const list = await triggerOpening(pid, true).unwrap();
            return [pid, list] as const;
          } catch {
            return [pid, [] as PlaceType[]] as const;
          }
        })
      );

      if (!cancelled) setOpeningByPlace(new Map(results));
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placeIds, triggerOpening]);

  // ---- itemById (for segments) ----
  const itemById = useMemo(() => {
    const m = new Map<number, { order: number; day: number; placeId: number; name: string }>();
    for (const it of itemsSorted) {
      const p: any = placeMap.get(it.placeId);
      m.set(it.tripItemId, {
        order: it.orderIndex ?? 0,
        day: it.dayIndex ?? 1,
        placeId: it.placeId,
        name: p?.name ?? `Place #${it.placeId}`,
      });
    }
    return m;
  }, [itemsSorted, placeMap]);

  // ---- segments totals ----
  const segTotals = useMemo(() => {
    const segs = data?.segments ?? [];
    const km = segs.reduce((a, s) => a + (s.distanceKm ?? 0), 0);
    const min = segs.reduce((a, s) => a + (s.travelMinutes ?? 0), 0);
    return { km, min };
  }, [data?.segments]);

  // ---- segments filtered by day ----
  const filteredSegments = useMemo(() => {
    const segs = data?.segments ?? [];
    if (dayFilter === 0) return segs;
    return segs.filter((s) => (itemById.get(s.fromTripItemId)?.day ?? 0) === dayFilter);
  }, [data?.segments, dayFilter, itemById]);

  const renderOpeningText = (placeId: number, dayIndex: number) => {
    const dow = getTripDayOfWeek(data?.startDateTime ?? null, dayIndex);
    const list = openingByPlace.get(placeId) ?? [];
    const oh = dow == null ? null : list.find((x) => x.dayOfWeek === dow);

    if (!oh) return "ไม่ระบุ";
    if (oh.isClosed) return "ปิดทำการ";
    return `${toHHMM(oh.openTime)} - ${toHHMM(oh.closeTime)} น.`;
  };

  // ---- delete ----
  const handleDelete = () => {
    Alert.alert("ยืนยันการลบ", "ต้องการลบทริปนี้ใช่ไหม? (ไม่สามารถกู้คืนได้)", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(tripId).unwrap();
            navigation.navigate("TripListScreen");
          } catch (err: any) {
            console.error(err);
            Alert.alert("ผิดพลาด", err?.data?.errorMessages?.[0] ?? "ลบทริปไม่สำเร็จ");
          }
        },
      },
    ]);
  };

  // ---- states ----
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2A4D50" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูลทริป...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={64} color="#cc3300" />
          </View>
          <Text style={styles.errorTitle}>โหลดไม่สำเร็จ</Text>
          <Text style={styles.errorText}>
            {(error as any)?.data?.errorMessages?.[0] ?? "เกิดข้อผิดพลาด"}
          </Text>

          <View style={styles.errorActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnSecondary}>
              <Ionicons name="arrow-back" size={18} color="#83829A" />
              <Text style={styles.btnSecondaryText}>กลับ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => refetch?.()} style={styles.btnPrimary}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>ลองใหม่</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="file-tray-outline" size={64} color="#C1C0C8" />
          </View>
          <Text style={styles.errorTitle}>ไม่พบทริป</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("TripListScreen")}
            style={styles.btnPrimary}
          >
            <Ionicons name="list" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>กลับไปหน้าทริป</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- main ----
  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2A4D50" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>รายละเอียดทริป</Text>
          <Text style={styles.topBarSub}>ทริป #{tripId}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 16 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="map" size={24} color="#2A4D50" />
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{data.title}</Text>
          </View>

          {/* Date Info */}
          <View style={styles.dateInfo}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar" size={18} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>เริ่มต้น</Text>
                <Text style={styles.dateValue}>{formatThaiDateTime(data.startDateTime ?? "")}</Text>
              </View>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={18} color="#FF7754" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>สิ้นสุด</Text>
                <Text style={styles.dateValue}>{formatThaiDateTime(data.endDateTime ?? "")}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {!!data.description && (
            <View style={styles.descCard}>
              <View style={styles.descHeader}>
                <Ionicons name="document-text" size={16} color="#2A4D50" />
                <Text style={styles.descHeaderText}>รายละเอียด</Text>
              </View>
              <Text style={styles.descText}>{data.description}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="location" size={20} color="#2A4D50" />
              <Text style={styles.statValue}>{data.items.length}</Text>
              <Text style={styles.statLabel}>สถานที่</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="routes" size={20} color="#7c3aed" />
              <Text style={styles.statValue}>{data.segments.length}</Text>
              <Text style={styles.statLabel}>เส้นทาง</Text>
            </View>
            {data.segments.length > 0 && (
              <>
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="map-marker-distance" size={20} color="#10b981" />
                  <Text style={styles.statValue}>{segTotals.km.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>กม.</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="time" size={20} color="#FF7754" />
                  <Text style={styles.statValue}>{segTotals.min}</Text>
                  <Text style={styles.statLabel}>นาที</Text>
                </View>
              </>
            )}
          </View>

          {isPlacesLoading && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color="#2A4D50" />
              <Text style={styles.loadingBannerText}>กำลังโหลดชื่อสถานที่...</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate("TripPlannerScreen", { tripId })}
            style={styles.actionBtn}
          >
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>วางแผน</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("TripMapScreen", { tripId })}
            style={[styles.actionBtn, styles.actionBtnMap]}
          >
            <Ionicons name="map" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>แผนที่</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={[styles.actionBtn, styles.actionBtnDelete, isDeleting && styles.actionBtnDisabled]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trash" size={18} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>{isDeleting ? "กำลังลบ..." : "ลบ"}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsCard}>
          <TouchableOpacity
            onPress={() => setTab("items")}
            style={[styles.tab, tab === "items" && styles.tabActive]}
          >
            <Ionicons name="location" size={20} color={tab === "items" ? "#fff" : "#83829A"} />
            <Text style={[styles.tabText, tab === "items" && styles.tabTextActive]}>
              รายการสถานที่
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("segments")}
            style={[styles.tab, tab === "segments" && styles.tabActive]}
          >
            <MaterialCommunityIcons name="routes" size={20} color={tab === "segments" ? "#fff" : "#83829A"} />
            <Text style={[styles.tabText, tab === "segments" && styles.tabTextActive]}>
              เส้นทาง
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day Filter */}
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Ionicons name="funnel" size={16} color="#2A4D50" />
            <Text style={styles.filterLabel}>กรองตามวัน</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            <TouchableOpacity
              onPress={() => setDayFilter(0)}
              style={[styles.filterChip, dayFilter === 0 && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, dayFilter === 0 && styles.filterChipTextActive]}>
                ทั้งหมด
              </Text>
            </TouchableOpacity>

            {days.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDayFilter(d)}
                style={[styles.filterChip, dayFilter === d && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, dayFilter === d && styles.filterChipTextActive]}>
                  วันที่ {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Body Content */}
        {tab === "items" ? (
          data.items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={64} color="#C1C0C8" />
              </View>
              <Text style={styles.emptyTitle}>ยังไม่มีสถานที่ในทริป</Text>
              <Text style={styles.emptyText}>เริ่มต้นวางแผนการเดินทางโดยเพิ่มสถานที่ที่ต้องการไป</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("TripPlannerScreen", { tripId })}
                style={styles.emptyAction}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.emptyActionText}>วางแผนการเดินทาง</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {filteredItems.map((it, idx) => {
                const p: any = placeMap.get(it.placeId);
                const name = p?.name ?? `Place #${it.placeId}`;

                return (
                  <View key={it.tripItemId} style={styles.placeCard}>
                    {/* Place Header */}
                    <View style={styles.placeHeader}>
                      <View style={styles.placeNumber}>
                        <Text style={styles.placeNumberText}>{it.orderIndex ?? idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.placeName} numberOfLines={2}>{name}</Text>
                        <View style={styles.placeBadges}>
                          <View style={styles.dayBadge}>
                            <Ionicons name="calendar-outline" size={12} color="#2A4D50" />
                            <Text style={styles.dayBadgeText}>วันที่ {it.dayIndex}</Text>
                          </View>
                          <View style={styles.orderBadge}>
                            <Ionicons name="list" size={12} color="#7c3aed" />
                            <Text style={styles.orderBadgeText}>ลำดับ {it.orderIndex}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Place Details */}
                    <View style={styles.placeDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color="#10b981" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>เวลาทำการ</Text>
                          <Text style={styles.detailValue}>
                            {renderOpeningText(it.placeId, it.dayIndex)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="hourglass-outline" size={16} color="#FF7754" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>ระยะเวลาแนะนำ</Text>
                          <Text style={styles.detailValue}>
                            {p?.avgVisitMinutes ? `${p.avgVisitMinutes} นาที` : "60 นาที"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Address */}
                    {!!p?.address && (
                      <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={14} color="#83829A" />
                        <Text style={styles.addressText} numberOfLines={2}>{p.address}</Text>
                      </View>
                    )}

                    {/* Action */}
                    <TouchableOpacity
                      onPress={() => navigation.navigate("PlaceUserDetailScreen", { placeId: it.placeId })}
                      style={styles.placeAction}
                    >
                      <Text style={styles.placeActionText}>ดูรายละเอียด</Text>
                      <Ionicons name="chevron-forward" size={16} color="#2A4D50" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        ) : data.segments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="routes" size={64} color="#C1C0C8" />
            </View>
            <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลเส้นทาง</Text>
            <Text style={styles.emptyText}>เส้นทางจะถูกสร้างเมื่อมีสถานที่อย่างน้อย 2 จุดและคำนวณเส้นทาง</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TripMapScreen", { tripId })}
              style={[styles.emptyAction, styles.emptyActionMap]}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.emptyActionText}>ไปหน้าแผนที่</Text>
            </TouchableOpacity>
          </View>
        ) : filteredSegments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="navigate-outline" size={64} color="#C1C0C8" />
            </View>
            <Text style={styles.emptyTitle}>ไม่มีเส้นทางในวันนี้</Text>
            <Text style={styles.emptyText}>ลองเลือก "ทั้งหมด" หรือคำนวณเส้นทางของวันนั้นก่อน</Text>
          </View>
        ) : (
          <View style={styles.segmentsList}>
            {filteredSegments.map((s) => {
              const from = itemById.get(s.fromTripItemId);
              const to = itemById.get(s.toTripItemId);

              return (
                <View
                  key={s.tripSegmentId ?? `${s.fromTripItemId}-${s.toTripItemId}`}
                  style={styles.segmentCard}
                >
                  {/* Segment Header */}
                  <View style={styles.segmentHeader}>
                    <View style={styles.segmentRoute}>
                      <View style={styles.segmentPoint}>
                        <Text style={styles.segmentPointText}>#{from?.order ?? "?"}</Text>
                      </View>
                      <View style={styles.segmentArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#83829A" />
                      </View>
                      <View style={styles.segmentPoint}>
                        <Text style={styles.segmentPointText}>#{to?.order ?? "?"}</Text>
                      </View>
                    </View>
                    {!!from?.day && (
                      <View style={styles.segmentDayBadge}>
                        <Ionicons name="calendar-outline" size={12} color="#2A4D50" />
                        <Text style={styles.segmentDayText}>วันที่ {from.day}</Text>
                      </View>
                    )}
                  </View>

                  {/* Route Names */}
                  <View style={styles.segmentNames}>
                    <Text style={styles.segmentFromName} numberOfLines={1}>{from?.name ?? `#${s.fromTripItemId}`}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#C1C0C8" />
                    <Text style={styles.segmentToName} numberOfLines={1}>{to?.name ?? `#${s.toTripItemId}`}</Text>
                  </View>

                  {/* Segment Stats */}
                  <View style={styles.segmentStats}>
                    <View style={styles.segmentStat}>
                      <MaterialCommunityIcons name="map-marker-distance" size={16} color="#10b981" />
                      <Text style={styles.segmentStatLabel}>ระยะทาง</Text>
                      <Text style={styles.segmentStatValue}>{(s.distanceKm ?? 0).toFixed(2)} กม.</Text>
                    </View>
                    <View style={styles.segmentStatDivider} />
                    <View style={styles.segmentStat}>
                      <Ionicons name="time" size={16} color="#FF7754" />
                      <Text style={styles.segmentStatLabel}>เวลา</Text>
                      <Text style={styles.segmentStatValue}>{s.travelMinutes ?? 0} นาที</Text>
                    </View>
                    <View style={styles.segmentStatDivider} />
                    <View style={styles.segmentStat}>
                      <MaterialCommunityIcons name="car" size={16} color="#7c3aed" />
                      <Text style={styles.segmentStatLabel}>ประเภท</Text>
                      <Text style={styles.segmentStatValue}>{String(s.transportMode ?? "รถยนต์")}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => navigation.navigate("TripMapScreen", { tripId })}
              style={styles.viewMapBtn}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.viewMapBtnText}>ดูแผนที่ทั้งหมด</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#F3F4F8" 
  },
  page: { 
    padding: 20, 
    gap: 16 
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },
  topBarSub: {
    fontSize: 12,
    color: "#83829A",
    marginTop: 2,
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },

  // Date Info
  dateInfo: {
    backgroundColor: "#F3F4F8",
    borderRadius: 16,
    padding: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#83829A",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },

  // Description
  descCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  descHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  descText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#83829A",
  },

  // Loading Banner
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
  },
  loadingBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnMap: {
    backgroundColor: "#7c3aed",
  },
  actionBtnDelete: {
    backgroundColor: "#cc3300",
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Tabs
  tabsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#2A4D50",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#83829A",
  },
  tabTextActive: {
    color: "#fff",
  },

  // Filter
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    borderWidth: 2,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#83829A",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // Empty State
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },
  emptyText: {
    fontSize: 14,
    color: "#83829A",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyActionMap: {
    backgroundColor: "#7c3aed",
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Places List
  itemsList: {
    gap: 12,
  },
  placeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  placeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  placeNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  placeNumberText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  placeName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
  },
  placeBadges: {
    flexDirection: "row",
    gap: 8,
  },
  dayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2A4D50",
  },
  orderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c3aed",
  },
  placeDetails: {
    backgroundColor: "#F3F4F8",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#83829A",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: "#83829A",
    lineHeight: 16,
  },
  placeAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingVertical: 12,
    borderRadius: 12,
  },
  placeActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2A4D50",
  },

  // Segments List
  segmentsList: {
    gap: 12,
  },
  segmentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  segmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segmentRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  segmentPoint: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentPointText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  segmentArrow: {
    width: 24,
    alignItems: "center",
  },
  segmentDayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  segmentDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2A4D50",
  },
  segmentNames: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F8",
    padding: 12,
    borderRadius: 12,
  },
  segmentFromName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
  segmentToName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textAlign: "right",
  },
  segmentStats: {
    flexDirection: "row",
    backgroundColor: "#F3F4F8",
    borderRadius: 12,
    padding: 12,
  },
  segmentStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  segmentStatDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  segmentStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#83829A",
  },
  segmentStatValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
  },
  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 14,
  },
  viewMapBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Loading & Error
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#83829A",
    fontWeight: "600",
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#cc3300",
    textAlign: "center",
    marginTop: 8,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#83829A",
  },
});
