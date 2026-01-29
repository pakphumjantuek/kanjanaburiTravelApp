import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { useGetByIdQuery, useGetPlacesByDishIdQuery } from "../LocalDishApi";
import { BASE_URL } from "../../../config/env";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

function toAbsoluteUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return joinUrl(BASE_URL, path);
}

function Pill({
  text,
  icon,
  variant = "default",
}: {
  text: string;
  icon?: string;
  variant?: "default" | "success" | "warning";
}) {
  const bgColor =
    variant === "success"
      ? "#ECFDF5"
      : variant === "warning"
      ? "#FEF3C7"
      : "#FFF7ED";
  const borderColor =
    variant === "success"
      ? "#6EE7B7"
      : variant === "warning"
      ? "#FCD34D"
      : "#FDBA74";
  const textColor =
    variant === "success"
      ? "#065F46"
      : variant === "warning"
      ? "#92400E"
      : "#C2410C";

  return (
    <View style={[styles.pill, { backgroundColor: bgColor, borderColor }]}>
      {icon && <Text style={styles.pillIcon}>{icon}</Text>}
      <Text style={[styles.pillText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color = "#FF6B35",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconWrap, { backgroundColor: color + "15" }]}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SpicyMeter({ level }: { level: number }) {
  const maxLevel = 5;
  const animatedValues = useRef(
    Array.from({ length: maxLevel }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = animatedValues.map((anim, idx) =>
      Animated.timing(anim, {
        toValue: idx < level ? 1 : 0,
        duration: 300,
        delay: idx * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  }, [level]);

  const getSpicyText = (lvl: number) => {
    if (lvl === 0) return "ไม่เผ็ด";
    if (lvl <= 1) return "เผ็ดน้อย";
    if (lvl <= 2) return "เผ็ดกลาง";
    if (lvl <= 3) return "เผ็ดมาก";
    if (lvl <= 4) return "เผ็ดมากๆ";
    return "สุดขีด! 🔥";
  };

  return (
    <View style={styles.spicyMeter}>
      <View style={styles.spicyHeader}>
        <View style={styles.spicyTitleWrap}>
          <Text style={styles.spicyEmoji}>🌶️</Text>
          <Text style={styles.spicyLabel}>ระดับความเผ็ด</Text>
        </View>
        <View style={styles.spicyBadge}>
          <Text style={styles.spicyBadgeText}>{getSpicyText(level)}</Text>
        </View>
      </View>

      <View style={styles.spicyBarContainer}>
        {animatedValues.map((anim, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.spicyBarItem,
              {
                backgroundColor:
                  idx < level
                    ? idx < 2
                      ? "#FCD34D"
                      : idx < 4
                      ? "#F97316"
                      : "#DC2626"
                    : "#E5E7EB",
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.spicyBarEmoji}>{idx < level ? "🌶️" : "○"}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export default function LocalDishDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const dishId = Number(route.params?.dishId);
  const {
    data: dish,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetByIdQuery(dishId, {
    skip: !Number.isFinite(dishId) || dishId <= 0,
    refetchOnMountOrArgChange: true,
  });

  const { data: places } = useGetPlacesByDishIdQuery(dishId, {
    skip: !Number.isFinite(dishId) || dishId <= 0,
  });

  if (!Number.isFinite(dishId) || dishId <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorEmoji}>🍽️</Text>
          </View>
          <Text style={styles.errorTitle}>ไม่พบข้อมูลอาหาร</Text>
          <Text style={styles.errorSubtitle}>กรุณาลองใหม่อีกครั้ง</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>← กลับหน้าหลัก</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>กำลังโหลดความอร่อย...</Text>
          <Text style={styles.loadingSubtext}>รอสักครู่นะคะ 🍜</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dish) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorEmoji}>😕</Text>
          </View>
          <Text style={styles.errorTitle}>อุ๊ปส์! เกิดข้อผิดพลาด</Text>
          <Text style={styles.errorSubtitle}>โหลดข้อมูลไม่สำเร็จ</Text>
          <TouchableOpacity style={styles.btn} onPress={() => refetch()}>
            <Text style={styles.btnText}>🔄 ลองใหม่อีกครั้ง</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images: any[] = dish.images ?? [];
  const cover = images.find((x) => x.isCover) ?? images[0];
  const coverUrl = toAbsoluteUrl(cover?.imageUrl);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Floating Header */}
      <Animated.View
        style={[styles.floatingHeader, { opacity: headerOpacity }]}
      >
        <TouchableOpacity
          style={styles.floatingBackBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.floatingBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.floatingTitle} numberOfLines={1}>
          {dish.nameTH}
        </Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image with Overlay */}
        <View style={styles.heroSection}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.heroCover}
              resizeMode="cover"
              onError={() => console.log("Cover load failed:", coverUrl)}
            />
          ) : (
            <View style={[styles.heroCover, styles.coverFallback]}>
              <Text style={styles.fallbackIcon}>🍜</Text>
              <Text style={styles.fallbackText}>ไม่มีรูปภาพ</Text>
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteBtn}>
            <Text style={styles.favoriteIcon}>♡</Text>
          </TouchableOpacity>

          {/* Title Overlay */}
          <Animated.View
            style={[styles.heroTextOverlay, { opacity: fadeAnim }]}
          >
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>🍲 อาหารท้องถิ่น</Text>
            </View>
            <Text style={styles.heroTitle}>{dish.nameTH}</Text>
            <Text style={styles.heroSubtitle}>{dish.nameEN}</Text>
          </Animated.View>
        </View>

        {/* Quick Info Bar */}
        <View style={styles.quickInfoBar}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>📍</Text>
            <Text style={styles.quickInfoText}>
              {dish.origin || "กาญจนบุรี"}
            </Text>
          </View>
          <View style={styles.quickInfoDivider} />
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>⏱️</Text>
            <Text style={styles.quickInfoText}>พร้อมเสิร์ฟ</Text>
          </View>
          <View style={styles.quickInfoDivider} />
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>⭐</Text>
            <Text style={styles.quickInfoText}>แนะนำ</Text>
          </View>
        </View>

        {/* Tags Row */}
        <Animated.View style={[styles.tagsRow, { opacity: fadeAnim }]}>
          {dish.isHalal ? (
            <Pill text="ฮาลาล" icon="☪️" variant="success" />
          ) : null}
          {dish.isVegetarian ? (
            <Pill text="มังสวิรัติ" icon="🥬" variant="success" />
          ) : null}
          {dish.origin ? <Pill text={dish.origin} icon="📍" /> : null}
          {dish.isActive ? (
            <Pill text="พร้อมบริการ" icon="✅" variant="success" />
          ) : (
            <Pill text="ไม่พร้อมบริการ" icon="❌" variant="warning" />
          )}
        </Animated.View>

        {/* Spicy Level */}
        <SpicyMeter level={dish.spicyLevel ?? 0} />

        {/* Description Card */}
        {dish.description ? (
          <View style={styles.card}>
            <SectionHeader
              icon="📖"
              title="เรื่องราวของเมนูนี้"
              subtitle="ความเป็นมาและเอกลักษณ์"
            />
            <View style={styles.descriptionWrap}>
              <Text style={styles.descQuote}>"</Text>
              <Text style={styles.desc}>{dish.description}</Text>
              <Text style={styles.descQuoteEnd}>"</Text>
            </View>
          </View>
        ) : null}

        {/* Info Grid */}
        {dish.origin ? (
          <View style={styles.infoSection}>
            <SectionHeader icon="📊" title="ข้อมูลเพิ่มเติม" />
            <View style={styles.infoGrid}>
              <InfoCard
                icon="🗺️"
                label="ต้นกำเนิด"
                value={dish.origin}
                color="#10B981"
              />
              <InfoCard
                icon="🍽️"
                label="ประเภท"
                value="อาหารคาว"
                color="#F59E0B"
              />
            </View>
          </View>
        ) : null}

        {/* Recommended Places Section */}
        {places && places.length > 0 ? (
          <View style={styles.placesSection}>
            <SectionHeader
              icon="🏪"
              title={`ร้านแนะนำ`}
              subtitle={`${places.length} ร้านที่ต้องลอง!`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesScroll}
            >
              {places.map((place: any, idx: number) => {
                const img =
                  place.coverImage ||
                  place.images?.[0]?.imageUrl ||
                  place.imageUrl;
                const placeImgUrl = toAbsoluteUrl(img);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.placeCard}
                    activeOpacity={0.9}
                    onPress={() => {
                      console.log("Go to place", place.id);
                    }}
                  >
                    <View style={styles.placeImageContainer}>
                      {placeImgUrl ? (
                        <Image
                          source={{ uri: placeImgUrl }}
                          style={styles.placeImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.placeImage, styles.placeFallback]}>
                          <Text style={styles.fallbackSmallIcon}>🏠</Text>
                        </View>
                      )}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.6)"]}
                        style={styles.placeGradient}
                      />
                      <View style={styles.placeBadge}>
                        <Text style={styles.placeBadgeText}>✨ แนะนำ</Text>
                      </View>
                    </View>

                    <View style={styles.placeContent}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <View style={styles.placeRating}>
                        <Text style={styles.placeRatingText}>⭐ 4.5</Text>
                      </View>
                      <TouchableOpacity style={styles.placeButton}>
                        <Text style={styles.placeButtonText}>ดูรายละเอียด</Text>
                        <Text style={styles.placeArrowText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Image Gallery */}
        {images.length > 0 ? (
          <View style={styles.gallerySection}>
            <SectionHeader
              icon="📸"
              title="แกลเลอรี่"
              subtitle={`${images.length} รูปภาพ`}
            />
            <View style={styles.gallery}>
              {images.map((img, idx) => {
                const imgUrl = toAbsoluteUrl(img.imageUrl);
                const isLarge = idx === 0 || idx === 3;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.galleryItem,
                      isLarge && styles.galleryItemLarge,
                    ]}
                    activeOpacity={0.9}
                  >
                    {imgUrl ? (
                      <Image
                        source={{ uri: imgUrl }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.galleryImage, styles.coverFallback]}>
                        <Text style={styles.fallbackSmallIcon}>🍜</Text>
                      </View>
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.3)"]}
                      style={styles.galleryGradient}
                    />
                    {img.isCover && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>📷 หน้าปก</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={["#FF6B35", "#F7931E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaEmoji}>🍜</Text>
            <Text style={styles.ctaTitle}>อยากลองชิมไหม?</Text>
            <Text style={styles.ctaSubtitle}>
              ค้นหาร้านใกล้คุณที่เสิร์ฟเมนูนี้
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>ค้นหาร้านอาหาร 🔍</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F5" },
  container: { paddingBottom: 20 },

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  floatingBackIcon: { fontSize: 20, fontWeight: "900", color: "#111827" },

  floatingTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginHorizontal: 12,
  },

  // Hero Section
  heroSection: {
    position: "relative",
    width: "100%",
    height: 420,
  },

  heroCover: {
    width: "100%",
    height: "100%",
  },

  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EB",
  },

  fallbackIcon: { fontSize: 80, marginBottom: 12 },
  fallbackText: { fontSize: 16, color: "#C2410C", fontWeight: "700" },
  fallbackSmallIcon: { fontSize: 32 },

  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
  },

  backBtn: {
    position: "absolute",
    top: 56,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  backIcon: { fontSize: 24, fontWeight: "900", color: "#111827" },

  favoriteBtn: {
    position: "absolute",
    top: 56,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  favoriteIcon: { fontSize: 24, color: "#EF4444" },

  heroTextOverlay: {
    position: "absolute",
    bottom: 28,
    left: 20,
    right: 20,
  },

  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },

  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    fontStyle: "italic",
  },

  // Quick Info Bar
  quickInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  quickInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  quickInfoIcon: { fontSize: 18 },

  quickInfoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  quickInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  pillIcon: { fontSize: 14 },

  pillText: {
    fontSize: 13,
    fontWeight: "800",
  },

  // Spicy Meter
  spicyMeter: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  spicyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  spicyTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  spicyEmoji: { fontSize: 24 },

  spicyLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  spicyBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },

  spicyBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },

  spicyBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  spicyBarItem: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  spicyBarEmoji: {
    fontSize: 22,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  sectionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF1EB",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionIcon: { fontSize: 24 },

  sectionTitleWrap: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  descriptionWrap: {
    backgroundColor: "#FFFBF7",
    borderRadius: 16,
    padding: 16,
    position: "relative",
  },

  descQuote: {
    fontSize: 48,
    color: "#FDBA74",
    position: "absolute",
    top: -8,
    left: 8,
    fontFamily: "Georgia",
  },

  descQuoteEnd: {
    fontSize: 48,
    color: "#FDBA74",
    position: "absolute",
    bottom: -24,
    right: 8,
    fontFamily: "Georgia",
  },

  desc: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 26,
    paddingLeft: 24,
  },

  // Info Section
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },

  infoCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  infoIcon: { fontSize: 24 },

  infoTextWrap: { flex: 1 },

  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  // Places Section
  placesSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  placesScroll: {
    paddingRight: 16,
    gap: 16,
  },

  placeCard: {
    width: 200,
    backgroundColor: "white",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },

  placeImageContainer: {
    position: "relative",
    height: 140,
  },

  placeImage: {
    width: "100%",
    height: "100%",
  },

  placeFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  placeGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },

  placeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  placeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F59E0B",
  },

  placeContent: {
    padding: 16,
    gap: 8,
  },

  placeName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },

  placeRating: {
    flexDirection: "row",
    alignItems: "center",
  },

  placeRatingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  placeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EB",
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },

  placeButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF6B35",
  },

  placeArrowText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FF6B35",
  },

  // Gallery Section
  gallerySection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  galleryItem: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },

  galleryItemLarge: {
    width: SCREEN_WIDTH - 32,
    height: 200,
  },

  galleryImage: {
    width: "100%",
    height: "100%",
  },

  galleryGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
  },

  coverBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  coverBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35",
  },

  // CTA Section
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },

  ctaCard: {
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },

  ctaEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },

  ctaTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "white",
    marginBottom: 6,
  },

  ctaSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },

  ctaButton: {
    backgroundColor: "white",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },

  ctaButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FF6B35",
  },

  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },

  loadingWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF1EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  loadingText: {
    color: "#FF6B35",
    fontWeight: "800",
    fontSize: 18,
  },

  loadingSubtext: {
    color: "#9CA3AF",
    fontWeight: "600",
    fontSize: 14,
  },

  errorIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF1EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  errorEmoji: { fontSize: 48 },

  errorTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 20,
    textAlign: "center",
  },

  errorSubtitle: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },

  btn: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },

  btnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
  },
});
