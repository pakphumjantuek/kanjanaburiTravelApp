import React, { useRef, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Pressable,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useDebounce } from "../utils/useDebounce";
import { useGetAllLocalDishQuery } from "../features/localDish/LocalDishApi";
import { LocalDishType } from "../features/localDish/LocalDishType";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCoverUrl } from "../utils/imagepath";

// Food Theme Color Palette
const COLORS = {
  primary: "#FF6B35",
  primaryDark: "#E85A2A",
  primaryLight: "#FF8C5A",
  secondary: "#F7931E",
  accent: "#FBBF24",
  background: "#FFFBF7",
  card: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#FED7AA",
  success: "#10B981",
  warning: "#F59E0B",
};

const SpicyBadge = memo(function SpicyBadge({ level }: { level: number }) {
  if (level === 0) return null;

  const getSpicyInfo = () => {
    if (level >= 4)
      return {
        color: "#DC2626",
        bg: "rgba(220,38,38,0.9)",
        label: "เผ็ดมาก",
        textColor: "#fff",
      };
    if (level >= 3)
      return {
        color: "#F59E0B",
        bg: "rgba(245,158,11,0.9)",
        label: "เผ็ดปานกลาง",
        textColor: "#fff",
      };
    if (level >= 2)
      return {
        color: "#F97316",
        bg: "rgba(249,115,22,0.9)",
        label: "เผ็ดน้อย",
        textColor: "#fff",
      };
    return {
      color: "#10B981",
      bg: "rgba(16,185,129,0.9)",
      label: "เผ็ดเล็กน้อย",
      textColor: "#fff",
    };
  };

  const info = getSpicyInfo();
  const chilis = "🌶️".repeat(Math.min(level, 5));

  return (
    <View style={[styles.spicyBadge, { backgroundColor: info.bg }]}>
      <Text style={styles.spicyChilis}>{chilis}</Text>
      <Text style={[styles.spicyText, { color: info.textColor }]}>
        {info.label}
      </Text>
    </View>
  );
});

const TagPill = memo(function TagPill({
  text,
  icon,
  type = "default",
}: {
  text: string;
  icon?: string;
  type?: "default" | "halal" | "vegan" | "location";
}) {
  const getStyle = () => {
    switch (type) {
      case "halal":
        return { bg: "#ECFDF5", border: "#10B981", text: "#059669" };
      case "vegan":
        return { bg: "#F0FDF4", border: "#22C55E", text: "#16A34A" };
      case "location":
        return {
          bg: "#FFF7ED",
          border: COLORS.primary,
          text: COLORS.primaryDark,
        };
      default:
        return { bg: "#F3F4F6", border: "#D1D5DB", text: "#4B5563" };
    }
  };

  const style = getStyle();

  return (
    <View
      style={[
        styles.tagPill,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
      {icon && <Text style={styles.tagIcon}>{icon}</Text>}
      <Text style={[styles.tagText, { color: style.text }]}>{text}</Text>
    </View>
  );
});

// =======================
// Animated Dish Card
// =======================
const DishCard = memo(function DishCard({
  item,
  index,
  onPress,
}: {
  item: LocalDishType;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  const coverUrl = getCoverUrl(item);

  return (
    <Animated.View
      style={[
        styles.dishCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        style={styles.cardPressable}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,107,53,0.1)" }}
      >
        {/* Cover Image Section */}
        <View style={styles.imageContainer}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.dishImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.dishImage, styles.imageFallback]}>
              <Text style={styles.fallbackEmoji}>🍜</Text>
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.imageGradient}
          />

          {/* Top Badges */}
          <View style={styles.topBadges}>
            {(item as any).isHalal && (
              <View style={styles.halalBadge}>
                <Text style={styles.halalText}>☪️ ฮาลาล</Text>
              </View>
            )}
            {(item as any).isVegetarian && (
              <View style={styles.veganBadge}>
                <Text style={styles.veganText}>🥬 มังสวิรัติ</Text>
              </View>
            )}
          </View>

          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.8}>
            <Ionicons name="heart-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Spicy Level Badge */}
          {(item as any).spicyLevel > 0 && (
            <View style={styles.spicyPosition}>
              <SpicyBadge level={(item as any).spicyLevel ?? 0} />
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.dishNameTH} numberOfLines={1}>
              {(item as any).nameTH}
            </Text>
            {(item as any).nameEN && (
              <Text style={styles.dishNameEN} numberOfLines={1}>
                {(item as any).nameEN}
              </Text>
            )}
          </View>

          {/* Description */}
          {(item as any).description && (
            <Text style={styles.dishDescription} numberOfLines={2}>
              {(item as any).description}
            </Text>
          )}

          {/* Tags Row */}
          {(item as any).origin && (
            <View style={styles.tagsRow}>
              <TagPill text={(item as any).origin} icon="📍" type="location" />
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>ดูรายละเอียด</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function LocalDishUserListScreen() {
  const navigation = useNavigation<any>();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = useCallback(() => {
    spinAnim.setValue(0);
    pulseAnim.setValue(1);
    spinLoopRef.current?.stop();

    const rotateOnce = Animated.timing(spinAnim, {
      toValue: 1,
      duration: 850,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const pulseOnce = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    spinLoopRef.current = Animated.loop(
      Animated.parallel([rotateOnce, pulseOnce]),
      { resetBeforeIteration: true },
    );
    spinLoopRef.current.start();
  }, [spinAnim, pulseAnim]);

  const stopSpin = useCallback(() => {
    spinLoopRef.current?.stop();
    spinLoopRef.current = null;
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [spinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const flatListRef = useRef<FlatList<LocalDishType>>(null);

  const [search, setSearch] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<string | null>(
    null,
  );
  const debouncedSearch = useDebounce(search, 400);

  // Animation
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const { data, isLoading, isFetching, refetch, error } =
    useGetAllLocalDishQuery({
      page: 1,
      pageSize: 50,
      search: debouncedSearch,
    });

  useEffect(() => {
    if (isFetching) startSpin();
    else stopSpin();
  }, [isFetching, startSpin, stopSpin]);

  const dishes = data?.items ?? [];
  const activeDishes = dishes.filter((d: any) => d.isActive);

  // Filter dishes
  const filteredDishes = useMemo(() => {
    if (!selectedFilter) return activeDishes;
    if (selectedFilter === "halal")
      return activeDishes.filter((d: any) => d.isHalal);
    if (selectedFilter === "vegan")
      return activeDishes.filter((d: any) => d.isVegetarian);
    if (selectedFilter === "spicy")
      return activeDishes.filter((d: any) => d.spicyLevel > 0);
    return activeDishes;
  }, [activeDishes, selectedFilter]);

  const goToDetail = useCallback(
    (dishId: number) =>
      navigation.navigate("LocalDishDetailScreen", { dishId }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LocalDishType; index: number }) => (
      <DishCard
        item={item}
        index={index}
        onPress={() => goToDetail((item as any).dishId)}
      />
    ),
    [goToDetail],
  );

  const renderHeader = () => (
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
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Decorative Pattern */}
        <View style={styles.heroPattern}>
          <View style={styles.patternCircle1} />
          <View style={styles.patternCircle2} />
          <View style={styles.patternCircle3} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerGreeting}>ค้นพบ 🍽️</Text>
              <Text style={styles.headerTitle}>อาหารท้องถิ่น</Text>
              <Text style={styles.headerSubtitle}>
                รสชาติดั้งเดิมแห่งกาญจนบุรี
              </Text>
            </View>
            <View style={styles.headerIconWrap}>
              <Text style={styles.headerIcon}>🍜</Text>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{activeDishes.length}</Text>
              <Text style={styles.statLabel}>เมนู</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {dishes.filter((d: any) => d.isHalal).length}
              </Text>
              <Text style={styles.statLabel}>ฮาลาล</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {dishes.filter((d: any) => d.isVegetarian).length}
              </Text>
              <Text style={styles.statLabel}>มังสวิรัติ</Text>
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
            onChangeText={setSearch}
            placeholder="ค้นหาเมนูที่คุณสนใจ..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterMainBtn,
            isFetching && styles.filterMainBtnFetching,
          ]}
          activeOpacity={0.85}
          onPress={() => {
            // ให้หมุนทันทีตอนกด (แม้ request จะยังไม่ทันเปลี่ยน isFetching)
            startSpin();
            refetch();
          }}
          disabled={isFetching} // กันกดรัว
        >
          <Animated.View
            style={{
              transform: [{ rotate: spin }, { scale: pulseAnim }],
              opacity: isFetching ? 1 : 0.95,
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>กรองตาม</Text>
        <View style={styles.filterChips}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedFilter && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterChipEmoji}>🍽️</Text>
            <Text
              style={[
                styles.filterChipText,
                !selectedFilter && styles.filterChipTextActive,
              ]}
            >
              ทั้งหมด
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === "halal" && styles.filterChipActive,
            ]}
            onPress={() =>
              setSelectedFilter(selectedFilter === "halal" ? null : "halal")
            }
            activeOpacity={0.8}
          >
            <Text style={styles.filterChipEmoji}>☪️</Text>
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === "halal" && styles.filterChipTextActive,
              ]}
            >
              ฮาลาล
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === "vegan" && styles.filterChipActive,
            ]}
            onPress={() =>
              setSelectedFilter(selectedFilter === "vegan" ? null : "vegan")
            }
            activeOpacity={0.8}
          >
            <Text style={styles.filterChipEmoji}>🥬</Text>
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === "vegan" && styles.filterChipTextActive,
              ]}
            >
              มังสวิรัติ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === "spicy" && styles.filterChipActive,
            ]}
            onPress={() =>
              setSelectedFilter(selectedFilter === "spicy" ? null : "spicy")
            }
            activeOpacity={0.8}
          >
            <Text style={styles.filterChipEmoji}>🌶️</Text>
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === "spicy" && styles.filterChipTextActive,
              ]}
            >
              เผ็ด
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {isFetching ? "กำลังโหลด..." : `พบ ${filteredDishes.length} เมนู`}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>กำลังค้นหาเมนูอร่อย...</Text>
          <Text style={styles.loadingSubtitle}>รอสักครู่นะคะ 🍜</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorEmoji}>😕</Text>
          </View>
          <Text style={styles.errorTitle}>เกิดข้อผิดพลาด</Text>
          <Text style={styles.errorSubtitle}>
            ไม่สามารถโหลดข้อมูลได้ในขณะนี้
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>ลองใหม่อีกครั้ง</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredDishes}
          keyExtractor={(x) => String((x as any).dishId)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          windowSize={5}
          maxToRenderPerBatch={6}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>ไม่พบเมนูที่ค้นหา</Text>
              <Text style={styles.emptySubtitle}>
                ลองค้นหาด้วยคำอื่นหรือเลือกดูเมนูทั้งหมด
              </Text>
              {(search || selectedFilter) && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => {
                    setSearch("");
                    setSelectedFilter(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>ล้างตัวกรอง</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerWrap: {
    paddingBottom: 12,
  },

  // Hero Section
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

  // Header Styles
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 50,
    position: "relative",
    overflow: "hidden",
  },

  headerContent: {
    paddingHorizontal: 20,
    zIndex: 1,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerGreeting: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "white",
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },

  headerIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    fontSize: 38,
  },

  // Search Styles
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

  filterMainBtn: {
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

  filterMainBtnFetching: {
    shadowOpacity: 0.45,
    elevation: 10,
    transform: [{ scale: 1.02 }],
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

  filterChips: {
    flexDirection: "row",
    gap: 10,
  },

  filterChip: {
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

  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterChipEmoji: {
    fontSize: 14,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  filterChipTextActive: {
    color: "#fff",
  },

  // Results Bar
  resultsBar: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },

  resultsText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  // Stats Styles
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
    color: "white",
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
    marginVertical: 4,
  },

  // List Styles
  listContent: {
    paddingBottom: 100,
  },

  // Card Styles
  dishCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 20,
    marginHorizontal: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  cardPressable: {
    flex: 1,
  },

  imageContainer: {
    position: "relative",
    height: 200,
  },

  dishImage: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  fallbackEmoji: {
    fontSize: 64,
  },

  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },

  topBadges: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    gap: 8,
  },

  halalBadge: {
    backgroundColor: "rgba(16,185,129,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  halalText: {
    fontSize: 11,
    fontWeight: "800",
    color: "white",
  },

  veganBadge: {
    backgroundColor: "rgba(34,197,94,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  veganText: {
    fontSize: 11,
    fontWeight: "800",
    color: "white",
  },

  favoriteBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  spicyPosition: {
    position: "absolute",
    bottom: 14,
    left: 14,
  },

  spicyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  spicyChilis: {
    fontSize: 11,
  },

  spicyText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Content Styles
  contentSection: {
    padding: 18,
  },

  titleSection: {
    marginBottom: 10,
  },

  dishNameTH: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  dishNameEN: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    fontStyle: "italic",
  },

  dishDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },

  tagIcon: {
    fontSize: 12,
  },

  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Action Button
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  viewButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
  },

  // State Containers
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  loadingWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
  },

  loadingSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  errorIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  errorEmoji: {
    fontSize: 56,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
  },

  errorSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  retryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 14,
    fontWeight: "600",
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
});
