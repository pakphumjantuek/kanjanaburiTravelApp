import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminScreen from "../screen/AdminScreen";
import UserListScreen from "../features/auth/screen/UserListScreen";
import UserProfileScreen from "../features/auth/screen/UserProfileScreen";
import UserInterestDetailsScreen from "../features/userinterests/screen/UserInterestDetailsScreen";
import RoleListScreen from "../features/role/screen/RoleListScreen";
import RoleFormScreen from "../features/role/screen/RoleFormScreen";
import PlaceListAdminScreen from "../features/places/screen/PlaceListAdminScreen";
import PlaceTagListScreen from "../features/placeTag/screen/PlaceTagListScreen";
import PlaceTagFormScreen from "../features/placeTag/screen/PlaceTagFormScreen";
import PlaceCategoryListScreen from "../features/placeCategory/screen/PlaceCategoryListScreen";
import PlaceCategoryFormScreen from "../features/placeCategory/screen/PlaceCategoryFormScreen";
import PlaceOpeningScreen from "../features/placeOpening/screen/PlaceOpeningScreen";
import RecommendAdminScreen from "../features/recommend/screen/RecommendAdminScreen";
import PlaceFormScreen from "../features/places/screen/PlaceFormScreen";
import LocalDishListScreen from "../features/localDish/screen/LocalDishListScreen";
import LocalDishFormScreen from "../features/localDish/screen/LocalDishFormScreen";
import PlaceMenuManageScreen from "../features/places/screen/PlaceMenuManageScreen";

const Stack = createNativeStackNavigator();

export default function AdminStackNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminScreen"
        component={AdminScreen}
        options={{ title: "แอดมิน" }}
      />
      <Stack.Screen
        name="UserListScreen"
        component={UserListScreen}
        options={{ title: "รายชื่อผู้ใช้" }}
      />
      <Stack.Screen
        name="UserProfileScreen"
        component={UserProfileScreen}
        options={{ title: "โปรไฟล์ผู้ใช้" }}
      />
      <Stack.Screen
        name="UserInterestDetailsScreen"
        component={UserInterestDetailsScreen}
        options={{ title: "ความสนใจผู้ใช้" }}
      />
      <Stack.Screen
        name="RoleListScreen"
        component={RoleListScreen}
        options={{ title: "ความสนใจผู้ใช้" }}
      />
      <Stack.Screen
        name="RoleForm"
        component={RoleFormScreen}
        options={{ title: "ความสนใจผู้ใช้" }}
      />
      <Stack.Screen
        name="PlaceListAdminScreen"
        component={PlaceListAdminScreen}
        options={{ title: "ความสนใจผู้ใช้" }}
      />
      <Stack.Screen
        name="PlaceOpeningScreen"
        component={PlaceOpeningScreen}
        options={{ title: "เวลาทำการสถานที่" }}
      />
      <Stack.Screen
        name="PlaceFormScreen"
        component={PlaceFormScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="PlaceTagListScreen"
        component={PlaceTagListScreen}
        options={{ title: "จัดการแท็กสถานที่" }}
      />
      <Stack.Screen
        name="PlaceMenuManageScreen"
        component={PlaceMenuManageScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="PlaceTagForm"
        component={PlaceTagFormScreen}
        options={{ title: "" }}
      />

      <Stack.Screen
        name="PlaceCategoryListScreen"
        component={PlaceCategoryListScreen}
        options={{ title: "จัดการหมวดหมู่สถานที่" }}
      />
      <Stack.Screen
        name="PlaceCategoryFormScreen"
        component={PlaceCategoryFormScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="RecommendAdminScreen"
        component={RecommendAdminScreen}
        options={{ title: "" }}
      />

      <Stack.Screen
        name="LocalDishListScreen"
        component={LocalDishListScreen}
        options={{ title: "อาหารพื้นถื่น" }}
      />
      <Stack.Screen
        name="LocalDishFormScreen"
        component={LocalDishFormScreen}
        options={{ title: "อาหารพื้นถื่น" }}
      />
    </Stack.Navigator>
  );
}
