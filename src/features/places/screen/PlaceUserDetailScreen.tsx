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
  StatusBar,
} from "react-native";
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2A4D50" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  if (!displayPlace) {
    return (
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
    );
  }

  const images = displayPlace.images || [];
  const coverUrl = getPlaceImageUrl(displayPlace);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        bounces={false}
      >
        {/* Gallery Section with Overlay Header */}
        <View style={styles.galleryWrapper}>
          <PlaceGalleryRN images={images} fallbackCoverUrl={coverUrl} />

          {/* Header Buttons */}
          <View
            style={[
              styles.headerOverlay,
              { paddingTop: (StatusBar.currentHeight || 40) + 10 },
            ]}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("PlaceList")}
              style={styles.iconBtnBlur}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsFavorite(!isFavorite)}
              style={styles.iconBtnBlur}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#FF5A5F" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Sheet */}
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          {/* Title & Badge */}
          <View style={styles.headerSection}>
            <View style={{ flex: 1, gap: 8 }}>
              {!!displayPlace.categoryName && (
                <Text style={styles.categoryLabel}>
                  {displayPlace.categoryName.toUpperCase()}
                </Text>
              )}
              <Text style={styles.placeTitle}>{displayPlace.name}</Text>
            </View>
          </View>

          {/* Minimal Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#FFF4E5" }]}
              >
                <Ionicons name="star" size={18} color="#FFB02E" />
              </View>
              <Text style={styles.statValue}>{avg ? String(avg) : "-"}</Text>
              <Text style={styles.statLabel}>คะแนน</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#E3F2FD" }]}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#2196F3"
                />
              </View>
              <Text style={styles.statValue}>
                {(reviews as any[])?.length ?? 0}
              </Text>
              <Text style={styles.statLabel}>รีวิว</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="time" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>
                {displayPlace.avgVisitMinutes ?? "-"}
              </Text>
              <Text style={styles.statLabel}>นาที</Text>
            </View>
          </View>

          {isLoggedIn && (
            <TouchableOpacity
              onPress={() => setOpenAddTrip(true)}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>เพิ่มลงในทริป</Text>
              <Ionicons name="add-circle" size={22} color="#fff" />
            </TouchableOpacity>
          )}

          <View style={styles.sectionDivider} />

          {/* Description */}
          <View style={styles.contentSection}>
            <Text style={styles.sectionHeader}>เกี่ยวกับสถานที่</Text>
            <Text style={styles.bodyText}>
              {displayPlace.description?.trim() || "ไม่มีรายละเอียด"}
            </Text>
          </View>

          {/* Info Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.infoScroll}
          >
            <View style={styles.infoPill}>
              <Ionicons name="cash-outline" size={16} color="#2A4D50" />
              <Text style={styles.infoPillText}>เข้าชมฟรี</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="car-outline" size={16} color="#2A4D50" />
              <Text style={styles.infoPillText}>มีที่จอดรถ</Text>
            </View>
            <View style={styles.infoPill}>
              <MaterialCommunityIcons
                name="wheelchair-accessibility"
                size={16}
                color="#2A4D50"
              />
              <Text style={styles.infoPillText}>สิ่งอำนวยความสะดวก</Text>
            </View>
          </ScrollView>

          {/* Location */}
          <View style={styles.contentSection}>
            <Text style={styles.sectionHeader}>ตำแหน่งที่ตั้ง</Text>
            <View style={styles.locationBox}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={22} color="#FF5A5F" />
              </View>
              <Text style={styles.locationAddress}>
                {displayPlace.address ?? "ไม่มีข้อมูลที่อยู่"}
              </Text>
            </View>
            <TouchableOpacity style={styles.mapOutlineBtn}>
              <Text style={styles.mapOutlineBtnText}>ดูบนแผนที่</Text>
              <Ionicons name="map-outline" size={18} color="#2A4D50" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionDivider} />

          {/* Reviews Section */}
          <View style={styles.contentSection}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeader}>รีวิวจากผู้ใช้งาน</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#B45309" />
                <Text style={styles.ratingBadgeText}>{avg}/5</Text>
              </View>
            </View>

            {/* Form anchor */}
            <View
              onLayout={(e) => {
                reviewFormY.current = e.nativeEvent.layout.y;
              }}
              style={{ marginBottom: 20 }}
            >
              <PlaceReviewFormRN placeId={placeId!} isLoggedIn={isLoggedIn} />
            </View>

            {/* List / Placeholder */}
            {isReviewLoading ? (
              <ActivityIndicator
                size="small"
                color="#2A4D50"
                style={{ marginTop: 20 }}
              />
            ) : reviewError ? (
              <Text style={{ textAlign: "center", color: "#EF4444" }}>
                โหลดรีวิวไม่สำเร็จ
              </Text>
            ) : (reviews as any[]).length === 0 ? (
              <View style={styles.emptyReviewBox}>
                <Ionicons name="chatbox-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyReviewText}>
                  ยังไม่มีรีวิว เป็นคนแรกเลย!
                </Text>
                <TouchableOpacity onPress={scrollToReviewForm}>
                  <Text
                    style={{
                      color: "#2A4D50",
                      fontWeight: "700",
                      marginTop: 8,
                    }}
                  >
                    เขียนรีวิว
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {(reviews as ReviewLike[]).map((r, idx) => {
                  const createdAt = r.createdAt ?? r.createdDateTime ?? null;
                  const reviewUserId = r.userId ?? r.createdByUserId ?? null;
                  const myUserId = user?.userId ?? user?.id ?? null;
                  const isMine = Boolean(
                    myUserId && reviewUserId && myUserId === reviewUserId
                  );
                  const userName =
                    (isMine ? user?.DisplayName ?? user?.displayName : null) ||
                    r.displayName ||
                    r.userName ||
                    r.createdByName ||
                    "ผู้ใช้งาน";

                  return (
                    <View key={r.reviewId ?? idx} style={styles.reviewItem}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {userName.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.reviewTitle} numberOfLines={1}>
                            {userName}
                            {isMine && (
                              <Text style={{ color: "#059669", fontSize: 12 }}>
                                {" "}
                                (คุณ)
                              </Text>
                            )}
                          </Text>
                          <Text style={styles.reviewTime}>
                            {createdAt ? formatThaiDate(createdAt) : "-"}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            marginTop: 2,
                            marginBottom: 4,
                          }}
                        >
                          <RatingStarsRN
                            value={r.rating ?? 0}
                            readOnly
                            size={12}
                          />
                        </View>
                        {!!r.comment && (
                          <Text style={styles.reviewBody}>{r.comment}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Pagination */}
            {reviews.length > 0 && (
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
                    size={16}
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
                    (reviews as any[]).length < take && styles.pagerBtnDisabled,
                  ]}
                  disabled={
                    (reviews as any[]).length < take || isReviewFetching
                  }
                  onPress={() => setSkip((s) => s + take)}
                >
                  <Text
                    style={[
                      styles.pagerText,
                      (reviews as any[]).length < take && { color: "#C1C0C8" },
                    ]}
                  >
                    ถัดไป
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      (reviews as any[]).length < take ? "#C1C0C8" : "#2A4D50"
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

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
      </ScrollView>
    </View>
  );
}

/* =========================
   Gallery
========================= */
function PlaceGalleryRN({
  images,
  fallbackCoverUrl,
}: {
  images: PlaceDto["images"];
  fallbackCoverUrl: string;
}) {
  const list = images?.length
    ? images
    : [{ imageId: "fallback", imageUrl: fallbackCoverUrl }];

  const pagerRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const getUrl = (img: any) =>
    img?.imageUrl?.startsWith("http")
      ? img.imageUrl
      : getPlaceImageUrl({ images: [img] } as any);

  return (
    <View style={styles.heroWrap}>
      {/* HERO IMAGE */}
      <FlatList
        ref={pagerRef}
        data={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(x, i) => String(x.imageId ?? i)}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: getUrl(item) }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}
      />

      {/* GRADIENT */}
      <View style={styles.heroGradient} />

      {/* IMAGE STACK (preview ว่ามีหลายรูป) */}
      {list.length > 1 && (
        <View style={styles.imageStack}>
          {list.slice(0, 3).map((img, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={() => {
                setIndex(i);
                pagerRef.current?.scrollToIndex({ index: i, animated: true });
              }}
              style={[
                styles.stackItem,
                { transform: [{ translateX: i * -12 }] },
              ]}
            >
              <Image source={{ uri: getUrl(img) }} style={styles.stackImage} />
            </TouchableOpacity>
          ))}

          <View style={styles.stackCount}>
            <Text style={styles.stackCountText}>+{list.length}</Text>
          </View>
        </View>
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
    <View style={{ flexDirection: "row", gap: 2 }}>
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
              color={filled ? "#FFC107" : "#D1D5DB"}
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
      <View
        style={[
          styles.reviewFormCard,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={styles.reviewFormHint}>
          กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.reviewFormCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.reviewFormTitle}>รีวิวของฉัน</Text>
        <View style={myReview ? styles.pillYes : styles.pillNo}>
          <Text style={myReview ? styles.pillYesText : styles.pillNoText}>
            {myReview ? "รีวิวแล้ว" : "ยังไม่รีวิว"}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <RatingStarsRN value={rating} onChange={setRating} size={24} />
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
            {isSaving ? "กำลังบันทึก..." : "โพสต์รีวิว"}
          </Text>
        </TouchableOpacity>

        {myReview ? (
          <TouchableOpacity
            onPress={onDelete}
            disabled={isDeleting}
            style={[styles.reviewDeleteBtn, isDeleting && { opacity: 0.6 }]}
          >
            <Text style={styles.reviewDeleteText}>
              {isDeleting ? "..." : "ลบ"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  // Gallery - Compact Height
  galleryWrapper: {
    height: 320 + 88, // เพิ่มพื้นที่ให้แถบ thumbnails
    width: width,
    position: "relative",
  },
  thumbnailImage: { width: "100%", height: "100%" },

  thumbnailsBar: {
    height: 88,
    justifyContent: "center",
    backgroundColor: "#0B1220", // เข้มๆ ให้รูปเด่น (ปรับได้)
  },

  galleryContainer: { flex: 1, backgroundColor: "#E5E7EB" },
  mainImageContainer: { width, height: 320, backgroundColor: "#cbd5e1" },
  mainImage: { width: "100%", height: "100%" },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  heroWrap: {
    height: 340,
    width,
    backgroundColor: "#E5E7EB",
  },
  heroImage: {
    width,
    height: 340,
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  /* Image stack */
  imageStack: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  stackItem: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#eee",
  },
  stackImage: {
    width: "100%",
    height: "100%",
  },
  stackCount: {
    marginLeft: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stackCountText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  // Header Overlay - Modern Glass Effect
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 50,
  },
  iconBtnBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.25)", // เดิมขาว ทำให้รูปสว่างแล้วอ่านยาก
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },

  // Sheet - Enhanced Card Style
  sheetContainer: {
    flex: 1,
    marginTop: -50,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 800,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 24,
  },

  // Header Title - Modern Typography
  headerSection: { marginBottom: 20 },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 1,
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  placeTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 36,
    letterSpacing: -0.5,
  },

  // Stats Row - Card Based Design
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statItem: { alignItems: "center", gap: 6, flex: 1 },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  statLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  statDivider: { width: 1, height: 36, backgroundColor: "#E2E8F0" },

  // Action Buttons - Modern Gradient Style
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A4D50",
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    gap: 12,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 28,
  },
  actionBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Sections - Better Spacing
  sectionDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 28,
    marginHorizontal: -24,
  },
  contentSection: { gap: 16, marginBottom: 8 },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 28,
    color: "#475569",
    fontWeight: "400",
  },

  // Info Pills - Modern Chips
  infoScroll: { flexDirection: "row", marginBottom: 20, marginTop: 8 },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 100,
    marginRight: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoPillText: { fontSize: 14, color: "#334155", fontWeight: "700" },

  // Location - Enhanced Card
  locationBox: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FAFAFA",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  locationAddress: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
    fontWeight: "500",
  },
  mapOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#2A4D50",
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
    backgroundColor: "#F8FAFC",
  },
  mapOutlineBtnText: { fontSize: 15, fontWeight: "800", color: "#2A4D50" },

  // Reviews - Modern Cards
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingBadgeText: { fontSize: 14, fontWeight: "900", color: "#92400E" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reviewItem: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DDD6FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E9D5FF",
  },
  reviewAvatarText: { fontSize: 18, fontWeight: "900", color: "#6B21A8" },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    maxWidth: 180,
  },
  reviewTime: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  reviewBody: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginTop: 4,
  },
  emptyReviewBox: {
    alignItems: "center",
    padding: 40,
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyReviewText: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },

  reviewPager: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
  pagerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: 14, fontWeight: "800", color: "#2A4D50" },

  // Form - Modern Card Design
  reviewFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  reviewFormTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A" },
  reviewFormHint: { fontSize: 14, color: "#64748B", fontWeight: "600" },

  pillYes: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pillNo: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillYesText: { color: "#047857", fontSize: 12, fontWeight: "800" },
  pillNoText: { color: "#64748B", fontSize: 12, fontWeight: "700" },

  reviewInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginTop: 12,
    minHeight: 120,
    padding: 16,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
    lineHeight: 24,
  },
  reviewSaveBtn: {
    backgroundColor: "#2A4D50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    flex: 1,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewSaveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  reviewDeleteBtn: {
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    width: 80,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  reviewDeleteText: { color: "#DC2626", fontWeight: "800", fontSize: 15 },

  // Helpers
  loadingText: {
    marginTop: 16,
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },
  errorIcon: { marginBottom: 20 },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
    color: "#0F172A",
  },
  btnPrimary: {
    backgroundColor: "#2A4D50",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
