import React from "react";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSelector } from "react-redux";
import { useGetProfileQuery } from "../features/auth/authApi";
import AdminStackNavigation from "./AdminStackNavigation";
import PlaceStackNavigation from "./PlaceStackNavigation";
import TripStackNavigation from "./TripStackNavigation";
import AuthStackNavigation from "./AuthStackNavigation";
import { HomeScreen } from "../screen";
import LocalDishStackNavigation from "./LocalDishStackNavigation";

const Tab = createBottomTabNavigator();

export default function BottomTabNavigation() {
  const { accessToken, hydrated } = useSelector((state: any) => state.auth);
  const { data: profile } = useGetProfileQuery(undefined, {
    skip: !accessToken,
  });

  const isLoggedIn = !!accessToken && hydrated;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === "หน้าเเรก") {
            return <Ionicons name="home" size={size} color={color} />;
          }
          if (route.name === "สถานที่") {
            return <Ionicons name="list" size={size} color={color} />;
          }
           if (route.name === "อาหาร") {
            return <FontAwesome6 name="bowl-food" size={size} color={color} />;
          }
          if (route.name === "ทริปของฉัน") {
            return <Ionicons name="map" size={size} color={color} />;
          }
          if (route.name === "โปรไฟล์") {
            return <Ionicons name="person" size={size} color={color} />;
          }
          if (route.name === "เเอดมิน") {
            return (
              <MaterialIcons
                name="admin-panel-settings"
                size={size}
                color={color}
              />
            );
          }
          return null;
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="หน้าเเรก" component={HomeScreen} />
      <Tab.Screen name="สถานที่" component={PlaceStackNavigation} />
      <Tab.Screen name="อาหาร" component={LocalDishStackNavigation} />

      {isLoggedIn && (
        <Tab.Screen name="ทริปของฉัน" component={TripStackNavigation} />
      )}
      {isLoggedIn && profile?.roleName === "Admin" && (
        <Tab.Screen name="เเอดมิน" component={AdminStackNavigation} />
      )}

      <Tab.Screen name="โปรไฟล์" component={AuthStackNavigation} />
    </Tab.Navigator>
  );
}
