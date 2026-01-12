// AdminScreen.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

type AdminAction = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
};

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const actions: AdminAction[] = useMemo(
    () => [
      {
        id: "users",
        title: "จัดการผู้ใช้",
        subtitle: "ดู/แก้ไข/ระงับผู้ใช้",
        icon: "👤",
        onPress: () => navigation.navigate("UserListScreen"),
      },
      {
        id: "roles",
        title: "สิทธิ์ & บทบาท",
        subtitle: "กำหนดสิทธิ์การเข้าถึง",
        icon: "🛡️",
        onPress: () => navigation.navigate("RoleListScreen"),
      },
      {
        id: "places",
        title: "จัดการสถานที่",
        subtitle: "เพิ่ม/แก้ไข/ลบ สถานที่",
        icon: "🏞",
        onPress: () => navigation.navigate("PlaceListAdminScreen"),
      },
      {
        id: "local-dist",
        title: "อาหารท้องถิ่น",
        subtitle: "จัดการข้อมูลอาหารท้องถิ่น",
        icon: "📍",
        onPress: () => navigation.navigate("LocalDishListScreen"),
      },
      {
        id: "place-tags",
        title: "แท็กสถานที่",
        subtitle: "จัดการแท็กสถานที่",
        icon: "📍",
        onPress: () => navigation.navigate("PlaceTagListScreen"),
      },
      {
        id: "place-categories",
        title: "หมวดหมู่สถานที่",
        subtitle: "จัดการหมวดหมู่สถานที่",
        icon: "🗂",
        onPress: () => navigation.navigate("PlaceCategoryListScreen"),
      },
      {
        id: "recommendations",
        title: "การแนะนำสถานที่",
        subtitle: "จัดการระบบแนะนำสถานที่",
        icon: "🤖",
        onPress: () => navigation.navigate("RecommendAdminScreen"),
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Admin</Text>
            <Text style={styles.subtitle}>แผงควบคุมผู้ดูแลระบบ</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>DEV</Text>
          </View>
        </View>

        {/* Quick stats (placeholder) */}
        {/* <View style={styles.statsRow}>
          <StatCard label="ผู้ใช้" value="—" />
          <StatCard label="ออเดอร์" value="—" />
          <StatCard label="รายงาน" value="—" />
        </View> */}

        {/* Actions grid */}
        <Text style={styles.sectionTitle}>เมนูการจัดการ</Text>
        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable
              key={a.id}
              onPress={a.onPress}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.cardIcon}>{a.icon ?? "🔧"}</Text>
              <Text style={styles.cardTitle}>{a.title}</Text>
              {!!a.subtitle && (
                <Text style={styles.cardSubtitle}>{a.subtitle}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Footer actions (placeholder) */}
        <Text style={styles.sectionTitle}>การทำงานด่วน</Text>
        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>สร้างประกาศ</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.secondaryBtnText}>ดู Logs</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />
        <Text style={styles.hint}>
          * หน้านี้เป็นโครง UI ยังไม่ผูกข้อมูล/ยังไม่เชื่อม API
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    paddingTop: Platform.OS === "android" ? 6 : 0,
  },
  container: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  badge: {
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    marginTop: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48.6%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 120,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },

  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
  },
  btnPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },

  spacer: { height: 14 },
  hint: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
});
