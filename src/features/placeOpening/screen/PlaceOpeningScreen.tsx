import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useGetPlaceOpeningQuery,
  useCreateDefaultOpeningMutation,
  useUpsertOpeningWeeklyMutation,
  useDeleteOpeningByPlaceMutation,
} from "../placeOpenApi";

import {
  dayNames,
  type UpsertOpeningHourDto,
  type UpsertWeeklyOpeningHoursDto,
  type PlaceType,
} from "../placetype";

// ---------- helpers ----------
function toHHmm(time?: string | null) {
  const t = (time ?? "").trim();
  const [h = "09", m = "00"] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function buildDefaultWeek(): UpsertOpeningHourDto[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: false,
  }));
}

function parseHHmmToDate(t: string) {
  const [hh = "0", mm = "0"] = (t || "0:0").split(":");
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d;
}

function formatDateToHHmm(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type RouteParams = { placeId: number; placeName?: string };

export default function PlaceOpeningScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RouteParams;

  const placeId = Number(params.placeId);
  const placeName = params.placeName ?? "สถานที่นี้";

  const invalid = !Number.isFinite(placeId) || placeId <= 0;

  const { data, isLoading, isFetching, error, refetch } =
    useGetPlaceOpeningQuery(placeId, { skip: invalid });

  const [createDefault, { isLoading: isCreating }] = useCreateDefaultOpeningMutation();
  const [upsertWeekly, { isLoading: isSaving }] = useUpsertOpeningWeeklyMutation();
  const [deleteByPlace, { isLoading: isDeleting }] = useDeleteOpeningByPlaceMutation();

  const [week, setWeek] = React.useState<UpsertOpeningHourDto[]>(buildDefaultWeek);

  const [picker, setPicker] = React.useState<{
    visible: boolean;
    dayOfWeek: number;
    field: "openTime" | "closeTime";
    value: Date;
  }>({ visible: false, dayOfWeek: 0, field: "openTime", value: new Date() });

  const hasOpeningHours = Array.isArray(data) && data.length > 0;

  // โหลดค่าเดิมจาก backend แล้วเติมให้ครบ 7 วัน
  React.useEffect(() => {
    if (!Array.isArray(data)) return;

    const map = new Map<number, PlaceType>();
    for (const oh of data) {
      const d = Number((oh as any).dayOfWeek);
      if (Number.isFinite(d)) map.set(d, oh as any);
    }

    setWeek(
      Array.from({ length: 7 }, (_, i) => {
        const oh = map.get(i);
        return {
          dayOfWeek: i,
          openTime: toHHmm((oh as any)?.openTime ?? "09:00"),
          closeTime: toHHmm((oh as any)?.closeTime ?? "18:00"),
          isClosed: Boolean((oh as any)?.isClosed),
        };
      })
    );
  }, [data]);

  const onToggleClosed = (day: number) => {
    setWeek((prev) => prev.map((x) => (x.dayOfWeek === day ? { ...x, isClosed: !x.isClosed } : x)));
  };

  const onChangeTime = (day: number, field: "openTime" | "closeTime", value: string) => {
    setWeek((prev) => prev.map((x) => (x.dayOfWeek === day ? { ...x, [field]: value } : x)));
  };

  const validateWeek = (items: UpsertOpeningHourDto[]) => {
    for (const it of items) {
      if (it.isClosed) continue;
      if (!it.openTime || !it.closeTime) return "กรุณากรอกเวลาเปิดและเวลาปิดให้ครบ";
      if (it.closeTime < it.openTime)
        return `วัน${dayNames[it.dayOfWeek]}: เวลาปิดต้องไม่น้อยกว่าเวลาเปิด`;
    }
    return null;
  };

  const handleCreateDefault = async () => {
    try {
      await createDefault({ placeId, body: { openTime: "09:00:00", closeTime: "18:00:00" } }).unwrap();
      await refetch();
      Alert.alert("สำเร็จ", "สร้างเวลาเริ่มต้นสำเร็จ");
    } catch (e: any) {
      Alert.alert("ผิดพลาด", e?.data?.errorMessages?.[0] ?? e?.message ?? "สร้างเวลาเริ่มต้นไม่สำเร็จ");
    }
  };

  const handleSaveWeekly = async () => {
    const msg = validateWeek(week);
    if (msg) return Alert.alert("ตรวจสอบข้อมูล", msg);

    const toHHmmss = (t: string) => (t.length === 5 ? `${t}:00` : t);

    const payload: UpsertWeeklyOpeningHoursDto = {
      items: week.map((x) => ({
        ...x,
        openTime: toHHmmss(x.openTime),
        closeTime: toHHmmss(x.closeTime),
      })),
    };

    try {
      await upsertWeekly({ placeId, body: payload }).unwrap();
      await refetch();
      Alert.alert("สำเร็จ", "บันทึกสำเร็จ");
    } catch (e: any) {
      Alert.alert("ผิดพลาด", e?.data?.errorMessages?.[0] ?? e?.message ?? "บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "ยืนยันการลบ",
      "คุณแน่ใจหรือไม่ว่าต้องการลบ/รีเซ็ตเวลาเปิด–ปิดทั้งหมดของสถานที่นี้?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteByPlace(placeId).unwrap();
              setWeek(buildDefaultWeek());
              Alert.alert("สำเร็จ", "ลบ/รีเซ็ตสำเร็จ");
            } catch (e: any) {
              Alert.alert("ผิดพลาด", e?.data?.errorMessages?.[0] ?? e?.message ?? "ลบไม่สำเร็จ");
            }
          },
        },
      ]
    );
  };

  const openPicker = (dayOfWeek: number, field: "openTime" | "closeTime", current: string) => {
    setPicker({
      visible: true,
      dayOfWeek,
      field,
      value: parseHHmmToDate(current),
    });
  };

  if (invalid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errBox}>placeId ไม่ถูกต้อง</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>เวลาเปิด–ปิดสถานที่</Text>
          <Text style={styles.subTitle}>
            ชื่อสถานที่: <Text style={{ fontWeight: "900", color: "#111827" }}>{placeName}</Text>
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <ActionBtn title="กลับ" variant="ghost" onPress={() => navigation.goBack()} disabled={isFetching} />
        <ActionBtn title={isFetching ? "..." : "รีเฟรช"} variant="ghost" onPress={refetch} disabled={isFetching} />
        <ActionBtn
          title={isSaving ? "กำลังบันทึก..." : "บันทึกทั้งสัปดาห์"}
          variant="primary"
          onPress={handleSaveWeekly}
          disabled={isSaving || isLoading || isFetching}
        />
        <ActionBtn
          title={isDeleting ? "กำลังลบ..." : "ลบ/รีเซ็ต"}
          variant="danger"
          onPress={handleDelete}
          disabled={isDeleting}
        />
      </View>

      {/* States */}
      {isLoading ? (
        <View style={styles.notice}>
          <ActivityIndicator />
          <Text style={styles.noticeText}>กำลังโหลดข้อมูล...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.notice, styles.noticeError]}>
          <Text style={[styles.noticeText, { color: "#991B1B" }]}>โหลดข้อมูลไม่สำเร็จ</Text>
          <Text style={styles.noticeSub}>กรุณาตรวจสอบการเชื่อมต่อหรือดูรายละเอียดในคอนโซล</Text>
        </View>
      ) : null}

      {!isLoading && !hasOpeningHours ? (
        <View style={[styles.notice, styles.noticeWarn]}>
          <Text style={[styles.noticeText, { color: "#92400E" }]}>ยังไม่มีเวลาเปิด–ปิดสำหรับสถานที่นี้</Text>
          <Text style={[styles.noticeSub, { color: "#92400E" }]}>
            กรุณาสร้างข้อมูลเวลาเปิด–ปิดเพื่อให้ผู้ใช้ทราบเวลาบริการ
          </Text>

          <View style={{ marginTop: 10 }}>
            <ActionBtn
              title={isCreating ? "กำลังสร้าง..." : "สร้างเวลา (09:00–18:00)"}
              variant="warning"
              onPress={handleCreateDefault}
              disabled={isCreating}
            />
          </View>
        </View>
      ) : null}

      {/* Weekly list */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableCard}>
          {week.map((d) => {
            const statusText = d.isClosed ? "ปิด" : `${d.openTime}–${d.closeTime}`;
            return (
              <View key={d.dayOfWeek} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.day}>{dayNames[d.dayOfWeek]}</Text>

                  <View style={styles.timeRow}>
                    <Pressable
                      onPress={() => openPicker(d.dayOfWeek, "openTime", d.openTime)}
                      disabled={d.isClosed}
                      style={({ pressed }) => [
                        styles.timeBtn,
                        d.isClosed && styles.timeBtnDisabled,
                        pressed && !d.isClosed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.timeText}>{d.openTime}</Text>
                    </Pressable>

                    <Text style={styles.toText}>ถึง</Text>

                    <Pressable
                      onPress={() => openPicker(d.dayOfWeek, "closeTime", d.closeTime)}
                      disabled={d.isClosed}
                      style={({ pressed }) => [
                        styles.timeBtn,
                        d.isClosed && styles.timeBtnDisabled,
                        pressed && !d.isClosed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.timeText}>{d.closeTime}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.right}>
                  <View style={styles.switchWrap}>
                    <Text style={styles.switchLabel}>ปิด</Text>
                    <Switch value={d.isClosed} onValueChange={() => onToggleClosed(d.dayOfWeek)} />
                  </View>

                  <View style={[styles.badge, d.isClosed ? styles.badgeClosed : styles.badgeOpen]}>
                    <Text style={[styles.badgeText, d.isClosed ? styles.badgeTextClosed : styles.badgeTextOpen]}>
                      {statusText}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>💡 หมายเหตุ</Text>
          <Text style={styles.tipText}>
            ระบบนี้ไม่รองรับการเปิดข้ามวัน (เช่น 18:00–02:00) โปรดตั้งค่าเวลาเปิด–ปิดของแต่ละวันแยกกัน
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker */}
      {picker.visible ? (
        <DateTimePicker
          value={picker.value}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            if (Platform.OS !== "ios") {
              // android: ปิดทันที
              setPicker((p) => ({ ...p, visible: false }));
            }
            if (event.type === "dismissed" || !date) return;

            const next = formatDateToHHmm(date);
            onChangeTime(picker.dayOfWeek, picker.field, next);

            // ios: ให้ปิดเองหลังเลือก (จะปิดทันทีเหมือนกันเพื่อใช้ง่าย)
            if (Platform.OS === "ios") setPicker((p) => ({ ...p, visible: false }));
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ActionBtn({
  title,
  onPress,
  disabled,
  variant,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant: "ghost" | "primary" | "danger" | "warning";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.aBtn,
        variant === "ghost" && styles.aGhost,
        variant === "primary" && styles.aPrimary,
        variant === "danger" && styles.aDanger,
        variant === "warning" && styles.aWarning,
        disabled && styles.aDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.aText,
          variant === "ghost" && { color: "#111827" },
          variant !== "ghost" && { color: "white" },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subTitle: { marginTop: 4, color: "#6B7280", fontWeight: "700", fontSize: 12 },

  actionsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  aBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    minWidth: 90,
    alignItems: "center",
  },
  aText: { fontWeight: "900", fontSize: 12 },
  aGhost: { backgroundColor: "white" },
  aPrimary: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  aDanger: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  aWarning: { backgroundColor: "#D97706", borderColor: "#D97706" },
  aDisabled: { opacity: 0.55 },

  notice: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    gap: 6,
  },
  noticeError: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  noticeWarn: { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" },
  noticeText: { fontWeight: "900", color: "#1D4ED8" },
  noticeSub: { color: "#6B7280", fontWeight: "700", fontSize: 12 },

  content: { padding: 16, paddingBottom: 30 },

  tableCard: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  day: { fontWeight: "900", color: "#111827", marginBottom: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  timeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    minWidth: 84,
    alignItems: "center",
  },
  timeBtnDisabled: { backgroundColor: "#F3F4F6" },
  timeText: { fontWeight: "900", color: "#111827" },
  toText: { color: "#6B7280", fontWeight: "800" },

  right: { alignItems: "flex-end", gap: 10 },
  switchWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { color: "#111827", fontWeight: "900", fontSize: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOpen: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeClosed: { backgroundColor: "#E5E7EB", borderColor: "#D1D5DB" },
  badgeText: { fontWeight: "900", fontSize: 12 },
  badgeTextOpen: { color: "#166534" },
  badgeTextClosed: { color: "#374151" },

  tip: {
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 6,
  },
  tipTitle: { fontWeight: "900", color: "#111827" },
  tipText: { color: "#6B7280", fontWeight: "700", fontSize: 12, lineHeight: 16 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  errBox: {
    color: "#991B1B",
    fontWeight: "900",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 12,
    borderRadius: 14,
  },
});
