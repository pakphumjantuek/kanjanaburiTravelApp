import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Formik } from "formik";
import * as Yup from "yup";

import { useCreatePlaceTagMutation, useUpdatePlaceTagMutation } from "../placeTagApi";
import type { PlaceTagDto } from "../placeTagTypes";
import { AppButton, Card, FormTextInput } from "../../../components";


type RouteParams =
  | { mode: "add" }
  | { mode: "edit"; placeTag: PlaceTagDto };

  
const placeTagValidationSchema = Yup.object({
  tagName: Yup.string()
    .trim()
    .required("กรุณากรอกชื่อแท็กสถานที่")
    .max(150, "ชื่อแท็กยาวเกินไป (ไม่เกิน 150 ตัวอักษร)"),
  tagDescription: Yup.string().optional(),
});

type FormValues = {
  tagName: string;
  tagDescription: string;
};

export default function PlaceTagFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? { mode: "add" }) as RouteParams;

  const isEditMode = params.mode === "edit";
  const placeTag = isEditMode ? params.placeTag : undefined;

  
  const [createPlaceTag, { isLoading: creating }] = useCreatePlaceTagMutation();
  const [updatePlaceTag, { isLoading: updating }] = useUpdatePlaceTagMutation();

  const isSubmitting = creating || updating;

  const initialValues: FormValues = {
    tagName: placeTag?.tagName ?? "",
    tagDescription: placeTag?.tagDescription ?? "",
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      if (isEditMode) {
        const id = Number(placeTag?.tagId);
        if (!Number.isFinite(id) || id <= 0) throw new Error("tagId ไม่ถูกต้อง");

        await updatePlaceTag({
          id,
          body: {
            tagId: id,
            tagName: values.tagName.trim(),
            tagDescription: values.tagDescription?.trim(),
          },
        }).unwrap();
      } else {
        await createPlaceTag({
          tagId: 0,
          tagName: values.tagName.trim(),
          tagDescription: values.tagDescription?.trim(),
        }).unwrap();
      }

      Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย");
      navigation.goBack(); // หรือ navigation.navigate("PlaceTagList")
    } catch (e) {
      console.log(e);
      Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {isEditMode ? "แก้ไขแท็กสถานที่" : "เพิ่มแท็กสถานที่ใหม่"}
              </Text>
              <Text style={styles.subtitle}>
                ใช้สำหรับจัดหมวดหมู่สถานที่ เช่น วัฒนธรรม / อาหาร / ชุมชน
              </Text>
            </View>

            <AppButton
              title="ยกเลิก"
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
          </View>

          {/* Form */}
          <Card>
            <Formik
              initialValues={initialValues}
              validationSchema={placeTagValidationSchema}
              enableReinitialize
              onSubmit={handleSubmit}
            >
              {({ handleSubmit, isValid, dirty }) => (
                <View style={{ gap: 14 }}>
                  <FormTextInput
                    name="tagName"
                    label="ชื่อแท็กสถานที่"
                    placeholder="เช่น ธรรมชาติ, ประวัติศาสตร์, ชุมชน"
                  />

                  <FormTextInput
                    name="tagDescription"
                    label="คำอธิบายแท็กสถานที่ (ถ้ามี)"
                    placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับแท็กสถานที่นี้"
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                  />

                  <View style={styles.btnRow}>
                    <AppButton
                      title="ยกเลิก"
                      variant="secondary"
                      onPress={() => navigation.goBack()}
                    />

                    <AppButton
                      title={isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                      variant="primary"
                      disabled={isSubmitting || !isValid || !dirty}
                      onPress={() => handleSubmit()}
                    />
                  </View>

                  <Text style={styles.hint}>
                    * แท็กที่ดีช่วยให้ Search/Filter และการแนะนำสถานที่แม่นขึ้น
                  </Text>
                </View>
              )}
            </Formik>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { padding: 16, gap: 12 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 4, color: "#6B7280", fontWeight: "700", fontSize: 12 },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },

  textArea: { minHeight: 110, textAlignVertical: "top" },

  hint: { color: "#6B7280", fontWeight: "700", fontSize: 12, marginTop: 4 },
});
