import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ProfileScreen,
} from "../screen";
import { RootStackParamList } from "./typeRootStack";

import LoginScreen from "../features/auth/screen/LoginScreen";
import RegisterScreen from "../features/auth/screen/RegisterScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigation() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator initialRouteName="HomeScreen">   
        <Stack.Screen
          name="ProfileScreen"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />         
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
}
