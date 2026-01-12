import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen, PlaceListScreen } from "../screen";
import PlaceUserDetailScreen from "../features/places/screen/PlaceUserDetailScreen";

const Stack = createNativeStackNavigator();

export default function PlaceStackNavigation() {
  return (
    <Stack.Navigator>
       
      <Stack.Screen
        name="PlaceList"
        component={PlaceListScreen}
        options={{ headerShown: false }}
      />
       <Stack.Screen
        name="PlaceDetails"
        component={PlaceUserDetailScreen}
        options={{ headerShown: false }}
      />
     
    </Stack.Navigator>
  );
}
