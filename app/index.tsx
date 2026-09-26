import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuthState } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";

export default function EntryScreen() {
  const colors = useColors();
  const { status } = useAuthState();

  if (status === "loading") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loading}>
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary">
            <Text className="text-2xl font-bold text-white">B</Text>
          </View>
          <Text className="mt-5 text-lg font-bold text-foreground">Bakaláři Mobile</Text>
          <ActivityIndicator className="mt-4" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return <Redirect href={status === "signed_in" ? "/(tabs)" : "/login"} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
