import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDebounce } from "../utils/useDebounce";
import { useGetAllLocalDishQuery } from "../features/localDish/LocalDishApi";
import { LocalDishType } from "../features/localDish/LocalDishType";
import { BASE_URL } from "../config/env";
import { SafeAreaView } from "react-native-safe-area-context";

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

function getCoverUrl(dish: any) {
  const cover = dish?.images?.find((x: any) => x.isCover) ?? dish?.images?.[0];
  const p = cover?.imageUrl;
  if (!p) return "";
  return p.startsWith("http") ? p : joinUrl(BASE_URL, p);
}

function SpicyBadge({ level }: { level: number }) {
  const getSpicyColor = () => {
    if (level >= 4) return ["#DC2626", "#EF4444"];
    if (level >= 3) return ["#F59E0B", "#FBBF24"];
    if (level >= 2) return ["#F97316", "#FB923C"];
    return ["#10B981", "#34D399"];
  };

  const colors = getSpicyColor();
  const chilis = "🌶️".repeat(Math.min(level, 5));

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {chilis} เผ็ด {level}
      </Text>
    </View>
  );
}

function TagPill({ text, icon }: { text: string; icon?: string }) {
  return (
    <View style={styles.pill}>
      {icon && <Text style={styles.pillIcon}>{icon}</Text>}
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

export default function LocalDishUserListScreen() {
  const navigation = useNavigation<any>();

  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching, refetch, error } =
    useGetAllLocalDishQuery({
      page: 1,
      pageSize: 50,
      search: debouncedSearch,
    });

  const dishes = data?.items ?? [];

  const renderItem = ({ item }: { item: LocalDishType }) => {
    const coverUrl = getCoverUrl(item);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() =>
          navigation.navigate("LocalDishDetailScreen", {
            dishId: item.dishId,
          })
        }
      >
        {/* Cover with Gradient Overlay */}
        <View style={styles.coverWrap}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              resizeMode="cover"
              onError={() => console.log("Dish image load failed:", coverUrl)}
            />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Text style={styles.fallbackIcon}>🍜</Text>
              <Text style={styles.fallbackText}>ไม่มีรูปภาพ</Text>
            </View>
          )}

          {/* Gradient overlay for better readability */}
          <View style={styles.gradientOverlay} />

          <View style={styles.coverOverlay}>
            <SpicyBadge level={(item as any).spicyLevel ?? 0} />
          </View>
        </View>

        {/* Text */}
        <View style={styles.cardBody}>
          <View style={styles.nameSection}>
            <Text style={styles.nameTH} numberOfLines={1}>
              🍽️ {(item as any).nameTH}
            </Text>
            <Text style={styles.nameEN} numberOfLines={1}>
              {(item as any).nameEN}
            </Text>
          </View>

          {(item as any).description && (
            <Text style={styles.description} numberOfLines={2}>
              {(item as any).description}
            </Text>
          )}

          <View style={styles.pillsRow}>
            {(item as any).isHalal ? (
              <TagPill text="ฮาลาล" icon="☪️" />
            ) : null}
            {(item as any).isVegetarian ? (
              <TagPill text="มังสวิรัติ" icon="🥬" />
            ) : null}
            {(item as any).origin ? (
              <TagPill text={(item as any).origin} icon="📍" />
            ) : null}
          </View>
        </View>

        {/* View Details Arrow */}
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>ดูรายละเอียด</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header with gradient background */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🍜</Text>
          <View>
            <Text style={styles.title}>อาหารท้องถิ่นกาญจนบุรี</Text>
            <Text style={styles.subtitle}>
              สำรวจรสชาติดั้งเดิมแห่งกาญจน์ 🌿
            </Text>
          </View>
        </View>

        {/* Search Bar with Icon */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหาอาหารที่คุณสนใจ..."
            placeholderTextColor="#9CA3AF"
            style={styles.search}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results count */}
      {!isLoading && dishes.length > 0 && (
        <View style={styles.resultsBanner}>
          <Text style={styles.resultsText}>
            พบ {dishes.length} รายการ
            {debouncedSearch ? ` สำหรับ "${debouncedSearch}"` : ""}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>กำลังค้นหาเมนูอร่อย...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>โหลดข้อมูลไม่สำเร็จ</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>🔄 ลองใหม่อีกครั้ง</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(x) => String((x as any).dishId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>ไม่พบรายการอาหาร</Text>
              <Text style={styles.emptySubtitle}>
                ลองค้นหาด้วยคำอื่นดูนะคะ
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FEF3C7" },

  headerContainer: {
    backgroundColor: "#FBBF24",
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerEmoji: { fontSize: 40 },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#78350F",
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
  },

  searchWrap: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  searchIcon: { fontSize: 18, marginRight: 8 },

  search: {
    flex: 1,
    paddingVertical: 12,
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },

  clearBtn: {
    padding: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  clearText: { fontSize: 14, color: "#6B7280", fontWeight: "700" },

  resultsBanner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },

  resultsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350F",
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  coverWrap: { position: "relative", height: 180 },

  cover: { width: "100%", height: "100%" },

  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
  },

  fallbackIcon: { fontSize: 48, marginBottom: 8 },

  fallbackText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "700",
  },

  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  coverOverlay: {
    position: "absolute",
    left: 12,
    top: 12,
    flexDirection: "row",
    gap: 8,
  },

  badge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#DC2626",
  },

  cardBody: { padding: 16, gap: 10 },

  nameSection: { gap: 4 },

  nameTH: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },

  nameEN: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    fontStyle: "italic",
  },

  description: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
    lineHeight: 18,
  },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  pillIcon: { fontSize: 12 },

  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFBEB",
    borderTopWidth: 1,
    borderTopColor: "#FEF3C7",
  },

  viewDetailsText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },

  arrow: {
    fontSize: 18,
    fontWeight: "900",
    color: "#D97706",
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

  errorEmoji: { fontSize: 64 },

  errorText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 16,
  },

  retryBtn: {
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

  retryText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },

  emptyEmoji: { fontSize: 72, marginBottom: 16 },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#78350F",
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    textAlign: "center",
  },
});
