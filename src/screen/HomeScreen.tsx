import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";

import { useGetHomeQuery } from "../features/home/homeApi";
import { COLORS, FONTS, SHADOWS } from "../common";
import { toAbsoluteUrl } from "../utils/imagepath";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, hydrated } = useSelector((state: any) => state.auth);
  const isLoggedIn = hydrated && !!accessToken;

  const { data, isLoading, isFetching } = useGetHomeQuery(
    { topN: 10, personalized: isLoggedIn ? 1 : 0 } as any,
    { refetchOnFocus: true, refetchOnReconnect: true }
  );

  const sections = data?.sections ?? [];

  const quickActions = useMemo<QuickAction[]>(
    () => [
      { key: "places", label: "สถานที่", icon: "location", color: "#059669", bgColor: "#D1FAE5" },
      { key: "trips", label: "วางแผน", icon: "map", color: "#7C3AED", bgColor: "#EDE9FE" },
      { key: "food", label: "อาหาร", icon: "restaurant", color: "#EA580C", bgColor: "#FFEDD5" },
      { key: "stay", label: "ที่พัก", icon: "bed", color: "#0284C7", bgColor: "#E0F2FE" },
    ],
    []
  );

  const toPlaces = () => navigation.navigate("สถานที่");

 

  const getSectionTitle = (sec: any, idx: number) => {
    const key = String(sec?.key ?? "").toLowerCase();
    const isPersonal = ["for_you", "foryou", "personalized", "recommended"].includes(key);
    if (isLoggedIn && isPersonal) return "แนะนำสำหรับคุณ ✨";
    if (!isLoggedIn && isPersonal) return sec?.title ?? "ยอดนิยม 🔥";
    return sec?.title ?? (idx === 0 ? "แนะนำ" : "รายการแนะนำ");
  };

  const handleQuickAction = (key: string) => {
    switch (key) {
      case "places": navigation.navigate("สถานที่"); break;
      case "trips": navigation.navigate("ทริปของฉัน"); break;
      case "food": navigation.navigate("อาหาร"); break;
      case "stay": navigation.navigate("PlacesScreen", { category: "stay" }); break;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingIcon}>
          <Ionicons name="compass" size={48} color={COLORS.primary} />
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>กำลังค้นหาสถานที่น่าสนใจ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
        
        {/* ================= HERO SECTION ================= */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200" }}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.5, 1]}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTag}>
                  <Ionicons name="sparkles" size={14} color="#FFD700" />
                  <Text style={styles.heroTagText}>สถานที่ท่องเที่ยวในจังหวัดกาญจนบุรี</Text>
                </View>
                
                <Text style={styles.heroTitle}>กาญจนบุรี</Text>
                <Text style={styles.heroSubtitle}>
                  ดินแดนแห่งขุนเขา สายน้ำ และประวัติศาสตร์
                </Text>

                <View style={styles.heroStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="location" size={16} color="#10B981" />
                    <Text style={styles.statText}>100+ สถานที่</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={16} color="#FBBF24" />
                    <Text style={styles.statText}>4.8 คะแนน</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* ================= QUICK ACTIONS ================= */}
        <View style={styles.quickActionsWrapper}>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickActionItem}
                onPress={() => handleQuickAction(action.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      

        {/* ================= CONTENT SECTIONS ================= */}
        <View style={styles.contentContainer}>
          {sections.map((sec: any, sectionIndex: number) => (
            <View key={sec.key ?? sectionIndex} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionTitle}>{getSectionTitle(sec, sectionIndex)}</Text>
                  <View style={styles.sectionLine} />
                </View>
                <TouchableOpacity style={styles.seeAllBtn} onPress={toPlaces}>
                  <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.cardsScroll}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 16}
              >
                {sec.items?.map((p: any, idx: number) => {
                  const imageUrl = p.coverImageUrl
                    ? toAbsoluteUrl(p.coverImageUrl)
                    : "https://via.placeholder.com/400x300?text=No+Image";

                  return (
                    <TouchableOpacity
                      key={p.placeId}
                      activeOpacity={0.9}
                      style={[styles.card, idx === 0 && { marginLeft: 0 }]}
                      onPress={() =>
                        navigation.navigate("สถานที่", {
                          screen: "PlaceDetails",
                          params: { placeId: p.placeId },
                        })
                      }
                    >
                      <View style={styles.cardImageContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.cardGradient}
                        />
                        
                        {/* Rating Badge */}
                        <View style={styles.cardRating}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.cardRatingText}>
                            {p.rating ? p.rating.toFixed(1) : "N/A"}
                          </Text>
                        </View>

                        {/* Category Tag */}
                        {p.categoryName && (
                          <View style={styles.cardCategory}>
                            <Text style={styles.cardCategoryText}>{p.categoryName}</Text>
                          </View>
                        )}

                        {/* Favorite Button */}
                        <TouchableOpacity style={styles.favoriteBtn}>
                          <Ionicons name="heart-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardDetails}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                        <View style={styles.cardLocation}>
                          <Ionicons name="location" size={14} color="#10B981" />
                          <Text style={styles.cardLocationText} numberOfLines={1}>
                            {p.locationName ?? p.district ?? "กาญจนบุรี"}
                          </Text>
                        </View>
                        {p.description && (
                          <Text style={styles.cardDesc} numberOfLines={2}>
                            {p.description}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* ================= EXPLORE MORE CTA ================= */}
        <View style={styles.exploreCta}>
          <LinearGradient
            colors={['#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.exploreGradient}
          >
            <Ionicons name="compass" size={48} color="rgba(255,255,255,0.2)" style={styles.exploreIcon} />
            <Text style={styles.exploreTitle}>พร้อมออกเดินทางหรือยัง?</Text>
            <Text style={styles.exploreDesc}>ค้นพบสถานที่ท่องเที่ยวอีกมากมายในกาญจนบุรี</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={toPlaces}>
              <Text style={styles.exploreBtnText}>สำรวจเพิ่มเติม</Text>
              <Ionicons name="arrow-forward" size={18} color="#059669" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {isFetching && (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  loading: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 16,
  },
  
  // Hero
  heroContainer: {
    height: height * 0.42,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 32,
  },
  heroContent: {},
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  heroTagText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 42,
    fontFamily: FONTS.bold,
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontFamily: FONTS.regular,
    lineHeight: 24,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },

  // Quick Actions
  quickActionsWrapper: {
    marginTop: -30,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-around',
    ...SHADOWS.medium,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#374151',
  },

  // Featured Banner
  featuredBanner: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  featuredGradient: {
    flexDirection: 'row',
    padding: 20,
    minHeight: 140,
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featuredBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
  featuredTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  featuredDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginBottom: 12,
  },
  featuredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
  },
  featuredBtnText: {
    color: '#764BA2',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  featuredImageWrap: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },

  // Sections
  contentContainer: {
    marginTop: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleWrap: {},
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  sectionLine: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 6,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  cardsScroll: {
    paddingHorizontal: 20,
  },

  // Cards
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginLeft: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  cardRating: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    ...SHADOWS.small,
  },
  cardRatingText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#1F2937',
  },
  cardCategory: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cardCategoryText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#374151',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginBottom: 6,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLocationText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 19,
  },

  // Explore CTA
  exploreCta: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  exploreGradient: {
    padding: 28,
    alignItems: 'center',
    position: 'relative',
  },
  exploreIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  exploreTitle: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  exploreDesc: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 20,
    textAlign: 'center',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    ...SHADOWS.small,
  },
  exploreBtnText: {
    color: '#059669',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },

  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
