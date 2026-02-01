import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { PieChart, BarChart } from "react-native-gifted-charts";

import { useGetUserInterestDetailsQuery } from "../interestApi";

type RouteParams = { userId: number };
type TabType = "data" | "charts";

export default function UserInterestDetailsScreen() {
  const route = useRoute<any>();
  const userId = Number((route.params as RouteParams | undefined)?.userId);
  const [activeTab, setActiveTab] = useState<TabType>("data");

  const { data, isLoading, isError, refetch, isFetching } =
    useGetUserInterestDetailsQuery(
      { userId, days: 90, top: 20 },
      { skip: !Number.isFinite(userId) || userId <= 0 },
    );

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>userId ไม่ถูกต้อง</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>กำลังโหลด...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>โหลดข้อมูลไม่สำเร็จ</Text>
          <Pressable style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>ลองใหม่</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dto = data;

  // ----- Charts data prep -----
  const palette = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // yellow
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#6366F1", // indigo
    "#14B8A6", // teal
    "#F97316", // orange
    "#06B6D4", // cyan
  ];

  const pieData =
    dto.topInterests?.slice(0, 5).map((it: any, idx: number) => ({
      value: Number((it.weight ?? 0).toFixed(2)),
      text: it.displayName || it.interestKey,
      color: palette[idx % palette.length],
    })) ?? [];

  const actionBarData =
    Object.entries(dto.actionCounts ?? {}).map(([k, v]: any, idx) => ({
      value: Number(v ?? 0),
      label: String(k),
      frontColor: palette[idx % palette.length],
      topLabelComponent: () => <Text style={styles.barTopLabel}>{v}</Text>,
    })) ?? [];

  const placeBarData =
    (dto.topPlaces ?? []).slice(0, 10).map((p: any, idx) => ({
      value: Number((p.score ?? 0).toFixed(2)),
      label: p.name ? String(p.name).slice(0, 10) : `#${p.placeId}`,
      frontColor: palette[idx % palette.length],
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>
          {Number((p.score ?? 0).toFixed(2))}
        </Text>
      ),
    })) ?? [];

  const sinceText = dto.sinceUtc
    ? new Date(dto.sinceUtc).toLocaleDateString("th-TH")
    : "-";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ความสนใจผู้ใช้ #{dto.userId}</Text>
          <Text style={styles.subTitle}>
            ข้อมูลตั้งแต่วันที่ {sinceText} ({dto.days} วันที่ผ่านมา)
          </Text>
        </View>

        <Pressable style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshText}>
            {isFetching ? "..." : "รีเฟรช"}
          </Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "data" && styles.tabActive]}
          onPress={() => setActiveTab("data")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "data" && styles.tabTextActive,
            ]}
          >
            📋 ข้อมูล
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "charts" && styles.tabActive]}
          onPress={() => setActiveTab("charts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "charts" && styles.tabTextActive,
            ]}
          >
            📊 กราฟ
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === "data" ? (
          /* Data Tab */
          <View style={styles.grid}>
            {/* Top Interests */}
            <Card title="ความสนใจสูงสุด">
              {dto.topInterests?.length ? (
                <View style={{ gap: 10 }}>
                  {dto.topInterests.slice(0, 20).map((it: any) => (
                    <View key={it.interestKey} style={styles.listRow}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {it.displayName || it.interestKey}
                      </Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {Number(it.weight ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyText text="ไม่มีข้อมูล" />
              )}
            </Card>

            {/* Action summary */}
            <Card title="สรุปพฤติกรรม">
              {dto.actionCounts && Object.keys(dto.actionCounts).length ? (
                <View style={{ gap: 10 }}>
                  {Object.entries(dto.actionCounts).map(([k, v]: any) => (
                    <View key={String(k)} style={styles.listRow}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {String(k)}
                      </Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{String(v)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyText text="ไม่มีพฤติกรรม" />
              )}
            </Card>

            {/* Top places */}
            <Card title="สถานที่ที่มีผลต่อความสนใจ">
              {dto.topPlaces?.length ? (
                <View style={{ gap: 10 }}>
                  {dto.topPlaces.slice(0, 20).map((p: any) => (
                    <View key={p.placeId} style={styles.placeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {p.name}
                        </Text>
                        {!!p.categoryName && (
                          <Text style={styles.placeSub} numberOfLines={1}>
                            {p.categoryName}
                          </Text>
                        )}
                      </View>
                      {typeof p.score === "number" && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {Number(p.score).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyText text="ไม่มีข้อมูล" />
              )}
            </Card>
          </View>
        ) : (
          /* Charts Tab */
          <View style={styles.chartsGrid}>
            {/* Pie */}
            {pieData.length > 0 && (
              <Card title="สัดส่วนความสนใจ">
                <View style={styles.chartWrap}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={110}
                    innerRadius={62}
                    showText
                    textColor="#111827"
                    textSize={10}
                    focusOnPress
                    centerLabelComponent={() => (
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.centerLabelTitle}>Top 5</Text>
                        <Text style={styles.centerLabelSub}>Interests</Text>
                      </View>
                    )}
                  />
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  {pieData.map((p, idx) => (
                    <View style={styles.legendRow} key={`${p.text}-${idx}`}>
                      <View
                        style={[styles.legendDot, { backgroundColor: p.color }]}
                      />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {p.text}
                      </Text>
                      <Text style={styles.legendValue}>{p.value}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Actions bar */}
            {actionBarData.length > 0 && (
              <Card title="จำนวนการกระทำ">
                <View style={styles.chartWrap}>
                  <BarChart
                    data={actionBarData}
                    height={260}
                    barWidth={26}
                    spacing={18}
                    roundedTop
                    yAxisThickness={0}
                    xAxisThickness={0}
                    xAxisLabelTextStyle={styles.xLabel}
                    noOfSections={4}
                    isAnimated
                  />
                </View>
              </Card>
            )}

            {/* Places bar */}
            {placeBarData.length > 0 && (
              <Card title="คะแนนสถานที่">
                <View style={styles.chartWrap}>
                  <BarChart
                    data={placeBarData}
                    height={260}
                    barWidth={26}
                    spacing={18}
                    roundedTop
                    yAxisThickness={0}
                    xAxisThickness={0}
                    xAxisLabelTextStyle={styles.xLabel}
                    noOfSections={4}
                    isAnimated
                    rotateLabel
                  />
                  <Text style={styles.hint}>
                    * แสดงสูงสุด 10 สถานที่ เพื่อความอ่านง่ายบนมือถือ
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { padding: 16, paddingBottom: 30 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "white",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subTitle: { marginTop: 6, color: "#6B7280", fontSize: 12, lineHeight: 16 },
  refreshBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshText: { fontWeight: "900", color: "#111827", fontSize: 12 },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#1E40AF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "white",
  },

  grid: { gap: 12 },
  chartsGrid: { gap: 12 },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  listTitle: { flex: 1, fontWeight: "800", color: "#111827", fontSize: 13 },
  placeSub: { color: "#6B7280", fontSize: 11, marginTop: 3 },

  badge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeText: { fontSize: 12, fontWeight: "900", color: "#334155" },

  emptyBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
  },
  muted: { color: "#6B7280", fontWeight: "700" },
  errorText: { color: "#DC2626", fontWeight: "900", fontSize: 16 },

  retryBtn: {
    marginTop: 12,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "white", fontWeight: "900" },

  chartWrap: { marginTop: 6 },
  xLabel: { color: "#6B7280", fontSize: 10, fontWeight: "700" },
  barTopLabel: { color: "#111827", fontSize: 10, fontWeight: "900" },

  hint: { marginTop: 10, color: "#6B7280", fontSize: 11, fontWeight: "700" },

  legend: { marginTop: 12, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 99 },
  legendText: { flex: 1, color: "#111827", fontWeight: "800", fontSize: 12 },
  legendValue: { color: "#6B7280", fontWeight: "900", fontSize: 12 },

  centerLabelTitle: { fontWeight: "900", color: "#111827", fontSize: 14 },
  centerLabelSub: {
    marginTop: 2,
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 11,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
});
