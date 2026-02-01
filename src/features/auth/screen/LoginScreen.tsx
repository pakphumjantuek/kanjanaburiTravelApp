import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootStackParamList } from "../../../navigates/typeRootStack";
import { RootState } from "../../../redux/store";
import { useLoginMutation } from "../authApi";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../../common";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useSelector((s: RootState) => s.auth.user);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [login, { isLoading, error }] = useLoginMutation();

  // ถ้า login แล้ว ให้กลับ
  useEffect(() => {
    if (user) navigation.goBack();
  }, [user, navigation]);

  const errorText = useMemo(() => {
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.page}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary2, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bg}
        />

        <KeyboardAvoidingView
          style={styles.pageInner}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🧭</Text>
            </View>
            <Text style={styles.heroTitle}>Kanchanaburi Travel</Text>
            <Text style={styles.heroSub}>เข้าสู่ระบบเพื่อเริ่มต้นการเดินทาง</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>
            <Text style={styles.cardSub}>ยินดีต้อนรับกลับมา</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                placeholder="example@email.com"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="******"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.8}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>

            {!!errorText && <Text style={styles.error}>{errorText}</Text>}

            <TouchableOpacity
              style={[styles.btn, disabled && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={disabled}
              activeOpacity={0.9}
            >
              {isLoading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.btnText}>กำลังเข้าสู่ระบบ...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>ยังไม่มีบัญชี?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.link}>สมัครสมาชิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.offwhite,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  pageInner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large,
  },
  hero: {
    alignItems: "center",
    marginBottom: SIZES.large,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 34 },
  heroTitle: {
    fontSize: 22,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.9)",
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.large,
    ...SHADOWS.medium,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary2,
    letterSpacing: -0.2,
  },
  cardSub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },

  label: {
    marginTop: SIZES.medium,
    fontSize: SIZES.small,
    fontFamily: FONTS.medium,
    color: COLORS.primary2,
  },
  inputWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.deActive,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.lightWhite,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    color: COLORS.primary2,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    marginRight: -6,
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
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: { color: COLORS.white, fontFamily: FONTS.semiBold, fontSize: 15 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: SIZES.large,
  },
  footerText: {
    color: COLORS.gray,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  link: {
    color: COLORS.info,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
});
