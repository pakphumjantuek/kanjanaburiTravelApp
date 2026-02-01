import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";

import { useGetAllPlaceQuery } from "../features/places/placeApi";
import { useDebounce } from "../utils/useDebounce";
import { useGetAllPlaceCategoryQuery } from "../features/placeCategory/placeCategoryApi";
import type { PlaceDto } from "../features/places/placeTypes";
import { getCoverUrl } from "../utils/imagepath";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Nature Travel Color Palette
const COLORS = {
  primary: "#059669",
  primaryDark: "#047857",
  primaryLight: "#10B981",
  secondary: "#0EA5E9",
  accent: "#F59E0B",
  background: "#ffffff",
  card: "#FFFFFF",
  text: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#D1FAE5",
  success: "#22C55E",
  warning: "#F59E0B",
};

type PlaceWithDistance = PlaceDto & {
  distanceKm?: number | null;
};

type PlaceCategory = {
  categoryId: number;
  categoryName: string;
  categoryDescription?: string | null;
};

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      (Math.sin(dLng / 2) * Math.sin(dLng / 2));
  return 2 * R * Math.asin(Math.sqrt(s1));
}

// =======================
// Category Chip - Modern Design
// =======================
const CategoryChip = memo(function CategoryChip({
  name,
  active,
  onPress,
}: {
  name: string;
  active: boolean;
  onPress: () => void;
}) {
  const icons: Record<string, { emoji: string; color: string }> = {
    วัด: { emoji: "🛕", color: "#F59E0B" },
    น้ำตก: { emoji: "💧", color: "#3B82F6" },
    ภูเขา: { emoji: "⛰️", color: "#22C55E" },
    ทะเล: { emoji: "🏖️", color: "#06B6D4" },
    ถ้ำ: { emoji: "🕳️", color: "#8B5CF6" },
    สวนสาธารณะ: { emoji: "🌳", color: "#10B981" },
    พิพิธภัณฑ์: { emoji: "🏛️", color: "#6366F1" },
    ตลาด: { emoji: "🛒", color: "#EC4899" },
  };

  const iconData = icons[name] || { emoji: "📍", color: COLORS.primary };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        active && {
          backgroundColor: iconData.color,
          borderColor: iconData.color,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text style={styles.categoryChipIcon}>{iconData.emoji}</Text>
      <Text
        style={[
          styles.categoryChipText,
          active && styles.categoryChipTextActive,
        ]}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
});

// =======================
// Place Card - Modern Glass Design
// =======================
const PlaceCard = memo(function PlaceCard({
  item,
  index,
  onPress,
}: {
  item: PlaceWithDistance;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, translateY, index]);

  const imageUrl = getCoverUrl(item);

  const ratingValue =
    typeof item?.averageRating === "number" ? item.averageRating : null;
  const ratingText = ratingValue !== null ? ratingValue.toFixed(1) : "-";

  return (
    <Animated.View
      style={[
        styles.placeCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY }],
        },
      ]}
    >
      <Pressable
        style={styles.placeCardTouchable}
        onPress={onPress}
        android_ripple={{ color: "rgba(99, 102, 241, 0.1)" }}
      >
        <View style={styles.placeImageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.placeImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.placeImageGradient}
          />

          {/* Top Badges */}
          <View style={styles.cardTopRow}>
            {!!item.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {item.categoryName}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Info on Image */}
          <View style={styles.cardImageBottom}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratingText}>{ratingText}</Text>
            </View>
            {typeof item.distanceKm === "number" && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={10} color="#fff" />
                <Text style={styles.distanceText}>
                  {item.distanceKm.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.placeContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.address || "กาญจนบุรี"}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function PlaceListScreen() {
  const navigation = useNavigation<any>();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<PlaceWithDistance>>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(16);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  // ใกล้ฉัน
  const [nearMeOn, setNearMeOn] = useState(false);
  const [radiusKm] = useState(10);
  const [userLoc, setUserLoc] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Animation
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  // Fetch places
  const { data, isLoading, isFetching, refetch } = useGetAllPlaceQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const places: PlaceWithDistance[] = (data?.items ??
    []) as PlaceWithDistance[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Fetch categories (try big pageSize to get all)
  const {
    data: catPaged,
    isFetching: catFetching,
    refetch: refetchCats,
  } = useGetAllPlaceCategoryQuery({ page: 1, pageSize: 1000, search: "" });

  const categories: PlaceCategory[] = (catPaged?.items ?? []) as any[];

  const requestUserLocation = useCallback(async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setUserLoc(null);
        return false;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLoc({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      return true;
    } finally {
      setLocLoading(false);
    }
  }, []);

  const toggleNearMe = useCallback(async () => {
    if (nearMeOn) {
      setNearMeOn(false);
      return;
    }

    const ok = userLoc ? true : await requestUserLocation();
    if (!ok) return;

    setNearMeOn(true);
  }, [nearMeOn, userLoc, requestUserLocation]);

  const placesWithDistance: PlaceWithDistance[] = useMemo(() => {
    if (!userLoc) return places.map((p) => ({ ...p, distanceKm: null }));

    return places.map((p) => {
      const lat = Number((p as any).latitude);
      const lng = Number((p as any).longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return { ...p, distanceKm: null };

      return {
        ...p,
        distanceKm: haversineKm(userLoc.latitude, userLoc.longitude, lat, lng),
      };
    });
  }, [places, userLoc]);

  const filteredPlaces: PlaceWithDistance[] = useMemo(() => {
    let arr = placesWithDistance;

    // Category filter
    if (selectedCategoryId !== null) {
      arr = arr.filter((p) => p.categoryId === selectedCategoryId);
    }

    // Near me filter (within radius + sort)
    if (nearMeOn && userLoc) {
      arr = arr
        .filter(
          (p) =>
            typeof p.distanceKm === "number" &&
            (p.distanceKm as number) <= radiusKm,
        )
        .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
    }

    return arr;
  }, [placesWithDistance, selectedCategoryId, nearMeOn, userLoc, radiusKm]);

  const hasFilters = Boolean(search || selectedCategoryId !== null || nearMeOn);

  const resetAll = useCallback(() => {
    setSearch("");
    setSelectedCategoryId(null);
    setNearMeOn(false);
    setPage(1);
  }, []);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const goDetails = useCallback(
    (placeId: number) => navigation.navigate("PlaceDetails", { placeId }),
    [navigation],
  );

  const onPressPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
    scrollToTop();
  }, [scrollToTop]);

  const onPressNext = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
    scrollToTop();
  }, [totalPages, scrollToTop]);

  const onRefreshAll = useCallback(() => {
    refetch();
    refetchCats();
  }, [refetch, refetchCats]);

  const Header = (
    <Animated.View
      style={[
        styles.headerWrap,
        {
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Hero Section - Nature Gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, "#34D399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        {/* Decorative Pattern */}
        <View style={styles.heroPattern}>
          <View style={styles.patternCircle1} />
          <View style={styles.patternCircle2} />
          <View style={styles.patternCircle3} />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroLabel}>ค้นพบ 🗺️</Text>
              <Text style={styles.heroTitle}>สถานที่ท่องเที่ยว</Text>
              <Text style={styles.heroSubtitle}>
                ธรรมชาติงดงามแห่งกาญจนบุรี
              </Text>
            </View>
            <View style={styles.heroIconBadge}>
              <Ionicons name="compass" size={32} color="#fff" />
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{total}+</Text>
              <Text style={styles.statLabel}>สถานที่</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{categories.length}</Text>
              <Text style={styles.statLabel}>หมวดหมู่</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>4.8</Text>
              <Text style={styles.statLabel}>คะแนน</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Floating Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="ค้นหาสถานที่ที่คุณสนใจ..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setPage(1);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onRefreshAll}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips - Category */}
      {categories.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>หมวดหมู่</Text>
          <View style={styles.filterChipsScroll}>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(x) => String(x.categoryId)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipList}
              renderItem={({ item }) => (
                <CategoryChip
                  name={item.categoryName}
                  active={item.categoryId === selectedCategoryId}
                  onPress={() => {
                    setSelectedCategoryId(
                      item.categoryId === selectedCategoryId
                        ? null
                        : item.categoryId,
                    );
                    setPage(1);
                  }}
                />
              )}
            />
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {isLoading || isFetching
            ? "กำลังโหลด..."
            : `พบ ${filteredPlaces.length} สถานที่`}
        </Text>

        <View style={styles.filterActions}>
          <TouchableOpacity
            onPress={toggleNearMe}
            style={[styles.actionChip, nearMeOn && styles.actionChipActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={nearMeOn ? "locate" : "locate-outline"}
              size={16}
              color={nearMeOn ? "#fff" : COLORS.primary}
            />
            <Text
              style={[
                styles.actionChipText,
                nearMeOn && styles.actionChipTextActive,
              ]}
            >
              {locLoading ? "..." : "ใกล้ฉัน"}
            </Text>
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              onPress={resetAll}
              style={styles.resetChip}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(isLoading || isFetching) && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      )}
    </Animated.View>
  );

  const Empty = (
    <View style={styles.emptyState}>
      <View style={styles.emptyContent}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="search" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>ไม่พบสถานที่</Text>
        <Text style={styles.emptyDesc}>
          {hasFilters
            ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่"
            : "ยังไม่มีข้อมูลสถานที่"}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={resetAll}
            style={styles.emptyBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>ล้างตัวกรอง</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#65fbcc" />
      <View style={styles.page}>
        <FlatList
          ref={flatListRef}
          data={filteredPlaces}
          keyExtractor={(item) => String(item.placeId)}
          numColumns={2}
          ListHeaderComponent={Header}
          ListEmptyComponent={!isLoading && !isFetching ? Empty : null}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <PlaceCard
              item={item}
              index={index}
              onPress={() => goDetails(item.placeId)}
            />
          )}
          refreshing={isFetching}
          onRefresh={onRefreshAll}
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={7}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={60}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={onPressPrev}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={page <= 1 ? COLORS.textMuted : "#fff"}
                  />
                </TouchableOpacity>

                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>{page}</Text>
                  <Text style={styles.pageSep}>/</Text>
                  <Text style={styles.pageTotal}>{totalPages}</Text>
                </View>

                <TouchableOpacity
                  disabled={page >= totalPages}
                  onPress={onPressNext}
                  style={[
                    styles.pageBtn,
                    page >= totalPages && styles.pageBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={page >= totalPages ? COLORS.textMuted : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { flex: 1 },
  headerWrap: { paddingBottom: 12, width: SCREEN_WIDTH, alignSelf: "center" },
  // Hero Section
  heroSection: {
    paddingTop: 20,
    paddingBottom: 50,
    position: "relative",
    overflow: "hidden",
    width: "100%",
  },
  heroPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  patternCircle2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  patternCircle3: {
    position: "absolute",
    top: 40,
    left: "40%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroContent: {
    paddingHorizontal: 20,
    zIndex: 1,
  },
  heroTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  heroIconBadge: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 8,
  },

  // Search
  searchWrapper: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: -28,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Filter Section
  filterSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  filterChipsScroll: {},
  chipList: {
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: "#fff",
  },

  // Results Bar
  resultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  actionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  actionChipTextActive: {
    color: "#fff",
  },
  resetChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // Loading
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // List
  columnWrapper: {
    gap: 12,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 100,
    gap: 12,
  },

  // Place Card
  placeCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  placeCardTouchable: {
    flex: 1,
  },
  placeImageContainer: {
    height: 140,
    backgroundColor: COLORS.border,
  },
  placeImage: {
    width: "100%",
    height: "100%",
  },
  placeImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  cardTopRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  categoryBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },
  favoriteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageBottom: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  placeContent: {
    padding: 14,
  },
  placeName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 24,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  pageInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
  },
  pageText: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },
  pageSep: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  pageTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
