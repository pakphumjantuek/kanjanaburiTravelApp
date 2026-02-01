import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { PieChart, BarChart } from "react-native-gifted-charts";

import {
  useGetRecommendStatusQuery,
  useGetTrainingStatsQuery,
  useRetrainNowMutation,
} from "../recommendApi";
import { formatThaiDate, formatThaiDateTime } from "../../../utils/dateUtils";

type TabType = "status" | "charts" | "config";

export default function RecommendAdminScreen() {
  const [days, setDays] = useState(90);
  const [minRows, setMinRows] = useState(20);
  const [activeTab, setActiveTab] = useState<TabType>("status");

  const {
    data: status,
    isLoading: loadingStatus,
    isFetching: fetchingStatus,
    isError: errStatus,
    refetch: refetchStatus,
  } = useGetRecommendStatusQuery();

  const {
    data: stats,
    isLoading: loadingStats,
    isFetching: fetchingStats,
    isError: errStats,
    refetch: refetchStats,
  } = useGetTrainingStatsQuery(
    { days },
    {
      pollingInterval: 3000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const [retrainNow, { isLoading: training }] = useRetrainNowMutation();

  const isFetching = fetchingStatus || fetchingStats;

  const onRefresh = () => {
    refetchStatus();
    refetchStats();
  };

  const onRetrain = async () => {
    try {
      await retrainNow({ days, minRows }).unwrap();
      await Promise.all([refetchStatus(), refetchStats()]);
      Alert.alert("สำเร็จ", "เทรนโมเดลสำเร็จ");
    } catch (e: any) {
      Alert.alert(
        "ผิดพลาด",
        e?.data?.errorMessages?.[0] ?? e?.message ?? "เทรนไม่สำเร็จ",
      );
    }
  };

  // ----------------------------
  // Chart data prep (Gifted Charts)
  // ----------------------------
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

  const actionsPieData = useMemo(() => {
    const list = stats?.actions ?? [];
    // Gifted pie wants {value,color,label}
    return list
      .filter((x: any) => Number(x?.count ?? 0) > 0)
      .map((a: any, idx: number) => ({
        value: Number(a.count ?? 0),
        label: String(a.actionType ?? "-"),
        color: palette[idx % palette.length],
      }))
      .slice(0, 8);
  }, [stats, palette]);

  const topUsersBarData = useMemo(() => {
    const list = stats?.topUsers ?? [];
    const users: { label: string; value: number }[] = [];
    let guestLogs = 0;

    for (const u of list) {
      const logs = Number(u?.logs ?? 0);
      if (!logs) continue;

      if (u?.userId) users.push({ label: `#${u.userId}`, value: logs });
      else guestLogs += logs;
    }

    if (guestLogs > 0) users.push({ label: "Guest", value: guestLogs });

    return users.slice(0, 10).map((x, idx) => ({
      value: x.value,
      label: x.label,
      frontColor: palette[idx % palette.length],
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{String(x.value)}</Text>
      ),
    }));
  }, [stats]);

  const topPlacesBarData = useMemo(() => {
    const list = stats?.topPlaces ?? [];
    return list.slice(0, 10).map((p: any, idx) => {
      const v = Number(p?.logs ?? 0);
      const label = (p?.name ? String(p.name) : `#${p?.placeId ?? "-"}`).slice(
        0,
        10,
      );
      return {
        value: v,
        label,
        frontColor: palette[idx % palette.length],
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{String(v)}</Text>
        ),
      };
    });
  }, [stats]);

  // metrics
  const sinceText = stats?.sinceUtc
    ? formatThaiDate(stats.sinceUtc.slice(0, 10))
    : "-";

  const modelReady = !!status?.model?.exists;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>แนะนำแบบฉลาด (ML)</Text>
          <Text style={styles.subTitle}>แดชบอร์ด & การตั้งค่า</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[
              styles.btn,
              styles.btnPrimary,
              training && styles.btnDisabled,
            ]}
            disabled={training}
            onPress={onRetrain}
          >
            <Text style={styles.btnTextPrimary}>
              {training ? "กำลังเทรน..." : "⚡ Retrain"}
            </Text>
          </Pressable>

          <Pressable style={[styles.btn, styles.btnGhost]} onPress={onRefresh}>
            <Text style={styles.btnTextGhost}>รีเฟรช</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          id="status"
          label="🤖 สถานะ"
          active={activeTab}
          onPress={setActiveTab}
        />
        <TabButton
          id="charts"
          label="📊 กราฟ"
          active={activeTab}
          onPress={setActiveTab}
        />
        <TabButton
          id="config"
          label="⚙️ ตั้งค่า"
          active={activeTab}
          onPress={setActiveTab}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* STATUS TAB */}
        {activeTab === "status" && (
          <View style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>สถานะโมเดล</Text>
              <View
                style={[
                  styles.badge,
                  modelReady ? styles.badgeOk : styles.badgeBad,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    modelReady ? styles.badgeTextOk : styles.badgeTextBad,
                  ]}
                >
                  {modelReady ? "พร้อมใช้งาน" : "ยังไม่มีไฟล์โมเดล"}
                </Text>
              </View>
            </View>

            {loadingStatus ? (
              <Center text="กำลังโหลด..." />
            ) : errStatus ? (
              <Center text="โหลดไม่สำเร็จ" />
            ) : (
              <Card title="รายละเอียด">
                <InfoRow
                  label="📁 เส้นทาง"
                  value={status?.model?.path ?? "-"}
                />
                <InfoRow
                  label="📅 เทรนครั้งสุดท้าย"
                  value={
                    status?.model?.lastTrainedAtUtc
                      ? formatThaiDateTime(status.model.lastTrainedAtUtc)
                      : "-"
                  }
                />
                <InfoRow
                  label="💾 เขียนครั้งสุดท้าย"
                  value={
                    status?.model?.lastWriteUtc
                      ? formatThaiDateTime(status.model.lastWriteUtc)
                      : "-"
                  }
                />

                {!!status?.training && (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <Text style={styles.miniTitle}>สถานะการเทรน</Text>

                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>สถานะ</Text>
                      <Text
                        style={[
                          styles.kvVal,
                          status.training.isTraining && { color: "#EA580C" },
                        ]}
                      >
                        {status.training.isTraining ? "กำลังเทรน..." : "ว่าง"}
                      </Text>
                    </View>

                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>สำเร็จครั้งสุดท้าย</Text>
                      <Text style={styles.kvVal}>
                        {status.training.lastSuccessUtc
                          ? formatThaiDateTime(status.training.lastSuccessUtc)
                          : "-"}
                      </Text>
                    </View>

                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>แถวล่าสุด</Text>
                      <Text style={styles.kvVal}>
                        {String(status.training.lastRows ?? "-")}
                      </Text>
                    </View>

                    <View style={styles.kvRow}>
                      <Text style={styles.kvKey}>ข้อความล่าสุด</Text>
                      <Text style={styles.kvVal} numberOfLines={2}>
                        {String(status.training.lastMessage ?? "-")}
                      </Text>
                    </View>
                  </View>
                )}
              </Card>
            )}
          </View>
        )}

        {/* CHARTS TAB */}
        {activeTab === "charts" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>สถิติและแผนภูมิ</Text>

            {loadingStats ? (
              <Center text="กำลังโหลด..." />
            ) : errStats ? (
              <Center text="โหลดสถิติไม่สำเร็จ" />
            ) : (
              <>
                {/* Metrics */}
                <View style={styles.metrics}>
                  <Stat
                    label="บันทึกทั้งหมด"
                    value={stats?.totalLogs ?? 0}
                    icon="📝"
                  />
                  <Stat
                    label="บันทึกสถานที่"
                    value={stats?.placeLogs ?? 0}
                    icon="📍"
                  />
                  <Stat
                    label="ผู้ใช้ไม่ซ้ำ"
                    value={stats?.uniqueUsers ?? 0}
                    icon="👥"
                  />
                  <Stat
                    label="สถานที่ไม่ซ้ำ"
                    value={stats?.uniquePlaces ?? 0}
                    icon="🏢"
                  />
                  <Stat
                    label="แถวเทรนได้"
                    value={stats?.rowsTrainable ?? 0}
                    icon="✓"
                  />
                  <Stat label="ข้อมูลตั้งแต่" value={sinceText} icon="📅" />
                </View>

                {/* Pie */}
                {actionsPieData.length > 0 && (
                  <Card title="🎯 สัดส่วนการกระทำ">
                    <View style={styles.chartWrap}>
                      <PieChart
                        data={actionsPieData}
                        donut
                        radius={110}
                        innerRadius={62}
                        showText
                        textColor="#111827"
                        textSize={10}
                        focusOnPress
                        centerLabelComponent={() => (
                          <View style={{ alignItems: "center" }}>
                            <Text style={styles.centerLabelTitle}>Actions</Text>
                            <Text style={styles.centerLabelSub}>
                              Top {actionsPieData.length}
                            </Text>
                          </View>
                        )}
                      />
                    </View>

                    <View style={styles.legend}>
                      {actionsPieData.map((p, idx) => (
                        <View
                          style={styles.legendRow}
                          key={`${p.label}-${idx}`}
                        >
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: p.color },
                            ]}
                          />
                          <Text style={styles.legendText} numberOfLines={1}>
                            {p.label}
                          </Text>
                          <Text style={styles.legendValue}>{p.value}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}

                {/* Top Users Bar (scroll) */}
                {topUsersBarData.length > 0 && (
                  <Card title="👥 ผู้ใช้ยอดนิยม">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <BarChart
                        data={topUsersBarData}
                        height={260}
                        barWidth={26}
                        spacing={18}
                        initialSpacing={10}
                        endSpacing={10}
                        width={Math.max(330, topUsersBarData.length * 62)}
                        roundedTop
                        yAxisThickness={0}
                        xAxisThickness={0}
                        xAxisLabelTextStyle={styles.xLabel}
                        noOfSections={4}
                      />
                    </ScrollView>
                    <Text style={styles.hint}>
                      * เลื่อนซ้าย/ขวาเพื่อดูทั้งหมด
                    </Text>
                  </Card>
                )}

                {/* Top Places Bar (scroll) */}
                {topPlacesBarData.length > 0 && (
                  <Card title="🏆 สถานที่ยอดนิยม">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <BarChart
                        data={topPlacesBarData}
                        height={260}
                        barWidth={26}
                        spacing={18}
                        initialSpacing={10}
                        endSpacing={10}
                        width={Math.max(330, topPlacesBarData.length * 62)}
                        roundedTop
                        yAxisThickness={0}
                        xAxisThickness={0}
                        xAxisLabelTextStyle={styles.xLabel}
                        noOfSections={4}
                      />
                    </ScrollView>
                    <Text style={styles.hint}>
                      * เลื่อนซ้าย/ขวาเพื่อดูทั้งหมด
                    </Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}

        {/* CONFIG TAB */}
        {activeTab === "config" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>การตั้งค่า</Text>

            <Card title="📅 ย้อนหลังกี่วัน">
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(days)}
                onChangeText={(t) =>
                  setDays(Number(t.replace(/[^0-9]/g, "")) || 0)
                }
                placeholder="90"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.hint}>0 = ข้อมูลทั้งหมด</Text>
            </Card>

            <Card title="📊 จำนวนแถวขั้นต่ำ">
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(minRows)}
                onChangeText={(t) =>
                  setMinRows(Number(t.replace(/[^0-9]/g, "")) || 1)
                }
                placeholder="20"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.hint}>ต้องมีแถวขั้นต่ำนี้เพื่อเทรน</Text>
            </Card>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️ ข้อมูล</Text>
              <Text style={styles.infoLine}>
                • วันปัจจุบัน:{" "}
                <Text style={styles.mono}>
                  {new Date().toLocaleDateString("th-TH")}
                </Text>
              </Text>
              <Text style={styles.infoLine}>
                • วันที่ย้อนหลัง: <Text style={styles.mono}>{days} วัน</Text>
              </Text>
              <Text style={styles.infoLine}>
                • แถวขั้นต่ำ: <Text style={styles.mono}>{minRows} แถว</Text>
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */

function TabButton({
  id,
  label,
  active,
  onPress,
}: {
  id: TabType;
  label: string;
  active: TabType;
  onPress: (id: TabType) => void;
}) {
  const isActive = active === id;
  return (
    <Pressable
      onPress={() => onPress(id)}
      style={[styles.tab, isActive && styles.tabActive]}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
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

function Center({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {icon ? `${icon} ` : ""}
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {String(value)}
      </Text>
    </View>
  );
}

/* ---------- styles ---------- */

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

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  btnGhost: { backgroundColor: "white", borderColor: "#E5E7EB" },
  btnTextPrimary: { color: "white", fontWeight: "900", fontSize: 12 },
  btnTextGhost: { color: "#111827", fontWeight: "900", fontSize: 12 },
  btnDisabled: { opacity: 0.55 },

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
  tabActive: { backgroundColor: "#1E40AF" },
  tabText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  tabTextActive: { color: "white" },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeBad: { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
  badgeText: { fontWeight: "900", fontSize: 12 },
  badgeTextOk: { color: "#166534" },
  badgeTextBad: { color: "#991B1B" },

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

  infoLabel: { color: "#6B7280", fontWeight: "800", fontSize: 12 },
  infoValue: { color: "#111827", fontWeight: "800" },

  miniTitle: { fontWeight: "900", color: "#111827", marginTop: 6 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  kvKey: { color: "#6B7280", fontWeight: "800" },
  kvVal: { color: "#111827", fontWeight: "900", flex: 1, textAlign: "right" },

  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 10,
    gap: 6,
  },
  statLabel: { color: "#6B7280", fontWeight: "800", fontSize: 12 },
  statValue: { color: "#111827", fontWeight: "900", fontSize: 16 },

  chartWrap: { marginTop: 6 },
  legend: { marginTop: 12, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 99 },
  legendText: { flex: 1, color: "#111827", fontWeight: "800", fontSize: 12 },
  legendValue: { color: "#6B7280", fontWeight: "900", fontSize: 12 },

  xLabel: { color: "#6B7280", fontSize: 10, fontWeight: "700" },
  barTopLabel: { color: "#111827", fontSize: 10, fontWeight: "900" },

  hint: { marginTop: 10, color: "#6B7280", fontSize: 11, fontWeight: "700" },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    fontWeight: "900",
  },

  infoBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  infoTitle: { fontWeight: "900", color: "#111827" },
  infoLine: { color: "#111827", fontWeight: "700" },
  mono: { fontFamily: "monospace" as any, fontWeight: "900" },

  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  muted: { color: "#6B7280", fontWeight: "700" },

  centerLabelTitle: { fontWeight: "900", color: "#111827", fontSize: 14 },
  centerLabelSub: {
    marginTop: 2,
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 11,
  },
});
