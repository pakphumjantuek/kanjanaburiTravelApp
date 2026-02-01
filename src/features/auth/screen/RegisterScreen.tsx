import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useRegisterMutation } from "../authApi";
import { RootStackParamList } from "../../../navigates/typeRootStack";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../../common";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [register, { isLoading, error }] = useRegisterMutation();

  const errorText = useMemo(() => {
    const anyErr: any = error;
    if (!anyErr) return "";
    if (typeof anyErr?.data === "string") return anyErr.data;
    return anyErr?.data?.errorMessages?.[0] ?? anyErr?.error ?? "Register failed";
  }, [error]);

  const onSubmit = async () => {
    const name = displayName.trim();
    const em = email.trim();
    const phone = phoneNumber.trim();

    if (!name || !em || password.length < 6) return;

    try {
      await register({
        displayName: name,
        email: em,
        phoneNumber: phone || undefined,
        password,
      }).unwrap();

      // onQueryStarted จะ persistAuth ให้แล้ว (ถ้าคุณทำไว้)
      navigation.goBack(); // กลับไปหน้าก่อนหน้า หรือ navigate("HomeScreen") ก็ได้
    } catch {}
  };

  const disabled = !displayName.trim() || !email.trim() || password.length < 6 || isLoading;

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
              <Text style={styles.logoEmoji}>🧳</Text>
            </View>
            <Text style={styles.heroTitle}>สร้างบัญชีใหม่</Text>
            <Text style={styles.heroSub}>เริ่มต้นการเดินทางของคุณกับเรา</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>สมัครสมาชิก</Text>
            <Text style={styles.cardSub}>กรอกข้อมูลให้ครบเพื่อสร้างบัญชี</Text>

            <Text style={styles.label}>ชื่อที่แสดง</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={COLORS.gray}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>เบอร์โทร (ไม่บังคับ)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.input}
                placeholder="0812345678"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                placeholderTextColor={COLORS.gray}
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
                  <Text style={styles.btnText}>กำลังสร้างบัญชี...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>สร้างบัญชี</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>มีบัญชีอยู่แล้ว?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.link}>เข้าสู่ระบบ</Text>
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

  error: {
    marginTop: 10,
    color: COLORS.red,
    fontFamily: FONTS.regular,
  },

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
