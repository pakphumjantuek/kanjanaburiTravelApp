import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootStackParamList } from "../../../navigates/typeRootStack";
import { RootState } from "../../../redux/store";
import { useLoginMutation } from "../authApi";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../../common";

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useSelector((s: RootState) => s.auth.user);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading, error }] = useLoginMutation();

  // ถ้า login แล้ว ให้กลับ
  useEffect(() => {
    if (user) navigation.goBack();
  }, [user]);

  const errorText = useMemo(() => {
    // RTKQ error รูปแบบต่าง ๆ — เอาแบบอ่านง่าย
    const anyErr: any = error;
    if (!anyErr) return "";
    if (typeof anyErr?.data === "string") return anyErr.data;
    return anyErr?.data?.errorMessages?.[0] ?? anyErr?.error ?? "Login failed";
  }, [error]);

  const onSubmit = async () => {
    const e = emailOrPhone.trim();
    if (!e || password.length < 1) return;

    try {
      await login({ emailOrPhone: e, password }).unwrap();
      // onQueryStarted จะ persistAuth ให้แล้ว
       navigation.getParent?.()?.navigate("โปรไฟล์"); 
    } catch {
      // errorText จะโชว์
    }
  };

  const disabled = !emailOrPhone.trim() || password.length < 1 || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Login to continue</Text>

        <Text style={styles.label}>Email or Phone</Text>
        <TextInput
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          placeholder="example@email.com / 0812345678"
          placeholderTextColor={COLORS.gray}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="******"
          placeholderTextColor={COLORS.gray}
          style={styles.input}
          secureTextEntry
        />

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <TouchableOpacity
          style={[styles.btn, disabled && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={disabled}
        >
          <Text style={styles.btnText}>
            {isLoading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>No account? Create one</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.offwhite,
    justifyContent: "center",
    padding: SIZES.large,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.large,
    ...SHADOWS.medium,
  },
  title: { fontSize: 22, fontFamily: FONTS.semiBold, color: COLORS.primary },
  sub: {
    marginTop: 6,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },

  label: {
    marginTop: SIZES.medium,
    fontSize: SIZES.small,
    fontFamily: FONTS.medium,
    color: COLORS.primary2,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.deActive,
    borderRadius: SIZES.small,
    paddingHorizontal: SIZES.medium,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    color: COLORS.primary2,
    backgroundColor: COLORS.lightWhite,
  },

  error: { marginTop: 10, color: COLORS.red, fontFamily: FONTS.regular },

  btn: {
    marginTop: SIZES.large,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontFamily: FONTS.semiBold },

  link: {
    marginTop: SIZES.large,
    textAlign: "center",
    color: COLORS.info,
    fontFamily: FONTS.medium,
  },
});
