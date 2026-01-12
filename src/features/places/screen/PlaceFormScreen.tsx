import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";

import {
  useCreatePlaceMutation,
  useUpdatePlaceMutation,
  useUploadPlaceImagesBatchMutation,
  useDeletePlaceImageMutation,
  useGetByIdQuery,
} from "../placeApi";

import { useGetAllPlaceCategoryQuery } from "../../placeCategory/placeCategoryApi";
import { useGetAllPlaceTagQuery } from "../../placeTag/placeTagApi";
import type { CreatePlaceRequest, PlaceDto } from "../placeTypes";
import { useCreateDefaultOpeningMutation } from "../../placeOpening/placeOpenApi";
import { BASE_URL } from "../../../config/env";

type RouteParams =
  | { mode: "add" }
  | { mode: "edit"; placeId: number; place?: PlaceDto };

type FormValues = {
  name: string;
  description: string;
  latitude: string; // เก็บเป็น string เพื่อพิมพ์ง่าย
  longitude: string;
  address: string;
  avgVisitMinutes: string;
  priceRange: string;
  categoryId: string; // string
  tagIds: number[];
  isActive: boolean;
};

const toNumOrUndef = (v: string) => {
  const t = (v ?? "").trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required("กรุณากรอกชื่อสถานที่"),
  categoryId: Yup.string()
    .required("กรุณาเลือกหมวดหมู่")
    .test("categoryId", "กรุณาเลือกหมวดหมู่", (v) => Number(v) > 0),
  latitude: Yup.string()
    .required("กรุณากรอกละติจูด")
    .test("lat", "ละติจูดไม่ถูกต้อง", (v) => Number.isFinite(Number(v))),
  longitude: Yup.string()
    .required("กรุณากรอกลองจิจูด")
    .test("lng", "ลองจิจูดไม่ถูกต้อง", (v) => Number.isFinite(Number(v))),
  description: Yup.string(),
  address: Yup.string(),
  avgVisitMinutes: Yup.string(),
  priceRange: Yup.string(),
  tagIds: Yup.array().of(Yup.number()).default([]),
  isActive: Yup.boolean().default(true),
});

type PickedImage = {
  uri: string;
  name: string;
  mimeType: string;
};

export default function PlaceFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? { mode: "add" }) as RouteParams;

  const isEditMode = params.mode === "edit";
  const placeIdFromParams = isEditMode
    ? Number((params as any).placeId)
    : undefined;
  const placeId = Number.isFinite(placeIdFromParams as number)
    ? (placeIdFromParams as number)
    : undefined;
  const placeFromState = isEditMode ? (params as any).place : undefined;
  
  const { data: placeFromApi, isLoading: loadingPlace } = useGetByIdQuery(
    placeId as number,
    { skip: !isEditMode || !placeId }
  );

  const place: PlaceDto | undefined = placeFromApi ?? placeFromState;

  const { data: placeCategories } = useGetAllPlaceCategoryQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: placeTags } = useGetAllPlaceTagQuery({
    page: 1,
    pageSize: 100,
  });

  const categoryOptions =
    placeCategories?.items?.map((c: any) => ({
      value: String(c.categoryId),
      label: c.categoryName,
    })) ?? [];

  const tagList = placeTags?.items ?? [];

  const {
    data: dish,
    isLoading: loadingDish,
    refetch,
  } = useGetByIdQuery(placeId!, {
    skip: !placeId,
  });

  const [createPlace, { isLoading: creating }] = useCreatePlaceMutation();
  const [updatePlace, { isLoading: updating }] = useUpdatePlaceMutation();
  const [uploadBatch, { isLoading: uploading }] =
    useUploadPlaceImagesBatchMutation();
  const [deleteImage] = useDeletePlaceImageMutation();
  const [createDefaultOpening] = useCreateDefaultOpeningMutation();

  const isSubmitting = creating || updating || uploading;

  // รูปใหม่ (uri)
  const [newImages, setNewImages] = useState<PickedImage[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [replaceOld, setReplaceOld] = useState(false);

  const initialValues: FormValues = useMemo(
    () => ({
      name: place?.name ?? "",
      description: place?.description ?? "",
      latitude: place?.latitude != null ? String(place.latitude) : "14.0228",
      longitude: place?.longitude != null ? String(place.longitude) : "99.5328",
      address: place?.address ?? "",
      avgVisitMinutes:
        place?.avgVisitMinutes != null ? String(place.avgVisitMinutes) : "",
      priceRange: place?.priceRange != null ? String(place.priceRange) : "",
      categoryId: place?.categoryId != null ? String(place.categoryId) : "",
      tagIds: (place as any)?.tagIds ?? [],
      isActive: place?.isActive ?? true,
    }),
    [place]
  );

  const completion = (v: FormValues) => {
    const required = [
      v.name?.trim(),
      v.categoryId,
      v.latitude?.trim(),
      v.longitude?.trim(),
    ];
    const filled = required.filter((x) => !!x).length;
    return Math.round((filled / required.length) * 100);
  };

  const toPayload = (v: FormValues): CreatePlaceRequest => ({
    name: v.name.trim(),
    description: v.description?.trim() || undefined,
    latitude: Number(v.latitude),
    longitude: Number(v.longitude),
    address: v.address?.trim() || undefined,
    avgVisitMinutes: toNumOrUndef(v.avgVisitMinutes),
    priceRange: toNumOrUndef(v.priceRange),
    categoryId: v.categoryId ? Number(v.categoryId) : undefined,
    isActive: v.isActive,
    tagIds: v.tagIds,
  });

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("ต้องอนุญาต", "กรุณาอนุญาตเข้าถึงรูปภาพ");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });

    if (res.canceled) return;

    const assets = res.assets ?? [];
    const picked: PickedImage[] = assets.map((a, idx) => ({
      uri: a.uri,
      name:
        a.fileName ??
        `place_${Date.now()}_${idx}.${a.uri.split(".").pop() || "jpg"}`,
      mimeType: a.mimeType ?? "image/jpeg",
    }));

    setNewImages(picked);
    setCoverIndex(0);
  };

  const uploadIfAny = async (newPlaceId: number) => {
    if (!newImages.length) return;

    // *** สำคัญ: RTK Query endpoint ของคุณต้องรองรับส่ง uri/asset หรือ FormData
    // โค้ดนี้สมมติว่า endpoint รับ { placeId, files, coverIndex, replaceOld }
    // และ "files" เป็น array ของ { uri, name, type } หรือมันจัด FormData ให้เอง
    await uploadBatch({
      placeId: newPlaceId,
      files: newImages.map((x) => ({
        uri: x.uri,
        name: x.name,
        type: x.mimeType,
      })),
      coverIndex,
      replaceOld,
    }).unwrap();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);

      let newPlaceId: number;

      if (isEditMode) {
        if (!place?.placeId) throw new Error("ไม่พบ placeId สำหรับแก้ไข");
        newPlaceId = place.placeId;
        await updatePlace({ id: newPlaceId, body: payload }).unwrap();
      } else {
        const created = await createPlace(payload).unwrap();
        newPlaceId = created.placeId;

        // auto default opening
        try {
          await createDefaultOpening({
            placeId: newPlaceId,
            body: { openTime: "09:00:00", closeTime: "18:00:00" },
          }).unwrap();
        } catch (e) {
          console.warn("CREATE DEFAULT OPENING FAILED:", e);
        }
      }

      // upload images
      try {
        await uploadIfAny(newPlaceId);
      } catch (e) {
        console.warn("UPLOAD FAILED:", e);
        // ไม่ต้อง fail ทั้งฟอร์มก็ได้
      }

      Alert.alert("สำเร็จ", "บันทึกสถานที่เรียบร้อยแล้ว", [
        {
          text: "ตกลง",
          onPress: () => navigation.goBack(), // หรือ navigate("PlaceList")
        },
      ]);
    } catch (e: any) {
      Alert.alert(
        "ผิดพลาด",
        e?.data?.errorMessages?.[0] ?? e?.message ?? "บันทึกไม่สำเร็จ"
      );
      console.log(e);
    }
  };

  if (isEditMode && loadingPlace) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>กำลังโหลดข้อมูลสถานที่...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onDeleteExistingImage = (imageId: number) => {
    if (!placeId) {
      Alert.alert("ผิดพลาด", "ไม่พบ placeId (อาจส่ง params มาไม่ครบ)");
      return;
    }

    Alert.alert("ยืนยันการลบ", "ต้องการลบรูปนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteImage({ placeId, imageId }).unwrap();
            await refetch(); 
            Alert.alert("สำเร็จ", "ลบรูปแล้ว");
          } catch (e: any) {
            console.log("DELETE IMAGE FAILED:", e);
            Alert.alert(
              "ผิดพลาด",
              e?.data?.errorMessages?.[0] ?? e?.message ?? "ลบรูปไม่สำเร็จ"
            );
          }
          console.log("DELETE IMAGE:", imageId , "from place:", placeId);
        },
      },
    ]);
  };

  const joinUrl = (base: string, path: string) =>
    `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
        >
          {({
            values,
            setFieldValue,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isValid,
            dirty,
          }) => (
            <View style={{ gap: 12 }}>
              {/* Header */}
              <View style={styles.headerCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hTitle}>
                    {isEditMode ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}
                  </Text>

                  <View style={styles.pillsRow}>
                    <Pill
                      label="ความครบถ้วน"
                      value={`${completion(values)}%`}
                    />
                    <Pill
                      label="พิกัด"
                      value={`${Number(values.latitude || 0).toFixed(
                        5
                      )}, ${Number(values.longitude || 0).toFixed(5)}`}
                    />
                    <Pill
                      label="รูปใหม่"
                      value={
                        newImages.length ? `${newImages.length} รูป` : "ไม่มี"
                      }
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGhost,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.btnGhostText}>ยกเลิก</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSubmit()}
                    disabled={isSubmitting}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnSave,
                      isSubmitting && styles.btnDisabled,
                      pressed && !isSubmitting && styles.pressed,
                    ]}
                  >
                    <Text style={styles.btnSaveText}>
                      {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Basic */}
              <Card title="ข้อมูลพื้นฐาน">
                <Field
                  label="ชื่อสถานที่"
                  error={touched.name ? errors.name : undefined}
                >
                  <TextInput
                    value={values.name}
                    onChangeText={handleChange("name")}
                    onBlur={handleBlur("name")}
                    placeholder="ระบุชื่อสถานที่"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </Field>

                <Field
                  label="หมวดหมู่"
                  error={
                    touched.categoryId ? (errors.categoryId as any) : undefined
                  }
                >
                  <SelectLike
                    valueLabel={
                      categoryOptions.find((x) => x.value === values.categoryId)
                        ?.label ?? "เลือกหมวดหมู่"
                    }
                    onPress={() => {
                      // แสดงเป็น list ง่าย ๆ (คุณจะเปลี่ยนเป็น modal ก็ได้)
                      Alert.alert(
                        "เลือกหมวดหมู่",
                        "",
                        [
                          ...categoryOptions.slice(0, 20).map((opt) => ({
                            text: opt.label,
                            onPress: () =>
                              setFieldValue("categoryId", opt.value),
                          })),
                          { text: "ยกเลิก", style: "cancel" },
                        ],
                        { cancelable: true }
                      );
                    }}
                  />
                </Field>

                <Field label="คำอธิบาย">
                  <TextInput
                    value={values.description}
                    onChangeText={handleChange("description")}
                    onBlur={handleBlur("description")}
                    placeholder="รายละเอียดสถานที่..."
                    placeholderTextColor="#9CA3AF"
                    style={[
                      styles.input,
                      { height: 110, textAlignVertical: "top" },
                    ]}
                    multiline
                  />
                </Field>
              </Card>

              {/* Tags */}
              <Card title="แท็ก (เลือกได้หลายอัน)">
                <View style={styles.chipsWrap}>
                  {tagList.map((t: any) => {
                    const tid = Number(t.tagId);
                    const active = values.tagIds.includes(tid);
                    return (
                      <Pressable
                        key={t.tagId}
                        onPress={() => {
                          const next = active
                            ? values.tagIds.filter((x) => x !== tid)
                            : [...values.tagIds, tid];
                          setFieldValue("tagIds", next);
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          active && styles.chipActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {t.tagName ?? t.name ?? `Tag ${t.tagId}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {!tagList.length && (
                    <Text style={styles.muted}>ยังไม่มีแท็ก</Text>
                  )}
                </View>
              </Card>

              {/* Current images (edit mode) */}
              {isEditMode && place?.images?.length ? (
                <Card title="รูปปัจจุบัน">
                  <View style={styles.grid}>
                    {place.images.map((img: any) => {
                      const url = img.imageUrl?.startsWith("http")
                        ? img.imageUrl
                        : joinUrl(BASE_URL, img.imageUrl);

                      return (
                        <View key={img.imageId} style={styles.imgWrap}>
                          <Image
                            source={{ uri: url }}
                            style={styles.img}
                            resizeMode="cover"
                            onError={() =>
                              console.log("Image load failed:", url)
                            }
                          />

                          {img.isCover ? (
                            <View style={styles.coverBadge}>
                              <Text style={styles.coverBadgeText}>⭐ ปก</Text>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            style={styles.deleteBadge}
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

              {/* New Images */}
              <Card title="อัปโหลดรูปใหม่ (หลายรูป + เลือกปก)">
                <Pressable
                  onPress={pickImages}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnPick,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnPickText}>🖼️ เลือกรูปจากเครื่อง</Text>
                </Pressable>

                <View style={styles.rowBetween}>
                  <Text style={styles.muted}>
                    เลือกแล้ว {newImages.length} รูป • ปก:{" "}
                    {newImages[coverIndex]?.name ?? "-"}
                  </Text>

                  <Pressable
                    onPress={() => setReplaceOld((x) => !x)}
                    style={({ pressed }) => [
                      styles.toggle,
                      replaceOld && styles.toggleOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        replaceOld && styles.toggleTextOn,
                      ]}
                    >
                      Replace
                    </Text>
                  </Pressable>
                </View>

                {newImages.length > 0 && (
                  <View style={styles.chipsWrap}>
                    {newImages.map((f, idx) => {
                      const isCover = idx === coverIndex;
                      return (
                        <Pressable
                          key={`${f.uri}-${idx}`}
                          onPress={() => setCoverIndex(idx)}
                          style={({ pressed }) => [
                            styles.fileChip,
                            isCover && styles.fileChipActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fileChipText,
                              isCover && styles.fileChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {isCover ? "⭐ " : ""}
                            {f.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Card>

              {/* Location */}
              <Card title="พิกัดและที่อยู่">
                <Field label="ที่อยู่">
                  <TextInput
                    value={values.address}
                    onChangeText={handleChange("address")}
                    onBlur={handleBlur("address")}
                    placeholder="ระบุที่อยู่"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </Field>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Lat"
                      error={
                        touched.latitude ? (errors.latitude as any) : undefined
                      }
                    >
                      <TextInput
                        value={values.latitude}
                        onChangeText={handleChange("latitude")}
                        onBlur={handleBlur("latitude")}
                        placeholder="13.xxx"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </Field>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Field
                      label="Long"
                      error={
                        touched.longitude
                          ? (errors.longitude as any)
                          : undefined
                      }
                    >
                      <TextInput
                        value={values.longitude}
                        onChangeText={handleChange("longitude")}
                        onBlur={handleBlur("longitude")}
                        placeholder="99.xxx"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </Field>
                  </View>
                </View>

                <Text style={styles.hint}>
                  * ถ้าต้องการ “แผนที่จริง” ต้องใช้ react-native-maps + Expo Dev
                  Client (เพราะ Expo Go มักเจอ RNMapsAirModule)
                </Text>
              </Card>

              {/* Other */}
              <Card title="เวลาและข้อมูลอื่นๆ">
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="เวลาชม (นาที)">
                      <TextInput
                        value={values.avgVisitMinutes}
                        onChangeText={handleChange("avgVisitMinutes")}
                        onBlur={handleBlur("avgVisitMinutes")}
                        placeholder="60"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </Field>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Field label="ค่าเข้า (บาท)">
                      <TextInput
                        value={values.priceRange}
                        onChangeText={handleChange("priceRange")}
                        onBlur={handleBlur("priceRange")}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </Field>
                  </View>
                </View>
              </Card>

              {/* Footer Submit */}
              <Pressable
                onPress={() => handleSubmit()}
                disabled={isSubmitting || !isValid || !dirty}
                style={({ pressed }) => [
                  styles.footerBtn,
                  (isSubmitting || !isValid || !dirty) && styles.btnDisabled,
                  pressed && !isSubmitting && styles.pressed,
                ]}
              >
                <Text style={styles.footerBtnText}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกสถานที่"}
                </Text>
              </Pressable>
            </View>
          )}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- small components ---------- */

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
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function SelectLike({
  valueLabel,
  onPress,
}: {
  valueLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.select, pressed && styles.pressed]}
    >
      <Text style={styles.selectText} numberOfLines={1}>
        {valueLabel}
      </Text>
      <Text style={styles.selectChevron}>▾</Text>
    </Pressable>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { padding: 16, paddingBottom: 28 },

  headerCard: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  hTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  pillLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  pillValue: { fontSize: 11, fontWeight: "900", color: "#111827" },

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
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  label: { fontWeight: "900", color: "#111827" },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: "#111827",
  },
  errorText: { color: "#EF4444", fontWeight: "800", fontSize: 12 },

  select: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: "#111827", fontWeight: "900", flex: 1 },
  selectChevron: { color: "#6B7280", fontWeight: "900", marginLeft: 10 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  chipText: { color: "#111827", fontWeight: "900", fontSize: 12 },
  chipTextActive: { color: "white" },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "white", borderColor: "#E5E7EB" },
  btnGhostText: { color: "#111827", fontWeight: "900", fontSize: 12 },
  btnSave: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  btnSaveText: { color: "white", fontWeight: "900", fontSize: 12 },
  btnDisabled: { opacity: 0.55 },

  btnPick: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  btnPickText: { color: "#1D4ED8", fontWeight: "900" },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  toggle: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  toggleOn: { backgroundColor: "#111827", borderColor: "#111827" },
  toggleText: { color: "#111827", fontWeight: "900", fontSize: 12 },
  toggleTextOn: { color: "white" },

  fileChip: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },
  fileChipActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  fileChipText: { color: "#111827", fontWeight: "900", fontSize: 12 },
  fileChipTextActive: { color: "#1D4ED8" },
  currentImgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10, // ✅ เพิ่ม
    gap: 10, // ✅ เพิ่ม
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnDanger: { backgroundColor: "#E11D48" },
  smallBtnText: { color: "white", fontWeight: "900", fontSize: 12 },

  hint: { marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: "700" },

  footerBtn: {
    marginTop: 4,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  footerBtnText: { color: "white", fontWeight: "900", fontSize: 14 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "#6B7280", fontWeight: "700" },

  thumbWrap: {
    width: 100,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },

  thumb: {
    width: "100%",
    height: "100%",
  },

  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  fallbackText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  currentImgText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "700",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  imgWrap: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },

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
});
