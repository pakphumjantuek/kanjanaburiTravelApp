import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TripCreateScreen from "../features/trip/screen/TripCreateScreen";
import TripDetailScreen from "../features/trip/screen/TripDetailScreen";
import TripPlannerScreen from "../features/trip/screen/TripPlannerScreen";
import TripMapScreen from "../features/trip/screen/TripMapScreen";
import { TripListScreen } from "../screen";
import AutoTripCreateScreen from "../features/trip/screen/AutoTripCreateScreen";
const Stack = createNativeStackNavigator();

export default function TripStackNavigation() {
  return (
    <Stack.Navigator>
     <Stack.Screen
          name="TripListScreen"
          component={TripListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripDetailScreen"
          component={TripDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripPlannerScreen"
          component={TripPlannerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripMapScreen"
          component={TripMapScreen}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="TripCreateScreen"
          component={TripCreateScreen}
          options={{ headerShown: false }}
        />
         <Stack.Screen
          name="AutoTripCreateScreen"
          component={AutoTripCreateScreen}
          options={{ headerShown: false }}
        />

        
    </Stack.Navigator>
  );
}
