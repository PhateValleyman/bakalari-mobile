import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useBakalariGrades } from "@/hooks/use-bakalari-data";
import { calculateAverage } from "@/lib/bakalari-data";
import { useColors } from "@/hooks/use-colors";
import type { Grade } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function GradesScreen() {
  const colors = useColors();
  const { data: grades, loading, error, refresh } = useBakalariGrades();
  const average = useMemo(() => calculateAverage(grades), [grades]);

  const renderGrade = ({ item }: { item: Grade }) => (
    <Pressable
      onPress={() => {
        ping();
        const latest = item.latestCaption ? `\n\n${item.latestCaption}` : "";
        const latestDate = item.latestDate ? `\nDatum: ${item.latestDate}` : "";
        Alert.alert(item.subject, `Známky: ${item.grades.join(" · ")}\nAktuální průměr: ${item.average}${latest}${latestDate}`);
      }}
      style={({ pressed }) => [styles.gradeCard, { backgroundColor: colors.surface }, pressed && styles.pressed]}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}18` }}>
          <Text className="text-sm font-bold" style={{ color: item.color }}>{item.abbreviation}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{item.subject}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            {item.grades.slice(-5).map((grade, index, visibleGrades) => (
              <View key={`${item.id}-${index}`} className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: index === visibleGrades.length - 1 ? `${colors.primary}18` : `${colors.border}70` }}>
                <Text className="text-xs font-bold" style={{ color: index === visibleGrades.length - 1 ? colors.primary : colors.muted }}>{grade}</Text>
              </View>
            ))}
            <Text className="ml-1 text-xs text-muted">{item.grades.length} známek</Text>
          </View>
          {item.latestMark ? <Text className="mt-2 text-xs font-semibold text-primary">Poslední: {item.latestMark}{item.latestDate ? ` · ${item.latestDate}` : ""}</Text> : null}
        </View>
        <View className="items-end">
          <Text className="text-xl font-bold text-foreground">{item.average}</Text>
          <IconSymbol name="minus" size={17} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );

  const emptyState = loading ? (
    <View className="items-center rounded-2xl bg-surface p-6">
      <ActivityIndicator color={colors.primary} />
      <Text className="mt-3 text-sm text-muted">Načítám nejnovější známky…</Text>
    </View>
  ) : error ? (
    <View className="rounded-2xl bg-surface p-5">
      <Text className="text-sm font-bold text-foreground">Známky se nepodařilo načíst</Text>
      <Text className="mt-2 text-xs leading-5 text-muted">{error}</Text>
      <Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text className="text-sm font-bold text-primary">Zkusit znovu</Text>
        <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
      </Pressable>
    </View>
  ) : (
    <Text className="rounded-2xl bg-surface p-5 text-center text-sm text-muted">Škola zatím nevrátila žádné známky.</Text>
  );

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
              <Text className="text-sm font-semibold text-primary">Aktuální data školy</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-3xl font-bold text-foreground">Známky</Text>
                <Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-muted">{loading ? "Synchronizuji se školou…" : "Poslední známky podle předmětů"}</Text>
            </View>
            <View className="mt-6 flex-row items-center rounded-3xl bg-surface p-5" style={[styles.summaryCard, { backgroundColor: colors.surface }] }>
              <View className="h-24 w-24 items-center justify-center rounded-full" style={[styles.averageCircle, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text className="text-3xl font-bold text-primary">{average}</Text>
                <Text className="text-[10px] font-semibold text-muted">průměr předmětů</Text>
              </View>
              <View className="ml-5 flex-1">
                <View className="flex-row items-center gap-2">
                  <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
                  <Text className="text-sm font-bold text-success">Aktuální hodnocení</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-muted">Průměr je odvozený z průměrů předmětů, které vrátila tvoje škola.</Text>
              </View>
            </View>
            <View className="mb-3 mt-7 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Předměty</Text>
              <Text className="text-sm font-semibold text-muted">{loading ? "…" : `${grades.length} celkem`}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={emptyState}
        ListFooterComponent={grades.length ? <Text className="mt-5 mb-4 text-center text-xs leading-5 text-muted">Klepnutím na předmět zobrazíš detail známek z API.</Text> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  summaryCard: { shadowColor: "#172033", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  averageCircle: { borderWidth: 8 },
  gradeCard: { marginBottom: 10, borderRadius: 18, padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
