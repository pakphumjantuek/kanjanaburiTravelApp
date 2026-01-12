// AutoTripModal.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useGetAllPlaceTagQuery } from "../../placeTag/placeTagApi";

type Props = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (v: {
    days: number;
    hoursPerDay: number;
    preferredTagNames: string[];
    relaxedPace: number;
    budgetLevel: number;
    withElderOrKids: boolean;
  }) => void;
};

type UiTag = { tagId: number; tagName: string; count: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export default function AutoTripModal({
  visible,
  loading,
  onClose,
  onConfirm,
}: Props) {
  // -------------------------
  // Load tags from backend
  // -------------------------
  const { data, isLoading, isError } = useGetAllPlaceTagQuery(
    { page: 1, pageSize: 500, search: "" },
    { skip: !visible }
  );

  const tags: UiTag[] = useMemo(() => {
    const items = data?.items ?? [];

    const map = new Map<number, UiTag>();

    for (const pt of items as any[]) {
      // รองรับทั้งแบบ pt.tag.{tagId,tagName} หรือ pt.tagId/pt.tagName
      const tagId = pt?.tag?.tagId ?? pt?.tagId;
      const tagName = pt?.tag?.tagName ?? pt?.tagName;

      if (!tagId || !tagName) continue;

      if (!map.has(tagId)) {
        map.set(tagId, { tagId, tagName, count: 0 });
      }
      map.get(tagId)!.count += 1;
    }

    // เรียงจากใช้เยอะ -> น้อย (optional)
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [data]);

  // -------------------------
  // Form state
  // -------------------------
  const [days, setDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [relaxedPace, setRelaxedPace] = useState(0.5);
  const [budgetLevel, setBudgetLevel] = useState(0.5);
  const [withElderOrKids, setWithElderOrKids] = useState(false);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((x) => x !== tagName)
        : [...prev, tagName]
    );
  };

  const reset = () => {
    setDays(1);
    setHoursPerDay(8);
    setSelectedTags([]);
    setRelaxedPace(0.5);
    setBudgetLevel(0.5);
    setWithElderOrKids(false);
  };

  useEffect(() => {
    if (!visible) return;
    reset();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>สร้างทริปอัตโนมัติ</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#83829A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Days / Hours */}
            <View style={s.row2}>
              <View style={s.card}>
                <Text style={s.label}>กี่วัน</Text>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setDays((v) => clamp(v - 1, 1, 7))}
                    disabled={days <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={days <= 1 ? "#C1C0C8" : "#2A4D50"}
                    />
                  </TouchableOpacity>
                  <Text style={s.stepValue}>{days}</Text>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setDays((v) => clamp(v + 1, 1, 7))}
                    disabled={days >= 7}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={days >= 7 ? "#C1C0C8" : "#2A4D50"}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={s.hint}>1–7 วัน</Text>
              </View>

              <View style={s.card}>
                <Text style={s.label}>ชั่วโมง/วัน</Text>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setHoursPerDay((v) => clamp(v - 1, 4, 14))}
                    disabled={hoursPerDay <= 4}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={hoursPerDay <= 4 ? "#C1C0C8" : "#2A4D50"}
                    />
                  </TouchableOpacity>
                  <Text style={s.stepValue}>{hoursPerDay}</Text>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setHoursPerDay((v) => clamp(v + 1, 4, 14))}
                    disabled={hoursPerDay >= 14}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={hoursPerDay >= 14 ? "#C1C0C8" : "#2A4D50"}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={s.hint}>4–14 ชม.</Text>
              </View>
            </View>

            {/* Tags */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>แนวที่ชอบ</Text>
                <TouchableOpacity onPress={() => setSelectedTags([])}>
                  <Text style={s.clear}>ล้าง</Text>
                </TouchableOpacity>
              </View>

              <View style={s.chipsWrap}>
                {isLoading ? (
                  <Text style={s.note}>กำลังโหลดแท็ก...</Text>
                ) : isError ? (
                  <Text style={s.note}>โหลดแท็กไม่สำเร็จ</Text>
                ) : tags.length === 0 ? (
                  <Text style={s.note}>ยังไม่มีแท็กในระบบ</Text>
                ) : (
                  tags.map((t) => {
                    const active = selectedTags.includes(t.tagName);
                    return (
                      <TouchableOpacity
                        key={t.tagId}
                        onPress={() => toggleTag(t.tagName)}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text
                          style={[s.chipText, active && s.chipTextActive]}
                          numberOfLines={1}
                        >
                          {t.tagName}
                          {!!t.count && (
                            <Text style={{ opacity: active ? 0.9 : 0.6 }}>
                              {" "}
                              · {t.count}
                            </Text>
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

             
            </View>

            {/* Pace */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>ความชิล</Text>
                <Text style={s.percent}>{Math.round(relaxedPace * 100)}%</Text>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={relaxedPace}
                onValueChange={setRelaxedPace}
                minimumTrackTintColor="#7c3aed"
                maximumTrackTintColor="#e5e7eb"
              />
              <View style={s.scaleRow}>
                <Text style={s.scale}>แน่น</Text>
                <Text style={s.scale}>ชิล</Text>
              </View>
            </View>

            {/* Budget */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>งบประมาณ</Text>
                <Text style={s.percent}>{Math.round(budgetLevel * 100)}%</Text>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={budgetLevel}
                onValueChange={setBudgetLevel}
                minimumTrackTintColor="#2A4D50"
                maximumTrackTintColor="#e5e7eb"
              />
              <View style={s.scaleRow}>
                <Text style={s.scale}>ประหยัด</Text>
                <Text style={s.scale}>แพงได้</Text>
              </View>
            </View>

            {/* Elder/Kids */}
            <View style={s.section}>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>มีเด็ก / ผู้สูงอายุ</Text>
                  <Text style={s.note}>จะช่วยให้แผนชิลขึ้น</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setWithElderOrKids((v) => !v)}
                  style={[
                    s.toggleBtn,
                    withElderOrKids ? s.toggleOn : s.toggleOff,
                  ]}
                >
                  <Text
                    style={[
                      s.toggleText,
                      withElderOrKids ? s.toggleTextOn : s.toggleTextOff,
                    ]}
                  >
                    {withElderOrKids ? "ใช่" : "ไม่"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              onPress={reset}
              disabled={loading}
              style={s.outlineBtn}
            >
              <Text style={s.outlineText}>รีเซ็ต</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              onPress={() =>
                onConfirm({
                  days,
                  hoursPerDay,
                  preferredTagNames: selectedTags,
                  relaxedPace,
                  budgetLevel,
                  withElderOrKids,
                })
              }
              style={[s.primaryBtn, loading && { opacity: 0.6 }]}
            >
              <Text style={s.primaryText}>
                {loading ? "กำลังสร้าง..." : "สร้างทริป"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },

  row2: { flexDirection: "row", gap: 10, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#F3F4F8",
    borderRadius: 16,
    padding: 12,
  },
  label: { fontSize: 12, fontWeight: "800", color: "#2A4D50" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 18, fontWeight: "900", color: "#000" },
  hint: { marginTop: 6, fontSize: 11, color: "#83829A", fontWeight: "600" },

  section: { marginTop: 8, marginBottom: 8 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#000" },
  clear: { fontSize: 12, fontWeight: "800", color: "#83829A" },
  percent: { fontSize: 12, fontWeight: "900", color: "#83829A" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  chipText: { fontSize: 12, fontWeight: "800", color: "#83829A" },
  chipTextActive: { color: "#fff" },

  note: { marginTop: 6, fontSize: 11, color: "#83829A", fontWeight: "600" },
  scaleRow: { flexDirection: "row", justifyContent: "space-between" },
  scale: { fontSize: 11, color: "#83829A", fontWeight: "700" },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleBtn: {
    width: 64,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "#16a34a" },
  toggleOff: { backgroundColor: "#F3F4F8" },
  toggleText: { fontWeight: "900", fontSize: 13 },
  toggleTextOn: { color: "#fff" },
  toggleTextOff: { color: "#2A4D50" },

  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#2A4D50",
    alignItems: "center",
  },
  outlineText: { color: "#2A4D50", fontWeight: "900" },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#2A4D50",
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900" },
});
