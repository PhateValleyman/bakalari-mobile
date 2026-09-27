import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 58 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Přehled",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Rozvrh",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: "Známky",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: "Úkoly",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="checklist" color={color} />,
        }}
      />
    </Tabs>
  );
}
