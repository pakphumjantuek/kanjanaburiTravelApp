import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useGetReviewsByPlaceQuery } from "../PlaceReviewApi";

import { RatingStars } from "../components/RatingStars.native"; 
import { PlaceReviewForm } from "../components/PlaceReviewForm";
import { formatThaiDate } from "../../../utils/dateUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";

// ✅ ช่วยอ่านฟิลด์แบบปลอดภัยขึ้น
type ReviewLike = {
  reviewId?: number;
  rating?: number | null;
  comment?: string | null;

  displayName?: string | null;
  userName?: string | null;
  createdByName?: string | null;

  userId?: number | null;
  createdByUserId?: number | null;

  createdAt?: string | null;
  createdDateTime?: string | null;
};

type Props = {
  placeId: number;
};

export function PlaceReviews({ placeId }: Props) {
  const user = useSelector((s : RootState) => s.auth.user);
  const isLoggedIn = Boolean(user);

  const take = 10;
  const [skip, setSkip] = useState(0);

  const {
    data: reviews = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetReviewsByPlaceQuery({ placeId, skip, take });

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = (reviews as any[]).reduce((a, r) => a + (r?.rating ?? 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const avgRounded = Math.round(avg);

  const myUserId = (user as any)?.userId ?? (user as any)?.id ?? null;

  const renderReviewCard = (r: ReviewLike, idx: number) => {
    const createdAt = r.createdAt ?? r.createdDateTime ?? null;
    const reviewUserId = r.userId ?? r.createdByUserId ?? null;
    const isMine = Boolean(myUserId && reviewUserId && myUserId === reviewUserId);

    const myDisplayName =
      (user as any)?.displayName ??
      (user as any)?.DisplayName ??
      (user as any)?.userName ??
      (user as any)?.username ??
      null;

    const userName =
      (isMine ? myDisplayName : null) ||
      r.displayName ||
      r.userName ||
      r.createdByName ||
      "ผู้ใช้งาน";

    return (
      <View key={r.reviewId ?? idx} style={s.reviewCard}>
        <View style={s.reviewTopRow}>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.reviewName} numberOfLines={1}>
                {userName}
              </Text>

              {isMine ? (
                <View style={s.mineBadge}>
                  <Text style={s.mineBadgeText}>ของฉัน</Text>
                </View>
              ) : null}
            </View>

            <Text style={s.reviewDate}>
              {formatThaiDate(createdAt ?? "")}
            </Text>
          </View>

          <View style={s.ratingRight}>
            <RatingStars value={r.rating ?? 0} onChange={() => {}} />
            <Text style={s.ratingSmallText}>{(r.rating ?? 0)}/5</Text>
          </View>
        </View>

        {r.comment ? (
          <Text style={s.reviewComment}>{r.comment}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={s.wrap}>
      {/* My Review Form */}
      <PlaceReviewForm placeId={placeId} isLoggedIn={isLoggedIn} />

      {/* Reviews Section */}
      <View style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>รีวิวจากผู้ใช้งาน</Text>
            <Text style={s.sectionSubTitle}>
              {reviews.length
                ? `คะแนนเฉลี่ย (จากรายการที่โหลด): ${avg}/5`
                : "ยังไม่มีรีวิว"}
            </Text>
          </View>

          <View style={s.avgBox}>
            <RatingStars value={avgRounded} onChange={() => {}} />
            <Text style={s.avgText}>{avg}</Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          {isLoading ? (
            <View style={s.centerRow}>
              <ActivityIndicator />
              <Text style={s.muted}>กำลังโหลดรีวิว...</Text>
            </View>
          ) : error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>โหลดรีวิวไม่สำเร็จ</Text>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => [s.retryBtn, pressed && s.pressed]}
              >
                <Text style={s.retryText}>ลองใหม่</Text>
              </Pressable>
            </View>
          ) : reviews.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                ยังไม่มีรีวิว ลองเป็นคนแรกที่รีวิวสถานที่นี้ 🙂
              </Text>
            </View>
          ) : (
            (reviews as ReviewLike[]).map(renderReviewCard)
          )}
        </View>

        {/* Pagination */}
        <View style={s.pagingRow}>
          <Pressable
            disabled={skip === 0 || isFetching}
            onPress={() => setSkip((s0) => Math.max(0, s0 - take))}
            style={({ pressed }) => [
              s.pageBtn,
              (skip === 0 || isFetching) && s.disabledBtn,
              pressed && !(skip === 0 || isFetching) && s.pressed,
            ]}
          >
            <Text style={s.pageBtnText}>ก่อนหน้า</Text>
          </Pressable>

          <Pressable
            disabled={reviews.length < take || isFetching}
            onPress={() => setSkip((s0) => s0 + take)}
            style={({ pressed }) => [
              s.pageBtn,
              (reviews.length < take || isFetching) && s.disabledBtn,
              pressed && !(reviews.length < take || isFetching) && s.pressed,
            ]}
          >
            <Text style={s.pageBtnText}>ถัดไป</Text>
          </Pressable>
        </View>

        {isFetching ? (
          <Text style={s.fetchingText}>กำลังโหลด...</Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  sectionSubTitle: { marginTop: 4, fontSize: 13, color: "#475569", fontWeight: "600" },

  avgBox: { alignItems: "flex-end", gap: 6 },
  avgText: { fontSize: 14, fontWeight: "900", color: "#0f172a" },

  centerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  muted: { fontSize: 13, color: "#64748b", fontWeight: "700" },

  errorBox: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  errorText: { color: "#e11d48", fontWeight: "900" },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  retryText: { color: "#e11d48", fontWeight: "900" },

  emptyBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
  },
  emptyText: { color: "#475569", fontWeight: "700" },

  reviewCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  reviewTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  reviewName: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  reviewDate: { marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: "700" },

  mineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  mineBadgeText: { fontSize: 11, fontWeight: "900", color: "#047857" },

  ratingRight: { alignItems: "flex-end", gap: 6 },
  ratingSmallText: { fontSize: 12, fontWeight: "900", color: "#334155" },

  reviewComment: {
    marginTop: 10,
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
    lineHeight: 18,
  },

  pagingRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  pageBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnText: { fontSize: 13, fontWeight: "900", color: "#0f172a" },

  disabledBtn: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },

  fetchingText: { marginTop: 10, fontSize: 13, color: "#64748b", fontWeight: "700" },
});
