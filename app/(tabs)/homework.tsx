import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariHomeworks } from "@/hooks/use-bakalari-data";
import { useParentalControl } from "@/lib/parental-context";
import type { Homework } from "@/shared/bakalari-data";

function ping() { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
function dueUrgency(due: string): "urgent" | "soon" | "normal" | "none" {
  if (!due) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${due}T00:00:00`); if (Number.isNaN(target.getTime())) return "none";
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return days <= 1 ? "urgent" : days <= 3 ? "soon" : "normal";
}

export default function HomeworkScreen() {
  const colors = useColors();
  const { data: homework, loading, refreshing, error, cacheAge, fromCache, save, refresh } = useBakalariHomeworks();
  const { state: parentalState, completeHomework } = useParentalControl();
  const [showCompleted, setShowCompleted] = useState(false);
  const visibleHomework = useMemo(() => homework.filter((item) => showCompleted || !item.completed), [homework, showCompleted]);
  const openCount = homework.filter((item) => !item.completed).length;
  const urgentCount = homework.filter((item) => !item.completed && dueUrgency(item.due) === "urgent").length;

  useEffect(() => {
    if (parentalState.locked && parentalState.lockReason === "homework" && !loading && !error && homework.length > 0 && openCount === 0) {
      void completeHomework();
    }
  }, [completeHomework, error, homework.length, loading, openCount, parentalState.lockReason, parentalState.locked]);

  const toggleHomework = (id: string) => {
    ping();
    void save(homework.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const renderHomework = ({ item }: { item: Homework }) => (
    <Pressable onPress={() => toggleHomework(item.id)} style={({ pressed }) => [styles.taskCard, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
      <View className="flex-row items-start gap-3">
        <View className="pt-1">
          <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: item.completed ? colors.success : "transparent", borderWidth: item.completed ? 0 : 2, borderColor: item.color }}>
            {item.completed ? <IconSymbol name="checkmark.circle.fill" size={24} color="#FFFFFF" /> : <IconSymbol name="circle" size={24} color={item.color} />}
          </View>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className={`text-xs font-bold ${item.completed ? "text-muted" : "text-primary"}`}>{item.subject}</Text>
            <View className="flex-row items-center gap-1"><IconSymbol name="clock" size={14} color={item.completed ? colors.muted : dueUrgency(item.due) === "urgent" ? colors.error : item.color} /><Text className="text-xs font-semibold" style={{ color: item.completed ? colors.muted : dueUrgency(item.due) === "urgent" ? colors.error : item.color }}>{item.completed ? "hotovo" : item.dueLabel}</Text></View>
          </View>
          <Text className={`mt-2 text-base font-bold ${item.completed ? "text-muted line-through" : "text-foreground"}`}>{item.title}</Text>
        </View>
      </View>
    </Pressable>
  );

  const emptyState = loading ? <View className="items-center rounded-2xl bg-surface p-6"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Načítám úkoly…</Text></View> : error ? <View className="rounded-2xl bg-surface p-5"><Text className="text-sm font-bold text-foreground">Úkoly se nepodařilo načíst</Text><Text className="mt-2 text-xs leading-5 text-muted">{error}</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-primary">Zkusit znovu</Text><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /></Pressable></View> : <View className="items-center rounded-2xl bg-surface p-6"><IconSymbol name="checkmark.circle.fill" size={30} color={colors.success} /><Text className="mt-3 text-base font-bold text-foreground">Vše hotovo</Text><Text className="mt-1 text-center text-sm text-muted">Škola nevrátila žádné otevřené úkoly.</Text></View>;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={visibleHomework} keyExtractor={(item) => item.id} renderItem={renderHomework} showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={() => { ping(); refresh(); }} contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View><View className="pt-3"><View className="flex-row items-center justify-between"><View><Text className="text-sm font-semibold text-primary">Aktuální data školy</Text><Text className="mt-1 text-3xl font-bold text-foreground">Úkoly</Text></View><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /></Pressable></View><Text className="mt-1 text-sm text-muted">Měj všechny termíny na jednom místě.</Text>{fromCache ? <Text className="mt-1 text-xs font-semibold text-warning">Offline cache · {cacheAge ?? "uloženo"}{refreshing ? " · synchronizuji…" : ""}</Text> : null}</View>{urgentCount > 0 ? <View className="mt-4 flex-row items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: `${colors.error}14`, borderWidth: 1, borderColor: `${colors.error}35` }}><IconSymbol name="bell.fill" size={21} color={colors.error} /><Text className="flex-1 text-sm font-bold" style={{ color: colors.error }}>{urgentCount === 1 ? "Jeden úkol má termín dnes nebo zítra." : `${urgentCount} úkoly mají termín dnes nebo zítra.`}</Text></View> : null}<View className="mt-6 flex-row items-center justify-between rounded-3xl bg-primary p-5" style={styles.summaryCard}><View><Text className="text-xs font-bold uppercase tracking-widest" style={{ color: "#DCEAFF" }}>K dokončení</Text><Text className="mt-1 text-3xl font-bold text-white">{loading ? "…" : openCount}</Text><Text className="mt-1 text-sm" style={{ color: "#DCEAFF" }}>{openCount === 1 ? "otevřený úkol" : "otevřené úkoly"}</Text></View><View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF22" }}><IconSymbol name="checklist" size={28} color="#FFFFFF" /></View></View><View className="mb-4 mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">Seznam</Text><Pressable onPress={() => { ping(); setShowCompleted((value) => !value); }} style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}><Text className="text-xs font-bold text-primary">{showCompleted ? "Skrýt hotové" : "Zobrazit hotové"}</Text></Pressable></View></View>}
        ListEmptyComponent={emptyState}
        ListFooterComponent={visibleHomework.length ? <Text className="mt-5 mb-4 text-center text-xs leading-5 text-muted">Potáhni seznam dolů pro obnovení · klepnutím označíš úkol jako hotový.</Text> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  summaryCard: { shadowColor: "#2F7DF6", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  taskCard: { marginBottom: 10, borderRadius: 18, padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  filterButton: { borderRadius: 999, backgroundColor: "#E5EEFF", paddingHorizontal: 12, paddingVertical: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
