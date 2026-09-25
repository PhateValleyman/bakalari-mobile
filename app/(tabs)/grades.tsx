import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { grades, type Grade } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function GradesScreen() {
  const colors = useColors();
  const average = useMemo(() => "1,4", []);

  const renderGrade = ({ item }: { item: Grade }) => {
    const trendColor = item.trend === "up" ? colors.success : item.trend === "down" ? colors.error : colors.muted;
    const trendIcon = item.trend === "up" ? "trending.up" : item.trend === "down" ? "trending.down" : "minus";
    return (
      <Pressable
        onPress={() => {
          ping();
          Alert.alert(item.subject, `Známky: ${item.grades.join(" · ")}\nAktuální průměr: ${item.average}`);
        }}
        style={({ pressed }) => [styles.gradeCard, pressed && styles.pressed]}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}18` }}>
            <Text className="text-sm font-bold" style={{ color: item.color }}>{item.abbreviation}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">{item.subject}</Text>
            <View className="mt-2 flex-row items-center gap-2">
              {item.grades.map((grade, index) => (
                <View key={`${item.id}-${index}`} className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: index === item.grades.length - 1 ? "#EAF1FF" : "#F2F4F8" }}>
                  <Text className="text-xs font-bold" style={{ color: index === item.grades.length - 1 ? colors.primary : colors.muted }}>{grade}</Text>
                </View>
              ))}
              <Text className="ml-1 text-xs text-muted">{item.grades.length} známky</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xl font-bold text-foreground">{item.average}</Text>
            <IconSymbol name={trendIcon} size={17} color={trendColor} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        renderItem={renderGrade}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View className="pt-3">
              <Text className="text-sm font-semibold text-primary">Hodnocení</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">Známky</Text>
              <Text className="mt-1 text-sm text-muted">Pololetí 2026/27 · poslední synchronizace dnes</Text>
            </View>
            <View className="mt-6 flex-row items-center rounded-3xl bg-surface p-5" style={styles.summaryCard}>
              <View className="h-24 w-24 items-center justify-center rounded-full" style={styles.averageCircle}>
                <Text className="text-3xl font-bold text-primary">{average}</Text>
                <Text className="text-[10px] font-semibold text-muted">průměr</Text>
              </View>
              <View className="ml-5 flex-1">
                <View className="flex-row items-center gap-2">
                  <IconSymbol name="trending.up" size={18} color={colors.success} />
                  <Text className="text-sm font-bold text-success">Zlepšení o 0,2</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-muted">Oproti minulému měsíci se držíš nad očekáváním. Jen tak dál.</Text>
              </View>
            </View>
            <View className="mb-3 mt-7 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Předměty</Text>
              <Text className="text-sm font-semibold text-muted">{grades.length} celkem</Text>
            </View>
          </View>
        }
        ListFooterComponent={<Text className="mt-5 mb-4 text-center text-xs leading-5 text-muted">Klepnutím na předmět zobrazíš detail známek.</Text>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  summaryCard: { shadowColor: "#172033", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  averageCircle: { borderWidth: 8, borderColor: "#DCE8FF", backgroundColor: "#F5F8FF" },
  gradeCard: { marginBottom: 10, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
