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
import { getPlaceImageUrl } from "../features/places/Components/placeListUtils";
import { useGetAllPlaceCategoryQuery } from "../features/placeCategory/placeCategoryApi";
import type { PlaceDto } from "../features/places/placeTypes"; // <- ปรับ path ให้ตรงของคุณ

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

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
// Category Chip
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
  const icons: Record<string, string> = {
    วัด: "🛕",
    น้ำตก: "💧",
    ภูเขา: "⛰️",
    ทะเล: "🏖️",
    ถ้ำ: "🕳️",
    สวนสาธารณะ: "🌳",
    พิพิธภัณฑ์: "🏛️",
    ตลาด: "🛒",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.categoryChip, active && styles.categoryChipActive]}
      activeOpacity={0.85}
    >
      <Text style={styles.categoryChipIcon}>{icons[name] || "📍"}</Text>
      <Text
        style={[
          styles.categoryChipText,
          active && styles.categoryChipTextActive,
        ]}
      >
        {name}
      </Text>
      {active && (
        <View style={styles.chipCheckmark}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

// =======================
// Place Card
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
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, index]);

  const imageUrl = getPlaceImageUrl(item);

  const ratingText = useMemo(() => {
    const r = item?.averageRating ?? "4.5";
    return String(r);
  }, [item?.averageRating]);

  return (
    <Animated.View
      style={[
        styles.placeCard,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable style={styles.placeCardTouchable} onPress={onPress}>
        <View style={styles.placeImageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.placeImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
            style={styles.placeImageGradient}
          />

          {!!item.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeIcon}>📍</Text>
              <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.85}>
            <Ionicons name="heart-outline" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{ratingText}</Text>
          </View>
        </View>

        <View style={styles.placeContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.placeDesc} numberOfLines={2}>
            {item.description || "สถานที่ท่องเที่ยวยอดนิยม"}
          </Text>

          <View style={styles.placeFooter}>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#10B981" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.address || "กาญจนบุรี"}
              </Text>
            </View>
            {typeof item.distanceKm === "number" && (
              <View >
                <Text style={styles.distanceText}>
                  {item.distanceKm.toFixed(1)} กม.
                </Text>
              </View>
            )}
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
    null
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...p, distanceKm: null };

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
            (p.distanceKm as number) <= radiusKm
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
    [navigation]
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
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={["#1E3A5F", "#2A4D50", "#3D6B6B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconBadge}>
              <Text style={styles.heroEmoji}>🗺️</Text>
            </View>
            <Text style={styles.heroTitle}>สำรวจสถานที่</Text>
            <Text style={styles.heroSubtitle}>
              ค้นพบจุดหมายปลายทางที่น่าประทับใจในกาญจนบุรี
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{total}</Text>
                <Text style={styles.statLabel}>สถานที่</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{categories.length}</Text>
                <Text style={styles.statLabel}>หมวดหมู่</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={20} color="#2A4D50" />
          </View>
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="ค้นหาสถานที่ที่คุณสนใจ..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setPage(1);
              }}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <View style={styles.searchDivider} />
          <TouchableOpacity onPress={onRefreshAll} style={styles.refreshBtn}>
            <Ionicons
              name={isFetching || catFetching ? "sync" : "refresh"}
              size={20}
              color="#2A4D50"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <View style={styles.filterTitleWrap}>
              <Text style={styles.filterIcon}>🏷️</Text>
              <Text style={styles.filterTitle}>หมวดหมู่</Text>
            </View>
            {selectedCategoryId !== null && (
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterText}>ล้าง</Text>
              </TouchableOpacity>
            )}
          </View>

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
                      : item.categoryId
                  );
                  setPage(1);
                }}
              />
            )}
          />
        </View>
      )}

      {/* Results Bar */}
      <View style={styles.resultsBar}>
        <View style={styles.resultsLeft}>
          <View style={styles.resultsIconWrap}>
            <Ionicons name="compass" size={18} color="#fff" />
          </View>
          <Text style={styles.resultsText}>
            {isLoading || isFetching
              ? "กำลังค้นหา..."
              : `พบ ${filteredPlaces.length} สถานที่`}
          </Text>
        </View>

        <View style={styles.resultsRight}>
          <TouchableOpacity
            onPress={toggleNearMe}
            activeOpacity={0.85}
            style={[styles.nearMeBtn, nearMeOn && styles.nearMeBtnActive]}
          >
            <Ionicons
              name={nearMeOn ? "navigate" : "navigate-outline"}
              size={16}
              color={nearMeOn ? "#fff" : "#0EA5E9"}
            />
            <Text
              style={[styles.nearMeText, nearMeOn && styles.nearMeTextActive]}
            >
              {locLoading ? "กำลังหา..." : "ใกล้ฉัน"}
            </Text>
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              onPress={resetAll}
              style={styles.clearAllBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={styles.clearAllText}>ล้าง</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(isLoading || isFetching) && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <ActivityIndicator size="small" color="#2A4D50" />
            <Text style={styles.loadingText}>กำลังโหลดสถานที่...</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );

  const Empty = (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={["#F0F9FF", "#E0F2FE"]}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyEmoji}>🔍</Text>
        </View>
        <Text style={styles.emptyTitle}>ไม่พบสถานที่</Text>
        <Text style={styles.emptyDesc}>
          {hasFilters
            ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองที่ใช้ดูนะคะ"
            : "ไม่มีข้อมูลสถานที่ในขณะนี้"}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={resetAll}
            style={styles.emptyBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>ล้างตัวกรอง</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
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
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={page <= 1 ? "#D1D5DB" : "#fff"}
                  />
                  <Text
                    style={[
                      styles.pageBtnText,
                      page <= 1 && styles.pageBtnTextDisabled,
                    ]}
                  >
                    ก่อนหน้า
                  </Text>
                </TouchableOpacity>

                <View style={styles.pageIndicator}>
                  <Text style={styles.pageText}>
                    <Text style={styles.pageNumber}>{page}</Text>
                    <Text style={styles.pageSeparator}> / </Text>
                    <Text style={styles.pageNumber}>{totalPages}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={page >= totalPages}
                  onPress={onPressNext}
                  style={[
                    styles.pageBtn,
                    page >= totalPages && styles.pageBtnDisabled,
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.pageBtnText,
                      page >= totalPages && styles.pageBtnTextDisabled,
                    ]}
                  >
                    ถัดไป
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={page >= totalPages ? "#D1D5DB" : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  page: { flex: 1 },

  headerWrap: { paddingBottom: 8 },

  heroSection: {
    paddingTop: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    position: "relative",
  },
  heroOverlay: { zIndex: 1 },
  heroContent: { alignItems: "center", paddingHorizontal: 24 },
  heroIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "900", color: "#fff" },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginVertical: 4,
  },

  decorCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },

  searchContainer: { paddingHorizontal: 20, marginTop: -28, marginBottom: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  searchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearSearchBtn: { padding: 8 },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  filterSection: { marginBottom: 16 },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterIcon: { fontSize: 18 },
  filterTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  clearFilterText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  chipList: { paddingHorizontal: 20, gap: 10 },

  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipActive: { backgroundColor: "#1E3A5F", borderColor: "#1E3A5F" },
  categoryChipIcon: { fontSize: 18 },
  categoryChipText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  categoryChipTextActive: { color: "#fff" },
  chipCheckmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultsRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsText: { fontSize: 15, fontWeight: "800", color: "#1F2937" },

  nearMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#7DD3FC",
  },
  nearMeBtnActive: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  nearMeText: { fontSize: 13, fontWeight: "900", color: "#0284C7" },
  nearMeTextActive: { color: "#fff" },

  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  clearAllText: { fontSize: 13, fontWeight: "800", color: "#DC2626" },

  loadingContainer: { paddingVertical: 16, alignItems: "center" },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  loadingText: { fontSize: 13, fontWeight: "700", color: "#2A4D50" },

  columnWrapper: { gap: 12 },
  listContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },

  placeCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  placeCardTouchable: { flex: 1 },
  placeImageContainer: {
    height: 150,
    backgroundColor: "#E5E7EB",
    position: "relative",
  },
  placeImage: { width: "100%", height: "100%" },
  placeImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },

  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryBadgeIcon: { fontSize: 12 },
  categoryBadgeText: { fontSize: 11, fontWeight: "800", color: "#1E3A5F" },

  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },

  ratingBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  placeContent: { padding: 16, gap: 8 },
  placeName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1F2937",
    lineHeight: 20,
  },
  placeDesc: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    lineHeight: 18,
  },

  placeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 4,
  },
  locationRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#10B981" },

  footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#7DD3FC",
  },
  distanceText: { fontSize: 11, fontWeight: "900", color: "#0284C7" },

  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: { paddingVertical: 40, paddingHorizontal: 20 },
  emptyGradient: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#1F2937" },
  emptyDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: "#2A4D50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#2A4D50",
  },
  pageBtnDisabled: { backgroundColor: "#F3F4F6" },
  pageBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  pageBtnTextDisabled: { color: "#9CA3AF" },
  pageIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F0F9FF",
  },
  pageText: { fontSize: 14, fontWeight: "700" },
  pageNumber: { fontWeight: "900", color: "#2A4D50" },
  pageSeparator: { fontWeight: "600", color: "#9CA3AF" },
});
