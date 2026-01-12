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

import type { PlaceCategory } from "../placeCategoryTypes";
import {
  useCreatePlaceCategoryMutation,
  useUpdatePlaceCategoryMutation,
} from "../placeCategoryApi";
import { AppButton, Card, FormTextInput } from "../../../components";

type RouteParams =
  | { mode: "add" }
  | { mode: "edit"; placeCategory: PlaceCategory };

const placeCategoryValidationSchema = Yup.object({
  categoryName: Yup.string()
    .trim()
    .required("กรุณากรอกชื่อประเภทสถานที่")
    .max(150, "ชื่อประเภทยาวเกินไป (ไม่เกิน 150 ตัวอักษร)"),
  categoryDescription: Yup.string().optional(),
});

type FormValues = {
  categoryName: string;
  categoryDescription: string;
};

export default function PlaceCategoryFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? { mode: "add" }) as RouteParams;

  const isEditMode = params.mode === "edit";
  const placeCategory = isEditMode ? params.placeCategory : undefined;

  const [createPlaceCategory, { isLoading: creating }] =
    useCreatePlaceCategoryMutation();
  const [updatePlaceCategory, { isLoading: updating }] =
    useUpdatePlaceCategoryMutation();

  const isSubmitting = creating || updating;

  const initialValues: FormValues = {
    categoryName: placeCategory?.categoryName ?? "",
    categoryDescription: placeCategory?.categoryDescription ?? "",
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      if (isEditMode) {
        const id = Number(placeCategory?.categoryId);
        if (!Number.isFinite(id) || id <= 0)
          throw new Error("categoryId ไม่ถูกต้อง");

        await updatePlaceCategory({
          id,
          body: {
            categoryId: id,
            categoryName: values.categoryName.trim(),
            categoryDescription: values.categoryDescription?.trim() ?? "",
          },
        }).unwrap();
      } else {
        await createPlaceCategory({
          categoryId: 0,
          categoryName: values.categoryName.trim(),
          categoryDescription: values.categoryDescription?.trim() ?? "",
        }).unwrap();
      }

      Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย");
      navigation.goBack(); // หรือ navigation.navigate("PlaceCategoryList")
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
                {isEditMode ? "แก้ไขประเภทสถานที่" : "เพิ่มประเภทสถานที่ใหม่"}
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

          {/* Form Card */}
          <Card>
            <Formik
              initialValues={initialValues}
              validationSchema={placeCategoryValidationSchema}
              enableReinitialize
              onSubmit={handleSubmit}
            >
              {({ handleSubmit, isValid, dirty }) => (
                <View style={{ gap: 14 }}>
                  <FormTextInput
                    name="categoryName"
                    label="ชื่อประเภทสถานที่"
                    placeholder="แหล่งท่องเที่ยวทางธรรมชาติ"
                  />

                  <FormTextInput
                    name="categoryDescription"
                    label="รายละเอียด"
                    placeholder="เช่น วัฒนธรรม, อาหาร, ชุมชน"
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
                    * หมวดหมู่ที่ดีช่วยให้ Search/Filter
                    และการแนะนำสถานที่แม่นขึ้น
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
