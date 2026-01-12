import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetAllPlaceQuery } from "../features/places/placeApi";
import { useDebounce } from "../utils/useDebounce";
import {
  buildUniqueCategories,
  buildUniqueTags,
  filterPlaces,
  getPlaceImageUrl,
} from "../features/places/Components/placeListUtils";

export default function PlaceListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, refetch } = useGetAllPlaceQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const places = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const uniqueCategories = useMemo(
    () => buildUniqueCategories(places),
    [places]
  );

  const uniqueTags = useMemo(() => buildUniqueTags(places), [places]);

  const filteredPlaces = useMemo(
    () => filterPlaces(places, selectedCategory, selectedTag),
    [places, selectedCategory, selectedTag]
  );

  const hasFilters = Boolean(search || selectedCategory || selectedTag);

  const resetAll = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedTag(null);
    setPage(1);
  };

  const goDetails = (placeId: number) => {
    navigation.navigate("PlaceDetails", { placeId });
  };

  const Header = (
    <View style={styles.headerWrap}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <View style={styles.heroIconBadge}>
            <MaterialCommunityIcons name="map-marker-star" size={28} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>สถานที่ท่องเที่ยว</Text>
          <Text style={styles.heroSubtitle}>
            ค้นพบจุดหมายปลายทางที่น่าสนใจ
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#83829A" />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="ค้นหาสถานที่..."
            placeholderTextColor="#C1C0C8"
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
              <Ionicons name="close-circle" size={20} color="#83829A" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#2A4D50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      {uniqueCategories.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Ionicons name="grid" size={16} color="#2A4D50" />
            <Text style={styles.filterTitle}>หมวดหมู่</Text>
          </View>
          <FlatList
            horizontal
            data={uniqueCategories}
            keyExtractor={(x) => x}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => {
              const active = item === selectedCategory;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(active ? null : item);
                    setPage(1);
                  }}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={16}
                    color={active ? "#fff" : "#2A4D50"}
                  />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Tag Filter */}
      {uniqueTags.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Ionicons name="pricetag" size={16} color="#FF7754" />
            <Text style={styles.filterTitle}>แท็ก</Text>
          </View>
          <FlatList
            horizontal
            data={uniqueTags}
            keyExtractor={(x) => x}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => {
              const active = item === selectedTag;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTag(active ? null : item);
                    setPage(1);
                  }}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                >
                  <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                    #{item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Results Bar */}
      <View style={styles.resultsBar}>
        <View style={styles.resultsLeft}>
          <Ionicons name="list" size={16} color="#2A4D50" />
          <Text style={styles.resultsText}>
            {isLoading || isFetching
              ? "กำลังโหลด..."
              : `พบ ${filteredPlaces.length} สถานที่`}
          </Text>
        </View>

        {hasFilters && (
          <TouchableOpacity onPress={resetAll} style={styles.clearAllBtn}>
            <Ionicons name="close-circle-outline" size={16} color="#cc3300" />
            <Text style={styles.clearAllText}>ล้างตัวกรอง</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading */}
      {(isLoading || isFetching) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2A4D50" />
        </View>
      )}
    </View>
  );

  const Empty = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="search-outline" size={64} color="#C1C0C8" />
      </View>
      <Text style={styles.emptyTitle}>ไม่พบสถานที่</Text>
      <Text style={styles.emptyDesc}>
        {hasFilters
          ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองที่ใช้"
          : "ไม่มีข้อมูลสถานที่ในขณะนี้"}
      </Text>
      {hasFilters && (
        <TouchableOpacity onPress={resetAll} style={styles.emptyBtn}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>ล้างตัวกรอง</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item: any) => String(item.placeId)}
          numColumns={2}
          ListHeaderComponent={Header}
          ListEmptyComponent={!isLoading && !isFetching ? Empty : null}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => {
            const imageUrl = getPlaceImageUrl(item);

            return (
              <TouchableOpacity
                style={styles.placeCard}
                activeOpacity={0.8}
                onPress={() => goDetails(item.placeId)}
              >
                {/* Image */}
                <View style={styles.placeImageContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.placeImage}
                    resizeMode="cover"
                  />
                  <View style={styles.placeImageOverlay} />

                  {/* Category Badge */}
                  {!!item.categoryName && (
                    <View style={styles.categoryBadge}>
                      <Ionicons name="pricetag" size={12} color="#2A4D50" />
                      <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
                    </View>
                  )}

                  {/* Favorite Icon */}
                  <View style={styles.favoriteBtn}>
                    <Ionicons name="heart-outline" size={18} color="#fff" />
                  </View>
                </View>

                {/* Content */}
                <View style={styles.placeContent}>
                  <Text style={styles.placeName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text style={styles.placeDesc} numberOfLines={2}>
                    {item.description || "ไม่มีรายละเอียด"}
                  </Text>

                  {/* Footer */}
                  <View style={styles.placeFooter}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color="#FF7754" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.locationName || item.district || "ไม่ระบุตำแหน่ง"}
                      </Text>
                    </View>

                    <View style={styles.arrowBtn}>
                      <Ionicons name="chevron-forward" size={16} color="#2A4D50" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={20} color={page <= 1 ? "#C1C0C8" : "#fff"} />
            </TouchableOpacity>

            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>
                {page} <Text style={styles.pageSeparator}>of</Text> {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            >
              <Ionicons name="chevron-forward" size={20} color={page >= totalPages ? "#C1C0C8" : "#fff"} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  page: {
    flex: 1,
  },

  // Header
  headerWrap: {
    paddingBottom: 16,
  },

  // Hero Section
  heroSection: {
    backgroundColor: "#2A4D50",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    alignItems: "center",
  },
  heroIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
  },
  clearSearchBtn: {
    padding: 4,
  },
  refreshBtn: {
    padding: 4,
  },

  // Filter Section
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  chipList: {
    gap: 8,
  },

  // Category Chips
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  categoryChipActive: {
    backgroundColor: "#2A4D50",
    borderColor: "#2A4D50",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A4D50",
  },
  categoryChipTextActive: {
    color: "#fff",
  },

  // Tag Chips
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF5F2",
    borderWidth: 2,
    borderColor: "#FECACA",
  },
  tagChipActive: {
    backgroundColor: "#FF7754",
    borderColor: "#FF7754",
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF7754",
  },
  tagChipTextActive: {
    color: "#fff",
  },

  // Results Bar
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#cc3300",
  },

  // Loading
  loadingContainer: {
    paddingVertical: 10,
    alignItems: "center",
  },

  // List
  columnWrapper: {
    gap: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },

  // Place Card
  placeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  placeImageContainer: {
    height: 140,
    backgroundColor: "#f3f4f6",
    position: "relative",
  },
  placeImage: {
    width: "100%",
    height: "100%",
  },
  placeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2A4D50",
  },
  favoriteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Place Content
  placeContent: {
    padding: 14,
    gap: 8,
  },
  placeName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    lineHeight: 20,
  },
  placeDesc: {
    fontSize: 12,
    color: "#83829A",
    lineHeight: 16,
    minHeight: 32,
  },
  placeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },
  emptyDesc: {
    fontSize: 14,
    color: "#83829A",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A4D50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2A4D50",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: {
    backgroundColor: "#F3F4F8",
  },
  pageIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F8",
  },
  pageText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  pageSeparator: {
    fontSize: 13,
    fontWeight: "600",
    color: "#83829A",
  },
});
