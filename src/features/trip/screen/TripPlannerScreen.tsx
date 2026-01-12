// src/screens/TripPlannerScreen.tsx
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  useGetTripDetailQuery,
  useDeleteTripItemMutation,
  useReorderTripItemsMutation,
  useGetTripSegmentsQuery,
} from "../tripApi";

import { usePlacesByIds } from "../hooks/usePlacesByIds";
import type { TripDetailDto, TripItemDto, TripSegmentDto } from "../tripTypes";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto } from "../../placeOpening/placetype";

// -------------------- types --------------------
type PlaceLite = {
  placeId: number;
  name: string;
  avgVisitMinutes?: number | null;
};

type TimelineRowStatus =
  | "ok"
  | "arrive_before_open"
  | "arrive_after_close"
  | "stay_exceed_close"
  | "closed"
  | "exceed_trip_end";

type TimelineRow = {
  tripItemId: number;
  placeId: number;
  name: string;

  arriveAt: Date;
  departAt: Date;

  stayMinutes: number;
  travelFromPrevMinutes: number;

  openAt?: Date;
  closeAt?: Date;

  isClosed?: boolean;
  status: TimelineRowStatus;

  exceedTripEndMinutes?: number;
};

// -------------------- helpers --------------------
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const toHHMM = (t?: string | null) => {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length < 2) return null;
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  return `${hh}:${mm}`;
};

const hhmmFromDateTime = (dt?: string | null, fallback = "09:00") => {
  if (!dt) return fallback;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return fallback;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const atDayTime = (day: Date, hhmm: string) => {
  const [hh, mm] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(day);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
};

const fmtHHMM = (d: Date) =>
  d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

const safeTripResult = (d: any) => d?.result ?? d;

const sortItems = (trip?: TripDetailDto) =>
  (trip?.items ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.dayIndex ?? 1) - (b.dayIndex ?? 1) ||
        (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

const swapReorderPayload = (items: TripItemDto[], idx: number, swapIdx: number) => {
  const reordered = items.slice();
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  return reordered.map((it, i) => ({ tripItemId: it.tripItemId, orderIndex: i + 1 }));
};

const dayOfWeekFromTripDay = (tripStart?: string | null, dayIndex?: number | null) => {
  if (!tripStart) return null;
  const start = new Date(tripStart);
  if (Number.isNaN(start.getTime())) return null;

  const offset = Math.max((dayIndex ?? 1) - 1, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + offset);
  return d.getDay();
};

const getOpeningForTripDay = (
  openingByPlace: Map<number, OpeningHourDto[]>,
  placeId: number,
  tripStart: string | null | undefined,
  dayIndex: number
) => {
  const dow = dayOfWeekFromTripDay(tripStart, dayIndex);
  if (dow == null) return null;
  const list = openingByPlace.get(placeId) ?? [];
  return list.find((x) => x.dayOfWeek === dow) ?? null;
};

// -------------------- timeline builder --------------------
function buildTimeline(params: {
  dayBaseDate: Date;
  startTimeHHMM: string;
  tripStart?: string | null;
  tripEndAt?: Date | null;

  items: TripItemDto[];
  places: Map<number, PlaceLite>;
  segments?: TripSegmentDto[];
  openingByPlace: Map<number, OpeningHourDto[]>;
}) {
  const {
    dayBaseDate,
    startTimeHHMM,
    tripStart,
    tripEndAt,
    items,
    places,
    segments = [],
    openingByPlace,
  } = params;

  const segMap = new Map<string, TripSegmentDto>();
  for (const s of segments) segMap.set(`${s.fromTripItemId}->${s.toTripItemId}`, s);

  const startAt = atDayTime(dayBaseDate, startTimeHHMM);
  let cursor = new Date(startAt);

  const rows: TimelineRow[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const p = places.get(it.placeId);

    const prev = items[i - 1];
    let travelMin = 0;
    if (prev) {
      const seg = segMap.get(`${prev.tripItemId}->${it.tripItemId}`);
      travelMin = seg?.travelMinutes ?? 0;
      cursor = new Date(cursor.getTime() + travelMin * 60_000);
    }

    const arriveAt = new Date(cursor);
    const stayMinutes = Math.max(10, p?.avgVisitMinutes ?? 60);
    const departAt = new Date(arriveAt.getTime() + stayMinutes * 60_000);

    const oh = getOpeningForTripDay(openingByPlace, it.placeId, tripStart, it.dayIndex);
    const isClosed = Boolean(oh?.isClosed);

    const openHHMM = toHHMM(oh?.openTime ?? null);
    const closeHHMM = toHHMM(oh?.closeTime ?? null);

    const openAt = !isClosed && openHHMM ? atDayTime(dayBaseDate, openHHMM) : undefined;
    let closeAt = !isClosed && closeHHMM ? atDayTime(dayBaseDate, closeHHMM) : undefined;

    if (openAt && closeAt && closeAt < openAt) {
      closeAt = new Date(closeAt);
      closeAt.setDate(closeAt.getDate() + 1);
    }

    let status: TimelineRowStatus = "ok";

    if (isClosed) {
      status = "closed";
    } else {
      if (openAt && arriveAt < openAt) status = "arrive_before_open";
      if (closeAt && arriveAt > closeAt) status = "arrive_after_close";
      if (closeAt && arriveAt <= closeAt && departAt > closeAt) status = "stay_exceed_close";
    }

    let exceedTripEndMinutes: number | undefined;
    if (tripEndAt) {
      const diffMs = departAt.getTime() - tripEndAt.getTime();
      if (diffMs > 0) exceedTripEndMinutes = Math.ceil(diffMs / 60_000);
    }

    if (!isClosed && tripEndAt && departAt > tripEndAt) {
      status = "exceed_trip_end";
    }

    rows.push({
      tripItemId: it.tripItemId,
      placeId: it.placeId,
      name: p?.name ?? `Place #${it.placeId}`,
      arriveAt,
      departAt,
      stayMinutes,
      travelFromPrevMinutes: travelMin,
      openAt,
      closeAt,
      isClosed,
      status,
      exceedTripEndMinutes,
    });

    cursor = new Date(departAt);
  }

  return {
    rows,
    totalStay: rows.reduce((a, r) => a + r.stayMinutes, 0),
    totalTravel: rows.reduce((a, r) => a + r.travelFromPrevMinutes, 0),
    startAt,
  };
}

// -------------------- screen --------------------
type RouteParams = { tripId: number };

export default function TripPlannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId } = (route.params ?? {}) as RouteParams;

  const baseSkip = !Number.isFinite(tripId) || tripId <= 0;

  const { data, isLoading, isError, error, refetch } = useGetTripDetailQuery(tripId, {
    skip: baseSkip,
  });

  const trip = safeTripResult(data) as TripDetailDto | undefined;

  const [removeTripItem, { isLoading: isRemoving }] = useDeleteTripItemMutation();
  const [reorderTripItems, { isLoading: isReordering }] = useReorderTripItemsMutation();

  const itemsSorted = useMemo(() => sortItems(trip), [trip]);

  const maxDay = useMemo(
    () =>
      itemsSorted.length ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1)) : 1,
    [itemsSorted]
  );

  const [selectedDay, setSelectedDay] = useState(1);
  const [showTimeline, setShowTimeline] = useState(true);
  
  useEffect(() => setSelectedDay((d) => clamp(d, 1, maxDay)), [maxDay]);

  const dayItems = useMemo(
    () => itemsSorted.filter((x) => x.dayIndex === selectedDay),
    [itemsSorted, selectedDay]
  );

  const placeIds = useMemo(
    () => Array.from(new Set(dayItems.map((x) => x.placeId))),
    [dayItems]
  );

  const { map: placeMapRaw, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  const placeMap = useMemo(() => {
    const m = new Map<number, PlaceLite>();
    for (const [pid, p] of placeMapRaw.entries()) {
      m.set(pid, {
        placeId: pid,
        name: (p as any)?.name ?? `Place #${pid}`,
        avgVisitMinutes: (p as any)?.avgVisitMinutes ?? null,
      });
    }
    return m;
  }, [placeMapRaw]);

  const dayBaseDate = useMemo(() => {
    const base = trip?.startDateTime ? new Date(trip.startDateTime) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (selectedDay - 1));
    return base;
  }, [selectedDay, trip?.startDateTime]);

  const startTimeHHMM = useMemo(
    () => hhmmFromDateTime(trip?.startDateTime ?? null, "09:00"),
    [trip?.startDateTime]
  );

  const tripEndAt = useMemo(() => {
    if (!trip?.endDateTime) return null;
    const end = new Date(trip.endDateTime);
    return Number.isNaN(end.getTime()) ? null : end;
  }, [trip?.endDateTime]);

  const { data: segments = [] } = useGetTripSegmentsQuery(
    { tripId, dayIndex: selectedDay },
    { skip: baseSkip }
  );

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

      const needFetch = placeIds.filter((pid) => !openingByPlace.has(pid));
      if (!needFetch.length) return;

      const results: Array<readonly [number, OpeningHourDto[]]> = await Promise.all(
        needFetch.map(async (pid) => {
          try {
            const list = await triggerOpening(pid, true).unwrap();
            return [pid, list] as const;
          } catch {
            return [pid, [] as OpeningHourDto[]] as const;
          }
        })
      );

      if (cancelled) return;

      setOpeningByPlace((prev) => {
        const next = new Map(prev);
        for (const [pid, list] of results) next.set(pid, list);
        return next;
      });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placeIds, triggerOpening]);

  const timeline = useMemo(
    () =>
      buildTimeline({
        dayBaseDate,
        startTimeHHMM,
        tripStart: trip?.startDateTime ?? null,
        tripEndAt,
        items: dayItems,
        places: placeMap,
        segments,
        openingByPlace,
      }),
    [dayBaseDate, startTimeHHMM, trip?.startDateTime, tripEndAt, dayItems, placeMap, segments, openingByPlace]
  );

  const overTripEndMinutes = useMemo(() => {
    if (!tripEndAt || timeline.rows.length === 0) return 0;
    const last = timeline.rows[timeline.rows.length - 1];
    const diffMs = last.departAt.getTime() - tripEndAt.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 60_000) : 0;
  }, [timeline.rows, tripEndAt]);

  // actions
  const handleRemove = async (tripItemId: number, placeName: string) => {
    Alert.alert(
      "ยืนยันการลบ", 
      `ต้องการลบ "${placeName}" ออกจากทริปใช่ไหม?`, 
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await removeTripItem({ tripId, tripItemId }).unwrap();
            } catch (e: any) {
              Alert.alert("ผิดพลาด", e?.data?.errorMessages?.[0] ?? "ลบไม่สำเร็จ");
            }
          },
        },
      ]
    );
  };

  const handleMove = async (tripItemId: number, dir: "up" | "down") => {
    const idx = dayItems.findIndex((x) => x.tripItemId === tripItemId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= dayItems.length) return;

    try {
      await reorderTripItems({
        tripId,
        body: { dayIndex: selectedDay, items: swapReorderPayload(dayItems, idx, swapIdx) },
      }).unwrap();
    } catch (e: any) {
      Alert.alert("ผิดพลาด", e?.data?.errorMessages?.[0] ?? "จัดลำดับไม่สำเร็จ");
    }
  };

  // renders
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2A4D50" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={64} color="#cc3300" />
          </View>
          <Text style={styles.errorTitle}>โหลดทริปไม่สำเร็จ</Text>
          <Text style={styles.errorText}>{(error as any)?.data?.errorMessages?.[0] ?? "เกิดข้อผิดพลาด"}</Text>

          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color="#83829A" />
              <Text style={styles.btnSecondaryText}>กลับ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => refetch()}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>ลองใหม่</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="file-tray-outline" size={64} color="#C1C0C8" />
          </View>
          <Text style={styles.errorTitle}>ไม่พบทริป</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#83829A" />
            <Text style={styles.btnSecondaryText}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openingText = (placeId: number) => {
    const oh = getOpeningForTripDay(openingByPlace, placeId, trip.startDateTime ?? null, selectedDay);
    if (!oh) return "ไม่มีข้อมูลเวลาเปิด-ปิด";
    if (oh.isClosed) return "ปิดทำการ";
    return `${toHHMM(oh.openTime) ?? "-"} - ${toHHMM(oh.closeTime) ?? "-"} น.`;
  };

  const statusLabel = (r: TimelineRow) => {
    if (r.status === "ok") return null;

    if (r.status === "exceed_trip_end") {
      return { text: `เกิน ${r.exceedTripEndMinutes ?? 0} นาที`, tone: "danger" as const, icon: "warning" as const };
    }

    if (r.status === "arrive_before_open") return { text: "ถึงก่อนเปิด", tone: "warn" as const, icon: "time-outline" as const };
    if (r.status === "arrive_after_close") return { text: "ปิดแล้ว", tone: "danger" as const, icon: "close-circle" as const };
    if (r.status === "stay_exceed_close") return { text: "เกินเวลาปิด", tone: "danger" as const, icon: "alert-circle" as const };
    return { text: "ปิดทำการ", tone: "muted" as const, icon: "moon" as const };
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2A4D50" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>วางแผนทริป</Text>
          <Text style={styles.topBarSub}>{trip.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("TripMapScreen", { tripId })}
        >
          <Ionicons name="map" size={20} color="#2A4D50" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {/* Helper Card */}
        <View style={styles.helperCard}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.helperTitle}>วิธีใช้งาน</Text>
            <Text style={styles.helperText}>
              • กดปุ่ม ↑ ↓ เพื่อเปลี่ยนลำดับ{'\n'}
              • กด <Ionicons name="trash-outline" size={12} /> เพื่อลบออก{'\n'}
              • กด "เพิ่ม" เพื่อเพิ่มสถานที่
            </Text>
          </View>
        </View>

        {/* Trip Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBadge}>
              <Ionicons name="calendar" size={20} color="#2A4D50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>ช่วงเวลาทริป</Text>
              <Text style={styles.infoValue}>
                {fmtHHMM(new Date(trip.startDateTime))} - {tripEndAt ? fmtHHMM(tripEndAt) : "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="today" size={20} color="#2A4D50" />
            <Text style={styles.cardTitle}>เลือกวันที่</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
            {Array.from({ length: Math.max(maxDay, 1) }, (_, i) => {
              const d = i + 1;
              const active = d === selectedDay;
              const count = itemsSorted.filter((x) => x.dayIndex === d).length;

              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <View>
                    <Text style={[styles.dayChipDay, active && styles.dayChipDayActive]}>วันที่ {d}</Text>
                    <Text style={[styles.dayChipCount, active && styles.dayChipCountActive]}>{count} สถานที่</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Places List */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={20} color="#2A4D50" />
              <Text style={styles.cardTitle}>รายการสถานที่</Text>
            </View>

            <TouchableOpacity
              style={styles.btnAdd}
              onPress={() => navigation.navigate("PlaceList")}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.btnAddText}>เพิ่ม</Text>
            </TouchableOpacity>
          </View>

          {dayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={48} color="#C1C0C8" />
              </View>
              <Text style={styles.emptyTitle}>ยังไม่มีสถานที่</Text>
              <Text style={styles.emptyText}>เพิ่มสถานที่เพื่อเริ่มวางแผน</Text>
              <TouchableOpacity
                style={styles.btnEmptyAction}
                onPress={() => navigation.navigate("PlaceList")}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2A4D50" />
                <Text style={styles.btnEmptyActionText}>เพิ่มสถานที่แรก</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placesList}>
              {dayItems.map((it, idx) => {
                const p = placeMap.get(it.placeId);
                const name = p?.name ?? `Place #${it.placeId}`;
                const isFirst = idx === 0;
                const isLast = idx === dayItems.length - 1;

                return (
                  <View key={it.tripItemId} style={[styles.placeCard, (isRemoving || isReordering) && styles.placeCardDisabled]}>
                    {/* Header with Number */}
                    <View style={styles.placeCardHeader}>
                      <View style={styles.placeNumber}>
                        <Text style={styles.placeNumberText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.placeName} numberOfLines={2}>{name}</Text>
                        <View style={styles.placeMetaRow}>
                          <Ionicons name="time" size={14} color="#FF7754" />
                          <Text style={styles.placeMeta}>{p?.avgVisitMinutes ?? 60} นาที</Text>
                        </View>
                      </View>
                      
                      {/* Quick Info Button */}
                      <TouchableOpacity
                        onPress={() => navigation.navigate("PlaceUserDetailScreen", { placeId: it.placeId })}
                        style={styles.quickInfoBtn}
                      >
                        <Ionicons name="information-circle" size={20} color="#2A4D50" />
                      </TouchableOpacity>
                    </View>

                    {/* Opening Hours */}
                    <View style={styles.openingHoursChip}>
                      <Ionicons name="business" size={14} color="#83829A" />
                      <Text style={styles.openingHoursText}>{openingText(it.placeId)}</Text>
                    </View>

                    {/* Large Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => handleMove(it.tripItemId, "up")}
                        disabled={isFirst || isReordering || isRemoving}
                        style={[styles.actionBtn, styles.actionBtnUp, (isFirst || isReordering || isRemoving) && styles.actionBtnDisabled]}
                      >
                        <Ionicons name="arrow-up" size={20} color={isFirst ? "#C1C0C8" : "#fff"} />
                        <Text style={[styles.actionBtnText, (isFirst || isReordering || isRemoving) && styles.actionBtnTextDisabled]}>
                          ขึ้น
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleMove(it.tripItemId, "down")}
                        disabled={isLast || isReordering || isRemoving}
                        style={[styles.actionBtn, styles.actionBtnDown, (isLast || isReordering || isRemoving) && styles.actionBtnDisabled]}
                      >
                        <Ionicons name="arrow-down" size={20} color={isLast ? "#C1C0C8" : "#fff"} />
                        <Text style={[styles.actionBtnText, (isLast || isReordering || isRemoving) && styles.actionBtnTextDisabled]}>
                          ลง
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemove(it.tripItemId, name)}
                        disabled={isRemoving || isReordering}
                        style={[styles.actionBtn, styles.actionBtnDelete, (isRemoving || isReordering) && styles.actionBtnDisabled]}
                      >
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>ลบ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {(isRemoving || isReordering) && (
            <View style={styles.processingBanner}>
              <ActivityIndicator size="small" color="#2A4D50" />
              <Text style={styles.processingText}>
                {isRemoving ? "กำลังลบ..." : "กำลังจัดลำดับ..."}
              </Text>
            </View>
          )}
        </View>

        {/* Timeline Toggle */}
        {timeline.rows.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowTimeline(!showTimeline)}
            style={styles.timelineToggle}
          >
            <Ionicons name="time" size={20} color="#2A4D50" />
            <Text style={styles.timelineToggleText}>
              {showTimeline ? "ซ่อนตารางเวลา" : "แสดงตารางเวลา"}
            </Text>
            <Ionicons name={showTimeline ? "chevron-up" : "chevron-down"} size={20} color="#2A4D50" />
          </TouchableOpacity>
        )}

        {/* Timeline */}
        {showTimeline && timeline.rows.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color="#2A4D50" />
              <Text style={styles.cardTitle}>ตารางเวลา</Text>
            </View>

            {/* Summary Stats */}
            <View style={styles.timelineStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="car" size={18} color="#2A4D50" />
                <Text style={styles.statValue}>{timeline.totalTravel}</Text>
                <Text style={styles.statLabel}>นาที เดินทาง</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="location" size={18} color="#FF7754" />
                <Text style={styles.statValue}>{timeline.totalStay}</Text>
                <Text style={styles.statLabel}>นาที เที่ยว</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="hourglass" size={18} color="#7c3aed" />
                <Text style={styles.statValue}>
                  {Math.floor((timeline.totalStay + timeline.totalTravel) / 60)}:{((timeline.totalStay + timeline.totalTravel) % 60).toString().padStart(2, "0")}
                </Text>
                <Text style={styles.statLabel}>รวมทั้งหมด</Text>
              </View>
            </View>

            <View style={styles.timeline}>
              {/* Start */}
              <View style={styles.timelineStart}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineStartContent}>
                  <Ionicons name="flag" size={18} color="#10b981" />
                  <Text style={styles.timelineStartText}>เริ่ม {fmtHHMM(timeline.startAt)} น.</Text>
                </View>
              </View>

              {/* Items */}
              {timeline.rows.map((r, idx) => {
                const warn = statusLabel(r);

                return (
                  <View key={r.tripItemId}>
                    {/* Travel */}
                    {idx > 0 && r.travelFromPrevMinutes > 0 && (
                      <View style={styles.travelSegment}>
                        <View style={styles.timelineLine} />
                        <View style={styles.travelContent}>
                          <MaterialCommunityIcons name="car" size={16} color="#2563eb" />
                          <Text style={styles.travelText}>{r.travelFromPrevMinutes} นาที</Text>
                        </View>
                      </View>
                    )}

                    {/* Place */}
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineLine} />
                      <View style={styles.timelineMarker}>
                        <Text style={styles.timelineMarkerText}>{idx + 1}</Text>
                      </View>

                      <View style={[
                        styles.timelineItemCard,
                        warn?.tone === "warn" && styles.timelineItemWarn,
                        warn?.tone === "danger" && styles.timelineItemDanger,
                      ]}>
                        <Text style={styles.timelineItemName} numberOfLines={1}>{r.name}</Text>
                        
                        {warn && (
                          <View style={[styles.warningBadge, warn.tone === "danger" && styles.warningBadgeDanger]}>
                            <Ionicons name={warn.icon} size={12} color="#fff" />
                            <Text style={styles.warningBadgeText}>{warn.text}</Text>
                          </View>
                        )}

                        <View style={styles.timelineItemDetails}>
                          <Text style={styles.timeDetailText}>
                            ⏱ ถึง {fmtHHMM(r.arriveAt)} • ออก {fmtHHMM(r.departAt)} • พัก {r.stayMinutes} นาที
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* End */}
              <View style={styles.timelineEnd}>
                <View style={styles.timelineEndDot} />
                <View style={[styles.timelineEndContent, overTripEndMinutes > 0 && styles.timelineEndContentDanger]}>
                  <Ionicons name="checkmark-circle" size={18} color={overTripEndMinutes > 0 ? "#cc3300" : "#2A4D50"} />
                  <Text style={styles.timelineEndText}>
                    สิ้นสุด {fmtHHMM(timeline.rows[timeline.rows.length - 1].departAt)}
                    {overTripEndMinutes > 0 && ` (เกิน ${overTripEndMinutes} นาที)`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------- styles --------------------
const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#F3F4F8" 
  },
  page: { 
    padding: 20, 
    gap: 16,
    paddingBottom: 40,
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  // Helper Card
  helperCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e40af",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#83829A",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },

  // Day Chips
  dayChips: {
    flexDirection: "row",
    gap: 10,
  },
  dayChip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F3F4F8",
    borderWidth: 3,
    borderColor: "transparent",
    minWidth: 120,
  },
  dayChipActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  dayChipDay: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  dayChipDayActive: {
    color: "#fff",
  },
  dayChipCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#83829A",
  },
  dayChipCountActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },

  // Buttons
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnAddText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#83829A",
  },
  btnEmptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2A4D50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  btnEmptyActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A4D50",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
  emptyText: {
    fontSize: 13,
    color: "#83829A",
    textAlign: "center",
  },

  // Places List
  placesList: {
    gap: 16,
  },
  placeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  placeCardDisabled: {
    opacity: 0.6,
  },
  placeCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  placeNumber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  placeNumberText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
  },
  placeName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    marginBottom: 6,
  },
  placeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  placeMeta: {
    fontSize: 13,
    color: "#83829A",
    fontWeight: "600",
  },
  quickInfoBtn: {
    padding: 8,
  },
  openingHoursChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  openingHoursText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  // Large Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnUp: {
    backgroundColor: "#2A4D50",
  },
  actionBtnDown: {
    backgroundColor: "#7c3aed",
  },
  actionBtnDelete: {
    backgroundColor: "#cc3300",
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  actionBtnTextDisabled: {
    color: "#C1C0C8",
  },

  // Processing Banner
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
  },
  processingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A4D50",
  },

  // Timeline Toggle
  timelineToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineToggleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2A4D50",
  },

  // Timeline Stats
  timelineStats: {
    flexDirection: "row",
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#83829A",
    textAlign: "center",
  },

  // Timeline
  timeline: {
    paddingLeft: 8,
  },
  timelineLine: {
    position: "absolute",
    left: 17,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#e5e7eb",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 3,
    borderColor: "#fff",
  },
  timelineStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  timelineStartContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
  },
  timelineStartText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  travelSegment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 6,
    marginBottom: 12,
  },
  travelContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  travelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  timelineMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  timelineMarkerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  timelineItemCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  timelineItemWarn: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  timelineItemDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  timelineItemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  warningBadgeDanger: {
    backgroundColor: "#cc3300",
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  timelineItemDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  timeDetailText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  timelineEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineEndDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2A4D50",
    borderWidth: 3,
    borderColor: "#fff",
  },
  timelineEndContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
  },
  timelineEndContentDanger: {
    backgroundColor: "#FEF2F2",
  },
  timelineEndText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A4D50",
    flex: 1,
  },

  // Loading & Error States
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
});
