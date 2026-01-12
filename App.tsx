import React, { useEffect } from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Provider, useDispatch, useSelector } from "react-redux";
import store, { RootState } from "./src/redux/store";
import { DefaultTheme, PaperProvider } from "react-native-paper";
import FlashMessage from "react-native-flash-message";
import { hydrateAuth } from "./src/features/auth/authSlice";
import BottomTabNavigation from "./src/navigates/BottomTabNavigation";
import { NavigationContainer } from "@react-navigation/native";

function Bootstrap() {
  const dispatch = useDispatch();
  const hydrated = useSelector((s: RootState) => s.auth.hydrated);

  useEffect(() => {
    dispatch(hydrateAuth() as any);
  }, [dispatch]);

  // ✅ รอ hydrate ให้จบก่อน ไม่งั้น token เก่ามาทับได้
  if (!hydrated) return <Text>Loading...</Text>;

  return (
    <NavigationContainer>
      <BottomTabNavigation />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Light": require("./assets/fonts/Poppins-Light.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
    "Poppins-ExtraBold": require("./assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-BlackItalic": require("./assets/fonts/Poppins-BlackItalic.ttf"),
    "Poppins-Italic": require("./assets/fonts/Poppins-Italic.ttf"),
  });

  if (!fontsLoaded && !fontError) return <Text>Font loading...</Text>;

  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: "tomato", secondary: "yellow" },
  };

  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <Bootstrap />
        <FlashMessage position="bottom" />
        <StatusBar style="dark" />
      </PaperProvider>
    </Provider>
  );
}
