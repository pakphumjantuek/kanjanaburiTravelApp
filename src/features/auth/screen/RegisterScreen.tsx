import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useRegisterMutation } from "../authApi";
import { RootStackParamList } from "../../../navigates/typeRootStack";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../../common";

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

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
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Start your journey</Text>

        <Text style={styles.label}>Display name</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholder="Your name" placeholderTextColor={COLORS.gray} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="example@email.com"
          placeholderTextColor={COLORS.gray}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          style={styles.input}
          placeholder="0812345678"
          placeholderTextColor={COLORS.gray}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="Min 6 characters"
          placeholderTextColor={COLORS.gray}
          secureTextEntry
        />

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <TouchableOpacity style={[styles.btn, disabled && styles.btnDisabled]} onPress={onSubmit} disabled={disabled}>
          <Text style={styles.btnText}>{isLoading ? "Creating..." : "Create account"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.offwhite, justifyContent: "center", padding: SIZES.large },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.medium, padding: SIZES.large, ...SHADOWS.medium },
  title: { fontSize: 22, fontFamily: FONTS.semiBold, color: COLORS.primary },
  sub: { marginTop: 6, fontSize: SIZES.small, fontFamily: FONTS.regular, color: COLORS.gray },

  label: { marginTop: SIZES.medium, fontSize: SIZES.small, fontFamily: FONTS.medium, color: COLORS.primary2 },
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

  link: { marginTop: SIZES.large, textAlign: "center", color: COLORS.info, fontFamily: FONTS.medium },
});
