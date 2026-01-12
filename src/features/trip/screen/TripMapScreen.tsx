import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";

import { COLORS, FONTS, SHADOWS } from "../../../common";
import { useGetTripMapQuery } from "../tripApi";

type MapTheme = "standard" | "light" | "dark";

const MAP_STYLE_LIGHT: any[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
];

const MAP_STYLE_DARK: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111827" }] },
];

const getMapStyle = (theme: MapTheme) => {
  if (theme === "light") return MAP_STYLE_LIGHT;
  if (theme === "dark") return MAP_STYLE_DARK;
  return undefined;
};

const NumberPin = ({ label, tone }: { label: string; tone: "start" | "end" | "normal" }) => {
  const bg =
    tone === "start" ? COLORS.success : tone === "end" ? COLORS.danger : COLORS.primary;

  return (
    <View style={[styles.pin, { backgroundColor: bg }]}>
      <Text style={styles.pinText}>{label}</Text>
    </View>
  );
};

function osrmPolylineToLatLng(poly: number[][]): LatLng[] {
  // backend ส่ง [lng,lat]
  return poly.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function TripMapScreen() {
  const route = useRoute<RouteProp<{ params: { tripId: number } }, "params">>();
  const tripId = route.params.tripId;

  const [selectedDay, setSelectedDay] = useState(1);
  const [theme, setTheme] = useState<MapTheme>("standard");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const setMapRef = useCallback((r: MapView | null) => {
    mapRef.current = r;
  }, []);

  const { data, isLoading, isError, error, refetch } = useGetTripMapQuery({
    tripId,
    dayIndex: selectedDay,
    transportMode: "driving",
  });

  const stops = data?.stops ?? [];
  const routeLine: LatLng[] = useMemo(() => {
    if (!data?.route?.polyline?.length) return [];
    return osrmPolylineToLatLng(data.route.polyline);
  }, [data?.route?.polyline]);

  const center = useMemo(() => {
    const s = stops[0];
    return s ? { latitude: s.latitude, longitude: s.longitude } : { latitude: 13.7563, longitude: 100.5018 };
  }, [stops]);

  const fitToAll = useCallback(() => {
    if (!mapRef.current) return;

    const pts: LatLng[] =
      routeLine.length > 0
        ? routeLine
        : stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

    if (pts.length === 0) return;

    mapRef.current.fitToCoordinates(pts, {
      edgePadding: { top: 120, right: 80, bottom: 220, left: 80 },
      animated: true,
    });
  }, [routeLine, stops]);

  useEffect(() => {
    const t = setTimeout(() => fitToAll(), 350);
    return () => clearTimeout(t);
  }, [fitToAll, selectedDay, data?.tripId]);

  const cycleTheme = () => {
    const order: MapTheme[] = ["standard", "light", "dark"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

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
          {(error as any)?.message ?? (error as any)?.data?.errorMessages?.[0] ?? "unknown"}
        </Text>
        <View style={{ height: 12 }} />
        <TouchableOpacity style={styles.btnGray} onPress={() => refetch()}>
          <Text style={styles.btnGrayText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
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
          >
            {/* markers */}
            {stops.map((s, idx) => {
              const label = s.type === "start" ? "เริ่ม" : s.type === "end" ? "จบ" : String(idx + 1);
              return (
                <Marker
                  key={`${s.tripItemId}-${s.placeId}`}
                  coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                >
                  <NumberPin label={label} tone={s.type} />
                </Marker>
              );
            })}

            {/* route polyline */}
            {routeLine.length > 0 && (
              <Polyline coordinates={routeLine} strokeWidth={6} strokeColor={COLORS.primary} />
            )}
          </MapView>

          {/* overlay top */}
          {!isFullscreen && (
            <View style={styles.overlayTop}>
              <View style={styles.tripHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h1} numberOfLines={1}>
                    {data?.title ?? `Trip ${tripId}`}
                  </Text>
                  <Text style={styles.subH} numberOfLines={1}>
                    Day {selectedDay} • {stops.length} stops
                    {data?.route ? ` • ~${data.route.totalDistanceKm.toFixed(1)} km • ~${data.route.totalTravelMinutes} min` : ""}
                  </Text>
                </View>

                <TouchableOpacity style={styles.pillBtn} onPress={cycleTheme}>
                  <Text style={styles.pillText}>ธีม</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const active = d === selectedDay;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDay(d)}
                      style={[styles.dayPill, active && styles.dayPillActive]}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>Day {d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={fitToAll}>
              <Text style={styles.ctrlText}>ซูม</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => setIsFullscreen((v) => !v)}>
              <Text style={styles.ctrlText}>{isFullscreen ? "ออก" : "เต็ม"}</Text>
            </TouchableOpacity>
          </View>

          {/* bottom sheet */}
          {!isFullscreen && (
            <View style={styles.miniSheet}>
              <Text style={styles.miniTitle}>แผนวันนี้</Text>
              <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
                {stops.map((s, i) => (
                  <View key={`${s.placeId}-${i}`} style={styles.itRow}>
                    <View
                      style={[
                        styles.itDot,
                        { backgroundColor: s.type === "start" ? COLORS.success : s.type === "end" ? COLORS.danger : COLORS.primary },
                      ]}
                    />
                    <Text style={styles.itTitle} numberOfLines={1}>
                      {i + 1}. {s.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.btnGray} onPress={() => refetch()}>
                <Text style={styles.btnGrayText}>รีเฟรช</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.offwhite },
  fullscreen: { backgroundColor: "#000" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.offwhite },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  muted: { marginTop: 8, fontFamily: FONTS.regular, color: COLORS.gray },

  mapWrap: { flex: 1 },
  mapWrapFull: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

  overlayTop: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...SHADOWS.small,
  },
  tripHeader: { flexDirection: "row", alignItems: "center", gap: 10 as any },
  h1: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary2 },
  subH: { marginTop: 2, fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gray },

  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.offwhite,
  },
  pillText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary2 },

  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(245,245,245,1)",
    borderWidth: 1,
    borderColor: COLORS.offwhite,
    marginRight: 8,
  },
  dayPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayPillText: { fontFamily: FONTS.semiBold, color: COLORS.gray2, fontSize: 12 },
  dayPillTextActive: { color: "#fff" },

  controls: { position: "absolute", right: 12, top: 120, gap: 8 as any },
  ctrlBtn: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.offwhite,
    ...SHADOWS.small,
  },
  ctrlText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary2 },

  miniSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...SHADOWS.medium,
  },
  miniTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary2, marginBottom: 8 },
  itRow: { flexDirection: "row", alignItems: "center", gap: 10 as any, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  itDot: { width: 10, height: 10, borderRadius: 6 },
  itTitle: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary2 },

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

  pin: {
    minWidth: 34,
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
  },
  pinText: { color: "#fff", fontFamily: FONTS.bold, fontSize: 11 },
});
