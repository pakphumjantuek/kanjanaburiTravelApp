import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";

import {
  useGetMyReviewQuery,
  useUpsertMyReviewMutation,
  useDeleteMyReviewMutation,
} from "../PlaceReviewApi"; // <-- ปรับ path ให้ตรง

import { RatingStars } from "./RatingStars.native"; // <-- ใช้ไฟล์ด้านล่าง

type Props = {
  placeId: number;
  isLoggedIn: boolean;
};

// ถ้าคุณมี toast ของ RN อยู่แล้ว ให้แทนที่ 2 ฟังก์ชันนี้ได้เลย
const showSuccessOk = (msg: string) => Alert.alert("สำเร็จ", msg);
const showError = (msg: string) => Alert.alert("ผิดพลาด", msg);

export function PlaceReviewForm({ placeId, isLoggedIn }: Props) {
  const {
    data: myReview,
    isLoading: isMyLoading,
    error,
  } = useGetMyReviewQuery({ placeId }, { skip: !isLoggedIn });

  const [upsert, { isLoading: isSaving }] = useUpsertMyReviewMutation();
  const [del, { isLoading: isDeleting }] = useDeleteMyReviewMutation();

  const initial = useMemo(() => {
    return {
      rating: myReview?.rating ?? 0,
      comment: myReview?.comment ?? "",
    };
  }, [myReview?.rating, myReview?.comment]);

  const [rating, setRating] = useState(initial.rating);
  const [comment, setComment] = useState(initial.comment);

  useEffect(() => {
    setRating(initial.rating);
    setComment(initial.comment);
  }, [initial.rating, initial.comment]);

  const canSubmit = isLoggedIn && rating >= 1 && comment.trim().length > 0;

  const onSave = async () => {
    try {
      await upsert({
        placeId,
        body: { rating, comment: comment.trim() },
      }).unwrap();

      showSuccessOk("บันทึกรีวิวสำเร็จ");
    } catch (e: any) {
      showError(e?.data?.errorMessages?.[0] ?? e?.message ?? "บันทึกรีวิวไม่สำเร็จ");
    }
  };

  const onDelete = async () => {
    if (!myReview) return;

    Alert.alert("ยืนยันการลบ", "ต้องการลบรีวิวของคุณหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await del({ placeId }).unwrap();
            showSuccessOk("ลบรีวิวสำเร็จ");
            setRating(0);
            setComment("");
          } catch (e: any) {
            showError(e?.data?.errorMessages?.[0] ?? e?.message ?? "ลบรีวิวไม่สำเร็จ");
          }
        },
      },
    ]);
  };

  if (!isLoggedIn) {
    return (
      <View style={s.card}>
        <Text style={s.muted}>กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>รีวิวของฉัน</Text>
          <Text style={s.subTitle}>ให้ดาวและเขียนความคิดเห็นสั้น ๆ</Text>
        </View>

        <View style={[s.badge, myReview ? s.badgeOk : s.badgeIdle]}>
          <Text style={[s.badgeText, myReview ? s.badgeTextOk : s.badgeTextIdle]}>
            {myReview ? "เคยรีวิวแล้ว" : "ยังไม่เคยรีวิว"}
          </Text>
        </View>
      </View>

      {/* Rating */}
      <View style={s.ratingRow}>
        <RatingStars value={rating} onChange={setRating} />
        <Text style={s.ratingText}>{rating}/5</Text>
      </View>

      {/* Comment */}
      <TextInput
        style={s.textarea}
        placeholder="เล่าประสบการณ์ของคุณ..."
        placeholderTextColor="#94a3b8"
        value={comment}
        onChangeText={setComment}
        multiline
        textAlignVertical="top"
      />

      {/* Actions */}
      <View style={s.actionsRow}>
        <Pressable
          onPress={onSave}
          disabled={!canSubmit || isSaving}
          style={({ pressed }) => [
            s.saveBtn,
            (!canSubmit || isSaving) && s.btnDisabled,
            pressed && !(!canSubmit || isSaving) && s.btnPressed,
          ]}
        >
          {isSaving ? (
            <View style={s.inline}>
              <ActivityIndicator size="small" color="#0f172a" />
              <Text style={s.saveBtnText}>กำลังบันทึก...</Text>
            </View>
          ) : (
            <Text style={s.saveBtnText}>บันทึกรีวิว</Text>
          )}
        </Pressable>

        {myReview ? (
          <Pressable
            onPress={onDelete}
            disabled={isDeleting}
            style={({ pressed }) => [
              s.deleteBtn,
              isDeleting && s.btnDisabled2,
              pressed && !isDeleting && s.btnPressed,
            ]}
          >
            <Text style={s.deleteBtnText}>
              {isDeleting ? "กำลังลบ..." : "ลบ"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* status */}
      {error ? <Text style={s.error}>โหลดรีวิวของฉันไม่สำเร็จ</Text> : null}
      {isMyLoading ? <Text style={s.loading}>กำลังโหลดข้อมูล...</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },

  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  subTitle: { marginTop: 4, fontSize: 13, color: "#475569", fontWeight: "600" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  badgeIdle: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  badgeText: { fontSize: 11, fontWeight: "900" },
  badgeTextOk: { color: "#047857" },
  badgeTextIdle: { color: "#475569" },

  ratingRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  ratingText: { fontSize: 14, fontWeight: "900", color: "#0f172a" },

  textarea: {
    marginTop: 14,
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },

  actionsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#34d399", // emerald-ish
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#0f172a", fontWeight: "900", fontSize: 14 },

  deleteBtn: {
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { color: "#e11d48", fontWeight: "900", fontSize: 14 },

  btnDisabled: { backgroundColor: "#e2e8f0" },
  btnDisabled2: { opacity: 0.6 },
  btnPressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },

  inline: { flexDirection: "row", alignItems: "center", gap: 8 },

  error: { marginTop: 10, fontSize: 13, color: "#e11d48", fontWeight: "700" },
  loading: { marginTop: 10, fontSize: 13, color: "#64748b", fontWeight: "700" },
  muted: { fontSize: 13, color: "#334155", fontWeight: "700" },
});
