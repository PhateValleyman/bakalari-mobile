import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Platform, View } from "react-native";
import type { PropsWithChildren } from "react";

import { nextTabPath, type TabPath } from "@/lib/tab-navigation";

function hapticSelection() {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
}

function navigateToTab(path: TabPath) {
  router.replace(path);
}

export function SwipeTabGesture({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const gesture = Gesture.Pan()
    // Keep routing and haptics on the JS thread. Calling router methods from a UI worklet can crash native builds.
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-18, 18])
    .onEnd((event) => {
      const nextPath = nextTabPath(pathname, event.translationX);
      if (!nextPath) return;
      hapticSelection();
      navigateToTab(nextPath);
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
