import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const formatTripRangeShort = (start?: string | null, end?: string | null) => {
  // keep it simple: reuse your existing formatter but shorten by splitting
  const s = start ? formatThaiDateTime(start) : "-";
  const e = end ? formatThaiDateTime(end) : "-";
  // If your formatter returns a long string, still OK. This is just a compact line.
  return `${s} • ${e}`;
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
  const [daySelected, setDaySelected] = useState<number>(1); // ✅ day is the primary context
  const [showDetails, setShowDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // ✅ default daySelected = first day that has items (or 1)
  useEffect(() => {
    if (!days.length) return;
    const firstWithItems = itemsSorted.find((x) => x.dayIndex)?.dayIndex ?? 1;
    setDaySelected((prev) => {
      // keep user's selection if still valid
      if (days.includes(prev)) return prev;
      return clamp(firstWithItems, 1, days[days.length - 1]);
    });
  }, [days, itemsSorted]);

  // ---- items by selected day ----
  const itemsForDay = useMemo(() => {
    return itemsSorted.filter((x) => x.dayIndex === daySelected);
  }, [itemsSorted, daySelected]);

  // unique placeIds
  const placeIds = useMemo(
    () => Array.from(new Set(itemsSorted.map((x) => x.placeId))),
    [itemsSorted]
  );

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

  const renderOpeningText = (placeId: number, dayIndex: number) => {
    const dow = getTripDayOfWeek(data?.startDateTime ?? null, dayIndex);
    const list = openingByPlace.get(placeId) ?? [];
    const oh = dow == null ? null : list.find((x) => x.dayOfWeek === dow);

    if (!oh) return "ไม่ระบุ";
    if (oh.isClosed) return "ปิดทำการ";
    return `${toHHMM(oh.openTime)} - ${toHHMM(oh.closeTime)} น.`;
  };

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

  // ---- segments filtered by selected day ----
  const segmentsForDay = useMemo(() => {
    const segs = data?.segments ?? [];
    return segs.filter((s) => (itemById.get(s.fromTripItemId)?.day ?? 0) === daySelected);
  }, [data?.segments, daySelected, itemById]);

  // ---- totals by selected day ----
  const dayTotals = useMemo(() => {
    const segs = segmentsForDay;
    const km = segs.reduce((a, s) => a + (s.distanceKm ?? 0), 0);
    const min = segs.reduce((a, s) => a + (s.travelMinutes ?? 0), 0);
    return { km, min };
  }, [segmentsForDay]);

  // ---- delete (moved to menu) ----
  const handleDelete = () => {
    setMenuOpen(false);
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

  const dayCount = days.length || 1;

  // ---- main ----
  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar (with menu) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#2A4D50" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {data.title || `ทริป #${tripId}`}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {dayCount} วัน • {data.items.length} สถานที่
          </Text>
        </View>

        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#2A4D50" />
        </TouchableOpacity>
      </View>

      {/* Sticky Day Tabs + Main Tabs */}
      <View style={styles.stickyTop}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabs}
        >
          {days.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDaySelected(d)}
              style={[styles.dayTab, daySelected === d && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, daySelected === d && styles.dayTabTextActive]}>
                วัน {d}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabsCard}>
          <TouchableOpacity
            onPress={() => setTab("items")}
            style={[styles.tab, tab === "items" && styles.tabActive]}
          >
            <Ionicons name="location" size={18} color={tab === "items" ? "#fff" : "#83829A"} />
            <Text style={[styles.tabText, tab === "items" && styles.tabTextActive]}>
              สถานที่
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("segments")}
            style={[styles.tab, tab === "segments" && styles.tabActive]}
          >
            <MaterialCommunityIcons
              name="routes"
              size={18}
              color={tab === "segments" ? "#fff" : "#83829A"}
            />
            <Text style={[styles.tabText, tab === "segments" && styles.tabTextActive]}>
              การเดินทาง
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 16 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card (compact) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="map" size={20} color="#2A4D50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle} numberOfLines={2}>
                {data.title}
              </Text>
              <Text style={styles.summaryRange} numberOfLines={1}>
                {formatTripRangeShort(data.startDateTime ?? null, data.endDateTime ?? null)}
              </Text>
            </View>
          </View>

          {!!data.description && (
            <TouchableOpacity onPress={() => setShowDetails((v) => !v)} style={styles.detailsToggle}>
              <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={18} color="#2A4D50" />
              <Text style={styles.detailsToggleText}>
                {showDetails ? "ซ่อนรายละเอียดทริป" : "ดูรายละเอียดทริป"}
              </Text>
            </TouchableOpacity>
          )}

          {showDetails && (
            <View style={styles.detailsBox}>
              {!!data.description && <Text style={styles.detailsText}>{data.description}</Text>}

              <View style={styles.detailsRow}>
                <Ionicons name="calendar" size={16} color="#10b981" />
                <Text style={styles.detailsRowText}>
                  เริ่ม: {formatThaiDateTime(data.startDateTime ?? "")}
                </Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="calendar-outline" size={16} color="#FF7754" />
                <Text style={styles.detailsRowText}>
                  จบ: {formatThaiDateTime(data.endDateTime ?? "")}
                </Text>
              </View>
            </View>
          )}

          {isPlacesLoading && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color="#2A4D50" />
              <Text style={styles.loadingBannerText}>กำลังโหลดชื่อสถานที่...</Text>
            </View>
          )}
        </View>

        {/* Primary CTA (single hero action for "ดูแผน") */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("TripMapScreen", { tripId, dayIndex: daySelected })}
            style={styles.primaryCta}
          >
            <Ionicons name="map" size={18} color="#fff" />
            <Text style={styles.primaryCtaText}>เปิดแผนที่วันนี้ (วัน {daySelected})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("TripPlannerScreen", { tripId })}
            style={styles.secondaryCta}
          >
            <Ionicons name="create-outline" size={18} color="#2A4D50" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        {tab === "items" ? (
          data.items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={64} color="#C1C0C8" />
              </View>
              <Text style={styles.emptyTitle}>ยังไม่มีสถานที่ในทริป</Text>
              <Text style={styles.emptyText}>เพิ่มสถานที่เพื่อเริ่มวางแผนการเดินทาง</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("TripPlannerScreen", { tripId })}
                style={styles.emptyAction}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.emptyActionText}>ไปหน้าวางแผน</Text>
              </TouchableOpacity>
            </View>
          ) : itemsForDay.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={64} color="#C1C0C8" />
              </View>
              <Text style={styles.emptyTitle}>วัน {daySelected} ยังไม่มีสถานที่</Text>
              <Text style={styles.emptyText}>เพิ่มสถานที่ในวันนี้จากหน้าวางแผน</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("TripPlannerScreen", { tripId })}
                style={styles.emptyAction}
              >
                <Ionicons name="create" size={18} color="#fff" />
                <Text style={styles.emptyActionText}>ไปหน้าวางแผน</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timeline}>
              {itemsForDay.map((it, idx) => {
                const p: any = placeMap.get(it.placeId);
                const name = p?.name ?? `Place #${it.placeId}`;
                const openText = renderOpeningText(it.placeId, it.dayIndex);
                const visitText = p?.avgVisitMinutes ? `${p.avgVisitMinutes} นาที` : "60 นาที";

                // Timeline connectors
                const isLast = idx === itemsForDay.length - 1;

                return (
                  <View key={it.tripItemId} style={styles.timelineRow}>
                    {/* Left rail */}
                    <View style={styles.rail}>
                      <View style={styles.railDot}>
                        <Text style={styles.railDotText}>{it.orderIndex ?? idx + 1}</Text>
                      </View>
                      {!isLast && <View style={styles.railLine} />}
                    </View>

                    {/* Card (tap whole card) */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() =>
                        navigation.navigate("PlaceUserDetailScreen", { placeId: it.placeId })
                      }
                      style={styles.placeCardNew}
                    >
                      <Text style={styles.placeNameNew} numberOfLines={2}>
                        {name}
                      </Text>

                      <View style={styles.metricsRow}>
                        <View style={styles.metricPill}>
                          <Ionicons name="time-outline" size={14} color="#10b981" />
                          <Text style={styles.metricText} numberOfLines={1}>
                            {openText}
                          </Text>
                        </View>

                        <View style={styles.metricPill}>
                          <Ionicons name="hourglass-outline" size={14} color="#FF7754" />
                          <Text style={styles.metricText} numberOfLines={1}>
                            {visitText}
                          </Text>
                        </View>
                      </View>

                      {!!p?.address && (
                        <Text style={styles.addressNew} numberOfLines={1}>
                          {p.address}
                        </Text>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterText}>ดูรายละเอียด</Text>
                        <Ionicons name="chevron-forward" size={16} color="#2A4D50" />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          <>
            {/* Day summary */}
            <View style={styles.daySummary}>
              <View style={styles.daySummaryLeft}>
                <MaterialCommunityIcons name="routes" size={18} color="#2A4D50" />
                <Text style={styles.daySummaryTitle}>สรุปการเดินทาง • วัน {daySelected}</Text>
              </View>
              <View style={styles.daySummaryStats}>
                <View style={styles.daySummaryStat}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={16}
                    color="#10b981"
                  />
                  <Text style={styles.daySummaryValue}>{dayTotals.km.toFixed(1)} กม.</Text>
                </View>
                <View style={styles.daySummaryDivider} />
                <View style={styles.daySummaryStat}>
                  <Ionicons name="time" size={16} color="#FF7754" />
                  <Text style={styles.daySummaryValue}>{dayTotals.min} นาที</Text>
                </View>
              </View>
            </View>

            {data.segments.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons name="routes" size={64} color="#C1C0C8" />
                </View>
                <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลเส้นทาง</Text>
                <Text style={styles.emptyText}>เส้นทางจะถูกสร้างเมื่อมีสถานที่อย่างน้อย 2 จุด</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("TripMapScreen", { tripId })}
                  style={[styles.emptyAction, styles.emptyActionMap]}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.emptyActionText}>ไปหน้าแผนที่</Text>
                </TouchableOpacity>
              </View>
            ) : segmentsForDay.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="navigate-outline" size={64} color="#C1C0C8" />
                </View>
                <Text style={styles.emptyTitle}>วัน {daySelected} ไม่มีเส้นทาง</Text>
                <Text style={styles.emptyText}>ลองคำนวณเส้นทางจากหน้าแผนที่</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("TripMapScreen", { tripId, dayIndex: daySelected })}
                  style={[styles.emptyAction, styles.emptyActionMap]}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.emptyActionText}>เปิดแผนที่วันนี้</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.segmentsList}>
                {segmentsForDay.map((s) => {
                  const from = itemById.get(s.fromTripItemId);
                  const to = itemById.get(s.toTripItemId);

                  const distanceText = `${(s.distanceKm ?? 0).toFixed(2)} กม.`;
                  const timeText = `${s.travelMinutes ?? 0} นาที`;
                  const modeText = String(s.transportMode ?? "รถยนต์");

                  return (
                    <View
                      key={s.tripSegmentId ?? `${s.fromTripItemId}-${s.toTripItemId}`}
                      style={styles.segmentCardNew}
                    >
                      <View style={styles.segmentTop}>
                        <View style={styles.segmentBadge}>
                          <Text style={styles.segmentBadgeText}>
                            #{from?.order ?? "?"} → #{to?.order ?? "?"}
                          </Text>
                        </View>
                        <Text style={styles.segmentTopRight}>
                          {distanceText} • {timeText}
                        </Text>
                      </View>

                      <View style={styles.segmentNamesNew}>
                        <Text style={styles.segmentNameLeft} numberOfLines={1}>
                          {from?.name ?? `#${s.fromTripItemId}`}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#C1C0C8" />
                        <Text style={styles.segmentNameRight} numberOfLines={1}>
                          {to?.name ?? `#${s.toTripItemId}`}
                        </Text>
                      </View>

                      <Text style={styles.segmentMode}>ประเภท: {modeText}</Text>
                    </View>
                  );
                })}

                <TouchableOpacity
                  onPress={() => navigation.navigate("TripMapScreen", { tripId, dayIndex: daySelected })}
                  style={styles.viewMapBtn}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.viewMapBtnText}>เปิดแผนที่วันนี้</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Menu Modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <View />
        </Pressable>

        <View style={[styles.menuSheet, { bottom: 16 + insets.bottom }]}>
          <Text style={styles.menuTitle}>ตัวเลือก</Text>

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("TripPlannerScreen", { tripId });
            }}
            style={styles.menuItem}
          >
            <Ionicons name="create-outline" size={18} color="#2A4D50" />
            <Text style={styles.menuItemText}>แก้ไขแผน</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("TripMapScreen", { tripId });
            }}
            style={styles.menuItem}
          >
            <Ionicons name="map-outline" size={18} color="#2A4D50" />
            <Text style={styles.menuItemText}>เปิดแผนที่ทริป</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={[styles.menuItem, styles.menuItemDanger, isDeleting && { opacity: 0.6 }]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#cc3300" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#cc3300" />
            )}
            <Text style={styles.menuItemDangerText}>ลบทริป</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F8" },

  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#000" },
  subtitle: { fontSize: 12, color: "#83829A", marginTop: 2, fontWeight: "600" },

  // Sticky top area
  stickyTop: {
    backgroundColor: "#F3F4F8",
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dayTabs: { paddingHorizontal: 16, gap: 8 },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayTabActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  dayTabText: { fontSize: 13, fontWeight: "800", color: "#475569" },
  dayTabTextActive: { color: "#fff" },

  // Tabs
  tabsCard: {
    flexDirection: "row",
    marginTop: 10,
    marginHorizontal: 16,
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
  tabActive: { backgroundColor: "#2A4D50" },
  tabText: { fontSize: 14, fontWeight: "900", color: "#83829A" },
  tabTextActive: { color: "#fff" },

  // Page
  page: { padding: 16, gap: 12 },

  // Summary card (compact)
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  summaryTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
  summaryRange: { fontSize: 12, fontWeight: "700", color: "#64748b", marginTop: 4 },

  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  detailsToggleText: { fontSize: 13, fontWeight: "800", color: "#2A4D50" },
  detailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  detailsText: { fontSize: 13, color: "#0f172a", lineHeight: 18 },
  detailsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailsRowText: { fontSize: 12, color: "#475569", fontWeight: "700" },

  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
  },
  loadingBannerText: { fontSize: 13, fontWeight: "700", color: "#2563eb" },

  // CTA
  ctaRow: { flexDirection: "row", gap: 10 },
  primaryCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed", // map vibe
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryCtaText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  secondaryCta: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  // Timeline
  timeline: { gap: 12 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  rail: { width: 28, alignItems: "center" },
  railDot: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  railDotText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#d1d5db",
    marginTop: 8,
    borderRadius: 2,
  },

  placeCardNew: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  placeNameNew: { fontSize: 16, fontWeight: "900", color: "#000" },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metricText: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  addressNew: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  cardFooter: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  cardFooterText: { fontSize: 13, fontWeight: "900", color: "#2A4D50" },

  // Day summary (segments)
  daySummary: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  daySummaryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  daySummaryTitle: { fontSize: 14, fontWeight: "900", color: "#000" },
  daySummaryStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    padding: 12,
  },
  daySummaryStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  daySummaryDivider: { width: 1, height: 18, backgroundColor: "#e5e7eb" },
  daySummaryValue: { fontSize: 13, fontWeight: "900", color: "#000" },

  // Segments list
  segmentsList: { gap: 12 },
  segmentCardNew: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  segmentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segmentBadge: { backgroundColor: "#F3F4F8", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  segmentBadgeText: { fontSize: 12, fontWeight: "900", color: "#2A4D50" },
  segmentTopRight: { fontSize: 12, fontWeight: "900", color: "#0f172a" },
  segmentNamesNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  segmentNameLeft: { flex: 1, fontSize: 13, fontWeight: "900", color: "#000" },
  segmentNameRight: { flex: 1, fontSize: 13, fontWeight: "900", color: "#475569", textAlign: "right" },
  segmentMode: { fontSize: 12, fontWeight: "800", color: "#64748b" },

  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 16,
  },
  viewMapBtnText: { fontSize: 14, fontWeight: "900", color: "#fff" },

  // Empty state
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#000", textAlign: "center" },
  emptyText: { fontSize: 14, color: "#83829A", textAlign: "center", lineHeight: 20 },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 6,
  },
  emptyActionMap: { backgroundColor: "#7c3aed" },
  emptyActionText: { fontSize: 14, fontWeight: "900", color: "#fff" },

  // Loading & Error
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  loadingText: { fontSize: 14, color: "#83829A", fontWeight: "700" },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: "900", color: "#000", textAlign: "center" },
  errorText: { fontSize: 14, color: "#cc3300", textAlign: "center", marginTop: 8 },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: "900", color: "#83829A" },

  // Menu modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  menuSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    gap: 10,
  },
  menuTitle: { fontSize: 14, fontWeight: "900", color: "#000", marginBottom: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuItemText: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  menuDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 4 },
  menuItemDanger: {
    backgroundColor: "#FFF1F2",
    borderColor: "#fecdd3",
  },
  menuItemDangerText: { fontSize: 14, fontWeight: "900", color: "#cc3300" },
});
