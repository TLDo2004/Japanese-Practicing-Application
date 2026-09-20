import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Fraunces_500Medium, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
} from "@expo-google-fonts/noto-sans-jp";
import * as SplashScreen from "expo-splash-screen";
import { PlatformProvider, usePlatform } from "../src/platform/PlatformContext";
import { SessionProvider } from "../src/session/SessionContext";
import { colors, fonts } from "../src/theme";
import {
  installGlobalDiagBridge,
  probeSkiaPixelFormat,
  setSkiaInitOk,
} from "../src/platform/handwriting/diagnostics";

SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = usePlatform();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useEffect(() => {
    installGlobalDiagBridge();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { skiaAvailable } = require("../src/platform/handwriting/skiaRaster") as typeof import("../src/platform/handwriting/skiaRaster");
      setSkiaInitOk(skiaAvailable());
      probeSkiaPixelFormat();
    } catch {
      setSkiaInitOk(false);
    }
  }, []);
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlatformProvider>
        <ReadyGate>
          <SessionProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                headerStyle: { backgroundColor: colors.background },
                headerTitleStyle: { fontFamily: fonts.displayMed, color: colors.text, fontSize: 17 },
                headerTintColor: colors.text,
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="chart/[script]/index" options={{ headerShown: true, title: "" }} />
              <Stack.Screen name="chart/[script]/[ro]" options={{ headerShown: true, title: "" }} />
              <Stack.Screen name="practice/sets" options={{ headerShown: true, title: "" }} />
              <Stack.Screen name="practice/writing" options={{ headerShown: true, title: "" }} />
              <Stack.Screen name="practice/quiz" options={{ headerShown: true, title: "" }} />
              <Stack.Screen name="practice/summary" options={{ headerShown: true, title: "" }} />
            </Stack>
          </SessionProvider>
        </ReadyGate>
      </PlatformProvider>
    </GestureHandlerRootView>
  );
}
