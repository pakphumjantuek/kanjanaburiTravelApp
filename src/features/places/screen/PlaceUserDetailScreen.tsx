// src/screens/PlaceUserDetailScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";

import { useGetByIdQuery } from "../placeApi";
import type { PlaceDto } from "../placeTypes";

import { useBehaviorLogger } from "../../behavior/useBehaviorLogger";
import { getPlaceImageUrl } from "../../places/Components/placeListUtils";

import AddToTripModalRN from "../Components/AddToTripModalRN";

import {
  useGetReviewsByPlaceQuery,
  useGetMyReviewQuery,
  useUpsertMyReviewMutation,
  useDeleteMyReviewMutation,
} from "../../placeReview/PlaceReviewApi";

import { formatThaiDate } from "../../../utils/dateUtils";

const { width } = Dimensions.get("window");

type RouteParams = {
  placeId?: number;
  place?: PlaceDto;
};

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

export default function PlaceUserDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RouteParams;

  const { accessToken, hydrated, user } = useSelector(
    (state: any) => state.auth
  );
  const isLoggedIn = !!accessToken && hydrated;

  const placeFromState = params.place;
  const placeId = params.placeId ?? placeFromState?.placeId;

  const { data: place, isLoading: isPlaceLoading } = useGetByIdQuery(placeId!, {
    skip: !placeId || !!placeFromState,
  });

  const displayPlace = placeFromState || place;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // behavior logger
  const log = useBehaviorLogger();
  const viewedOnceRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    if (!placeId) return;
    if (viewedOnceRef.current[placeId]) return;
    viewedOnceRef.current[placeId] = true;

    log({ placeId, actionType: "VIEW" }).catch(() => {});
  }, [placeId, log]);

  // Add to trip modal
  const [openAddTrip, setOpenAddTrip] = useState(false);

  // ---------- Reviews (list) ----------
  const take = 10;
  const [skip, setSkip] = useState(0);

  const {
    data: reviews = [],
    isLoading: isReviewLoading,
    isFetching: isReviewFetching,
    error: reviewError,
    refetch: refetchReviews,
  } = useGetReviewsByPlaceQuery(
    { placeId: placeId!, skip, take },
    { skip: !placeId }
  );

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const s = (reviews as any[]).reduce((a, r) => a + (r.rating ?? 0), 0);
    return Math.round((s / reviews.length) * 10) / 10;
  }, [reviews]);

  // ---------- Scroll to review form ----------
  const scrollRef = useRef<ScrollView>(null);
  const reviewFormY = useRef(0);

  const scrollToReviewForm = () => {
    scrollRef.current?.scrollTo({ y: reviewFormY.current, animated: true });
  };

  // loading / empty
  if ((isPlaceLoading || !displayPlace) && !placeFromState) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2A4D50" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayPlace) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={64} color="#cc3300" />
          </View>
          <Text style={styles.errorTitle}>ไม่พบข้อมูลสถานที่</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("PlaceList")}
            style={styles.btnPrimary}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = displayPlace.images || [];
  const coverUrl = getPlaceImageUrl(displayPlace);

  const totalPages = Math.max(
    1,
    Math.ceil(((reviews as any[])?.length ?? 0) / take)
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            onPress={() => navigation.navigate("PlaceList")}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.favoriteBtn}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FF7754" : "#000"}
            />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          {/* Gallery */}
          <PlaceGalleryRN
            images={images}
            selectedIndex={selectedImageIndex}
            onSelect={setSelectedImageIndex}
            fallbackCoverUrl={coverUrl}
          />

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName}>{displayPlace.name}</Text>
                {!!displayPlace.categoryName && (
                  <View style={styles.categoryBadge}>
                    <Ionicons name="pricetag" size={14} color="#2A4D50" />
                    <Text style={styles.categoryText}>
                      {displayPlace.categoryName}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="time" size={20} color="#FF7754" />
                <Text style={styles.statValue}>
                  {displayPlace.avgVisitMinutes ?? "-"}
                </Text>
                <Text style={styles.statLabel}>นาที</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="star" size={20} color="#FFC107" />
                <Text style={styles.statValue}>{avg ? String(avg) : "-"}</Text>
                <Text style={styles.statLabel}>คะแนน</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people" size={20} color="#2A4D50" />
                <Text style={styles.statValue}>
                  {(reviews as any[])?.length ?? 0}
                </Text>
                <Text style={styles.statLabel}>รีวิว</Text>
              </View>
            </View>

            {isLoggedIn && (
              <TouchableOpacity
                onPress={() => setOpenAddTrip(true)}
                style={styles.addToTripBtn}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addToTripText}>เพิ่มเข้าทริป</Text>
              </TouchableOpacity>
            )}

            {/* Description */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#2A4D50" />
                <Text style={styles.sectionTitle}>รายละเอียด</Text>
              </View>
              <Text style={styles.descriptionText}>
                {displayPlace.description?.trim() || "ไม่มีรายละเอียด"}
              </Text>
            </View>

            {/* Location Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color="#FF7754" />
                <Text style={styles.sectionTitle}>ที่อยู่</Text>
              </View>
              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <Ionicons name="navigate" size={16} color="#83829A" />
                  <Text style={styles.locationText}>
                    {displayPlace.address ?? "ไม่มีข้อมูลที่อยู่"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.mapBtn}>
                <Ionicons name="map" size={18} color="#fff" />
                <Text style={styles.mapBtnText}>เปิดแผนที่</Text>
              </TouchableOpacity>
            </View>

            {/* Additional Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#7c3aed" />
                <Text style={styles.sectionTitle}>ข้อมูลเพิ่มเติม</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconBadge}>
                    <Ionicons name="cash" size={18} color="#10b981" />
                  </View>
                  <Text style={styles.infoLabel}>ค่าเข้าชม</Text>
                  <Text style={styles.infoValue}>ฟรี</Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconBadge}>
                    <Ionicons name="car" size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.infoLabel}>ที่จอดรถ</Text>
                  <Text style={styles.infoValue}>มี</Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconBadge}>
                    <MaterialCommunityIcons
                      name="wheelchair-accessibility"
                      size={18}
                      color="#FF7754"
                    />
                  </View>
                  <Text style={styles.infoLabel}>สิ่งอำนวยความสะดวก</Text>
                  <Text style={styles.infoValue}>มี</Text>
                </View>
              </View>
            </View>

            {/* ========================= */}
            {/* Reviews Section (จริง) */}
            {/* ========================= */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubbles" size={20} color="#FFC107" />
                <Text style={styles.sectionTitle}>รีวิวจากผู้เยี่ยมชม</Text>
              </View>

              {/* ✅ Form anchor */}
              <View
                onLayout={(e) => {
                  reviewFormY.current = e.nativeEvent.layout.y;
                }}
              >
                <PlaceReviewFormRN placeId={placeId!} isLoggedIn={isLoggedIn} />
              </View>

              {/* List / Placeholder */}
              {isReviewLoading ? (
                <View style={styles.reviewsPlaceholder}>
                  <ActivityIndicator size="small" color="#2A4D50" />
                  <Text style={styles.reviewsPlaceholderText}>
                    กำลังโหลดรีวิว...
                  </Text>
                </View>
              ) : reviewError ? (
                <View style={styles.reviewsPlaceholder}>
                  <Ionicons name="alert-circle" size={28} color="#cc3300" />
                  <Text style={styles.reviewsPlaceholderTitle}>
                    โหลดรีวิวไม่สำเร็จ
                  </Text>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => refetchReviews()}
                  >
                    <Ionicons name="refresh" size={16} color="#2A4D50" />
                    <Text style={styles.reviewBtnText}>ลองใหม่</Text>
                  </TouchableOpacity>
                </View>
              ) : (reviews as any[]).length === 0 ? (
                <View style={styles.reviewsPlaceholder}>
                  <Ionicons name="star" size={32} color="#FFC107" />
                  <Text style={styles.reviewsPlaceholderTitle}>
                    ยังไม่มีรีวิว
                  </Text>
                  <Text style={styles.reviewsPlaceholderText}>
                    เป็นคนแรกที่แชร์ประสบการณ์ของคุณ
                  </Text>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={scrollToReviewForm}
                  >
                    <Ionicons name="create" size={16} color="#2A4D50" />
                    <Text style={styles.reviewBtnText}>เขียนรีวิว</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Summary */}
                  <View style={styles.reviewSummaryRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <RatingStarsRN value={Math.round(avg)} readOnly />
                      <Text style={styles.reviewSummaryText}>{avg}/5</Text>
                    </View>
                    {isReviewFetching ? (
                      <Text style={styles.reviewFetchingText}>
                        กำลังโหลด...
                      </Text>
                    ) : null}
                  </View>

                  {/* Reviews list */}
                  <View style={{ gap: 12 }}>
                    {(reviews as ReviewLike[]).map((r, idx) => {
                      const createdAt =
                        r.createdAt ?? r.createdDateTime ?? null;

                      const reviewUserId =
                        r.userId ?? r.createdByUserId ?? null;
                      const myUserId = user?.userId ?? user?.id ?? null;
                      const isMine = Boolean(
                        myUserId && reviewUserId && myUserId === reviewUserId
                      );

                      const userName =
                        (isMine
                          ? user?.DisplayName ?? user?.displayName
                          : null) ||
                        r.displayName ||
                        r.userName ||
                        r.createdByName ||
                        "ผู้ใช้งาน";

                      return (
                        <View key={r.reviewId ?? idx} style={styles.reviewCard}>
                          <View style={styles.reviewHead}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.reviewName}>
                                {userName}
                                {isMine ? (
                                  <Text style={styles.mineBadge}>
                                    {" "}
                                    • ของฉัน
                                  </Text>
                                ) : null}
                              </Text>
                              <Text style={styles.reviewDate}>
                                {createdAt ? formatThaiDate(createdAt) : "-"}
                              </Text>
                            </View>

                            <View style={styles.reviewRatingRight}>
                              <RatingStarsRN
                                value={r.rating ?? 0}
                                readOnly
                                size={14}
                              />
                              <Text style={styles.reviewRatingText}>
                                {r.rating ?? 0}/5
                              </Text>
                            </View>
                          </View>

                          {!!r.comment && (
                            <Text style={styles.reviewComment}>
                              {r.comment}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Pagination */}
                  <View style={styles.reviewPager}>
                    <TouchableOpacity
                      style={[
                        styles.pagerBtn,
                        skip === 0 && styles.pagerBtnDisabled,
                      ]}
                      disabled={skip === 0 || isReviewFetching}
                      onPress={() => setSkip((s) => Math.max(0, s - take))}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={skip === 0 ? "#C1C0C8" : "#2A4D50"}
                      />
                      <Text
                        style={[
                          styles.pagerText,
                          skip === 0 && { color: "#C1C0C8" },
                        ]}
                      >
                        ก่อนหน้า
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.pagerBtn,
                        (reviews as any[]).length < take &&
                          styles.pagerBtnDisabled,
                      ]}
                      disabled={
                        (reviews as any[]).length < take || isReviewFetching
                      }
                      onPress={() => setSkip((s) => s + take)}
                    >
                      <Text
                        style={[
                          styles.pagerText,
                          (reviews as any[]).length < take && {
                            color: "#C1C0C8",
                          },
                        ]}
                      >
                        ถัดไป
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={
                          (reviews as any[]).length < take
                            ? "#C1C0C8"
                            : "#2A4D50"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Add to trip modal */}
        <AddToTripModalRN
          open={openAddTrip}
          onClose={() => setOpenAddTrip(false)}
          place={displayPlace}
          onCreateTrip={() => {
            setOpenAddTrip(false);
            navigation.navigate("ทริปของฉัน", {
              screen: "TripCreateScreen",
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

/* =========================
   Gallery
========================= */
function PlaceGalleryRN({
  images,
  selectedIndex,
  onSelect,
  fallbackCoverUrl,
}: {
  images: PlaceDto["images"];
  selectedIndex: number;
  onSelect: (i: number) => void;
  fallbackCoverUrl: string;
}) {
  const mainUrl = images?.[selectedIndex]?.imageUrl
    ? getPlaceImageUrl({ images: [images[selectedIndex]] } as any)
    : fallbackCoverUrl;

  const thumbs = (images ?? []).map((img) => ({
    id: img.imageId,
    url: getPlaceImageUrl({ images: [img] } as any),
  }));

  return (
    <View style={styles.galleryContainer}>
      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: mainUrl }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        <View style={styles.imageGradient} />

        {thumbs.length > 1 && (
          <View style={styles.imageCounter}>
            <Ionicons name="images" size={14} color="#fff" />
            <Text style={styles.imageCounterText}>
              {selectedIndex + 1} / {thumbs.length}
            </Text>
          </View>
        )}
      </View>

      {thumbs.length > 1 && (
        <FlatList
          horizontal
          data={thumbs}
          keyExtractor={(x) => String(x.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsList}
          renderItem={({ item, index }) => {
            const active = index === selectedIndex;
            return (
              <TouchableOpacity
                onPress={() => onSelect(index)}
                style={[styles.thumbnail, active && styles.thumbnailActive]}
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.thumbnailImage}
                />
                {active && <View style={styles.thumbnailOverlay} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

/* =========================
   Rating Stars (RN)
========================= */
function RatingStarsRN({
  value,
  onChange,
  readOnly,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const v = Math.max(0, Math.min(5, Math.round(value || 0)));
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= v;
        return (
          <TouchableOpacity
            key={i}
            disabled={readOnly}
            onPress={() => onChange?.(i)}
            style={{ padding: 2 }}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? "#FFC107" : "#C1C0C8"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* =========================
   Review Form (RN)
========================= */
function PlaceReviewFormRN({
  placeId,
  isLoggedIn,
}: {
  placeId: number;
  isLoggedIn: boolean;
}) {
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

      Alert.alert("สำเร็จ", "บันทึกรีวิวสำเร็จ");
    } catch (e: any) {
      Alert.alert(
        "ผิดพลาด",
        e?.data?.errorMessages?.[0] ?? e?.message ?? "บันทึกรีวิวไม่สำเร็จ"
      );
    }
  };

  const onDelete = async () => {
    if (!myReview) return;

    Alert.alert("ยืนยัน", "ต้องการลบรีวิวของคุณหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await del({ placeId }).unwrap();
            setRating(0);
            setComment("");
            Alert.alert("สำเร็จ", "ลบรีวิวสำเร็จ");
          } catch (e: any) {
            Alert.alert(
              "ผิดพลาด",
              e?.data?.errorMessages?.[0] ?? e?.message ?? "ลบรีวิวไม่สำเร็จ"
            );
          }
        },
      },
    ]);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.reviewFormCard}>
        <Text style={styles.reviewFormHint}>
          กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.reviewFormCard}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewFormTitle}>รีวิวของฉัน</Text>
          <Text style={styles.reviewFormSub}>
            ให้ดาวและเขียนความคิดเห็นสั้น ๆ
          </Text>
        </View>
        <View
          style={[styles.reviewPill, myReview ? styles.pillYes : styles.pillNo]}
        >
          <Text
            style={[
              styles.reviewPillText,
              myReview ? styles.pillYesText : styles.pillNoText,
            ]}
          >
            {myReview ? "เคยรีวิวแล้ว" : "ยังไม่เคยรีวิว"}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <RatingStarsRN value={rating} onChange={setRating} />
        <Text style={{ fontWeight: "900", color: "#111827" }}>{rating}/5</Text>
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="เล่าประสบการณ์ของคุณ..."
        placeholderTextColor="#9CA3AF"
        multiline
        style={styles.reviewInput}
      />

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSubmit || isSaving}
          style={[
            styles.reviewSaveBtn,
            (!canSubmit || isSaving) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.reviewSaveText}>
            {isSaving ? "กำลังบันทึก..." : "บันทึกรีวิว"}
          </Text>
        </TouchableOpacity>

        {myReview ? (
          <TouchableOpacity
            onPress={onDelete}
            disabled={isDeleting}
            style={[styles.reviewDeleteBtn, isDeleting && { opacity: 0.6 }]}
          >
            <Text style={styles.reviewDeleteText}>
              {isDeleting ? "กำลังลบ..." : "ลบ"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.reviewErrorText}>โหลดรีวิวของฉันไม่สำเร็จ</Text>
      ) : null}
      {isMyLoading ? (
        <Text style={styles.reviewLoadingText}>กำลังโหลดข้อมูล...</Text>
      ) : null}
    </View>
  );
}

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  page: { flex: 1 },

  // Header Overlay
  headerOverlay: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  favoriteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Gallery
  galleryContainer: { backgroundColor: "#000" },
  mainImageContainer: { width, height: 340, backgroundColor: "#1a1a1a" },
  mainImage: { width: "100%", height: "100%" },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  imageCounter: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  thumbnailsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: "#000",
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailActive: { borderColor: "#2A4D50" },
  thumbnailImage: { width: "100%", height: "100%" },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42, 77, 80, 0.3)",
  },

  // Content Container
  contentContainer: {
    backgroundColor: "#F3F4F8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },

  // Title
  titleSection: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  placeName: { fontSize: 24, fontWeight: "900", color: "#000", lineHeight: 32 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  categoryText: { fontSize: 13, fontWeight: "700", color: "#2A4D50" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "900", color: "#000" },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#83829A" },

  // Add to Trip
  addToTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToTripText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  // Section
  section: { gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#000" },

  // Description
  descriptionText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
  },

  // Location
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  locationText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 20 },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 14,
  },
  mapBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Info
  infoGrid: { flexDirection: "row", gap: 10 },
  infoItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  infoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#83829A",
    textAlign: "center",
  },
  infoValue: { fontSize: 13, fontWeight: "800", color: "#000" },

  // Placeholder
  reviewsPlaceholder: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewsPlaceholderTitle: { fontSize: 16, fontWeight: "800", color: "#000" },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: "#83829A",
    textAlign: "center",
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  reviewBtnText: { fontSize: 14, fontWeight: "800", color: "#2A4D50" },

  // Review form
  reviewFormCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewFormTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  reviewFormSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  reviewFormHint: { fontSize: 13, color: "#475569", fontWeight: "700" },
  reviewInput: {
    marginTop: 12,
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    color: "#111827",
    fontWeight: "600",
  },
  reviewSaveBtn: {
    flex: 1,
    backgroundColor: "#34d399",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSaveText: { fontWeight: "900", color: "#111827" },
  reviewDeleteBtn: {
    width: 90,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewDeleteText: { fontWeight: "900", color: "#dc2626" },
  reviewErrorText: {
    marginTop: 10,
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "700",
  },
  reviewLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  reviewPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillYes: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  pillNo: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  reviewPillText: { fontSize: 11, fontWeight: "900" },
  pillYesText: { color: "#047857" },
  pillNoText: { color: "#64748B" },

  // Review list cards
  reviewSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  reviewSummaryText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  reviewFetchingText: { fontSize: 12, fontWeight: "800", color: "#83829A" },

  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  mineBadge: { fontSize: 12, fontWeight: "900", color: "#059669" },
  reviewDate: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  reviewRatingRight: { alignItems: "flex-end", gap: 4 },
  reviewRatingText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  reviewComment: {
    marginTop: 10,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    fontWeight: "600",
  },

  // Pager
  reviewPager: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  pagerBtn: {
    flex: 1,
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { fontSize: 13, fontWeight: "900", color: "#2A4D50" },

  // Loading & Error
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  loadingText: { fontSize: 14, color: "#83829A", fontWeight: "600" },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: "800", color: "#000" },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
