import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LocalDishUserListScreen from "../screen/LocalDishUserListScreen";
import LocalDishDetailScreen from "../features/localDish/screen/LocalDishDetailScreen";

const Stack = createNativeStackNavigator();

export default function LocalDishStackNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LocalDishUserListScreen"
        component={LocalDishUserListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LocalDishDetailScreen"
        component={LocalDishDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
