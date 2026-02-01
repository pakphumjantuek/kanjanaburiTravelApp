// src/screens/TripPlannerScreen.tsx
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

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
        (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );

const swapReorderPayload = (
  items: TripItemDto[],
  idx: number,
  swapIdx: number,
) => {
  const reordered = items.slice();
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  return reordered.map((it, i) => ({
    tripItemId: it.tripItemId,
    orderIndex: i + 1,
  }));
};

const dayOfWeekFromTripDay = (
  tripStart?: string | null,
  dayIndex?: number | null,
) => {
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
  dayIndex: number,
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
  for (const s of segments)
    segMap.set(`${s.fromTripItemId}->${s.toTripItemId}`, s);

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

    const oh = getOpeningForTripDay(
      openingByPlace,
      it.placeId,
      tripStart,
      it.dayIndex,
    );
    const isClosed = Boolean(oh?.isClosed);

    const openHHMM = toHHMM(oh?.openTime ?? null);
    const closeHHMM = toHHMM(oh?.closeTime ?? null);

    const openAt =
      !isClosed && openHHMM ? atDayTime(dayBaseDate, openHHMM) : undefined;
    let closeAt =
      !isClosed && closeHHMM ? atDayTime(dayBaseDate, closeHHMM) : undefined;

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
      if (closeAt && arriveAt <= closeAt && departAt > closeAt)
        status = "stay_exceed_close";
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
  const insets = useSafeAreaInsets();
  const { tripId } = (route.params ?? {}) as RouteParams;

  const baseSkip = !Number.isFinite(tripId) || tripId <= 0;

  const { data, isLoading, isError, error, refetch } = useGetTripDetailQuery(
    tripId,
    {
      skip: baseSkip,
    },
  );

  const trip = safeTripResult(data) as TripDetailDto | undefined;

  const [removeTripItem, { isLoading: isRemoving }] =
    useDeleteTripItemMutation();
  const [reorderTripItems, { isLoading: isReordering }] =
    useReorderTripItemsMutation();

  const itemsSorted = useMemo(() => sortItems(trip), [trip]);

  const maxDay = useMemo(
    () =>
      itemsSorted.length
        ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1))
        : 1,
    [itemsSorted],
  );

  // ✅ default to first day that has items
  const [selectedDay, setSelectedDay] = useState(1);
  useEffect(() => {
    const first = itemsSorted.find((x) => x.dayIndex)?.dayIndex ?? 1;
    setSelectedDay((prev) => {
      const next = clamp(prev, 1, maxDay);
      return next || first;
    });
  }, [maxDay, itemsSorted]);

  const dayItems = useMemo(
    () => itemsSorted.filter((x) => x.dayIndex === selectedDay),
    [itemsSorted, selectedDay],
  );

  // ✅ UX: separate mode
  const [mode, setMode] = useState<"plan" | "reorder">("plan");
  const [showTimeline, setShowTimeline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const placeIds = useMemo(
    () => Array.from(new Set(dayItems.map((x) => x.placeId))),
    [dayItems],
  );
  const { map: placeMapRaw, isLoading: isPlacesLoading } =
    usePlacesByIds(placeIds);

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
    const base = trip?.startDateTime
      ? new Date(trip.startDateTime)
      : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (selectedDay - 1));
    return base;
  }, [selectedDay, trip?.startDateTime]);

  const startTimeHHMM = useMemo(
    () => hhmmFromDateTime(trip?.startDateTime ?? null, "09:00"),
    [trip?.startDateTime],
  );

  const tripEndAt = useMemo(() => {
    if (!trip?.endDateTime) return null;
    const end = new Date(trip.endDateTime);
    return Number.isNaN(end.getTime()) ? null : end;
  }, [trip?.endDateTime]);

  const { data: segments = [] } = useGetTripSegmentsQuery(
    { tripId, dayIndex: selectedDay },
    { skip: baseSkip },
  );

  const [triggerOpening] = useLazyGetPlaceOpeningQuery();
  const [openingByPlace, setOpeningByPlace] = useState<
    Map<number, OpeningHourDto[]>
  >(() => new Map());

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!placeIds.length) {
        if (!cancelled) setOpeningByPlace(new Map());
        return;
      }

      const needFetch = placeIds.filter((pid) => !openingByPlace.has(pid));
      if (!needFetch.length) return;

      const results: Array<readonly [number, OpeningHourDto[]]> =
        await Promise.all(
          needFetch.map(async (pid) => {
            try {
              const list = await triggerOpening(pid, true).unwrap();
              return [pid, list] as const;
            } catch {
              return [pid, [] as OpeningHourDto[]] as const;
            }
          }),
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
  }, [placeIds, triggerOpening]); // 👈 removed openingByPlace from deps to prevent loop

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
    [
      dayBaseDate,
      startTimeHHMM,
      trip?.startDateTime,
      tripEndAt,
      dayItems,
      placeMap,
      segments,
      openingByPlace,
    ],
  );

  const overTripEndMinutes = useMemo(() => {
    if (!tripEndAt || timeline.rows.length === 0) return 0;
    const last = timeline.rows[timeline.rows.length - 1];
    const diffMs = last.departAt.getTime() - tripEndAt.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 60_000) : 0;
  }, [timeline.rows, tripEndAt]);

  // ---------- actions ----------
  const handleRemove = async (tripItemId: number, placeName: string) => {
    Alert.alert(
      "ยืนยันการลบ",
      `ต้องการลบ "${placeName}" ออกจากวัน ${selectedDay} ใช่ไหม?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await removeTripItem({ tripId, tripItemId }).unwrap();
            } catch (e: any) {
              Alert.alert(
                "ผิดพลาด",
                e?.data?.errorMessages?.[0] ?? "ลบไม่สำเร็จ",
              );
            }
          },
        },
      ],
    );
  };

  const handleMove = async (tripItemId: number, dir: "up" | "down") => {
    const idx = dayItems.findIndex((x) => x.tripItemId === tripItemId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= dayItems.length) return;

    try {
      await reorderTripItems({
        tripId,
        body: {
          dayIndex: selectedDay,
          items: swapReorderPayload(dayItems, idx, swapIdx),
        },
      }).unwrap();
    } catch (e: any) {
      Alert.alert(
        "ผิดพลาด",
        e?.data?.errorMessages?.[0] ?? "จัดลำดับไม่สำเร็จ",
      );
    }
  };

  // ---------- render helpers ----------
  const openingText = (placeId: number) => {
    const oh = getOpeningForTripDay(
      openingByPlace,
      placeId,
      trip?.startDateTime ?? null,
      selectedDay,
    );
    if (!oh) return "ไม่มีข้อมูลเวลาเปิด-ปิด";
    if (oh.isClosed) return "ปิดทำการ";
    return `${toHHMM(oh.openTime) ?? "-"} - ${toHHMM(oh.closeTime) ?? "-"} น.`;
  };

  const statusBadge = (r: TimelineRow) => {
    if (r.status === "ok") return null;

    if (r.status === "arrive_before_open")
      return { label: "ถึงก่อนเปิด", tone: "warn" as const };
    if (r.status === "arrive_after_close")
      return { label: "ปิดแล้ว", tone: "danger" as const };
    if (r.status === "stay_exceed_close")
      return { label: "เกินเวลาปิด", tone: "danger" as const };
    if (r.status === "exceed_trip_end")
      return {
        label: `เกินทริป ${r.exceedTripEndMinutes ?? 0} นาที`,
        tone: "danger" as const,
      };
    return { label: "ปิดทำการ", tone: "muted" as const };
  };

  // ---------- states ----------
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
          <Text style={styles.errorText}>
            {(error as any)?.data?.errorMessages?.[0] ?? "เกิดข้อผิดพลาด"}
          </Text>

          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={18} color="#83829A" />
              <Text style={styles.btnSecondaryText}>กลับ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => refetch()}
            >
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
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={18} color="#83829A" />
            <Text style={styles.btnSecondaryText}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const days = Array.from({ length: Math.max(maxDay, 1) }, (_, i) => i + 1);
  const totalMinutes = timeline.totalStay + timeline.totalTravel;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#2A4D50" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle} numberOfLines={1}>
            วางแผนทริป
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {trip.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.iconBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#2A4D50" />
        </TouchableOpacity>
      </View>

      {/* Sticky Day Tabs + Mode */}
      <View style={styles.stickyTop}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabs}
        >
          {days.map((d) => {
            const active = d === selectedDay;
            const count = itemsSorted.filter((x) => x.dayIndex === d).length;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDay(d)}
                style={[styles.dayTab, active && styles.dayTabActive]}
              >
                <Text
                  style={[styles.dayTabText, active && styles.dayTabTextActive]}
                >
                  วัน {d}
                </Text>
                <Text
                  style={[styles.dayTabSub, active && styles.dayTabSubActive]}
                >
                  {count} สถานที่
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.modeBar}>
          <TouchableOpacity
            onPress={() => setMode("plan")}
            style={[styles.modeBtn, mode === "plan" && styles.modeBtnActive]}
          >
            <Ionicons
              name="eye"
              size={16}
              color={mode === "plan" ? "#fff" : "#64748b"}
            />
            <Text
              style={[
                styles.modeText,
                mode === "plan" && styles.modeTextActive,
              ]}
            >
              ดูเวลา
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("reorder")}
            style={[styles.modeBtn, mode === "reorder" && styles.modeBtnActive]}
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={mode === "reorder" ? "#fff" : "#64748b"}
            />
            <Text
              style={[
                styles.modeText,
                mode === "reorder" && styles.modeTextActive,
              ]}
            >
              จัดลำดับ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingBottom: 20 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary CTA row */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => navigation.navigate("PlaceList")}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.primaryCtaText}>เพิ่มสถานที่</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() =>
              navigation.navigate("TripMapScreen", {
                tripId,
                dayIndex: selectedDay,
              })
            }
          >
            <Ionicons name="map" size={18} color="#2A4D50" />
          </TouchableOpacity>
        </View>

        {/* Summary (for day) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <Ionicons name="time" size={14} color="#FF7754" />
              <Text style={styles.summaryText}>
                รวม {Math.floor(totalMinutes / 60)}:
                {String(totalMinutes % 60).padStart(2, "0")} ชม.
              </Text>
            </View>

            <View style={styles.summaryPill}>
              <MaterialCommunityIcons name="car" size={14} color="#2563eb" />
              <Text style={styles.summaryText}>
                {timeline.totalTravel} นาทีเดินทาง
              </Text>
            </View>

            <View style={styles.summaryPill}>
              <Ionicons name="location" size={14} color="#2A4D50" />
              <Text style={styles.summaryText}>
                {timeline.totalStay} นาทีเที่ยว
              </Text>
            </View>
          </View>

          {overTripEndMinutes > 0 && (
            <View style={styles.warnBanner}>
              <Ionicons name="warning" size={16} color="#cc3300" />
              <Text style={styles.warnText}>
                แผนวันนี้อาจเกินเวลาจบทริปประมาณ {overTripEndMinutes} นาที
              </Text>
            </View>
          )}

          {isPlacesLoading && (
            <View style={styles.loadingMini}>
              <ActivityIndicator size="small" color="#2A4D50" />
              <Text style={styles.loadingMiniText}>
                กำลังโหลดชื่อสถานที่...
              </Text>
            </View>
          )}
        </View>

        {/* Places list */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="list" size={18} color="#2A4D50" />
              <Text style={styles.cardTitle}>สถานที่ (วัน {selectedDay})</Text>
            </View>

            {mode === "reorder" ? (
              <View style={styles.editHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#64748b"
                />
                <Text style={styles.editHintText}>กด ↑ ↓ เพื่อเรียง</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowTimeline((v) => !v)}
                style={styles.smallToggle}
              >
                <Ionicons name="time-outline" size={16} color="#2A4D50" />
                <Text style={styles.smallToggleText}>
                  {showTimeline ? "ซ่อนเวลา" : "ดูเวลา"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {dayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={48} color="#C1C0C8" />
              </View>
              <Text style={styles.emptyTitle}>
                วัน {selectedDay} ยังไม่มีสถานที่
              </Text>
              <Text style={styles.emptyText}>
                กด “เพิ่มสถานที่” เพื่อเริ่มวางแผน
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("PlaceList")}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2A4D50" />
                <Text style={styles.emptyBtnText}>เพิ่มสถานที่แรก</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {dayItems.map((it, idx) => {
                const p = placeMap.get(it.placeId);
                const name = p?.name ?? `Place #${it.placeId}`;
                const isFirst = idx === 0;
                const isLast = idx === dayItems.length - 1;
                const disabled = isRemoving || isReordering;

                return (
                  <View
                    key={it.tripItemId}
                    style={[styles.placeRow, disabled && { opacity: 0.6 }]}
                  >
                    <View style={styles.placeIndex}>
                      <Text style={styles.placeIndexText}>{idx + 1}</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.placeBody}
                      onPress={() =>
                        navigation.navigate("PlaceUserDetailScreen", {
                          placeId: it.placeId,
                        })
                      }
                    >
                      <Text style={styles.placeName} numberOfLines={1}>
                        {name}
                      </Text>

                      <View style={styles.placeMetaRow}>
                        <View style={styles.metaPill}>
                          <Ionicons
                            name="hourglass-outline"
                            size={14}
                            color="#FF7754"
                          />
                          <Text style={styles.metaText}>
                            {p?.avgVisitMinutes ?? 60} นาที
                          </Text>
                        </View>
                        <View style={styles.metaPill}>
                          <Ionicons
                            name="business-outline"
                            size={14}
                            color="#64748b"
                          />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {openingText(it.placeId)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Actions only in reorder mode */}
                    {mode === "reorder" ? (
                      <View style={styles.actionsCol}>
                        <TouchableOpacity
                          onPress={() => handleMove(it.tripItemId, "up")}
                          disabled={isFirst || disabled}
                          style={[
                            styles.actionIconBtn,
                            (isFirst || disabled) &&
                              styles.actionIconBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={16}
                            color={isFirst || disabled ? "#C1C0C8" : "#2A4D50"}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleMove(it.tripItemId, "down")}
                          disabled={isLast || disabled}
                          style={[
                            styles.actionIconBtn,
                            (isLast || disabled) &&
                              styles.actionIconBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={16}
                            color={isLast || disabled ? "#C1C0C8" : "#2A4D50"}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemove(it.tripItemId, name)}
                          disabled={disabled}
                          style={[
                            styles.actionIconBtn,
                            disabled && styles.actionIconBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={disabled ? "#C1C0C8" : "#cc3300"}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#94a3b8"
                        style={{ marginLeft: 6 }}
                      />
                    )}
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

        {/* Timeline (plan mode) */}
        {mode === "plan" && showTimeline && timeline.rows.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="time" size={18} color="#2A4D50" />
              <Text style={styles.cardTitle}>
                ตารางเวลา (วัน {selectedDay})
              </Text>
            </View>

            {/* Start */}
            <View style={styles.timelineStart}>
              <View style={styles.dotGreen} />
              <Text style={styles.timelineStartText}>
                เริ่ม {fmtHHMM(timeline.startAt)} น.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {timeline.rows.map((r, idx) => {
                const badge = statusBadge(r);
                return (
                  <View key={r.tripItemId} style={styles.timeRow}>
                    <View style={styles.timeLeft}>
                      <Text style={styles.timeText}>{fmtHHMM(r.arriveAt)}</Text>
                      <Text style={styles.timeSub}>
                        → {fmtHHMM(r.departAt)}
                      </Text>
                    </View>

                    <View style={styles.timeCard}>
                      <Text style={styles.timeName} numberOfLines={1}>
                        {r.name}
                      </Text>

                      <View style={styles.timeMeta}>
                        {idx > 0 && r.travelFromPrevMinutes > 0 && (
                          <View style={styles.metaPillSmall}>
                            <MaterialCommunityIcons
                              name="car"
                              size={14}
                              color="#2563eb"
                            />
                            <Text style={styles.metaTextSmall}>
                              {r.travelFromPrevMinutes} นาที
                            </Text>
                          </View>
                        )}

                        <View style={styles.metaPillSmall}>
                          <Ionicons
                            name="hourglass-outline"
                            size={14}
                            color="#FF7754"
                          />
                          <Text style={styles.metaTextSmall}>
                            {r.stayMinutes} นาที
                          </Text>
                        </View>

                        {badge && (
                          <View
                            style={[
                              styles.badge,
                              badge.tone === "warn" && styles.badgeWarn,
                              badge.tone === "danger" && styles.badgeDanger,
                            ]}
                          >
                            <Text style={styles.badgeText}>{badge.label}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* End */}
            <View style={styles.timelineEnd}>
              <View
                style={[
                  styles.dot,
                  overTripEndMinutes > 0 && { backgroundColor: "#cc3300" },
                ]}
              />
              <Text
                style={[
                  styles.timelineEndText,
                  overTripEndMinutes > 0 && { color: "#cc3300" },
                ]}
              >
                สิ้นสุด{" "}
                {fmtHHMM(timeline.rows[timeline.rows.length - 1].departAt)}
                {overTripEndMinutes > 0
                  ? ` (เกิน ${overTripEndMinutes} นาที)`
                  : ""}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View />
        </Pressable>

        <View style={[styles.menuSheet, { bottom: 16 + insets.bottom }]}>
          <Text style={styles.menuTitle}>ตัวเลือก</Text>

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("TripMapScreen", {
                tripId,
                dayIndex: selectedDay,
              });
            }}
            style={styles.menuItem}
          >
            <Ionicons name="map-outline" size={18} color="#2A4D50" />
            <Text style={styles.menuItemText}>เปิดแผนที่วันนี้</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              setMode((m) => (m === "reorder" ? "plan" : "reorder"));
            }}
            style={styles.menuItem}
          >
            <Ionicons name="swap-vertical" size={18} color="#2A4D50" />
            <Text style={styles.menuItemText}>
              {mode === "reorder" ? "กลับไปดูเวลา" : "จัดลำดับสถานที่"}
            </Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("PlaceList");
            }}
            style={styles.menuItem}
          >
            <Ionicons name="add-circle-outline" size={18} color="#2A4D50" />
            <Text style={styles.menuItemText}>เพิ่มสถานที่</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// -------------------- styles --------------------
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
  topTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  topSub: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "700" },

  // Sticky
  stickyTop: {
    backgroundColor: "#F3F4F8",
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 10,
  },
  dayTabs: { paddingHorizontal: 16, gap: 8 },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 92,
  },
  dayTabActive: { backgroundColor: "#2A4D50", borderColor: "#2A4D50" },
  dayTabText: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  dayTabTextActive: { color: "#fff" },
  dayTabSub: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 2,
  },
  dayTabSubActive: { color: "rgba(255,255,255,0.85)" },

  modeBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modeBtnActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  modeText: { fontSize: 13, fontWeight: "900", color: "#64748b" },
  modeTextActive: { color: "#fff" },

  // Page
  page: { padding: 16, gap: 12 },

  // CTA
  ctaRow: { flexDirection: "row", gap: 10 },
  primaryCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
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

  // Summary
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  summaryText: { fontSize: 12, fontWeight: "900", color: "#0f172a" },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warnText: { fontSize: 12, fontWeight: "900", color: "#cc3300", flex: 1 },
  loadingMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  loadingMiniText: { fontSize: 12, fontWeight: "800", color: "#64748b" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#000" },

  editHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  editHintText: { fontSize: 12, fontWeight: "800", color: "#64748b" },

  smallToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  smallToggleText: { fontSize: 12, fontWeight: "900", color: "#2A4D50" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2A4D50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "900", color: "#2A4D50" },

  // Place Row
  placeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  placeIndex: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  placeIndexText: { color: "#fff", fontWeight: "900" },

  placeBody: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  placeName: { fontSize: 14, fontWeight: "900", color: "#000" },

  placeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    maxWidth: 180,
  },

  actionsCol: { gap: 8, alignItems: "center" },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBtnDisabled: { opacity: 0.6 },

  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 14,
  },
  processingText: { fontSize: 12, fontWeight: "900", color: "#2A4D50" },

  // Timeline (simple list)
  timelineStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
  },
  timelineStartText: { fontSize: 13, fontWeight: "900", color: "#047857" },

  timeRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  timeLeft: { width: 74, alignItems: "flex-start" },
  timeText: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  timeSub: { fontSize: 11, fontWeight: "800", color: "#64748b", marginTop: 2 },

  timeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  timeName: { fontSize: 13, fontWeight: "900", color: "#000" },
  timeMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  metaPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaTextSmall: { fontSize: 12, fontWeight: "900", color: "#0f172a" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  badgeWarn: { backgroundColor: "#f59e0b" },
  badgeDanger: { backgroundColor: "#cc3300" },
  badgeText: { fontSize: 11, fontWeight: "900", color: "#fff" },

  timelineEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2A4D50" },
  timelineEndText: { fontSize: 13, fontWeight: "900", color: "#2A4D50" },

  // Loading & Error
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
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
  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#cc3300",
    textAlign: "center",
    marginTop: 8,
  },
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
  menuTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    marginBottom: 4,
  },
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
});
