import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetByIdQuery, useGetPlacesByDishIdQuery } from "../LocalDishApi";
import { toAbsoluteUrl } from "../../../utils/imagepath";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BRAND = {
  accent: "#FF6B35",
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  text: "#111827",
  text2: "#374151",
  muted: "#6B7280",
  border: "#E5E7EB",
  soft: "#F3F4F6",
  chip: "#FFF1EB",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#065F46",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",
  warnText: "#92400E",
};


function Chip({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "success" | "warning";
}) {
  const bg =
    variant === "success"
      ? BRAND.successBg
      : variant === "warning"
        ? BRAND.warnBg
        : BRAND.chip;

  const border =
    variant === "success"
      ? BRAND.successBorder
      : variant === "warning"
        ? BRAND.warnBorder
        : "#FED7C7";

  const color =
    variant === "success"
      ? BRAND.successText
      : variant === "warning"
        ? BRAND.warnText
        : "#9A3412";

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function SpicyMeter({ level }: { level: number }) {
  const maxLevel = 5;
  const safeLevel = Math.max(0, Math.min(maxLevel, Number(level) || 0));

  const getSpicyText = (lvl: number) => {
    if (lvl === 0) return "ไม่เผ็ด";
    if (lvl <= 1) return "เผ็ดน้อย";
    if (lvl <= 2) return "เผ็ดปานกลาง";
    if (lvl <= 3) return "เผ็ดมาก";
    if (lvl <= 4) return "เผ็ดมากเป็นพิเศษ";
    return "เผ็ดมากที่สุด";
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ระดับความเผ็ด</Text>
      <Text style={styles.cardSubtitle}>{getSpicyText(safeLevel)}</Text>

      <View style={styles.spicyDots}>
        {Array.from({ length: maxLevel }).map((_, idx) => {
          const active = idx < safeLevel;
          return (
            <View
              key={idx}
              style={[
                styles.spicyDot,
                { backgroundColor: active ? BRAND.accent : BRAND.soft },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.hintText}>
        ระดับ {safeLevel}/{maxLevel}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function LocalDishDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const dishId = Number(route.params?.dishId);

  const {
    data: dish,
    isLoading,

    error,
  } = useGetByIdQuery(dishId, {
    skip: !Number.isFinite(dishId) || dishId <= 0,
    refetchOnMountOrArgChange: true,
  });

  const { data: places, refetch } = useGetPlacesByDishIdQuery(dishId, {
    skip: !Number.isFinite(dishId) || dishId <= 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (Number.isFinite(dishId) && dishId > 0) {
        refetch();
      }
    }, [dishId, refetch]),
  );

  if (!Number.isFinite(dishId) || dishId <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.stateCenter}>
          <Text style={styles.stateTitle}>ไม่พบข้อมูลรายการอาหาร</Text>
          <Text style={styles.stateSubtitle}>
            กรุณาตรวจสอบและลองใหม่อีกครั้ง
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={BRAND.accent} />
          <Text style={styles.stateTitle}>กำลังโหลดข้อมูล...</Text>
          <Text style={styles.stateSubtitle}>โปรดรอสักครู่</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dish) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.stateCenter}>
          <Text style={styles.stateTitle}>เกิดข้อผิดพลาด</Text>
          <Text style={styles.stateSubtitle}>ไม่สามารถโหลดข้อมูลได้</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => refetch()}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>ลองใหม่</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images: any[] = dish.images ?? [];
  const cover = images.find((x) => x.isCover) ?? images[0];
  const coverUrl = toAbsoluteUrl(cover?.imageUrl);

  const availabilityText = dish.isActive
    ? "พร้อมให้บริการ"
    : "ไม่พร้อมให้บริการ";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header (static / formal) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          รายละเอียดเมนู
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        <View style={styles.coverWrap}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImage, styles.coverFallback]}>
              <Text style={styles.coverFallbackText}>ไม่มีรูปภาพ</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.dishTitle}>{dish.nameTH}</Text>
          {dish.nameEN ? (
            <Text style={styles.dishSubtitle}>{dish.nameEN}</Text>
          ) : null}

          <View style={styles.chipsRow}>
            <Chip text={dish.origin || "กาญจนบุรี"} />
            <Chip
              text={availabilityText}
              variant={dish.isActive ? "success" : "warning"}
            />
            {dish.isHalal ? <Chip text="ฮาลาล" variant="success" /> : null}
            {dish.isVegetarian ? (
              <Chip text="มังสวิรัติ" variant="success" />
            ) : null}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <SectionHeader title="ข้อมูลสรุป" subtitle="ข้อมูลหลักของเมนูนี้" />
          <FieldRow label="ต้นกำเนิด" value={dish.origin || "-"} />
          <View style={styles.divider} />
          <FieldRow label="สถานะ" value={availabilityText} />
        </View>

        {/* Spicy */}
        <SpicyMeter level={dish.spicyLevel ?? 0} />

        {/* Description */}
        {dish.description ? (
          <View style={styles.card}>
            <SectionHeader
              title="รายละเอียด"
              subtitle="ข้อมูลโดยสรุปของเมนูนี้"
            />
            <Text style={styles.bodyText}>{dish.description}</Text>
          </View>
        ) : null}

        {/* Places */}
        {places && places.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.placesHeaderRow}>
              <SectionHeader
                title="ร้านแนะนำ"
                subtitle={`${places.length} ร้าน`}
              />
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("LocalDishPlacesList", { dishId })
                }
              ></TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesCarousel}
            >
              {places.map((place: any, idx: number) => {
                const cover =
                  place.images?.find((x: any) => x?.isCover) ??
                  place.images?.[0];

                const imgPath =
                  place.coverImageUrl ||
                  cover?.imageUrl ||
                  place.imageUrl ||
                  "";

                const placeImgUrl = toAbsoluteUrl(imgPath);

                const ratingValue =
                  typeof place?.averageRating === "number"
                    ? place.averageRating
                    : null;
                const ratingText =
                  ratingValue !== null ? ratingValue.toFixed(1) : "-";
                const reviewCount =
                  typeof place?.reviewCount === "number" ? place.reviewCount : null;
      
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.placeCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      navigation.navigate("สถานที่", {
                        screen: "PlaceDetails",
                        params: { placeId: place.placeId },
                      })
                    }
                  >
                    <View style={styles.placeCardImageWrap}>
                      {placeImgUrl ? (
                        <Image
                          source={{ uri: placeImgUrl }}
                          style={styles.placeCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.placeCardImage,
                            styles.placeCardImageFallback,
                          ]}
                        />
                      )}
                      <View style={styles.placeCardBadge}>
                        <Text style={styles.placeCardBadgeText}>แนะนำ</Text>
                      </View>
                    </View>

                    <View style={styles.placeCardBody}>
                      <Text style={styles.placeCardTitle} numberOfLines={1}>
                        {place.name}
                      </Text>

                      <View style={styles.placeRatingRow}>
                        <Text style={styles.placeRatingStar}>★</Text>
                        <Text style={styles.placeRatingText}>{ratingText}</Text>
                        {reviewCount !== null ? (
                          <Text style={styles.placeRatingCount}>
                            ({reviewCount})
                          </Text>
                        ) : null}
                      </View>
                      
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={styles.placeCardSub} numberOfLines={1}>
                          {place.address}
                        </Text>
                      </View>

                      <View style={styles.placeCardFooter}>
                        <View style={styles.placeCardPill}>
                          <Text style={styles.placeCardPillText}>
                            ดูรายละเอียด
                          </Text>
                        </View>
                        <Text style={styles.placeCardArrow}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Gallery */}
        {images.length > 0 ? (
          <View style={styles.card}>
            <SectionHeader
              title="รูปภาพ"
              subtitle={`${images.length} รายการ`}
            />
            <View style={styles.gallery}>
              {images.slice(0, 6).map((img, idx) => {
                const imgUrl = toAbsoluteUrl(img.imageUrl);
                return (
                  <View key={idx} style={styles.galleryItem}>
                    {imgUrl ? (
                      <Image
                        source={{ uri: imgUrl }}
                        style={styles.galleryImage}
                      />
                    ) : (
                      <View
                        style={[styles.galleryImage, styles.coverFallback]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* CTA */}
        <View style={styles.card}>
          <SectionHeader
            title="ค้นหาร้านอาหาร"
            subtitle="ค้นหาร้านที่มีเมนูนี้ใกล้คุณ"
          />
          <TouchableOpacity style={styles.primaryBtnWide} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>ค้นหาร้านอาหาร</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>
            * ฟีเจอร์นี้สามารถเชื่อมหน้าแผนที่/รายการร้านได้
          </Text>
        </View>

        <View style={{ height: 22 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.bg },
  container: { padding: 16, paddingBottom: 22 },

  // Header
  header: {
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND.soft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  headerBackIcon: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: BRAND.text,
    fontSize: 16,
    fontWeight: "800",
  },

  // Cover
  coverWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  coverImage: { width: "100%", height: 220, backgroundColor: BRAND.soft },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  coverFallbackText: { color: BRAND.muted, fontWeight: "700" },

  // Title block
  titleBlock: { marginTop: 12, marginBottom: 6 },
  dishTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: BRAND.text,
    letterSpacing: -0.2,
  },
  dishSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: BRAND.muted,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "800" },

  // Cards
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  sectionBar: {
    width: 4,
    height: 30,
    backgroundColor: BRAND.accent,
    borderRadius: 999,
  },
  sectionTextWrap: { flex: 1 },
  sectionTitle: { color: BRAND.text, fontSize: 15, fontWeight: "900" },
  sectionSubtitle: {
    marginTop: 2,
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  divider: { height: 1, backgroundColor: BRAND.border, marginVertical: 10 },

  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabel: { color: BRAND.muted, fontSize: 12, fontWeight: "800" },
  fieldValue: {
    flex: 1,
    textAlign: "right",
    color: BRAND.text,
    fontSize: 13,
    fontWeight: "800",
  },

  bodyText: {
    color: BRAND.text2,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },

  // Spicy
  cardTitle: { color: BRAND.text, fontSize: 15, fontWeight: "900" },
  cardSubtitle: {
    marginTop: 4,
    color: BRAND.muted,
    fontSize: 12.5,
    fontWeight: "700",
  },
  spicyDots: { flexDirection: "row", gap: 8, marginTop: 12 },
  spicyDot: { width: 18, height: 18, borderRadius: 999 },
  hintText: {
    marginTop: 10,
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  // Places (carousel cards)
  placesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  placesMoreText: { color: BRAND.text, fontSize: 12, fontWeight: "300" },
  placesMoreChevron: {
    color: BRAND.muted,
    fontSize: 16,
    fontWeight: "900",
    marginTop: -1,
  },

  placesCarousel: {
    paddingTop: 10,
    paddingBottom: 2,
    paddingRight: 4,
    gap: 12,
  },
  placeCard: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
    overflow: "hidden",
  },
  placeCardImageWrap: {
    height: 130,
    backgroundColor: BRAND.soft,
    position: "relative",
  },
  placeCardImage: { width: "100%", height: "100%" },
  placeCardImageFallback: { backgroundColor: BRAND.soft },

  placeCardBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  placeCardBadgeText: { color: BRAND.accent, fontSize: 12, fontWeight: "900" },

  placeCardBody: { padding: 12, gap: 6 },
  placeCardTitle: { color: BRAND.text, fontSize: 14.5, fontWeight: "900" },
  placeRatingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  placeRatingStar: { color: "#F59E0B", fontSize: 13, fontWeight: "900" },
  placeRatingText: { color: BRAND.text2, fontSize: 12.5, fontWeight: "900" },
  placeRatingCount: { color: BRAND.muted, fontSize: 12, fontWeight: "700" },
  placeCardSub: { color: BRAND.muted, fontSize: 12.5, fontWeight: "700" },
  priceInline: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32", // เขียว ดูเป็นมิตร/ราคาโอเค
    marginLeft: 8,
  },
  placeCardFooter: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeCardPill: {
    backgroundColor: BRAND.chip,
    borderWidth: 1,
    borderColor: "#FED7C7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  placeCardPillText: { color: "#9A3412", fontSize: 12.5, fontWeight: "900" },
  placeCardArrow: { color: BRAND.accent, fontSize: 18, fontWeight: "900" },

  // Gallery (simple grid)
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  galleryItem: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.soft,
  },
  galleryImage: { width: "100%", height: "100%" },

  // Buttons / states
  primaryBtn: {
    marginTop: 10,
    backgroundColor: BRAND.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnWide: {
    marginTop: 6,
    backgroundColor: BRAND.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 14 },

  stateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 28,
  },
  stateTitle: {
    color: BRAND.text,
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
  },
  stateSubtitle: {
    color: BRAND.muted,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
});
