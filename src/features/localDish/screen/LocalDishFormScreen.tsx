import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Formik } from "formik";
import * as Yup from "yup";

import * as ImagePicker from "expo-image-picker";

import {
  useCreateLocalDishMutation,
  useUpdateLocalDishMutation,
  useGetByIdQuery,
  useUploadLocalDishImagesBatchMutation,
  useDeleteLocalDishImageMutation,
} from "../LocalDishApi";

import type { CreateLocalDishPayload, LocalDishType } from "../LocalDishType";
import { AppButton, Card, FormTextInput } from "../../../components";
import { BASE_URL } from "../../../config/env";

// ---------------- route types ----------------
type RouteParams = { mode: "add" } | { mode: "edit"; dishId: number };

// ---------------- RN file type ----------------
type RNFile = { uri: string; name: string; type: string };

// ---------------- form types ----------------
type FormValues = {
  nameTH: string;
  nameEN: string;
  description: string;
  origin: string;
  spicyLevel: string; // RN input รับเป็น string แล้วค่อยแปลง
  isHalal: boolean;
  isVegetarian: boolean;
  isActive: boolean;
};

// ---------------- validation ----------------
const validationSchema = Yup.object({
  nameTH: Yup.string().trim().required("กรุณาระบุชื่ออาหารพื้นถิ่น"),
  spicyLevel: Yup.number()
    .transform((_, v) => (v === "" || v == null ? 0 : Number(v)))
    .min(0)
    .max(5),
});

export default function LocalDishFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? { mode: "add" }) as RouteParams;

  const isEditMode = params.mode === "edit";
  const dishId = isEditMode ? Number(params.dishId) : undefined;

  // ---------- API ----------
  const {
    data: dish,
    isLoading: loadingDish,
    refetch,
  } = useGetByIdQuery(dishId!, {
    skip: !dishId,
  });

  const [createLocalDish, { isLoading: creating }] =
    useCreateLocalDishMutation();
  const [updateLocalDish, { isLoading: updating }] =
    useUpdateLocalDishMutation();
  const [uploadBatch, { isLoading: uploading }] =
    useUploadLocalDishImagesBatchMutation();
  const [deleteImage, { isLoading: deletingImage }] =
    useDeleteLocalDishImageMutation();

  const isSubmitting = creating || updating || uploading;

  // ---------- image states ----------
  const [newFiles, setNewFiles] = React.useState<RNFile[]>([]);
  const [coverIndex, setCoverIndex] = React.useState(0);
  const [replaceOld, setReplaceOld] = React.useState(false);

  // ---------- initial values ----------
  const initialValues: FormValues = {
    nameTH: dish?.nameTH ?? "",
    nameEN: dish?.nameEN ?? "",
    description: dish?.description ?? "",
    origin: dish?.origin ?? "",
    spicyLevel: String(dish?.spicyLevel ?? 0),
    isHalal: dish?.isHalal ?? false,
    isVegetarian: dish?.isVegetarian ?? false,
    isActive: dish?.isActive ?? true,
  };

  // ---------- helpers ----------
  const toPayload = (v: FormValues): CreateLocalDishPayload => ({
    nameTH: v.nameTH.trim(),
    nameEN: v.nameEN?.trim() || "",
    description: v.description?.trim() || "",
    origin: v.origin?.trim() || "",
    spicyLevel: Number(v.spicyLevel || 0),
    isHalal: v.isHalal,
    isVegetarian: v.isVegetarian,
    isActive: v.isActive,
  });

  const pickImages = async () => {
    // ขอ permission
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("ต้องอนุญาต", "กรุณาอนุญาตให้เข้าถึงรูปภาพ");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 0,
    });

    if (res.canceled) return;

    const picked: RNFile[] = res.assets.map((a, idx) => {
      const uri = a.uri;
      const name = (a as any).fileName || `dish_${Date.now()}_${idx}.jpg`;
      const type = a.mimeType ?? "image/jpeg";

      return { uri, name, type };
    });

    setNewFiles(picked);
    setCoverIndex(0);
  };

  const uploadIfAny = async (newDishId: number) => {
    if (!newFiles.length) return;

    await uploadBatch({
      dishId: newDishId,
      files: newFiles,
      coverIndex,
      replaceOld,
    }).unwrap();
    setNewFiles([]);
    setCoverIndex(0);
    setReplaceOld(false);
  };

  const onDeleteExistingImage = (imageId: number) => {
    if (!dishId) return;

    Alert.alert("ยืนยันการลบ", "ต้องการลบรูปนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive", 
        onPress: async () => {
          try {
            await deleteImage({ dishId, imageId }).unwrap();
            refetch();
          } catch {
            Alert.alert("ผิดพลาด", "ลบรูปไม่สำเร็จ");
          }
        },
      },
    ]);
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      let savedDishId: number;

      if (isEditMode) {
        if (!dishId) throw new Error("ไม่พบ dishId");
        savedDishId = dishId;

        await updateLocalDish({ dishId: savedDishId, body: payload }).unwrap();
      } else {
        const created = await createLocalDish(payload).unwrap();
        savedDishId = created.dishId!;
      }

      await uploadIfAny(savedDishId);

      Alert.alert("สำเร็จ", "บันทึกอาหารพื้นถิ่นเรียบร้อยแล้ว");
      navigation.goBack(); // หรือ navigate ไป list screen
    } catch (e) {
      console.log(e);
      Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ");
    }
  };

  const joinUrl = (base: string, path: string) =>
    `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  // ---------- loading dish ----------
  if (isEditMode && loadingDish) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {isEditMode ? "แก้ไขอาหารพื้นถิ่น" : "เพิ่มอาหารพื้นถิ่น"}
              </Text>
              <Text style={styles.subtitle}>
                🍲 กรอกข้อมูล และจัดการรูปภาพได้ที่ด้านล่าง
              </Text>
            </View>

            <AppButton
              title="ยกเลิก"
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
          </View>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={handleSubmit}
          >
            {({ handleSubmit, values, setFieldValue, isValid, dirty }) => (
              <View style={{ gap: 12 }}>
                {/* Basic info */}
                <Card>
                  <View style={{ gap: 14 }}>
                    <FormTextInput
                      name="nameTH"
                      label="ชื่ออาหาร (ไทย)"
                      placeholder="เช่น ข้าวยำ, แกงไตปลา"
                    />
                    <FormTextInput
                      name="nameEN"
                      label="ชื่ออาหาร (อังกฤษ)"
                      placeholder="เช่น Khao Yam"
                    />
                    <FormTextInput
                      name="description"
                      label="คำอธิบาย"
                      placeholder="รายละเอียดของอาหาร"
                      multiline
                      numberOfLines={4}
                      style={styles.textArea}
                    />
                    <FormTextInput
                      name="origin"
                      label="ที่มา / วัฒนธรรม"
                      placeholder="เช่น ภาคใต้, ชุมชน..."
                    />

                    <FormTextInput
                      name="spicyLevel"
                      label="ระดับเผ็ด (0-5)"
                      placeholder="0-5"
                      keyboardType="numeric"
                    />

                    {/* Switches แบบง่าย (ใช้ปุ่ม toggle) */}
                    <View style={styles.toggleRow}>
                      <Toggle
                        label="เปิดใช้งาน"
                        value={values.isActive}
                        onChange={(v) => setFieldValue("isActive", v)}
                      />
                      <Toggle
                        label="ฮาลาล"
                        value={values.isHalal}
                        onChange={(v) => setFieldValue("isHalal", v)}
                      />
                      <Toggle
                        label="มังสวิรัติ"
                        value={values.isVegetarian}
                        onChange={(v) => setFieldValue("isVegetarian", v)}
                      />
                    </View>

                    <View style={styles.btnRow}>
                      <AppButton
                        title="ยกเลิก"
                        variant="secondary"
                        onPress={() => navigation.goBack()}
                      />
                      <AppButton
                        title={isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                        variant="primary"
                        disabled={
                          isSubmitting ||
                          !isValid ||
                          (!dirty && !newFiles.length)
                        }
                        onPress={() => handleSubmit()}
                      />
                    </View>
                  </View>
                </Card>

                {/* Existing Images */}
                {isEditMode && dish?.images?.length ? (
                  <Card>
                    <Text style={styles.sectionTitle}>รูปปัจจุบัน</Text>

                    <View style={styles.grid}>
                      {dish.images.map((img: any) => {
                        const url = img.imageUrl?.startsWith("http")
                          ? img.imageUrl
                          : joinUrl(BASE_URL, img.imageUrl);
                        return (
                          <View key={img.imageId} style={styles.imgWrap}>
                            <Image source={{ uri: url }} style={styles.img} />
                            {img.isCover ? (
                              <View style={styles.coverBadge}>
                                <Text style={styles.coverBadgeText}>⭐ ปก</Text>
                              </View>
                            ) : null}

                            <TouchableOpacity
                              style={styles.deleteBadge}
                              disabled={deletingImage}
                              onPress={() => onDeleteExistingImage(img.imageId)}
                            >
                              <Text style={styles.deleteBadgeText}>ลบ</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                ) : null}

                {/* Upload Images */}
                <Card>
                  <Text style={styles.sectionTitle}>
                    อัปโหลดรูปใหม่ (เลือกปกได้)
                  </Text>

                  <View style={{ gap: 10 }}>
                    <AppButton
                      title="เลือกรูป..."
                      variant="primary"
                      onPress={pickImages}
                    />

                    <Toggle
                      label="แทนที่รูปเก่าทั้งหมด"
                      value={replaceOld}
                      onChange={setReplaceOld}
                      fullWidth
                    />

                    {newFiles.length ? (
                      <>
                        <Text style={styles.muted}>
                          แตะรูปเพื่อเลือกเป็น “รูปปก” (ตอนนี้: #
                          {coverIndex + 1})
                        </Text>

                        <View style={styles.grid}>
                          {newFiles.map((f, idx) => (
                            <TouchableOpacity
                              key={`${f.uri}-${idx}`}
                              style={[
                                styles.imgWrap,
                                idx === coverIndex && styles.imgWrapActive,
                              ]}
                              onPress={() => setCoverIndex(idx)}
                            >
                              <Image
                                source={{ uri: f.uri }}
                                style={styles.img}
                              />
                              <View style={styles.coverBadge}>
                                <Text style={styles.coverBadgeText}>
                                  {idx === coverIndex ? "⭐ ปก" : "เลือกเป็นปก"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.muted}>ยังไม่ได้เลือกรูปใหม่</Text>
                    )}
                  </View>
                </Card>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Toggle({
  label,
  value,
  onChange,
  fullWidth,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  fullWidth?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      style={[
        styles.toggle,
        fullWidth && { alignSelf: "stretch" },
        value ? styles.toggleOn : styles.toggleOff,
      ]}
    >
      <Text style={[styles.toggleText, value && { color: "white" }]}>
        {label}: {value ? "ใช่" : "ไม่ใช่"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { padding: 16, gap: 12, paddingBottom: 30 },

  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 4, color: "#6B7280", fontWeight: "700", fontSize: 12 },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },

  textArea: { minHeight: 110, textAlignVertical: "top" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  muted: { color: "#6B7280", fontWeight: "700", fontSize: 12 },

  toggleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  toggle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleOn: { backgroundColor: "#111827", borderColor: "#111827" },
  toggleOff: { backgroundColor: "white" },
  toggleText: { fontWeight: "900", fontSize: 12, color: "#111827" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  imgWrapActive: { borderColor: "#2563EB", borderWidth: 2 },
  img: { width: "100%", height: 120 },

  coverBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  coverBadgeText: { fontSize: 12, fontWeight: "900", color: "#111827" },

  deleteBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "rgba(225,29,72,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deleteBadgeText: { fontSize: 12, fontWeight: "900", color: "white" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
});
