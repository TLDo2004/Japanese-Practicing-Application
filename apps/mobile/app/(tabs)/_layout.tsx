import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { colors, fonts, touch } from "../../src/theme";

/** Kana/kanji marks instead of generic icons — they read well at tab size. */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontFamily: fonts.jpMed, fontSize: 18, color: focused ? colors.primary : colors.textMuted }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.displayMed, color: colors.text, fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: touch + Math.max(insets.bottom, 8) + 8,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="learn/index"
        options={{
          title: t("title_learn"),
          tabBarLabel: t("nav_learn"),
          tabBarIcon: ({ focused }) => <TabIcon label="学" focused={focused} />,
          tabBarAccessibilityLabel: t("nav_learn"),
        }}
      />
      <Tabs.Screen
        name="practice/index"
        options={{
          title: t("title_practice"),
          tabBarLabel: t("nav_practice"),
          tabBarIcon: ({ focused }) => <TabIcon label="書" focused={focused} />,
          tabBarAccessibilityLabel: t("nav_practice"),
        }}
      />
      <Tabs.Screen
        name="dictionary/index"
        options={{
          title: t("title_dictionary"),
          tabBarLabel: t("nav_dictionary"),
          tabBarIcon: ({ focused }) => <TabIcon label="辞" focused={focused} />,
          tabBarAccessibilityLabel: t("nav_dictionary"),
        }}
      />
    </Tabs>
  );
}
