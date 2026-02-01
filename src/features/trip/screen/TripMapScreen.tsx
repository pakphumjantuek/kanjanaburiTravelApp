import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  LatLng,
} from "react-native-maps";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";

import { COLORS, FONTS, SHADOWS } from "../../../common";
import { useGetTripMapQuery, useGetTripDetailQuery } from "../tripApi";

type MapTheme = "standard" | "light" | "dark";

// (คงไว้ เผื่อคุณอยากเปิด theme ต่อทีหลัง แต่ UI รอบนี้ไม่โชว์ปุ่ม theme แล้ว)
const MAP_STYLE_LIGHT: any[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
];

const MAP_STYLE_DARK: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
];

const getMapStyle = (theme: MapTheme) => {
  if (theme === "light") return MAP_STYLE_LIGHT;
  if (theme === "dark") return MAP_STYLE_DARK;
  return undefined;
};

const toneColor = (tone: "start" | "end" | "normal") =>
  tone === "start"
    ? COLORS.success
    : tone === "end"
      ? COLORS.danger
      : COLORS.primary;

const NumberPin = ({
  label,
  tone,
  selected,
}: {
  label: string;
  tone: "start" | "end" | "normal";
  selected?: boolean;
}) => {
  return (
    <View
      style={[
        styles.pin,
        { backgroundColor: toneColor(tone) },
        selected && styles.pinSelected,
      ]}
    >
      <Text style={styles.pinText}>{label}</Text>
    </View>
  );
};

function osrmPolylineToLatLng(poly: number[][]): LatLng[] {
  // backend ส่ง [lng,lat]
  return poly.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

type Stop = {
  tripItemId: number;
  placeId: number;
  name: string;
  latitude: number;
  longitude: number;
  type: "start" | "end" | "normal";

  // ถ้าหลังบ้านมี ส่งมาได้เลย จะโชว์ใน sheet
  legMinutesFromPrev?: number;
  etaTotalMinutesFromStart?: number;
  distanceKmFromPrev?: number;
};

const safeResult = <T,>(d: any): T | undefined =>
  (d?.result ?? d) as T | undefined;

export default function TripMapScreen() {
  const route = useRoute<RouteProp<{ params: { tripId: number } }, "params">>();
  const tripId = route.params.tripId;

  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState(1);
  const [theme] = useState<MapTheme>("standard"); // UI รอบนี้ไม่โชว์ปุ่ม theme
  const [isFullscreen, setIsFullscreen] = useState(false);

  // selected จุดบน map
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // modal ต่าง ๆ
  const [detailOpen, setDetailOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const setMapRef = useCallback((r: MapView | null) => {
    mapRef.current = r;
  }, []);

  type TripDetailDtoLite = {
    title?: string;
    items: Array<{ dayIndex: number }>;
  };

  const { data: tripDetailRaw } = useGetTripDetailQuery(tripId, {
    skip: !Number.isFinite(tripId) || tripId <= 0,
  }) as { data?: any };

  const tripDetail = useMemo(
    () => safeResult<TripDetailDtoLite>(tripDetailRaw),
    [tripDetailRaw],
  );

  const availableDays = useMemo(() => {
    const items = tripDetail?.items ?? [];
    const set = new Set<number>();
    for (const it of items) {
      const d = Number(it.dayIndex ?? 0);
      if (Number.isFinite(d) && d > 0) set.add(d);
    }
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length ? arr : [1];
  }, [tripDetail?.items]);

  useEffect(() => {
    if (!availableDays.includes(selectedDay)) setSelectedDay(availableDays[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDays.join(",")]);

  const title = tripDetail?.title ?? `Trip ${tripId}`;

  const { data, isLoading, isError, error, refetch } = useGetTripMapQuery({
    tripId,
    dayIndex: selectedDay,
    transportMode: "driving",
  });

  const stops: Stop[] = (data?.stops ?? []) as any;

  const routeLine: LatLng[] = useMemo(() => {
    if (!data?.route?.polyline?.length) return [];
    return osrmPolylineToLatLng(data.route.polyline);
  }, [data?.route?.polyline]);

  const center = useMemo(() => {
    const s = stops[0];
    return s
      ? { latitude: s.latitude, longitude: s.longitude }
      : { latitude: 13.7563, longitude: 100.5018 };
  }, [stops]);

  const fitToAll = useCallback(() => {
    if (!mapRef.current) return;

    const pts: LatLng[] =
      routeLine.length > 0
        ? routeLine
        : stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

    if (pts.length === 0) return;

    mapRef.current.fitToCoordinates(pts, {
      edgePadding: { top: 90, right: 70, bottom: 160, left: 70 },
      animated: true,
    });
  }, [routeLine, stops]);

  const openDetailAtIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= stops.length) return;
      const s = stops[idx];
      setSelectedIndex(idx);
      setDetailOpen(true);

      // ปิด list ถ้าเปิดอยู่
      setListOpen(false);

      mapRef.current?.animateCamera(
        {
          center: { latitude: s.latitude, longitude: s.longitude },
          zoom: 15,
        },
        { duration: 300 },
      );
    },
    [stops],
  );

  const closeAllSheets = useCallback(() => {
    setDetailOpen(false);
    setListOpen(false);
  }, []);

  useEffect(() => {
    // เปลี่ยนวัน -> reset selection/sheet
    setSelectedIndex(-1);
    closeAllSheets();
  }, [selectedDay, closeAllSheets]);

  useEffect(() => {
    const t = setTimeout(() => fitToAll(), 250);
    return () => clearTimeout(t);
  }, [fitToAll, selectedDay, data?.tripId]);

  const selectedStop = selectedIndex >= 0 ? stops[selectedIndex] : null;

  const headerSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`วันที่ ${selectedDay}`);
    parts.push(`ทั้งหมด ${stops.length} จุด`);
    if (data?.route) {
      parts.push(`ระยะทาง ${data.route.totalDistanceKm.toFixed(1)} กม.`);
      parts.push(`ใช้เวลา ${data.route.totalTravelMinutes} นาที`);
    }
    return parts.join(" • ");
  }, [selectedDay, stops.length, data?.route]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>กำลังโหลดแผนที่...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.title}>โหลดแผนที่ไม่สำเร็จ</Text>
        <Text style={styles.muted}>
          {(error as any)?.message ??
            (error as any)?.data?.errorMessages?.[0] ??
            "unknown"}
        </Text>
        <View style={{ height: 12 }} />
        <TouchableOpacity style={styles.btnGray} onPress={() => refetch()}>
          <Text style={styles.btnGrayText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={[styles.page, isFullscreen && styles.fullscreen]}>
        <View style={[styles.mapWrap, isFullscreen && styles.mapWrapFull]}>
          <MapView
            ref={setMapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: center.latitude,
              longitude: center.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            customMapStyle={getMapStyle(theme)}
            onPress={() => closeAllSheets()}
          >
            {stops.map((s, idx) => {
              const label =
                s.type === "start"
                  ? "เริ่ม"
                  : s.type === "end"
                    ? "จบ"
                    : String(idx + 1);
              const tone = (
                s.type === "start" || s.type === "end" ? s.type : "normal"
              ) as "start" | "end" | "normal";
              const selected = idx === selectedIndex;

              return (
                <Marker
                  key={`${s.tripItemId}-${s.placeId}`}
                  coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                  onPress={() => openDetailAtIndex(idx)}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  {/* Smart label: โชว์ชื่อเฉพาะหมุดที่เลือก */}
                  <View style={{ alignItems: "center" }}>
                    {selected && (
                      <View style={styles.nameBubble} pointerEvents="none">
                        <Text style={styles.nameBubbleText} numberOfLines={1}>
                          {s.name}
                        </Text>
                      </View>
                    )}
                    <NumberPin label={label} tone={tone} selected={selected} />
                  </View>
                </Marker>
              );
            })}

            {routeLine.length > 0 && (
              <Polyline
                coordinates={routeLine}
                strokeWidth={6}
                strokeColor={COLORS.primary}
              />
            )}
          </MapView>

          {/* ✅ Small header */}
          {!isFullscreen && (
            <View style={[styles.headerBar, { top: 10 + insets.top * 0 }]}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>

              <View style={styles.headerRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {availableDays.map((d) => {
                    const active = d === selectedDay;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setSelectedDay(d)}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          วันที่ {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <Text style={styles.headerSub} numberOfLines={1}>
                {headerSummary}
              </Text>
            </View>
          )}

          {/* ✅ Right controls: Fit + List + Full */}
          <View style={[styles.controlsRight, { top: 100 + insets.top * 0 }]}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={fitToAll}>
              <Text style={styles.ctrlText}>จุดทั้งหมด</Text>
            </TouchableOpacity>

            {!isFullscreen && (
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={() => {
                  // เปิดลิสต์แทน miniSheet
                  setListOpen(true);
                  setDetailOpen(false);
                }}
              >
                <Text style={styles.ctrlText}>รายการ</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={() => {
                setIsFullscreen((v) => !v);
                // fullscreen -> ปิดชีทให้โล่ง
                closeAllSheets();
              }}
            >
              <Text style={styles.ctrlText}>
                {isFullscreen ? "ออก" : "เต็ม"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ✅ List Sheet (แทน miniSheet) */}
          <Modal
            visible={!isFullscreen && listOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setListOpen(false)}
          >
            <Pressable
              style={styles.backdrop}
              onPress={() => setListOpen(false)}
            />

            <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
              <View style={styles.sheetTopBar}>
                <Text style={styles.sheetTitle}>รายการจุดวันนี้</Text>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => refetch()}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeText}>รีเฟรช</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setListOpen(false)}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeText}>ปิด</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {stops.length === 0 ? (
                <Text style={styles.mutedSmall}>ยังไม่มีจุดในวันนี้</Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                >
                  {stops.map((s, i) => {
                    const active = i === selectedIndex;
                    const tone =
                      s.type === "start" || s.type === "end"
                        ? s.type
                        : "normal";

                    return (
                      <TouchableOpacity
                        key={`${s.placeId}-${i}`}
                        onPress={() => openDetailAtIndex(i)}
                        style={[styles.itRow, active && styles.itRowActive]}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.itDot,
                            { backgroundColor: toneColor(tone) },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.itTitle,
                              active && styles.itTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {s.type === "start"
                              ? "เริ่ม: "
                              : s.type === "end"
                                ? "จบ: "
                                : `${i + 1}. `}
                            {s.name}
                          </Text>

                          {/* โชว์เวลา/ระยะทางแบบสั้นในลิสต์ (ถ้ามี) */}
                          {i > 0 &&
                            (typeof s.legMinutesFromPrev === "number" ||
                              typeof s.distanceKmFromPrev === "number") && (
                              <Text style={styles.itMeta} numberOfLines={1}>
                                {typeof s.legMinutesFromPrev === "number"
                                  ? `~${s.legMinutesFromPrev} นาที`
                                  : ""}
                                {typeof s.legMinutesFromPrev === "number" &&
                                typeof s.distanceKmFromPrev === "number"
                                  ? " • "
                                  : ""}
                                {typeof s.distanceKmFromPrev === "number"
                                  ? `${s.distanceKmFromPrev.toFixed(1)} กม.`
                                  : ""}
                              </Text>
                            )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </Modal>

          {/* ✅ Detail Sheet: เหมือนเดิม + โชว์เวลาเดินทาง */}
          <Modal
            visible={!isFullscreen && detailOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setDetailOpen(false)}
          >
            <Pressable
              style={styles.backdrop}
              onPress={() => setDetailOpen(false)}
            />

            <View
              style={[
                styles.detailSheet,
                { paddingBottom: 14 + insets.bottom },
              ]}
            >
              <View style={styles.detailTopBar}>
                <Text style={styles.detailTitle}>
                  {selectedStop
                    ? `จุดที่ ${selectedIndex + 1}/${stops.length}`
                    : "รายละเอียด"}
                </Text>

                <TouchableOpacity
                  onPress={() => setDetailOpen(false)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>ปิด</Text>
                </TouchableOpacity>
              </View>

              {!selectedStop ? (
                <Text style={styles.mutedSmall}>แตะหมุดเพื่อดูรายละเอียด</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={styles.placeBig} numberOfLines={2}>
                    {selectedStop.name}
                  </Text>

                  <View style={styles.chipRow}>
                    <View
                      style={[
                        styles.chip,
                        { borderColor: toneColor(selectedStop.type) },
                      ]}
                    >
                      <Text style={styles.chipText}>
                        {selectedStop.type === "start"
                          ? "จุดเริ่ม"
                          : selectedStop.type === "end"
                            ? "จุดจบ"
                            : "จุดแวะ"}
                      </Text>
                    </View>

                    {selectedIndex > 0 &&
                      typeof selectedStop.legMinutesFromPrev === "number" && (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>
                            จากจุดก่อนหน้า ~{selectedStop.legMinutesFromPrev}{" "}
                            นาที
                          </Text>
                        </View>
                      )}

                    {selectedIndex > 0 &&
                      typeof selectedStop.distanceKmFromPrev === "number" && (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>
                            ระยะทางช่วงก่อนหน้า{" "}
                            {selectedStop.distanceKmFromPrev.toFixed(1)} กม.
                          </Text>
                        </View>
                      )}

                    {typeof selectedStop.etaTotalMinutesFromStart ===
                      "number" && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>
                          รวมจากเริ่ม ~{selectedStop.etaTotalMinutesFromStart}{" "}
                          นาที
                        </Text>
                      </View>
                    )}

                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        พิกัด {selectedStop.latitude.toFixed(4)},{" "}
                        {selectedStop.longitude.toFixed(4)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() =>
                        mapRef.current?.animateCamera(
                          {
                            center: {
                              latitude: selectedStop.latitude,
                              longitude: selectedStop.longitude,
                            },
                            zoom: 16,
                          },
                          { duration: 250 },
                        )
                      }
                    >
                      <Text style={styles.actionText}>ซูมที่นี่</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: COLORS.primary },
                      ]}
                      onPress={() => {
                        // ปิดชีทเพื่อดูแผนที่โล่ง
                        setDetailOpen(false);
                      }}
                    >
                      <Text style={[styles.actionText, { color: "#fff" }]}>
                        ดูบนแผนที่
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.lightWhite },
  fullscreen: { backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.offwhite,
  },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  muted: { marginTop: 8, fontFamily: FONTS.regular, color: COLORS.gray },
  mutedSmall: { fontFamily: FONTS.regular, color: COLORS.gray, fontSize: 12 },

  mapWrap: { flex: 1 },
  mapWrapFull: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

  // ✅ compact header
  headerBar: {
    position: "absolute",
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...SHADOWS.small,
    gap: 6,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary2 },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gray },
  headerRow: { flexDirection: "row", alignItems: "center" },

  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(245,245,245,1)",
    borderWidth: 1,
    borderColor: COLORS.offwhite,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.gray2,
  },
  dayChipTextActive: { color: "#fff" },

  // ✅ right controls
  controlsRight: {
    position: "absolute",
    marginBlock: 20,
    right: 12,
    gap: 8 as any,
  },
  ctrlBtn: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.offwhite,
    ...SHADOWS.small,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
  },
  ctrlText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary2,
  },

  // pins
  pin: {
    minWidth: 34,
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
    transform: [{ scale: 1 }],
  },
  pinSelected: {
    borderColor: "#fff",
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
    ...SHADOWS.small,
  },
  pinText: { color: "#fff", fontFamily: FONTS.bold, fontSize: 11 },

  // Smart label bubble (โชว์เฉพาะจุดที่เลือก)
  nameBubble: {
    maxWidth: 180,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 6,
    ...SHADOWS.small,
  },
  nameBubbleText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary2,
  },

  btnGray: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray2,
    ...SHADOWS.small,
    alignItems: "center",
  },
  btnGrayText: { fontFamily: FONTS.semiBold, color: COLORS.gray, fontSize: 14 },

  // modal
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },

  // List sheet (ใหม่)
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...SHADOWS.medium,
    gap: 10,
  },
  sheetTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary2 },

  itRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  itRowActive: { backgroundColor: "rgba(42,77,80,0.08)" },
  itDot: { width: 10, height: 10, borderRadius: 6 },
  itTitle: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary2,
  },
  itTitleActive: { color: COLORS.primary },
  itMeta: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.gray,
  },

  // detail sheet (เดิม)
  detailSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...SHADOWS.medium,
    gap: 10,
  },
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary2 },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.offwhite,
  },
  closeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary2,
  },

  placeBig: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary2 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 as any },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.offwhite,
  },
  chipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary2,
  },

  detailActions: { flexDirection: "row", gap: 8 as any, marginTop: 6 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(245,245,245,1)",
    borderWidth: 1,
    borderColor: COLORS.offwhite,
    alignItems: "center",
  },
  actionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary2,
  },
});
