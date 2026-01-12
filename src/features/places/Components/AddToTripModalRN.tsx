import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { PlaceDto } from "../placeTypes";
import type { TripDto } from "../../trip/tripTypes";

import {
  useGetAllTripsQuery,
  useGetTripDetailQuery,
  useAddTripItemMutation,
} from "../../trip/tripApi";

import {
  addDays,
  daysInclusive,
  parseIso,
  sod,
  thDate,
} from "../../../utils/dateTrip";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import { useBehaviorLogger } from "../../behavior/useBehaviorLogger";

type Props = {
  open: boolean;
  onClose: () => void;
  place: PlaceDto;
  onCreateTrip?: () => void;
};

export default function AddToTripModalRN({
  open,
  onClose,
  place,
  onCreateTrip,
}: Props) {
  const log = useBehaviorLogger();
  const [triggerOpening] = useLazyGetPlaceOpeningQuery();
  const insets = useSafeAreaInsets();

  const { data: tripPaged, isLoading: isTripListLoading } = useGetAllTripsQuery(
    { page: 1, pageSize: 50, search: "" },
    { skip: !open }
  );
  const trips: TripDto[] = tripPaged?.items ?? [];

  const [selectedTripId, setSelectedTripId] = useState<number | "">("");
  const tripIdNum = selectedTripId ? Number(selectedTripId) : null;

  const { data: tripDetailRes, isLoading: isTripDetailLoading } =
    useGetTripDetailQuery(tripIdNum!, {
      skip: !open || !tripIdNum,
    });

  const tripResult = useMemo(() => {
    const d: any = tripDetailRes;
    return d?.result ?? d;
  }, [tripDetailRes]);

  const tripStart = useMemo(
    () => parseIso(tripResult?.startDateTime),
    [tripResult?.startDateTime]
  );
  const tripEnd = useMemo(
    () => parseIso(tripResult?.endDateTime),
    [tripResult?.endDateTime]
  );
  const tripItems = useMemo(
    () => (tripResult?.items ?? []) as any[],
    [tripResult?.items]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [dayIndex, setDayIndex] = useState(1);
  const [arrivalTime, setArrivalTime] = useState("");
  const [duration, setDuration] = useState(place.avgVisitMinutes ?? 60);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedTripId("");
    setCurrentStep(1);
    setDayIndex(1);
    setArrivalTime("");
    setDuration(place.avgVisitMinutes ?? 60);
    setNotes("");
  }, [open, place.avgVisitMinutes]);

  useEffect(() => {
    setDayIndex(1);
    setArrivalTime("");
    setNotes("");
    setDuration(place.avgVisitMinutes ?? 60);
  }, [selectedTripId, place.avgVisitMinutes]);

  const dayOptions = useMemo(() => {
    if (!tripStart || !tripEnd) return [];
    const total = daysInclusive(tripStart, tripEnd);
    return Array.from({ length: total }, (_, i) => {
      const di = i + 1;
      const date = addDays(sod(tripStart), i);
      return { dayIndex: di, label: `วันที่ ${di}`, date: thDate(date) };
    });
  }, [tripStart, tripEnd]);

  const orderIndex = useMemo(() => {
    const countInDay = tripItems.filter((x) => x.dayIndex === dayIndex).length;
    return countInDay + 1;
  }, [tripItems, dayIndex]);

  const hasTripDates = Boolean(
    tripResult?.startDateTime && tripResult?.endDateTime
  );

  const dayOfWeekFromTripDay = (
    tripStartInput?: string | Date | null,
    dayIndexInput?: number | null
  ) => {
    if (!tripStartInput) return null;
    const start =
      tripStartInput instanceof Date
        ? tripStartInput
        : new Date(tripStartInput);
    if (Number.isNaN(start.getTime())) return null;

    const offset = Math.max((dayIndexInput ?? 1) - 1, 0);
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return d.getDay();
  };

  const [addTripItem, { isLoading: isAddingToTrip }] = useAddTripItemMutation();

  const canProceedToStep2 = Boolean(tripIdNum && hasTripDates);
  const canProceedToStep3 = canProceedToStep2 && dayIndex >= 1;

  const handleSubmit = async () => {
    if (!place?.placeId) return;
    if (!tripIdNum) return Alert.alert("กรุณาเลือกทริป");

    if (
      dayOptions.length > 0 &&
      (dayIndex < 1 || dayIndex > dayOptions.length)
    ) {
      return Alert.alert("กรุณาเลือกวันที่ถูกต้อง");
    }

    const tripStartDateTime =
      (tripResult?.startDateTime as string | undefined) ?? null;
    const dow = dayOfWeekFromTripDay(tripStartDateTime, dayIndex);
    if (dow == null) return Alert.alert("ไม่สามารถตรวจสอบวันของทริปได้");

    try {
      const openingList = await triggerOpening(place.placeId, true).unwrap();
      const oh = (openingList ?? []).find((x) => x.dayOfWeek === dow) ?? null;

      if (oh?.isClosed) {
        return Alert.alert(
          "ไม่สามารถเพิ่มได้",
          "สถานที่นี้ปิดทำการในวันที่เลือก"
        );
      }

      await addTripItem({
        tripId: tripIdNum,
        body: {
          placeId: place.placeId,
          dayIndex,
          orderIndex,
          plannedArrivalTime: arrivalTime
            ? new Date(arrivalTime).toISOString()
            : null,
          plannedDurationMinutes: duration,
          notes: notes.trim() || null,
        },
      }).unwrap();

      await log({
        placeId: place.placeId,
        actionType: "ADD_TO_TRIP",
        metaJson: JSON.stringify({ tripId: tripIdNum }),
      }).catch(() => {});

      Alert.alert("สำเร็จ", "เพิ่มสถานที่เข้าทริปแล้ว!");
      onClose();
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "ผิดพลาด",
        err?.data?.errorMessages?.[0] ?? "เพิ่มเข้าทริปไม่สำเร็จ"
      );
    }
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={s.modalPage}>
        {/* Header */}
        <View style={[s.modalHeader, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={s.modalTitle}>เพิ่มเข้าทริป</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Steps */}
        <View style={s.progressContainer}>
          <View style={s.progressSteps}>
            <View style={s.stepItem}>
              <View
                style={[s.stepCircle, currentStep >= 1 && s.stepCircleActive]}
              >
                {currentStep > 1 ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text
                    style={[
                      s.stepNumber,
                      currentStep >= 1 && s.stepNumberActive,
                    ]}
                  >
                    1
                  </Text>
                )}
              </View>
              <Text
                style={[s.stepLabel, currentStep >= 1 && s.stepLabelActive]}
              >
                เลือกทริป
              </Text>
            </View>
            <View style={[s.stepLine, currentStep >= 2 && s.stepLineActive]} />
            <View style={s.stepItem}>
              <View
                style={[s.stepCircle, currentStep >= 2 && s.stepCircleActive]}
              >
                {currentStep > 2 ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text
                    style={[
                      s.stepNumber,
                      currentStep >= 2 && s.stepNumberActive,
                    ]}
                  >
                    2
                  </Text>
                )}
              </View>
              <Text
                style={[s.stepLabel, currentStep >= 2 && s.stepLabelActive]}
              >
                เลือกวัน
              </Text>
            </View>
            <View style={[s.stepLine, currentStep >= 3 && s.stepLineActive]} />
            <View style={s.stepItem}>
              <View
                style={[s.stepCircle, currentStep >= 3 && s.stepCircleActive]}
              >
                <Text
                  style={[s.stepNumber, currentStep >= 3 && s.stepNumberActive]}
                >
                  3
                </Text>
              </View>
              <Text
                style={[s.stepLabel, currentStep >= 3 && s.stepLabelActive]}
              >
                รายละเอียด
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Place Info Card */}
          <View style={s.placeCard}>
            <View style={s.placeIconBadge}>
              <Ionicons name="location" size={24} color="#2A4D50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.placeCardLabel}>สถานที่ที่เลือก</Text>
              <Text style={s.placeCardName} numberOfLines={2}>
                {place.name}
              </Text>
            </View>
          </View>

          {/* Step 1: Select Trip */}
          {currentStep === 1 && (
            <View style={s.stepContainer}>
              <View style={s.sectionHeader}>
                <Ionicons name="list" size={20} color="#2A4D50" />
                <Text style={s.sectionTitle}>เลือกทริปที่ต้องการ</Text>
              </View>

              {isTripListLoading ? (
                <View style={s.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A4D50" />
                  <Text style={s.loadingText}>กำลังโหลดทริป...</Text>
                </View>
              ) : trips.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="albums-outline" size={48} color="#C1C0C8" />
                  <Text style={s.emptyTitle}>ยังไม่มีทริป</Text>
                  <Text style={s.emptyText}>
                    สร้างทริปใหม่เพื่อเริ่มวางแผนการเดินทาง
                  </Text>
                  {!!onCreateTrip && (
                    <TouchableOpacity
                      onPress={onCreateTrip}
                      style={s.createTripBtn}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={s.createTripBtnText}>สร้างทริปใหม่</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={s.tripList}>
                  {trips.map((t) => {
                    const active = Number(selectedTripId) === t.tripId;
                    return (
                      <TouchableOpacity
                        key={t.tripId}
                        onPress={() => setSelectedTripId(t.tripId)}
                        style={[s.tripItem, active && s.tripItemActive]}
                      >
                        <View style={s.tripItemContent}>
                          <View
                            style={[
                              s.radioCircle,
                              active && s.radioCircleActive,
                            ]}
                          >
                            {active && <View style={s.radioInner} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                s.tripItemTitle,
                                active && s.tripItemTitleActive,
                              ]}
                            >
                              {t.title ?? `ทริป #${t.tripId}`}
                            </Text>
                            {t.startDateTime && t.endDateTime && (
                              <Text style={s.tripItemDate}>
                                {parseIso(t.startDateTime) &&
                                parseIso(t.endDateTime)
                                  ? `${thDate(
                                      parseIso(t.startDateTime)!
                                    )} - ${thDate(parseIso(t.endDateTime)!)}`
                                  : "-"}
                              </Text>
                            )}
                          </View>
                          {active && (
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color="#2A4D50"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {!!onCreateTrip && (
                    <TouchableOpacity
                      onPress={onCreateTrip}
                      style={s.createNewBtn}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="#2A4D50"
                      />
                      <Text style={s.createNewBtnText}>สร้างทริปใหม่</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {trips.length > 0 && (
                <TouchableOpacity
                  disabled={!canProceedToStep2}
                  onPress={() => setCurrentStep(2)}
                  style={[s.nextBtn, !canProceedToStep2 && s.nextBtnDisabled]}
                >
                  <Text style={s.nextBtnText}>ถัดไป</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step 2: Select Day */}
          {currentStep === 2 && (
            <View style={s.stepContainer}>
              <View style={s.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#2A4D50" />
                <Text style={s.sectionTitle}>เลือกวันในทริป</Text>
              </View>

              {isTripDetailLoading ? (
                <View style={s.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A4D50" />
                  <Text style={s.loadingText}>กำลังโหลดวันในทริป...</Text>
                </View>
              ) : !hasTripDates ? (
                <View style={s.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#C1C0C8" />
                  <Text style={s.emptyTitle}>ทริปนี้ยังไม่มีวันที่</Text>
                  <Text style={s.emptyText}>
                    กรุณาแก้ไขทริปให้มีวันเริ่ม-สิ้นสุด
                  </Text>
                </View>
              ) : (
                <View style={s.dayList}>
                  {dayOptions.map((d) => {
                    const active = d.dayIndex === dayIndex;
                    const itemsInDay = tripItems.filter(
                      (x) => x.dayIndex === d.dayIndex
                    ).length;

                    return (
                      <TouchableOpacity
                        key={d.dayIndex}
                        onPress={() => setDayIndex(d.dayIndex)}
                        style={[s.dayItem, active && s.dayItemActive]}
                      >
                        <View style={s.dayItemContent}>
                          <View
                            style={[
                              s.radioCircle,
                              active && s.radioCircleActive,
                            ]}
                          >
                            {active && <View style={s.radioInner} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                s.dayItemTitle,
                                active && s.dayItemTitleActive,
                              ]}
                            >
                              {d.label}
                            </Text>
                            <Text style={s.dayItemDate}>{d.date}</Text>
                          </View>
                          <View style={s.dayBadge}>
                            <Text style={s.dayBadgeText}>
                              {itemsInDay} สถานที่
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={s.btnRow}>
                <TouchableOpacity
                  onPress={() => setCurrentStep(1)}
                  style={s.backBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#83829A" />
                  <Text style={s.backBtnText}>ย้อนกลับ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canProceedToStep3}
                  onPress={() => setCurrentStep(3)}
                  style={[
                    s.nextBtnFlex,
                    !canProceedToStep3 && s.nextBtnDisabled,
                  ]}
                >
                  <Text style={s.nextBtnText}>ถัดไป</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <View style={s.stepContainer}>
              <View style={s.sectionHeader}>
                <Ionicons name="create" size={20} color="#2A4D50" />
                <Text style={s.sectionTitle}>รายละเอียดเพิ่มเติม</Text>
              </View>

              {/* Summary */}
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Ionicons name="albums" size={16} color="#2A4D50" />
                  <Text style={s.summaryLabel}>ทริป:</Text>
                  <Text style={s.summaryValue}>
                    {trips.find((t) => t.tripId === tripIdNum)?.title ?? "-"}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="calendar" size={16} color="#FF7754" />
                  <Text style={s.summaryLabel}>วัน:</Text>
                  <Text style={s.summaryValue}>
                    {dayOptions.find((d) => d.dayIndex === dayIndex)?.label ??
                      "-"}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="list" size={16} color="#7c3aed" />
                  <Text style={s.summaryLabel}>ลำดับ:</Text>
                  <Text style={s.summaryValue}>#{orderIndex}</Text>
                </View>
              </View>

              {/* Duration Input */}
              <View style={s.inputGroup}>
                <View style={s.inputHeader}>
                  <Ionicons name="time" size={18} color="#FF7754" />
                  <Text style={s.inputLabel}>ระยะเวลาที่จะใช้ (นาที)</Text>
                </View>
                <View style={s.durationButtons}>
                  {[30, 60, 90, 120].map((min) => (
                    <TouchableOpacity
                      key={min}
                      onPress={() => setDuration(min)}
                      style={[
                        s.durationBtn,
                        duration === min && s.durationBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.durationBtnText,
                          duration === min && s.durationBtnTextActive,
                        ]}
                      >
                        {min} นาที
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={String(duration)}
                  onChangeText={(t) => setDuration(Number(t || 0))}
                  keyboardType="numeric"
                  placeholder="กรอกเอง"
                  style={s.input}
                />
              </View>

              {/* Notes Input */}
              <View style={s.inputGroup}>
                <View style={s.inputHeader}>
                  <Ionicons name="document-text" size={18} color="#2A4D50" />
                  <Text style={s.inputLabel}>โน้ต (ไม่บังคับ)</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="เช่น อย่าลืมถ่ายรูป, จองตั๋วล่วงหน้า..."
                  placeholderTextColor="#C1C0C8"
                  style={[s.input, s.textArea]}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={s.btnRow}>
                <TouchableOpacity
                  onPress={() => setCurrentStep(2)}
                  style={s.backBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#83829A" />
                  <Text style={s.backBtnText}>ย้อนกลับ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isAddingToTrip}
                  onPress={handleSubmit}
                  style={[s.submitBtn, isAddingToTrip && s.submitBtnDisabled]}
                >
                  {isAddingToTrip ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.submitBtnText}>กำลังเพิ่ม...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#fff"
                      />
                      <Text style={s.submitBtnText}>เพิ่มเข้าทริป</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalPage: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },

  // Header
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },

  // Progress Steps
  progressContainer: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepItem: {
    alignItems: "center",
    gap: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  stepCircleActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#83829A",
  },
  stepNumberActive: {
    color: "#fff",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C1C0C8",
  },
  stepLabelActive: {
    color: "#2A4D50",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#2A4D50",
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    gap: 20,
  },

  // Place Card
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  placeIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  placeCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#83829A",
    marginBottom: 4,
  },
  placeCardName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },

  // Step Container
  stepContainer: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#83829A",
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
  emptyText: {
    fontSize: 14,
    color: "#83829A",
    textAlign: "center",
    lineHeight: 20,
  },
  createTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  createTripBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Trip List
  tripList: {
    gap: 10,
  },
  tripItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  tripItemActive: {
    borderColor: "#2A4D50",
    backgroundColor: "#EFF6FF",
  },
  tripItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#2A4D50",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2A4D50",
  },
  tripItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  tripItemTitleActive: {
    color: "#2A4D50",
  },
  tripItemDate: {
    fontSize: 12,
    color: "#83829A",
    fontWeight: "600",
  },
  createNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  createNewBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2A4D50",
  },

  // Day List
  dayList: {
    gap: 10,
  },
  dayItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  dayItemActive: {
    borderColor: "#2A4D50",
    backgroundColor: "#EFF6FF",
  },
  dayItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  dayItemTitleActive: {
    color: "#2A4D50",
  },
  dayItemDate: {
    fontSize: 12,
    color: "#83829A",
    fontWeight: "600",
  },
  dayBadge: {
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#83829A",
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },

  // Input Group
  inputGroup: {
    gap: 12,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  durationButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  durationBtnActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  durationBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#83829A",
  },
  durationBtnTextActive: {
    color: "#fff",
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    flex: 1,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#83829A",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnFlex: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
