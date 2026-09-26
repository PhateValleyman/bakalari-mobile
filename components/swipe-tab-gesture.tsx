import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { router, usePathname, type Href } from "expo-router";
import { runOnJS } from "react-native-reanimated";
import { Platform, View } from "react-native";
import type { PropsWithChildren } from "react";
import * as Haptics from "expo-haptics";

const TAB_PATHS = ["/", "/schedule", "/grades", "/homework", "/settings"];

function tabIndex(pathname: string): number {
  if (pathname.endsWith("/schedule")) return 1;
  if (pathname.endsWith("/grades")) return 2;
  if (pathname.endsWith("/homework")) return 3;
  if (pathname.endsWith("/settings")) return 4;
  return pathname === "/" || pathname.endsWith("/(tabs)") ? 0 : -1;
}

function hapticSelection() {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
}

export function SwipeTabGesture({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const gesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-18, 18])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < 60) return;
      const currentIndex = tabIndex(pathname);
      if (currentIndex < 0) return;
      const nextIndex = event.translationX < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length) return;
      runOnJS(hapticSelection)();
      runOnJS(router.replace)(TAB_PATHS[nextIndex] as Href);
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
