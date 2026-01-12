import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useGetByIdQuery } from "../LocalDishApi";
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

function Pill({ text, icon }: { text: string; icon?: string }) {
  return (
    <View style={styles.pill}>
      {icon && <Text style={styles.pillIcon}>{icon}</Text>}
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SpicyMeter({ level }: { level: number }) {
  const maxLevel = 5;
  const chilis = "🌶️".repeat(Math.min(level, maxLevel));
  const emptyChilis = "⚪".repeat(Math.max(0, maxLevel - level));
  
  return (
    <View style={styles.spicyMeter}>
      <View style={styles.spicyHeader}>
        <Text style={styles.spicyLabel}>🔥 ความเผ็ด</Text>
        <Text style={styles.spicyLevel}>ระดับ {level}/5</Text>
      </View>
      <Text style={styles.spicyDisplay}>{chilis}{emptyChilis}</Text>
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
    isFetching,
    refetch,
    error,
  } = useGetByIdQuery(dishId, {
    skip: !Number.isFinite(dishId) || dishId <= 0,
    refetchOnMountOrArgChange: true,
  });

  if (!Number.isFinite(dishId) || dishId <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>ไม่พบข้อมูลอาหาร</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>← ย้อนกลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dish) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>โหลดข้อมูลไม่สำเร็จ</Text>
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

  return (
    <View style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.heroGradient} />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Title Overlay */}
          <View style={styles.heroTextOverlay}>
            <Text style={styles.heroTitle}>{dish.nameTH}</Text>
            <Text style={styles.heroSubtitle}>{dish.nameEN}</Text>
          </View>
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {dish.isHalal ? <Pill text="ฮาลาล" icon="☪️" /> : null}
          {dish.isVegetarian ? <Pill text="มังสวิรัติ" icon="🥬" /> : null}
          {dish.origin ? <Pill text={dish.origin} icon="📍" /> : null}
          {dish.isActive ? (
            <Pill text="พร้อมบริการ" icon="✅" />
          ) : (
            <Pill text="ไม่พร้อมบริการ" icon="❌" />
          )}
        </View>

        {/* Spicy Level */}
        <SpicyMeter level={dish.spicyLevel ?? 0} />

        {/* Description Card */}
        {dish.description ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📖</Text>
              <Text style={styles.cardTitle}>เกี่ยวกับเมนูนี้</Text>
            </View>
            <Text style={styles.desc}>{dish.description}</Text>
          </View>
        ) : null}

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          {dish.origin ? (
            <InfoCard icon="🗺️" label="ต้นกำเนิด" value={dish.origin} />
          ) : null}
         
        </View>

        {/* Image Gallery */}
        {images.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🖼️</Text>
              <Text style={styles.cardTitle}>แกลเลอรี่ ({images.length} รูป)</Text>
            </View>
            <View style={styles.gallery}>
              {images.map((img, idx) => {
                const imgUrl = toAbsoluteUrl(img.imageUrl);
                return (
                  <View key={idx} style={styles.galleryItem}>
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
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FEF3C7" },
  container: { paddingBottom: 20 },

  heroSection: {
    position: "relative",
    width: "100%",
    height: 380,
  },

  heroCover: {
    width: "100%",
    height: "100%",
  },

  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
  },

  fallbackIcon: { fontSize: 80, marginBottom: 12 },
  fallbackText: { fontSize: 16, color: "#92400E", fontWeight: "700" },
  fallbackSmallIcon: { fontSize: 32 },

  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  backBtn: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  backIcon: { fontSize: 24, fontWeight: "900", color: "#111827" },

  heroTextOverlay: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FEF3C7",
    marginTop: 6,
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

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
    borderColor: "#FDE68A",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  pillIcon: { fontSize: 14 },

  pillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },

  spicyMeter: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: "#FDE68A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  spicyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  spicyLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  spicyLevel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  spicyDisplay: {
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 4,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  cardIcon: { fontSize: 24 },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  desc: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },

  infoCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  infoIcon: { fontSize: 32 },

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
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  galleryItem: {
    width: (SCREEN_WIDTH - 32 - 18 * 2 - 12) / 2,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    position: "relative",
  },

  galleryImage: {
    width: "100%",
    height: "100%",
  },

  coverBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(251, 191, 36, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  coverBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "white",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },

  loadingText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 15,
  },

  errorEmoji: { fontSize: 72 },

  errorText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },

  btn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  btnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
});
