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

import { useCreateRoleMutation, useUpdateRoleMutation } from "../roleApi";
import type { roleDto } from "../roleTypes";
import { AppButton, Card, FormTextInput } from "../../../components";


type RoleFormRouteParams = { mode: "add" } | { mode: "edit"; role: roleDto };

export default function RoleFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? { mode: "add" }) as RoleFormRouteParams;

  const isEditMode = params.mode === "edit";
  const role = isEditMode ? params.role : undefined;

  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const isSubmitting = creating || updating;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.title}>
            {isEditMode ? "แก้ไขสิทธิ์" : "เพิ่มสิทธิ์ใหม่"}
          </Text>

          <Card>
            <Formik
              enableReinitialize
              initialValues={{ roleName: role?.roleName ?? "" }}
              validationSchema={Yup.object({
                roleName: Yup.string().required("กรุณากรอกชื่อสิทธิ์"),
              })}
              onSubmit={async (values) => {
                try {
                  if (isEditMode && role) {
                    await updateRole({
                      id: role.roleId,
                      body: { roleId: role.roleId, roleName: values.roleName },
                    }).unwrap();
                  } else {
                    await createRole({
                      roleId: 0,
                      roleName: values.roleName,
                    }).unwrap();
                  }

                  Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย");
                  navigation.goBack();
                } catch (e) {
                  Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ");
                  console.log(e);
                }
              }}
            >
              {({ handleSubmit, isValid, dirty }) => (
                <View style={{ gap: 14 }}>
                  <FormTextInput
                    name="roleName"
                    label="ชื่อสิทธิ์"
                    placeholder="กรุณากรอกชื่อสิทธิ์"
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
  container: { padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
});
