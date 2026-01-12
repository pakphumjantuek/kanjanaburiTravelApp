import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootState } from "../redux/store";
import { persistClearAuth } from "../features/auth/authSlice";
import { COLORS, FONTS, SHADOWS, SIZES } from "../common";
import { useGetProfileQuery } from "../features/auth/authApi";
import { RootStackParamList } from "../navigates/typeRootStack";
import { BASE_URL } from "../config/env";
import { authApi } from "../features/auth/authApi";


export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  
  const {
    data: profile,
    error,
    refetch,
  } = useGetProfileQuery(undefined, { skip: !accessToken });
  
  const onLogout = () => {
    Alert.alert(
      "ออกจากระบบ",
      "คุณแน่ใจว่าต้องการออกจากระบบ?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ออกจากระบบ",
          style: "destructive",
          onPress: () => {
            dispatch(persistClearAuth() as any);
            dispatch(authApi.util.resetApiState());
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ✅ ยังไม่ login (ไม่มี token)
  if (!accessToken) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="lock-closed" size={56} color={COLORS.primary} />
        </View>
        <Text style={[styles.title, { marginTop: SIZES.large }]}>
          กรุณาเข้าสู่ระบบ
        </Text>
        <Text style={styles.description}>
          เข้าสู่ระบบเพื่อเข้าถึงข้อมูลโปรไฟล์และฟีเจอร์ทั้งหมด
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in" size={20} color={COLORS.white} />
          <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate("Register")}
          activeOpacity={0.8}
        >
          <Text style={styles.registerBtnText}>สร้างบัญชีใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ มี token แต่โหลด profile ไม่ได้
  if (!profile) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle" size={56} color="#e74c3c" />
        </View>
        <Text style={[styles.title, { marginTop: SIZES.large }]}>
          เกิดข้อผิดพลาด
        </Text>
        <Text style={styles.description}>
          {typeof (error as any)?.data === "string"
            ? (error as any).data
            : (error as any)?.data?.errorMessages?.[0] ??
              "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง"}
        </Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={COLORS.white} />
          <Text style={styles.retryBtnText}>ลองอีกครั้ง</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarUri = profile.avatarUrl?.startsWith("http")
    ? profile.avatarUrl
    : `${BASE_URL}${profile.avatarUrl}`;

  // ✅ แสดงผลจาก profile จริง
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Modern Header with Gradient */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGradient} />
        <View style={styles.headerDecoration}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />
        </View>
      </View>

      {/* Avatar Section with Modern Design */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {profile.avatarUrl ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(
                  profile.displayName?.[0] ??
                  profile.email?.[0] ??
                  "U"
                ).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarRing} />
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#10b981" />
          </View>
        </View>
      </View>

      {/* Profile Info with Modern Typography */}
      <View style={styles.profileHeader}>
        <Text style={styles.name}>{profile.displayName}</Text>
        <View style={styles.emailContainer}>
          <Ionicons name="mail" size={14} color={COLORS.gray} />
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        {/* Modern Role Badge */}
        <View style={styles.roleBadge}>
          <View style={styles.roleBadgeGlow} />
          <Ionicons name="shield-checkmark" size={16} color="#10b981" />
          <Text style={styles.roleText}>{profile.roleName}</Text>
        </View>
      </View>

      {/* Main Content Cards */}
      <View style={styles.cardsContainer}>
        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconBg}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View
                style={[styles.infoIconContainer, { backgroundColor: "#dbeafe" }]}
              >
                <Ionicons name="person-circle" size={22} color="#3b82f6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ชื่อที่แสดง</Text>
                <Text style={styles.infoValue}>{profile.displayName}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[styles.infoIconContainer, { backgroundColor: "#fce7f3" }]}
              >
                <Ionicons name="mail" size={22} color="#ec4899" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>อีเมล</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[styles.infoIconContainer, { backgroundColor: "#dcfce7" }]}
              >
                <Ionicons name="shield-checkmark" size={22} color="#10b981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>บทบาท</Text>
                <Text style={styles.infoValue}>{profile.roleName}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Quick Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconBg}>
                <Ionicons name="settings" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>การจัดการบัญชี</Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#ede9fe" },
                  ]}
                >
                  <Ionicons name="create" size={20} color="#7c3aed" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>แก้ไขโปรไฟล์</Text>
                  <Text style={styles.actionSubtext}>
                    เปลี่ยนรูปและข้อมูลส่วนตัว
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />


            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#dbeafe" },
                  ]}
                >
                  <Ionicons name="lock-closed" size={20} color="#3b82f6" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>เปลี่ยนรหัสผ่าน</Text>
                  <Text style={styles.actionSubtext}>
                    อัปเดตรหัสผ่านของคุณ
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#fef3c7" },
                  ]}
                >
                  <Ionicons name="notifications" size={20} color="#f59e0b" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>การแจ้งเตือน</Text>
                  <Text style={styles.actionSubtext}>
                    จัดการการแจ้งเตือนต่างๆ
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#e0e7ff" },
                  ]}
                >
                  <Ionicons name="language" size={20} color="#6366f1" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>ภาษา</Text>
                  <Text style={styles.actionSubtext}>
                    เปลี่ยนภาษาการใช้งาน
                  </Text>
                </View>
              </View>
              <View style={styles.actionRight}>
                <Text style={styles.actionRightText}>ไทย</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.gray2}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconBg}>
                <Ionicons name="help-circle" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>ช่วยเหลือและสนับสนุน</Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#dcfce7" },
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#10b981" />
                </View>
                <Text style={styles.actionText}>ติดต่อเรา</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#fce7f3" },
                  ]}
                >
                  <Ionicons name="document-text" size={20} color="#ec4899" />
                </View>
                <Text style={styles.actionText}>เงื่อนไขการใช้งาน</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#e0e7ff" },
                  ]}
                >
                  <Ionicons name="shield" size={20} color="#6366f1" />
                </View>
                <Text style={styles.actionText}>นโยบายความเป็นส่วนตัว</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.gray} />
          <Text style={styles.appInfoText}>เวอร์ชัน 1.0.0</Text>
        </View>

        {/* Logout Button with Modern Design */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out" size={24} color="#ef4444" />
            <Text style={styles.logoutText}>ออกจากระบบ</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: SIZES.xLarge,
  },

  // Modern Header with Gradient
  headerBackground: {
    height: 200,
    backgroundColor: COLORS.primary,
    position: "relative",
    overflow: "hidden",
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42, 77, 80, 0.95)",
  },
  headerDecoration: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    top: -50,
    right: -50,
  },
  decorCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    bottom: -30,
    left: -30,
  },
  decorCircle3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    top: 50,
    left: 50,
  },

  // Modern Avatar
  avatarSection: {
    alignItems: "center",
    marginTop: -80,
    marginBottom: SIZES.medium,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: COLORS.white,
    backgroundColor: "#e0f2f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 64,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  avatarRing: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    top: -8,
    left: -8,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 2,
    ...SHADOWS.medium,
  },

  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    marginBottom: SIZES.xLarge,
  },
  name: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: "#1e293b",
    marginBottom: SIZES.small,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SIZES.medium,
  },
  email: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#86efac",
    position: "relative",
  },
  roleBadgeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  roleText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#10b981",
    letterSpacing: 0.5,
  },

  // Cards Container
  cardsContainer: {
    paddingHorizontal: SIZES.large,
  },

  // Card Styles
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: SIZES.large,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium + 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2f1",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: "#1e293b",
    letterSpacing: 0.3,
  },

  // Info Section
  infoSection: {
    padding: SIZES.large,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.medium,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: "#1e293b",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: SIZES.medium + 2,
  },

  // Action Section
  actionSection: {
    padding: SIZES.large,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SIZES.small + 2,
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: "#1e293b",
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionRightText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  actionDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: SIZES.small + 4,
    marginLeft: 58,
  },

  // App Info
  appInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: SIZES.medium,
    marginBottom: SIZES.large,
    ...SHADOWS.small,
  },
  appInfoText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },

  // Logout Button
  logoutBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    marginBottom: SIZES.large,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  logoutContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: SIZES.medium + 4,
  },
  logoutText: {
    fontFamily: FONTS.semiBold,
    color: "#ef4444",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Empty State
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    color: "#1e293b",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: SIZES.small,
    lineHeight: 22,
    paddingHorizontal: SIZES.medium,
  },

  // Error State
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },

  // Buttons
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SIZES.xLarge,
    paddingHorizontal: SIZES.xxLarge + 10,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    ...SHADOWS.medium,
  },
  loginBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  registerBtn: {
    marginTop: SIZES.medium,
    paddingHorizontal: SIZES.xxLarge + 10,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  registerBtnText: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SIZES.xLarge,
    paddingHorizontal: SIZES.xxLarge + 10,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    ...SHADOWS.medium,
  },
  retryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    marginTop: SIZES.medium,
    paddingHorizontal: SIZES.xxLarge + 10,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray2,
  },
  secondaryBtnText: {
    color: COLORS.gray,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  bottomPadding: {
    height: SIZES.xLarge + 10,
  },
});
