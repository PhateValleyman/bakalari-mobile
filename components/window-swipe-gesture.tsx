import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { useCallback, useMemo, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { getAdjacentWindow } from "@/lib/window-navigation";

type WindowSwipeGestureProps = {
  children: ReactNode;
};

export function WindowSwipeGesture({ children }: WindowSwipeGestureProps) {
  const pathname = usePathname();

  const navigate = useCallback((direction: "next" | "previous") => {
    const destination = getAdjacentWindow(pathname, direction);
    if (!destination) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(destination);
  }, [pathname]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .minDistance(24)
        .onEnd((event) => {
          if (event.translationX <= -64) {
            navigate("next");
          } else if (event.translationX >= 64) {
            navigate("previous");
          }
        })
        .runOnJS(true),
    [navigate],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
