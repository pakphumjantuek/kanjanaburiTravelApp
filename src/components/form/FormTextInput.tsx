import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { useField } from "formik";

type Props = TextInputProps & {
  name: string;
  label?: string;
};

export default function FormTextInput({ name, label, style, ...props }: Props) {
  const [field, meta, helpers] = useField<string>(name);
  const hasError = !!(meta.touched && meta.error);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        value={field.value ?? ""}
        onChangeText={(t) => helpers.setValue(t)}
        onBlur={() => helpers.setTouched(true)}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, hasError && styles.inputError, style]}
        {...props}
      />

      {hasError ? <Text style={styles.error}>{meta.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontWeight: "900", color: "#111827" },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
  },
  inputError: { borderColor: "#EF4444" },
  error: { color: "#EF4444", fontWeight: "800", fontSize: 12 },
});
