import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Image } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGetProfileQuery } from "../authApi";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, SHADOWS } from "../../../common/theme";
import { Ionicons } from "@expo/vector-icons";

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const { userId } = route.params;

  const { data, isLoading, error } = useGetProfileQuery({
    userid: userId,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>โหลดโปรไฟล์ไม่สำเร็จ</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card with Avatar */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            {data.avatarUrl ? (
              <Image source={{ uri: data.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{data.displayName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{data.roleName}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>อีเมล</Text>
                <Text style={styles.infoValue}>{data.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
                <Text style={styles.infoValue}>
                  {data.phoneNumber || "ไม่ระบุ"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="id-card-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>รหัสผู้ใช้</Text>
                <Text style={styles.infoValue}>#{data.userId}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Section - สำหรับอนาคต */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สถิติการใช้งาน</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>ทริปทั้งหมด</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={24} color={COLORS.tertiary} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>สถานที่ที่เยี่ยม</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="heart-outline" size={24} color={COLORS.red} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>รายการโปรด</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offwhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.offwhite,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.offwhite,
    padding: SIZES.large,
  },
  errorText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.large,
    color: COLORS.danger,
    fontWeight: "600",
  },
  headerCard: {
    backgroundColor: COLORS.white,
    padding: SIZES.xLarge,
    alignItems: "center",
    ...SHADOWS.medium,
    marginBottom: SIZES.medium,
  },
  avatarContainer: {
    marginBottom: SIZES.medium,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  displayName: {
    fontSize: SIZES.xLarge,
    fontWeight: "bold",
    color: COLORS.primary2,
    marginBottom: SIZES.small,
  },
  roleBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.xSmall / 2,
    borderRadius: 20,
  },
  roleText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: SIZES.medium,
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: "bold",
    color: COLORS.primary2,
    marginBottom: SIZES.medium,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.medium,
    ...SHADOWS.small,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.small,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.offwhite,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: SIZES.medium,
    color: COLORS.primary2,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.offwhite,
    marginVertical: SIZES.xSmall,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.medium,
    alignItems: "center",
    marginHorizontal: 4,
    ...SHADOWS.small,
  },
  statValue: {
    fontSize: SIZES.xLarge,
    fontWeight: "bold",
    color: COLORS.primary2,
    marginTop: SIZES.xSmall,
  },
  statLabel: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 4,
  },
});
