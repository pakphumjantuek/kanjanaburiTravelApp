import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useCreateTripMutation } from "../tripApi";

export default function TripCreateScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [createTrip, { isLoading }] = useCreateTripMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // picker state
  const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!startDate || !endDate) return false;
    return endDate.getTime() > startDate.getTime();
  }, [title, startDate, endDate]);

  const toLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().replace("Z", "");
  };

  const formatDateTime = (d: Date | null) => {
    if (!d) return "เลือกวันเวลา";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return d.toLocaleDateString("th-TH", options);
  };

  const openPicker = (mode: "start" | "end") => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onChangePicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);

    if (event.type === "dismissed") return;

    const picked = selected ?? new Date();

    if (pickerMode === "start") {
      setStartDate(picked);
      if (endDate && endDate.getTime() <= picked.getTime()) setEndDate(null);
    }

    if (pickerMode === "end") {
      if (startDate && picked.getTime() <= startDate.getTime()) {
        Alert.alert("วันที่ไม่ถูกต้อง", "วันสิ้นสุดต้องมาหลังวันเริ่มต้น");
        return;
      }
      setEndDate(picked);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "ข้อมูลไม่ครบ",
        "กรุณากรอกชื่อทริป และเลือกวันเวลาให้ถูกต้อง"
      );
      return;
    }

    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDateTime: toLocalISO(startDate!),
      endDateTime: toLocalISO(endDate!),
    };

    try {
      const created = await createTrip(body).unwrap();
      navigation.replace("TripDetailScreen", { tripId: created.tripId });
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "ผิดพลาด",
        err?.data?.errorMessages?.[0] ?? "สร้างทริปไม่สำเร็จ"
      );
    }
  };

  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (endDate.getTime() <= startDate.getTime()) return null;
    return Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [startDate, endDate]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate("ทริปของฉัน", { screen: "TripListScreen" })}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#2A4D50" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topBarTitle}>สร้างทริปใหม่</Text>
            <Text style={styles.topBarSub}>เริ่มต้นวางแผนการเดินทาง</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 16 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Steps */}
          <View style={styles.stepsCard}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
              <Text style={styles.stepText}>ข้อมูลทริป</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepTextInactive}>วันเวลา</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepTextInactive}>สำเร็จ</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="create-outline" size={20} color="#2A4D50" />
              </View>
              <Text style={styles.cardTitle}>รายละเอียดทริป</Text>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                ชื่อทริป <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="text-outline"
                  size={18}
                  color="#83829A"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="เช่น ทริปกาญจนบุรี 3 วัน 2 คืน"
                  placeholderTextColor="#C1C0C8"
                  style={styles.input}
                />
                {title.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setTitle("")}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#83829A" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.helperRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#83829A"
                />
                <Text style={styles.helper}>
                  ตั้งชื่อที่สื่อความหมายและจดจำง่าย
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                รายละเอียด <Text style={styles.optional}>(ไม่บังคับ)</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#83829A"
                  style={styles.inputIconTop}
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="อธิบายจุดประสงค์ สถานที่ที่อยากไป หรือกิจกรรมที่วางแผนไว้..."
                  placeholderTextColor="#C1C0C8"
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.helperRow}>
                <Ionicons name="bulb-outline" size={14} color="#83829A" />
                <Text style={styles.helper}>
                  เพิ่มรายละเอียดช่วยให้การวางแผนชัดเจนขึ้น
                </Text>
              </View>
            </View>
          </View>

          {/* Date Time Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="calendar-outline" size={20} color="#2A4D50" />
              </View>
              <Text style={styles.cardTitle}>ช่วงเวลาการเดินทาง</Text>
            </View>

            <View style={styles.dateContainer}>
              {/* Start Date */}
              <TouchableOpacity
                onPress={() => openPicker("start")}
                style={styles.dateCard}
              >
                <View style={styles.dateCardHeader}>
                  <View style={styles.dateIconWrap}>
                    <Ionicons name="calendar" size={20} color="#2A4D50" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateLabel}>วันเริ่มต้น</Text>
                    <Text style={styles.dateValue}>
                      {formatDateTime(startDate)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C1C0C8" />
                </View>
              </TouchableOpacity>

              {/* Arrow */}
              <View style={styles.arrowDown}>
                <Ionicons name="arrow-down" size={24} color="#C1C0C8" />
              </View>

              {/* End Date */}
              <TouchableOpacity
                onPress={() => openPicker("end")}
                style={[styles.dateCard, !startDate && styles.dateCardDisabled]}
                disabled={!startDate}
              >
                <View style={styles.dateCardHeader}>
                  <View
                    style={[
                      styles.dateIconWrap,
                      !startDate && styles.dateIconDisabled,
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={startDate ? "#FF7754" : "#C1C0C8"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.dateLabel,
                        !startDate && styles.dateLabelDisabled,
                      ]}
                    >
                      วันสิ้นสุด
                    </Text>
                    <Text
                      style={[
                        styles.dateValue,
                        !startDate && styles.dateValueDisabled,
                      ]}
                    >
                      {startDate
                        ? formatDateTime(endDate)
                        : "เลือกวันเริ่มต้นก่อน"}
                    </Text>
                  </View>
                  {startDate && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#C1C0C8"
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Validation Warning */}
            {startDate &&
              endDate &&
              endDate.getTime() <= startDate.getTime() && (
                <View style={styles.alertError}>
                  <Ionicons name="alert-circle" size={20} color="#cc3300" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertErrorTitle}>วันที่ไม่ถูกต้อง</Text>
                    <Text style={styles.alertErrorText}>
                      วันสิ้นสุดต้องมาหลังวันเริ่มต้น
                    </Text>
                  </View>
                </View>
              )}

            {/* Duration Badge */}
            {durationDays != null && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={18} color="#2A4D50" />
                <Text style={styles.durationText}>
                  ระยะเวลา{" "}
                  <Text style={styles.durationNumber}>{durationDays}</Text> วัน
                </Text>
              </View>
            )}
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#FF7754" />
              <Text style={styles.tipsTitle}>เคล็ดลับการสร้างทริป</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>
                  ตั้งชื่อที่บอกจุดหมายและระยะเวลาชัดเจน
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>
                  เพิ่มรายละเอียดช่วยให้จำจุดประสงค์ได้ง่าย
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>
                  ควรเผื่อเวลาสำหรับการเดินทางระหว่างสถานที่
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.btnCancel}
              disabled={isLoading}
            >
              <Ionicons name="close-outline" size={20} color="#83829A" />
              <Text style={styles.btnCancelText}>ยกเลิก</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.btnSubmit,
                (!canSubmit || isLoading) && styles.btnDisabled,
              ]}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnSubmitText}>กำลังสร้าง...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.btnSubmitText}>สร้างทริป</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Picker */}
        {showPicker && (
          <DateTimePicker
            value={
              pickerMode === "end"
                ? endDate ??
                  (startDate
                    ? new Date(startDate.getTime() + 60 * 60 * 1000)
                    : new Date())
                : startDate ?? new Date()
            }
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangePicker}
            minimumDate={
              pickerMode === "end" ? startDate ?? undefined : undefined
            }
          />
        )}

        {/* iOS Done Button */}
        {Platform.OS === "ios" && showPicker && (
          <View style={styles.iosPickerBar}>
            <TouchableOpacity
              onPress={() => setShowPicker(false)}
              style={styles.iosDoneBtn}
            >
              <Text style={styles.iosDoneText}>เสร็จสิ้น</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  page: {
    flex: 1,
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

  container: {
    padding: 20,
    gap: 16,
  },

  // Progress Steps
  stepsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  stepActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#83829A",
  },
  stepText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2A4D50",
  },
  stepTextInactive: {
    fontSize: 11,
    fontWeight: "600",
    color: "#C1C0C8",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
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
    gap: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000",
  },

  // Input Group
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  required: {
    color: "#cc3300",
  },
  optional: {
    fontSize: 12,
    fontWeight: "600",
    color: "#83829A",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputIcon: {
    marginTop: 2,
  },
  inputIconTop: {
    marginTop: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    paddingVertical: 10,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  clearBtn: {
    padding: 4,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helper: {
    fontSize: 12,
    color: "#83829A",
    flex: 1,
  },

  // Date Container
  dateContainer: {
    gap: 0,
  },
  dateCard: {
    backgroundColor: "#F3F4F8",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  dateCardDisabled: {
    opacity: 0.5,
  },
  dateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  dateIconDisabled: {
    backgroundColor: "#f9fafb",
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#83829A",
    marginBottom: 4,
  },
  dateLabelDisabled: {
    color: "#C1C0C8",
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  dateValueDisabled: {
    color: "#C1C0C8",
    fontWeight: "600",
  },
  arrowDown: {
    alignSelf: "center",
    marginVertical: 8,
  },

  // Alert Error
  alertError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#cc3300",
  },
  alertErrorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#cc3300",
    marginBottom: 4,
  },
  alertErrorText: {
    fontSize: 13,
    color: "#cc3300",
  },

  // Duration Badge
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  durationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A4D50",
  },
  durationNumber: {
    fontSize: 18,
    fontWeight: "900",
  },

  // Tips Card
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF7754",
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#83829A",
  },
  btnSubmit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnSubmitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },

  // iOS Picker
  iosPickerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  iosDoneBtn: {
    backgroundColor: "#2A4D50",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  iosDoneText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
