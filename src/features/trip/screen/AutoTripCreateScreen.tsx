// AutoTripCreateScreen.tsx - ปรับปรุง UX/UI
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useGetAllPlaceTagQuery } from "../../placeTag/placeTagApi";
import { useGenerateAutoTripMutation } from "../tripApi";

type UiTag = { tagId: number; tagName: string; count: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// ✨ เพิ่ม Preset Templates
type TripPreset = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  days: number;
  hoursPerDay: number;
  relaxedPace: number;
  budgetLevel: number;
  withElderOrKids: boolean;
  suggestedTags?: string[];
};

const PRESETS: TripPreset[] = [
  {
    id: "family",
    icon: "people",
    name: "ทริปครอบครัว",
    desc: "ชิลๆ เหมาะกับเด็กและผู้สูงอายุ",
    days: 2,
    hoursPerDay: 8,
    relaxedPace: 0.7,
    budgetLevel: 0.5,
    withElderOrKids: true,
    suggestedTags: ["ธรรมชาติ", "วัฒนธรรม", "อาหาร"],
  },
  {
    id: "adventure",
    icon: "bicycle",
    name: "ผจญภัย",
    desc: "เต็มที่ สนุกสุดมันส์",
    days: 3,
    hoursPerDay: 10,
    relaxedPace: 0.2,
    budgetLevel: 0.6,
    withElderOrKids: false,
    suggestedTags: ["ผจญภัย", "กีฬา", "ธรรมชาติ"],
  },
  {
    id: "chill",
    icon: "cafe",
    name: "พักผ่อน",
    desc: "ช้าๆ ชิลๆ ไม่เร่งรีบ",
    days: 2,
    hoursPerDay: 6,
    relaxedPace: 0.8,
    budgetLevel: 0.4,
    withElderOrKids: false,
    suggestedTags: ["คาเฟ่", "ธรรมชาติ", "ช้อปปิ้ง"],
  },
  {
    id: "explore",
    icon: "compass",
    name: "สำรวจ",
    desc: "ไปเยอะๆ ดูให้ครบ",
    days: 3,
    hoursPerDay: 9,
    relaxedPace: 0.4,
    budgetLevel: 0.5,
    withElderOrKids: false,
    suggestedTags: ["ประวัติศาสตร์", "วัฒนธรรม", "ช้อปปิ้ง"],
  },
];

export default function AutoTripCreateScreen() {
  const navigation = useNavigation<any>();

  const { data, isLoading: tagLoading, isError: tagError, refetch } =
    useGetAllPlaceTagQuery({ page: 1, pageSize: 500, search: "" });

  const tags: UiTag[] = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<number, UiTag>();

    for (const pt of items as any[]) {
      const tagId = pt?.tag?.tagId ?? pt?.tagId;
      const tagName = pt?.tag?.tagName ?? pt?.tagName;
      if (!tagId || !tagName) continue;

      if (!map.has(tagId)) map.set(tagId, { tagId, tagName, count: 0 });
      map.get(tagId)!.count += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [data]);

  const [generateAutoTrip, { isLoading: creating }] =
    useGenerateAutoTripMutation();

  // ✨ เพิ่ม step navigation
  const [currentStep, setCurrentStep] = useState(1); // 1=preset, 2=basic, 3=detail

  const [days, setDays] = useState(2); // เปลี่ยนค่า default เป็น 2 วัน (เหมาะกับวันหยุดสุดสัปดาห์)
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [relaxedPace, setRelaxedPace] = useState(0.5);
  const [budgetLevel, setBudgetLevel] = useState(0.5);
  const [withElderOrKids, setWithElderOrKids] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((x) => x !== tagName)
        : [...prev, tagName]
    );
  };

  const applyPreset = (preset: TripPreset) => {
    setSelectedPreset(preset.id);
    setDays(preset.days);
    setHoursPerDay(preset.hoursPerDay);
    setRelaxedPace(preset.relaxedPace);
    setBudgetLevel(preset.budgetLevel);
    setWithElderOrKids(preset.withElderOrKids);
    if (preset.suggestedTags) {
      setSelectedTags(preset.suggestedTags);
    }
    setCurrentStep(2); // ข้ามไปหน้าถัดไป
  };

  const reset = () => {
    setDays(2);
    setHoursPerDay(8);
    setSelectedTags([]);
    setRelaxedPace(0.5);
    setBudgetLevel(0.5);
    setWithElderOrKids(false);
    setSelectedPreset(null);
    setCurrentStep(1);
  };

  const handleCreate = async () => {
    // ✨ Validation
    if (selectedTags.length === 0) {
      Alert.alert(
        "โปรดเลือกแนวที่สนใจ",
        "เลือกอย่างน้อย 1 แนว เพื่อให้ AI แนะนำสถานที่ที่เหมาะกับคุณ"
      );
      return;
    }

    try {
      const start = new Date();
      start.setHours(8, 0, 0, 0);

      const trip = await generateAutoTrip({
        startDateTime: start.toISOString(),
        days,
        hoursPerDay,
        startLat: null,
        startLng: null,
        transportMode: "driving",
        preferredTagNames: selectedTags,
        relaxedPace,
        budgetLevel,
        withElderOrKids,
      } as any).unwrap();

      navigation.navigate("TripDetailScreen", { tripId: trip.tripId });
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "ผิดพลาด",
        err?.data?.errorMessages?.[0] ?? "สร้างทริปอัตโนมัติไม่สำเร็จ"
      );
    }
  };

  // ✨ Helper functions for better UX
  const getPaceLabel = (value: number) => {
    if (value < 0.3) return "เต็มที่ (เยอะมาก)";
    if (value < 0.5) return "ค่อนข้างแน่น";
    if (value < 0.7) return "พอดี";
    if (value < 0.9) return "ชิลๆ";
    return "ชิลสุดๆ";
  };

  const getBudgetLabel = (value: number) => {
    if (value < 0.3) return "ประหยัด (< 500฿/วัน)";
    if (value < 0.5) return "ปานกลาง (500-1000฿)";
    if (value < 0.7) return "ค่อนข้างสูง (1000-2000฿)";
    return "ไม่จำกัดงบ (2000฿+)";
  };

  const getEstimatedPlaces = () => {
    const placesPerDay = Math.round(hoursPerDay / (2.5 - relaxedPace * 1.5));
    return placesPerDay * days;
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                navigation.goBack();
              }
            }}
            style={s.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>
              {currentStep === 1 && "เลือกแบบทริป"}
              {currentStep === 2 && "ตั้งค่าพื้นฐาน"}
              {currentStep === 3 && "ปรับแต่งรายละเอียด"}
            </Text>
            <Text style={s.headerSub}>
              ขั้นตอนที่ {currentStep} จาก 3
            </Text>
          </View>

          <View style={s.robotBadge}>
            <MaterialCommunityIcons
              name="robot-happy-outline"
              size={18}
              color="#fff"
            />
          </View>
        </View>

        {/* ✨ Progress bar */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* ========= STEP 1: Preset Selection ========= */}
          {currentStep === 1 && (
            <View>
              <Text style={s.bigTitle}>คุณอยากได้ทริปแบบไหน?</Text>
              <Text style={s.bigDesc}>
                เลือกแบบที่ใกล้เคียงกับสิ่งที่คุณต้องการ (ปรับแต่งได้ในขั้นตอนถัดไป)
              </Text>

              <View style={s.presetGrid}>
                {PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => applyPreset(preset)}
                    style={[
                      s.presetCard,
                      selectedPreset === preset.id && s.presetCardActive,
                    ]}
                  >
                    <View style={s.presetIcon}>
                      <Ionicons
                        name={preset.icon as any}
                        size={32}
                        color="#2A4D50"
                      />
                    </View>
                    <Text style={s.presetName}>{preset.name}</Text>
                    <Text style={s.presetDesc}>{preset.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setCurrentStep(2)}
                style={s.skipBtn}
              >
                <Text style={s.skipText}>ข้าม (กำหนดเอง)</Text>
                <Ionicons name="arrow-forward" size={16} color="#2A4D50" />
              </TouchableOpacity>
            </View>
          )}

          {/* ========= STEP 2: Basic Settings ========= */}
          {currentStep === 2 && (
            <View>
              <Text style={s.bigTitle}>ตั้งค่าพื้นฐาน</Text>
              <Text style={s.bigDesc}>กำหนดระยะเวลาและแนวที่สนใจ</Text>

              {/* Duration */}
              <View style={s.sectionBox}>
                <Text style={s.sectionTitle}>📅 ระยะเวลา</Text>
                <View style={s.row2}>
                  <View style={s.card}>
                    <Text style={s.label}>จำนวนวัน</Text>
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
                    <Text style={s.label}>ชั่วโมงต่อวัน</Text>
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
              </View>

              {/* Tags */}
              <View style={s.sectionBox}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>🏷️ แนวที่สนใจ</Text>
                  {selectedTags.length > 0 && (
                    <TouchableOpacity onPress={() => setSelectedTags([])}>
                      <Text style={s.clear}>ล้าง ({selectedTags.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={s.sectionDesc}>
                  เลือกแนวที่คุณสนใจ (เลือกได้หลายแนว)
                </Text>

                <View style={s.tagsBox}>
                  {tagLoading ? (
                    <View style={s.loadingRow}>
                      <ActivityIndicator size="small" color="#2A4D50" />
                      <Text style={s.note}>กำลังโหลดแท็ก...</Text>
                    </View>
                  ) : tagError ? (
                    <View>
                      <Text style={s.note}>โหลดแท็กไม่สำเร็จ</Text>
                      <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
                        <Ionicons name="refresh" size={16} color="#2A4D50" />
                        <Text style={s.retryText}>ลองใหม่</Text>
                      </TouchableOpacity>
                    </View>
                  ) : tags.length === 0 ? (
                    <Text style={s.note}>ยังไม่มีแท็กในระบบ</Text>
                  ) : (
                    <View style={s.chipsWrap}>
                      {tags.map((t) => {
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
                            </Text>
                            {active && (
                              <Ionicons name="checkmark-circle" size={14} color="#fff" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

              {/* Next button */}
              <TouchableOpacity
                onPress={() => {
                  if (selectedTags.length === 0) {
                    Alert.alert(
                      "โปรดเลือกแนว",
                      "กรุณาเลือกแนวที่สนใจอย่างน้อย 1 แนว"
                    );
                    return;
                  }
                  setCurrentStep(3);
                }}
                style={s.nextBtn}
              >
                <Text style={s.nextBtnText}>ถัดไป</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ========= STEP 3: Advanced Settings ========= */}
          {currentStep === 3 && (
            <View>
              <Text style={s.bigTitle}>ปรับแต่งรายละเอียด</Text>
              <Text style={s.bigDesc}>
                ปรับให้ตรงใจคุณมากขึ้น (หรือกดสร้างเลยถ้าพอใจ)
              </Text>

              {/* Summary Card */}
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Ionicons name="calendar" size={16} color="#2A4D50" />
                  <Text style={s.summaryText}>
                    {days} วัน • {hoursPerDay} ชม./วัน
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="location" size={16} color="#2A4D50" />
                  <Text style={s.summaryText}>
                    ประมาณ {getEstimatedPlaces()} สถานที่
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="pricetag" size={16} color="#2A4D50" />
                  <Text style={s.summaryText}>
                    {selectedTags.join(", ")}
                  </Text>
                </View>
              </View>

              {/* Pace Slider */}
              <View style={s.sliderCard}>
                <View style={s.sliderHead}>
                  <View>
                    <Text style={s.sectionTitle}>⏱️ จังหวะการเที่ยว</Text>
                    <Text style={s.sectionDesc}>{getPaceLabel(relaxedPace)}</Text>
                  </View>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.1}
                  value={relaxedPace}
                  onValueChange={setRelaxedPace}
                  minimumTrackTintColor="#7c3aed"
                  maximumTrackTintColor="#e5e7eb"
                />
                <View style={s.scaleRow}>
                  <Text style={s.scale}>⚡ เต็มที่</Text>
                  <Text style={s.scale}>☕ ชิลๆ</Text>
                </View>
              </View>

              {/* Budget Slider */}
              <View style={s.sliderCard}>
                <View style={s.sliderHead}>
                  <View>
                    <Text style={s.sectionTitle}>💰 งบประมาณ</Text>
                    <Text style={s.sectionDesc}>{getBudgetLabel(budgetLevel)}</Text>
                  </View>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.1}
                  value={budgetLevel}
                  onValueChange={setBudgetLevel}
                  minimumTrackTintColor="#2A4D50"
                  maximumTrackTintColor="#e5e7eb"
                />
                <View style={s.scaleRow}>
                  <Text style={s.scale}>💵 ประหยัด</Text>
                  <Text style={s.scale}>💎 หรูหรา</Text>
                </View>
              </View>

              {/* Elder/Kids Toggle */}
              <TouchableOpacity
                onPress={() => setWithElderOrKids((v) => !v)}
                style={s.toggleCard}
              >
                <View style={s.toggleIcon}>
                  <Ionicons
                    name={withElderOrKids ? "people" : "people-outline"}
                    size={24}
                    color={withElderOrKids ? "#16a34a" : "#83829A"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>มีเด็กหรือผู้สูงอายุ</Text>
                  <Text style={s.sectionDesc}>
                    จะเลือกสถานที่ที่เข้าถึงง่าย และชิลกว่า
                  </Text>
                </View>
                <View
                  style={[s.toggleBtn, withElderOrKids ? s.toggleOn : s.toggleOff]}
                >
                  <Text
                    style={[
                      s.toggleText,
                      withElderOrKids ? s.toggleTextOn : s.toggleTextOff,
                    ]}
                  >
                    {withElderOrKids ? "ใช่" : "ไม่"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {currentStep > 1 && (
          <View style={s.bottomBar}>
            <TouchableOpacity
              onPress={() => setCurrentStep(currentStep - 1)}
              disabled={creating}
              style={s.outlineBtn}
            >
              <Ionicons name="chevron-back" size={16} color="#2A4D50" />
              <Text style={s.outlineText}>ย้อนกลับ</Text>
            </TouchableOpacity>

            {currentStep === 3 ? (
              <TouchableOpacity
                onPress={handleCreate}
                disabled={creating}
                style={[s.primaryBtn, creating && { opacity: 0.6 }]}
              >
                {creating ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.primaryText}>กำลังสร้าง...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="rocket-launch"
                      size={18}
                      color="#fff"
                    />
                    <Text style={s.primaryText}>สร้างทริป</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCurrentStep(currentStep + 1)}
                disabled={creating}
                style={s.primaryBtn}
              >
                <Text style={s.primaryText}>ถัดไป</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F8" },
  page: { flex: 1 },

  header: {
    backgroundColor: "#2A4D50",
    paddingTop: Platform.OS === "android" ? 8 : 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  robotBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },

  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
  },

  content: { padding: 16, paddingBottom: 100 },

  bigTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 8,
  },
  bigDesc: {
    fontSize: 14,
    color: "#83829A",
    lineHeight: 20,
    marginBottom: 24,
  },

  // Preset Cards
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  presetCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  presetCardActive: {
    borderColor: "#7c3aed",
    backgroundColor: "#f5f3ff",
  },
  presetIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 12,
    color: "#83829A",
    textAlign: "center",
    lineHeight: 16,
  },

  skipBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2A4D50",
  },

  // Section Box
  sectionBox: {
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  sectionDesc: {
    fontSize: 13,
    color: "#83829A",
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clear: { fontSize: 12, fontWeight: "800", color: "#83829A" },

  row2: { flexDirection: "row", gap: 10, marginTop: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  label: { fontSize: 13, fontWeight: "800", color: "#2A4D50", marginBottom: 8 },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 20, fontWeight: "900", color: "#000" },
  hint: { marginTop: 8, fontSize: 11, color: "#83829A", fontWeight: "600" },

  tagsBox: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  retryBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryText: { fontWeight: "800", color: "#2A4D50", fontSize: 12 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F8",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  chipText: { fontSize: 13, fontWeight: "800", color: "#83829A" },
  chipTextActive: { color: "#fff" },

  note: { marginTop: 8, fontSize: 11, color: "#83829A", fontWeight: "600" },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryText: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
    flex: 1,
  },

  sliderCard: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sliderHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  percent: { fontSize: 12, fontWeight: "900", color: "#83829A" },
  scaleRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  scale: { fontSize: 12, color: "#83829A", fontWeight: "700" },

  toggleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
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

  nextBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  outlineText: { color: "#2A4D50", fontWeight: "900", fontSize: 15 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
