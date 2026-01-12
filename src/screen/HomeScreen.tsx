import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";

import { useGetHomeQuery } from "../features/home/homeApi";
import { COLORS, FONTS, SIZES, SHADOWS } from "../common";
import { BASE_URL } from "../config/env";

const { width } = Dimensions.get("window");

type Category = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const { accessToken, hydrated } = useSelector((state: any) => state.auth);

  const isLoggedIn = hydrated && !!accessToken;

  const [query, setQuery] = useState("");

  const { data, isLoading, isFetching } = useGetHomeQuery(
    { topN: 10, personalized: isLoggedIn ? 1 : 0 } as any,
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const sections = data?.sections ?? [];

  const categories = useMemo<Category[]>(
    () => [
      { key: "recommended", label: "ท่องเที่ยว", icon: "map" },
      { key: "nature", label: "ธรรมชาติ", icon: "leaf" },
      { key: "history", label: "ประวัติศาสตร์", icon: "business" },
      { key: "activity", label: "กิจกรรม", icon: "trail-sign" },
      { key: "stay", label: "ที่พัก", icon: "bed" },
      { key: "food", label: "ร้านอาหาร", icon: "restaurant" },
    ],
    []
  );

  const onSearch = () => {
    const q = query.trim();
    navigation.navigate("PlacesScreen", q ? { search: q } : undefined);
  };

  const toPlaces = () => {
    navigation.navigate("สถานที่", { screen: "PlaceDetails" });
  };

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
  };

  // ✅ helper: ตั้งชื่อ section ให้ “แนะนำสำหรับคุณ” เมื่อ login
  const getSectionTitle = (sec: any, sectionIndex: number) => {
    // ถ้า API มี key ชัดเจน ใช้ key จะดีที่สุด
    const key = String(sec?.key ?? "").toLowerCase();

    // กลุ่มที่ถือว่า "personalized"
    const isPersonal =
      key === "for_you" ||
      key === "foryou" ||
      key === "personalized" ||
      key === "recommended";

    if (isLoggedIn && isPersonal) return "แนะนำสำหรับคุณ";
    if (!isLoggedIn && isPersonal) return sec?.title ?? "แนะนำยอดนิยม";

    // อื่น ๆ ใช้ title จาก API
    return sec?.title ?? (sectionIndex === 0 ? "แนะนำ" : "รายการแนะนำ");
  };

  const getSectionSubtitle = (sec: any) => {
    const key = String(sec?.key ?? "").toLowerCase();
    const isPersonal =
      key === "for_you" ||
      key === "foryou" ||
      key === "personalized" ||
      key === "recommended";

    if (isLoggedIn && isPersonal) return "คัดมาให้จากความสนใจของคุณ";
    return "แนะนำจากระบบ";
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* ================= HERO SECTION ================= */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800",
        }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroWelcome}>
            {isLoggedIn ? "สวัสดี 👋" : "ยินดีต้อนรับสู่"}
          </Text>
          <Text style={styles.heroTitle}>กาญจนบุรี</Text>
          <Text style={styles.heroSubtitle}>
            สัมผัสความงามของธรรมชาติและประวัติศาสตร์
          </Text>
          <Text style={styles.heroDesc}>
            ค้นพบสถานที่ท่องเที่ยว ที่พัก และร้านอาหารยอดนิยมในกาญจนบุรี
          </Text>

          {/* Search Bar */}
          <View style={styles.searchCard}>
            <Ionicons name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาสถานที่ท่องเที่ยว..."
              placeholderTextColor={COLORS.gray2}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={onSearch}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
              <Text style={styles.searchBtnText}>ค้นหา</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={toPlaces}>
              <Ionicons name="compass" size={20} color={COLORS.white} />
              <Text style={styles.ctaPrimaryText}>สำรวจ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaOutline}
              onPress={() => navigation.navigate("TripScreen")}
            >
              <Ionicons name="map-outline" size={20} color={COLORS.white} />
              <Text style={styles.ctaOutlineText}>วางแผน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* ================= CATEGORY PILLS ================= */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={styles.categoryPill}
              onPress={() =>
                navigation.navigate("PlacesScreen", { category: cat.key })
              }
            >
              <View style={styles.categoryIconBg}>
                <Ionicons name={cat.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.categoryText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ================= SECTIONS ================= */}
      <View style={styles.container}>
        {isFetching && (
          <View style={styles.fetchingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.fetchingText}>กำลังอัพเดท...</Text>
          </View>
        )}

        {sections.map((sec: any, sectionIndex: number) => (
          <View key={sec.key ?? sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons
                    name={
                      sectionIndex === 0
                        ? "star"
                        : sectionIndex === 1
                        ? "flame"
                        : "heart"
                    }
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>
                    {getSectionTitle(sec, sectionIndex)}
                  </Text>
                  <Text style={styles.sectionSub}>
                    {getSectionSubtitle(sec)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.moreButton} onPress={toPlaces}>
                <Text style={styles.moreLink}>ดูทั้งหมด</Text>
                <Ionicons name="chevron-forward" size={16} color="#15803d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsScroll}
            >
              {sec.items?.map((p: any) => {
                const imageUrl = p.coverImageUrl
                  ? getImageUrl(p.coverImageUrl)
                  : "https://via.placeholder.com/400x300?text=No+Image";

                return (
                  <TouchableOpacity
                    key={p.placeId}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("สถานที่", {
                        screen: "PlaceDetails",
                        params: {
                        placeId: p.placeId
                        },
                      })
                    }
                    style={styles.card}
                  >
                    <View style={styles.cardImageWrap}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.cardImage}
                      />
                      <View style={styles.cardImageOverlay} />

                      {!!p.categoryName && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{p.categoryName}</Text>
                        </View>
                      )}

                      {typeof p.rating === "number" && (
                        <View style={styles.rating}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText}>
                            {p.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.favoriteBtn}>
                        <Ionicons
                          name="heart-outline"
                          size={20}
                          color={COLORS.white}
                        />
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {p.name}
                      </Text>

                      {(p.locationName || p.district) && (
                        <View style={styles.locationRow}>
                          <Ionicons
                            name="location-sharp"
                            size={14}
                            color="#15803d"
                          />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {p.locationName ?? p.district}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {p.description}
                      </Text>

                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <View style={styles.tagRow}>
                          {p.tags.slice(0, 3).map((t: string, idx: number) => (
                            <View
                              key={`${p.placeId}-${idx}`}
                              style={styles.tag}
                            >
                              <Text style={styles.tagText}>#{t}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() =>
                          navigation.navigate("สถานที่", {
                            screen: "PlaceDetails",
                            params: { placeId: p.placeId },
                          })
                        }
                      >
                        <Text style={styles.detailBtnText}>ดูรายละเอียด</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))}

        {/* ================= FEATURES SECTION ================= */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>ทำไมต้องเลือกเราในการวางแผน?</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={28} color="#15803d" />
              </View>
              <Text style={styles.featureTitle}>น่าเชื่อถือ</Text>
              <Text style={styles.featureDesc}>
                ข้อมูลที่ถูกต้องและอัพเดทล่าสุด
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="star" size={28} color="#15803d" />
              </View>
              <Text style={styles.featureTitle}>คุณภาพ</Text>
              <Text style={styles.featureDesc}>รีวิวจากนักท่องเที่ยวจริง</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="compass" size={28} color="#15803d" />
              </View>
              <Text style={styles.featureTitle}>ครบครัน</Text>
              <Text style={styles.featureDesc}>สถานที่ท่องเที่ยวมากมาย</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="phone-portrait" size={28} color="#15803d" />
              </View>
              <Text style={styles.featureTitle}>ใช้งานง่าย</Text>
              <Text style={styles.featureDesc}>ออกแบบเพื่อความสะดวก</Text>
            </View>
          </View>
        </View>

        {/* ================= BOTTOM CTA ================= */}
        <View style={styles.bottomCta}>
          <View style={styles.bottomCtaIcon}>
            <Ionicons name="rocket" size={32} color="#15803d" />
          </View>
          <Text style={styles.bottomTitle}>พร้อมออกเดินทางหรือยัง?</Text>
          <Text style={styles.bottomDesc}>
            วางแผนทริปและรับคำแนะนำสถานที่ที่เหมาะกับคุณในกาญจนบุรี
            เริ่มต้นการผจญภัยของคุณวันนี้
          </Text>

          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate("TripScreen")}
          >
            <Ionicons name="map" size={18} color={COLORS.white} />
            <Text style={styles.bottomBtnText}>วางแผนเที่ยวเลย</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.offwhite },

  loading: {
    flex: 1,
    backgroundColor: COLORS.offwhite,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    fontSize: 16,
  },

  hero: { height: 480, justifyContent: "flex-end" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 77, 46, 0.75)",
  },
  heroContent: {
    paddingHorizontal: SIZES.large,
    paddingBottom: SIZES.xLarge + 10,
  },
  heroWelcome: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: FONTS.medium,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: COLORS.white,
    fontFamily: FONTS.extraBold,
    fontSize: 48,
    marginTop: 4,
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.95)",
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    marginTop: 8,
    lineHeight: 26,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 22,
  },

  searchCard: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.medium,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.primary2,
  },
  searchBtn: {
    backgroundColor: "#15803d",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },

  ctaRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  ctaPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803d",
    paddingVertical: 14,
    borderRadius: 14,
    ...SHADOWS.small,
  },
  ctaPrimaryText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
  },
  ctaOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaOutlineText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
  },

  categoryContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  categoryScroll: { paddingHorizontal: SIZES.large, gap: 10 },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    color: COLORS.primary2,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },

  container: { paddingTop: SIZES.large },

  fetchingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  fetchingText: {
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    fontSize: 13,
  },

  section: { marginBottom: SIZES.xLarge },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    marginBottom: SIZES.medium,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary2,
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  moreButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  moreLink: { fontFamily: FONTS.semiBold, color: "#15803d", fontSize: 14 },

  cardsScroll: {
    paddingHorizontal: SIZES.large,
    gap: 16,
    paddingVertical: 4,
  },
  card: {
    width: 280,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  cardImageWrap: {
    height: 180,
    backgroundColor: "#e5e7eb",
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%" },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.small,
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.primary2,
  },

  rating: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingText: { color: COLORS.white, fontFamily: FONTS.semiBold, fontSize: 12 },

  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardBody: { padding: 16 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary2,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
    marginTop: 8,
  },

  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.gray,
    flex: 1,
  },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  tagText: { fontFamily: FONTS.medium, fontSize: 11, color: "#15803d" },

  detailBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 11,
    backgroundColor: COLORS.white,
  },
  detailBtnText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    fontSize: 14,
  },

  featuresSection: {
    paddingHorizontal: SIZES.large,
    marginTop: SIZES.xLarge,
    marginBottom: SIZES.large,
  },
  featuresTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.primary2,
    textAlign: "center",
    marginBottom: SIZES.large,
    letterSpacing: -0.5,
  },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  featureCard: {
    width: (width - SIZES.large * 2 - 12) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SIZES.medium + 4,
    alignItems: "center",
    ...SHADOWS.small,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.primary2,
    marginBottom: 6,
  },
  featureDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 18,
  },

  bottomCta: {
    marginHorizontal: SIZES.large,
    marginTop: SIZES.xLarge,
    borderRadius: 24,
    backgroundColor: "#f0fdf4",
    padding: SIZES.xLarge,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dcfce7",
    ...SHADOWS.small,
  },
  bottomCtaIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.medium,
    ...SHADOWS.small,
  },
  bottomTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary2,
    textAlign: "center",
    marginBottom: SIZES.small,
    letterSpacing: -0.5,
  },
  bottomDesc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SIZES.large,
  },
  bottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#15803d",
    paddingHorizontal: SIZES.xLarge + 4,
    paddingVertical: 14,
    borderRadius: 14,
    ...SHADOWS.medium,
  },
  bottomBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },

  bottomPadding: { height: SIZES.xLarge },
});
