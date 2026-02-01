import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

// ✅ hooks เดิมของคุณ
import { useGetAllLocalDishQuery } from "../../localDish/LocalDishApi";
import type { LocalDishType } from "../../localDish/LocalDishType";

import {
  useGetDishesByPlaceIdQuery,
  useUpsertDishToPlaceMutation,
  useDeleteDishFromPlaceMutation,
} from "../placeApi";
import type { DishForPlaceDto } from "../placeTypes";

// -------------------- small utils --------------------
function useDebounce<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const toast = (msg: string) => {
  if (Platform.OS === "android") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
};

type RouteParams = {
  placeId: number;
  placeName?: string;
};

type DisplayDish = {
  id: number;
  nameTH: string;
  nameEN?: string | null;
  isLinked: boolean;
  imageUrl?: string | null;
};

type TabType = "my-menu" | "all-dishes";

type DishRowProps = {
  item: DisplayDish;
  activeTab: TabType;

  enabled: boolean;
  price: string;

  onToggleEnabled: (v: boolean) => void;
  onChangePrice: (digitsOnly: string) => void;

  onSave: () => void;
  onRemove: () => void;

  saving: boolean;
  deleting: boolean;

  // ถ้าคุณอยากให้แก้ราคาได้เฉพาะเมนูที่อยู่ในร้านแล้ว:
  // set to true to force only linked items are editable
  onlyEditableWhenLinked?: boolean;
};

const DishRow = React.memo(function DishRow({
  item,
  activeTab,
  enabled,
  price,
  onToggleEnabled,
  onChangePrice,
  onSave,
  onRemove,
  saving,
  deleting,
  onlyEditableWhenLinked = false,
}: DishRowProps) {
  const inputRef = React.useRef<TextInput | null>(null);

  const isOnMyMenu = item.isLinked;
  const isHighlight = activeTab === "all-dishes" && isOnMyMenu;

  const editable = onlyEditableWhenLinked ? isOnMyMenu : true;

  return (
    <View style={[styles.row, isHighlight && styles.rowHighlight]}>
      {/* Name */}
      <View style={styles.nameCol}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.nameTH} numberOfLines={1}>
            {item.nameTH}
          </Text>
          {isHighlight && (
            <View style={styles.badgeHave}>
              <Text style={styles.badgeHaveText}>มีแล้ว</Text>
            </View>
          )}
        </View>
        <Text style={styles.nameEN} numberOfLines={1}>
          {item.nameEN || "-"}
        </Text>
      </View>

      {/* Status + Price */}
      <View style={styles.controlsCol}>
        <View style={styles.controlLine}>
          <Text style={styles.smallLabel}>
            {enabled ? "พร้อมขาย" : "หมดชั่วคราว"}
          </Text>
          <Switch
            value={enabled}
            onValueChange={onToggleEnabled}
            disabled={!editable}
          />
        </View>

        <View style={styles.controlLine}>
          <Text style={styles.smallLabel}>ราคา</Text>

          {/* ✅ แตะตรงไหนในกรอบก็ focus ได้ */}
          <Pressable
            onPress={() => {
              if (!editable) return;
              inputRef.current?.focus();
            }}
            style={[styles.priceWrap, !editable && { opacity: 0.55 }]}
          >
            <TextInput
              ref={inputRef}
              value={price}
              onChangeText={(t) => {
                // ✅ digits only, เสถียรกว่า [^0-9] กับบาง IME
                const digits = (t ?? "").replace(/\D/g, "");
                onChangePrice(digits);
              }}
              placeholder="0"
              keyboardType={
                Platform.OS === "android" ? "numeric" : "number-pad"
              }
              // inputMode="numeric" // ← บาง RN/Android ทำงานเพี้ยน ลองปิดไว้
              editable={editable}
              style={styles.priceInput}
              // กันบางกรณี tap แล้ว blur เอง
              blurOnSubmit={false}
            />
            <Text style={styles.baht}>฿</Text>
          </Pressable>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsCol}>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[
            styles.btnSmall,
            isOnMyMenu ? styles.btnOutline : styles.btnPrimary,
            saving && styles.btnDisabled,
          ]}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnSmallText,
              isOnMyMenu ? styles.btnOutlineText : styles.btnPrimaryText,
            ]}
          >
            {isOnMyMenu ? "บันทึก" : "เพิ่มเมนู"}
          </Text>
        </TouchableOpacity>

        {isOnMyMenu && (
          <TouchableOpacity
            onPress={onRemove}
            disabled={deleting}
            style={[
              styles.btnSmall,
              styles.btnDanger,
              deleting && styles.btnDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.btnDangerText}>ลบ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default function PlaceMenuManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const pid = Number((route.params as RouteParams)?.placeId);
  const placeName = (route.params as RouteParams)?.placeName;

  const [activeTab, setActiveTab] = useState<TabType>("my-menu");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  // 1) Fetch ALL dishes (for adding new ones)
  const { data: allDishPaged, isLoading: allDishLoading } =
    useGetAllLocalDishQuery(
      { page: 1, pageSize: 200, search: debouncedSearch },
      { skip: !Number.isFinite(pid) || pid <= 0 || activeTab !== "all-dishes" },
    );

  const allDishes: LocalDishType[] = allDishPaged?.items ?? [];

  // 2) Fetch CURRENT shop dishes
  const {
    data: placeDishes,
    isLoading: placeDishLoading,
    refetch,
  } = useGetDishesByPlaceIdQuery(pid, {
    skip: !Number.isFinite(pid) || pid <= 0,
  });

  // Map for quick lookup
  const placeDishMap = useMemo(() => {
    const m = new Map<number, DishForPlaceDto>();
    (placeDishes ?? []).forEach((d) => m.set(d.dishId, d));
    return m;
  }, [placeDishes]);

  // Local state for edits
  const [priceByDishId, setPriceByDishId] = useState<Record<number, string>>(
    {},
  );
  const [enabledByDishId, setEnabledByDishId] = useState<
    Record<number, boolean>
  >({});

  // Sync state when placeDishes loads
  useEffect(() => {
    const p: Record<number, string> = {};
    const e: Record<number, boolean> = {};

    (placeDishes ?? []).forEach((d) => {
      p[d.dishId] = d.price != null ? String(d.price) : "";
      e[d.dishId] = d.isAvailable ?? true;
    });

    setPriceByDishId((prev) => ({ ...prev, ...p }));
    setEnabledByDishId((prev) => ({ ...prev, ...e }));
  }, [placeDishes]);

  const [upsertDishToPlace, { isLoading: saving }] =
    useUpsertDishToPlaceMutation();
  const [deleteDishFromPlace, { isLoading: deleting }] =
    useDeleteDishFromPlaceMutation();

  const isLoading =
    activeTab === "all-dishes" ? allDishLoading : placeDishLoading;

  const displayedDishes: DisplayDish[] = useMemo(() => {
    // my-menu
    if (activeTab === "my-menu") {
      let list = placeDishes ?? [];

      // 1) Filter by Search
      const s = debouncedSearch.trim().toLowerCase();
      if (s) {
        list = list.filter(
          (d) =>
            d.nameTH?.toLowerCase().includes(s) ||
            (d.nameEN ? d.nameEN.toLowerCase().includes(s) : false),
        );
      }

      // 2) Filter by Status (Admin feature)
      if (statusFilter !== "all") {
        list = list.filter((d) => {
          // Check local state first, fallback to prop
          const isAvail = enabledByDishId[d.dishId] ?? d.isAvailable ?? true;
          return statusFilter === "available" ? isAvail : !isAvail;
        });
      }

      return list.map((d) => ({
        id: d.dishId,
        nameTH: d.nameTH,
        nameEN: d.nameEN,
        isLinked: true,
        imageUrl: d.coverImageUrl,
      }));
    }

    // all-dishes
    // all-dishes (เอาเฉพาะที่ยังไม่อยู่ในร้าน)
    return (allDishes ?? [])
      .filter((d) => !placeDishMap.has(d.dishId!)) // ✅ ตัดเมนูที่มีแล้วออก
      .map((d) => {
        const cover =
          d.images?.find((i: any) => i.isCover)?.imageUrl ||
          d.images?.[0]?.imageUrl;

        return {
          id: d.dishId!,
          nameTH: d.nameTH,
          nameEN: d.nameEN,
          isLinked: false, // ✅ ในแท็บนี้เหลือแต่ของที่ยังไม่ลิงก์อยู่แล้ว
          imageUrl: cover,
        };
      });
  }, [
    activeTab,
    placeDishes,
    debouncedSearch,
    allDishes,
    placeDishMap,
    statusFilter,
    enabledByDishId,
  ]);

  if (!Number.isFinite(pid) || pid <= 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>ไม่พบรหัสสถานที่ (Place ID)</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>ย้อนกลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async (dishId: number) => {
    const enabled = enabledByDishId[dishId] ?? true;
    const priceStr = priceByDishId[dishId] ?? "";
    const price = priceStr.trim() === "" ? null : Number(priceStr);

    if (price != null && !Number.isFinite(price)) {
      toast("ราคาต้องเป็นตัวเลข");
      return;
    }

    try {
      await upsertDishToPlace({
        placeId: pid,
        body: { dishId, price, isAvailable: enabled },
      }).unwrap();

      toast("บันทึกข้อมูลเรียบร้อย");
      refetch();
    } catch (err) {
      console.error(err);
      toast("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleRemove = async (dishId: number) => {
    Alert.alert("ยืนยันการลบ", "ต้องการลบเมนูนี้ออกจากร้านใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDishFromPlace({ placeId: pid, dishId }).unwrap();
            toast("ลบเมนูเรียบร้อย");
            refetch();
          } catch (err) {
            console.error(err);
            toast("ไม่สามารถลบได้");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.h1} numberOfLines={1}>
              {placeName ? `จัดการเมนู: ${placeName}` : "จัดการเมนูอาหาร"}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              เพิ่ม/ลบเมนู และกำหนดราคา
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab("my-menu")}
            style={[
              styles.tab,
              activeTab === "my-menu" && styles.tabActiveOrange,
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "my-menu" && styles.tabTextActive,
              ]}
            >
              เมนูของฉัน ({placeDishes?.length ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("all-dishes")}
            style={[
              styles.tab,
              activeTab === "all-dishes" && styles.tabActiveBlue,
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "all-dishes" && styles.tabTextActive,
              ]}
            >
              เมนูทั้งหมดในระบบ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchBar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === "my-menu" ? "ค้นหาในร้าน..." : "ค้นหาเมนูทั้งหมด..."
            }
            style={styles.searchInput}
          />

          {activeTab === "my-menu" && (
            <View style={styles.filterRow}>
              {(["all", "available", "unavailable"] as const).map((st) => {
                const active = statusFilter === st;
                let label = "ทั้งหมด";
                let bgStyle = styles.chipGray;
                let textStyle = {};

                if (st === "available") {
                  label = "พร้อมขาย";
                  if (active) bgStyle = styles.chipGreen;
                  if (active) textStyle = { color: "#065F46" };
                } else if (st === "unavailable") {
                  label = "หมดชั่วคราว";
                  if (active) bgStyle = styles.chipRed;
                  if (active) textStyle = { color: "#991B1B" };
                } else {
                  // all
                  if (active) textStyle = { color: "#1F2937" };
                }

                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setStatusFilter(st)}
                    style={[styles.chip, active && bgStyle]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                        textStyle,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === "all-dishes" && (
            <View style={styles.tip}>
              <Text style={styles.tipText}>
                💡 แสดงเฉพาะเมนูที่ “ยังไม่ได้เพิ่มเข้าร้าน”
              </Text>
            </View>
          )}
        </View>

        {/* List */}
        <View style={styles.listWrap}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.muted}>กำลังโหลด...</Text>
            </View>
          ) : displayedDishes.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>ไม่พบรายการเมนู</Text>
            </View>
          ) : (
            <FlatList
              data={displayedDishes}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item }) => (
                <DishRow
                  item={item}
                  activeTab={activeTab}
                  enabled={enabledByDishId[item.id] ?? true}
                  price={priceByDishId[item.id] ?? ""}
                  onToggleEnabled={(v) =>
                    setEnabledByDishId((prev) => ({ ...prev, [item.id]: v }))
                  }
                  onChangePrice={(digitsOnly) =>
                    setPriceByDishId((prev) => ({
                      ...prev,
                      [item.id]: digitsOnly,
                    }))
                  }
                  onSave={() => handleSave(item.id)}
                  onRemove={() => handleRemove(item.id)}
                  saving={saving}
                  deleting={deleting}
                  // ถ้าอยากให้แก้ได้เฉพาะเมนูที่ link แล้ว ให้เปลี่ยนเป็น true
                  onlyEditableWhenLinked={false}
                />
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              // ✅ ช่วยให้ FlatList รู้ว่าต้อง rerender row เมื่อ state เปลี่ยน
              extraData={{
                priceByDishId,
                enabledByDishId,
                saving,
                deleting,
                activeTab,
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -------------------- styles --------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, fontWeight: "900", color: "#111827" },
  h1: { fontSize: 16, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "600" },

  tabs: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  tabActiveOrange: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tabActiveBlue: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tabText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  tabTextActive: { color: "#111827" },

  searchBar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  tip: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    padding: 10,
  },
  tipText: { fontSize: 12, color: "#1D4ED8", fontWeight: "700" },

  listWrap: { flex: 1, padding: 12 },

  row: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  rowHighlight: {
    backgroundColor: "rgba(16,185,129,0.06)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  sep: { height: 10 },

  nameCol: { gap: 4 },
  nameTH: { fontSize: 15, fontWeight: "900", color: "#111827" },
  nameEN: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  badgeHave: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.35)",
  },
  badgeHaveText: { fontSize: 10, fontWeight: "900", color: "#047857" },

  controlsCol: {
    gap: 10,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  controlLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallLabel: { fontSize: 12, color: "#374151", fontWeight: "800" },

  priceWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
    minWidth: 120,
  },
  priceInput: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" },
  baht: { fontSize: 12, color: "#9CA3AF", fontWeight: "900" },

  actionsCol: { flexDirection: "row", gap: 10 },
  btnSmall: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSmallText: { fontSize: 13, fontWeight: "900" },

  btnPrimary: { backgroundColor: "#EA580C" },
  btnPrimaryText: { color: "#fff" },

  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnOutlineText: { color: "#111827" },

  btnDanger: { backgroundColor: "#DC2626" },
  btnDangerText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  btnDisabled: { opacity: 0.6 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  muted: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  errTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "900" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipGray: {
    backgroundColor: "#E5E7EB",
    borderColor: "#D1D5DB",
  },
  chipGreen: {
    backgroundColor: "#D1FAE5",
    borderColor: "#A7F3D0",
  },
  chipRed: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  chipTextActive: {
    fontWeight: "800",
  },
});
