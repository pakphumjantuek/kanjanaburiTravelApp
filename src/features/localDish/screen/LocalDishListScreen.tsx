import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { useDebounce } from "../../../utils/useDebounce";
import { useDeleteLocalDishMutation, useGetAllLocalDishQuery } from "../LocalDishApi";
import type { LocalDishType } from "../LocalDishType";
import { BASE_URL } from "../../../config/env";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

function toAbsoluteUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return joinUrl(BASE_URL, path);
}

function LocalDishListItem({
  item,
  onEdit,
  onDelete,
  onView,
  deleting,
  index,
}: {
  item: LocalDishType;
  onEdit: (dish: LocalDishType) => void;
  onDelete: (dish: LocalDishType) => void;
  onView: (dish: LocalDishType) => void;
  deleting: boolean;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const images: any[] = item.images ?? [];
  const cover = images.find((x) => x.isCover) ?? images[0];
  const coverUrl = toAbsoluteUrl(cover?.imageUrl);

  const spicyDisplay = "🌶️".repeat(Math.min(item.spicyLevel ?? 0, 5));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.cardTouchable} 
        activeOpacity={0.95}
        onPress={() => onView(item)}
      >
        {/* Image Section */}
        <View style={styles.cardImageWrap}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImageFallback]}>
              <Text style={styles.fallbackEmoji}>🍜</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={styles.cardImageGradient}
          />
          
          {/* Badges */}
          <View style={styles.badgesRow}>
            {item.isHalal && (
              <View style={[styles.badge, styles.badgeHalal]}>
                <Text style={styles.badgeText}>☪️ ฮาลาล</Text>
              </View>
            )}
            {item.isVegetarian && (
              <View style={[styles.badge, styles.badgeVegan]}>
                <Text style={styles.badgeText}>🥬 มังสวิรัติ</Text>
              </View>
            )}
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: item.isActive ? "#10B981" : "#EF4444" }]} />
            <Text style={styles.statusText}>{item.isActive ? "พร้อมบริการ" : "ปิดบริการ"}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.nameTH}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{item.nameEN}</Text>
            </View>
          </View>

          {/* Info Row */}
          <View style={styles.cardInfoRow}>
            {item.origin && (
              <View style={styles.infoChip}>
                <Text style={styles.infoChipIcon}>📍</Text>
                <Text style={styles.infoChipText}>{item.origin}</Text>
              </View>
            )}
            {(item.spicyLevel ?? 0) > 0 && (
              <View style={styles.infoChip}>
                <Text style={styles.infoChipText}>{spicyDisplay}</Text>
              </View>
            )}
          </View>

          {/* Description Preview */}
          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {/* Action Buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => onView(item)}
            >
              <Text style={styles.actionIcon}>👁️</Text>
              <Text style={styles.actionText}>ดูรายละเอียด</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnWarning]} 
              onPress={() => onEdit(item)}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={[styles.actionText, styles.actionTextWarning]}>แก้ไข</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnDanger]} 
              onPress={() => onDelete(item)}
              disabled={deleting}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionText, styles.actionTextDanger]}>ลบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchBar({ 
  value, 
  onChangeText, 
  placeholder 
}: { 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PageSizeSelector({ 
  value, 
  onChange, 
  options 
}: { 
  value: number; 
  onChange: (size: number) => void;
  options: number[];
}) {
  return (
    <View style={styles.pageSizeWrap}>
      <Text style={styles.pageSizeLabel}>แสดง:</Text>
      <View style={styles.pageSizeOptions}>
        {options.map((size) => (
          <TouchableOpacity
            key={size}
            style={[styles.pageSizeBtn, value === size && styles.pageSizeBtnActive]}
            onPress={() => onChange(size)}
          >
            <Text style={[styles.pageSizeBtnText, value === size && styles.pageSizeBtnTextActive]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function LocalDishListScreen() {
  const navigation = useNavigation<any>();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllLocalDishQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [deleteLocalDish, { isLoading: isDeleting }] = useDeleteLocalDishMutation();

  const dishes = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const onAdd = () => navigation.navigate("LocalDishFormScreen", { mode: "add" });

  const onView = (dish: LocalDishType) => {
    navigation.navigate("LocalDishDetailScreen", { dishId: dish.dishId });
  };

  const onEdit = (dish: LocalDishType) => {
    navigation.navigate("LocalDishFormScreen", { mode: "edit", dish, dishId: dish.dishId });
  };

  const onDelete = (dish: LocalDishType) => {
    Alert.alert(
      "🗑️ ยืนยันการลบ", 
      `ต้องการลบ "${dish.nameTH}" ใช่ไหม?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`, 
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              if (!dish.dishId) return;
              await deleteLocalDish(dish.dishId).unwrap();
              Alert.alert("✅ สำเร็จ", "ลบข้อมูลสำเร็จ!");
              refetch();
            } catch {
              Alert.alert("❌ ผิดพลาด", "ลบข้อมูลไม่สำเร็จ");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={["#FF6B35", "#F7931E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerEmoji}>🍜</Text>
            <View>
              <Text style={styles.headerTitle}>อาหารท้องถิ่น</Text>
              <Text style={styles.headerSubtitle}>จัดการเมนูอาหารท้องถิ่นกาญจนบุรี</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>รายการทั้งหมด</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{dishes.filter(d => d.isActive).length}</Text>
            <Text style={styles.statLabel}>พร้อมบริการ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{page}/{totalPages || 1}</Text>
            <Text style={styles.statLabel}>หน้าปัจจุบัน</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search & Filter */}
      <View style={styles.controlsSection}>
        <SearchBar 
          value={search} 
          onChangeText={setSearch} 
          placeholder="ค้นหาอาหารท้องถิ่น..." 
        />
        
        <View style={styles.filterRow}>
          <PageSizeSelector 
            value={pageSize} 
            onChange={setPageSize} 
            options={[10, 20, 50]} 
          />
          
          <TouchableOpacity 
            style={styles.refreshBtn} 
            onPress={refetch}
            disabled={isFetching}
          >
            <Text style={styles.refreshIcon}>{isFetching ? "⏳" : "🔄"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : dishes.length === 0 ? (
        <EmptyState search={search} onAdd={onAdd} />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(d) => String(d.dishId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item, index }) => (
            <LocalDishListItem 
              item={item} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onView={onView}
              deleting={isDeleting} 
              index={index}
            />
          )}
        />
      )}

      {/* Pagination */}
      {!isLoading && !error && dishes.length > 0 && (
        <View style={styles.paginationBar}>
          <TouchableOpacity 
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>← ก่อนหน้า</Text>
          </TouchableOpacity>
          
          <View style={styles.pageInfo}>
            <Text style={styles.pageInfoText}>
              หน้า <Text style={styles.pageInfoNumber}>{page}</Text> จาก <Text style={styles.pageInfoNumber}>{totalPages || 1}</Text>
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.pageBtn, styles.pageBtnNext, page >= totalPages && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <Text style={[styles.pageBtnText, styles.pageBtnTextNext, page >= totalPages && styles.pageBtnTextDisabled]}>ถัดไป →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function LoadingState() {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
      <Text style={styles.stateTitle}>กำลังโหลดข้อมูล</Text>
      <Text style={styles.stateSubtitle}>รอสักครู่นะคะ... 🍜</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.errorIconWrap}>
        <Text style={styles.stateEmoji}>😕</Text>
      </View>
      <Text style={styles.stateTitle}>เกิดข้อผิดพลาด</Text>
      <Text style={styles.stateSubtitle}>ไม่สามารถโหลดข้อมูลได้</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>🔄 ลองใหม่อีกครั้ง</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ search, onAdd }: { search: string; onAdd: () => void }) {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.stateEmoji}>🍽️</Text>
      </View>
      {search ? (
        <>
          <Text style={styles.stateTitle}>ไม่พบผลการค้นหา</Text>
          <Text style={styles.stateSubtitle}>ลองค้นหาด้วยคำอื่น หรือเพิ่มรายการใหม่</Text>
        </>
      ) : (
        <>
          <Text style={styles.stateTitle}>ยังไม่มีอาหารท้องถิ่น</Text>
          <Text style={styles.stateSubtitle}>เริ่มต้นเพิ่มอาหารท้องถิ่นกันเลย!</Text>
        </>
      )}
      <TouchableOpacity style={styles.addEmptyBtn} onPress={onAdd}>
        <Text style={styles.addEmptyBtnText}>+ เพิ่มอาหารท้องถิ่น</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },

  // Header
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerEmoji: {
    fontSize: 40,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
  },

  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  addBtnIcon: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FF6B35",
  },

  addBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35",
  },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 4,
  },

  // Controls
  controlsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  searchContainer: {
    marginBottom: 12,
  },

  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 12,
  },

  clearBtn: {
    padding: 8,
  },

  clearIcon: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "800",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pageSizeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  pageSizeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  pageSizeOptions: {
    flexDirection: "row",
    gap: 6,
  },

  pageSizeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  pageSizeBtnActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },

  pageSizeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  pageSizeBtnTextActive: {
    color: "white",
  },

  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  refreshIcon: {
    fontSize: 20,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },

  // Card
  card: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },

  cardTouchable: {
    flex: 1,
  },

  cardImageWrap: {
    position: "relative",
    height: 160,
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  cardImageFallback: {
    backgroundColor: "#FFF1EB",
    alignItems: "center",
    justifyContent: "center",
  },

  fallbackEmoji: {
    fontSize: 48,
  },

  cardImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },

  badgesRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  badgeHalal: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
  },

  badgeVegan: {
    backgroundColor: "rgba(34, 197, 94, 0.9)",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "white",
  },

  statusBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  statusInactive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },

  cardContent: {
    padding: 16,
  },

  cardHeader: {
    marginBottom: 10,
  },

  cardTitleWrap: {
    gap: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  cardSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  cardInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  infoChipIcon: {
    fontSize: 12,
  },

  infoChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  cardDesc: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },

  actionBtnWarning: {
    backgroundColor: "#FEF3C7",
  },

  actionBtnDanger: {
    backgroundColor: "#FEE2E2",
  },

  actionIcon: {
    fontSize: 14,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },

  actionTextWarning: {
    color: "#D97706",
  },

  actionTextDanger: {
    color: "#DC2626",
  },

  // Pagination
  paginationBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },

  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },

  pageBtnNext: {
    backgroundColor: "#FF6B35",
  },

  pageBtnDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.5,
  },

  pageBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },

  pageBtnTextNext: {
    color: "white",
  },

  pageBtnTextDisabled: {
    color: "#9CA3AF",
  },

  pageInfo: {
    alignItems: "center",
  },

  pageInfoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  pageInfoNumber: {
    fontWeight: "900",
    color: "#FF6B35",
  },

  // States
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
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

  errorIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF1EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  stateEmoji: {
    fontSize: 48,
  },

  stateTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  stateSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 8,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },

  retryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
  },

  addEmptyBtn: {
    marginTop: 8,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },

  addEmptyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
  },
});
