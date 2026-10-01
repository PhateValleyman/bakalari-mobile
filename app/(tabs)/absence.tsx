import * as Haptics from "expo-haptics";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { SwipeCardDeck } from "@/components/swipe-card-deck";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariAbsence } from "@/hooks/use-bakalari-data";
import type { AbsenceDay, AbsenceSubject } from "@/shared/bakalari-data";

function ping() { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
function hours(value: number): string { return `${value} ${value === 1 ? "hodina" : value >= 2 && value <= 4 ? "hodiny" : "hodin"}`; }

export default function AbsenceScreen() {
  const colors = useColors();
  const { data, loading, refreshing, error, cacheAge, fromCache, refresh } = useBakalariAbsence();
  const totals = data?.totals; const threshold = data?.thresholdPercent ?? null;

  const renderSubject = (item: AbsenceSubject) => {
    const over = threshold != null && item.percent >= threshold; const barColor = over ? colors.error : item.color;
    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-base font-bold text-foreground">{item.subject}</Text>
          <Text className="text-sm font-bold" style={{ color: barColor }}>{item.percent.toLocaleString("cs-CZ")} %</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.border }]}><View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, item.percent)}%`, backgroundColor: barColor }} /></View>
        <Text className="mt-2 text-xs text-muted">{item.absence} z {item.lessons} hodin{item.late ? ` · pozdě ${item.late}×` : ""}{item.soon ? ` · dříve ${item.soon}×` : ""}{over ? " · nad limitem" : ""}</Text>
      </View>
    );
  };

  const renderDay = ({ item }: { item: AbsenceDay }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-foreground">{item.dateLabel}</Text>
        {item.unsolved ? <View style={[styles.badge, { backgroundColor: `${colors.warning}22` }]}><Text className="text-xs font-bold text-warning">neomluveno · {item.unsolved}</Text></View> : null}
      </View>
      <Text className="mt-2 text-xs leading-5 text-muted">
        {[item.ok ? `omluveno ${hours(item.ok)}` : "", item.missed ? `neomluveno ${hours(item.missed)}` : "", item.school ? `škola ${hours(item.school)}` : "", item.late ? `pozdě ${item.late}×` : "", item.soon ? `dříve ${item.soon}×` : ""].filter(Boolean).join(" · ") || "bez zameškaných hodin"}
      </Text>
    </View>
  );

  const emptyState = loading ? <View className="items-center rounded-2xl bg-surface p-6"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Načítám absenci…</Text></View> : error ? <View className="rounded-2xl bg-surface p-5"><Text className="text-sm font-bold text-foreground">Absenci se nepodařilo načíst</Text><Text className="mt-2 text-xs leading-5 text-muted">{error}</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text className="text-sm font-bold text-primary">Zkusit znovu</Text><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /></Pressable></View> : <View className="items-center rounded-2xl bg-surface p-6"><IconSymbol name="checkmark.circle.fill" size={30} color={colors.success} /><Text className="mt-3 text-base font-bold text-foreground">Žádná absence</Text><Text className="mt-1 text-center text-sm text-muted">Škola nevrátila žádné zameškané hodiny.</Text></View>;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={[] as AbsenceDay[]} keyExtractor={(item) => item.date} renderItem={null} showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={() => { ping(); refresh(); }} contentContainerStyle={styles.list}
        ListHeaderComponent={<View>
          <View className="pt-3"><View className="flex-row items-center justify-between"><View><Text className="text-sm font-semibold text-primary">Docházka</Text><Text className="mt-1 text-3xl font-bold text-foreground">Absence</Text></View><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /></Pressable></View>{fromCache ? <Text className="mt-1 text-xs font-semibold text-warning">Offline cache · {cacheAge ?? "uloženo"}{refreshing ? " · synchronizuji…" : ""}</Text> : null}</View>
          {totals ? <View className="mt-6 flex-row gap-3">
            <View className="flex-1 rounded-3xl bg-primary p-4"><Text className="text-xs font-bold uppercase" style={{ color: "#DCEAFF" }}>Omluveno</Text><Text className="mt-1 text-3xl font-bold text-white">{totals.ok}</Text></View>
            <View className="flex-1 rounded-3xl p-4" style={{ backgroundColor: totals.unsolved || totals.missed ? colors.error : colors.success }}><Text className="text-xs font-bold uppercase" style={{ color: "#FFFFFFCC" }}>Neomluveno</Text><Text className="mt-1 text-3xl font-bold text-white">{Math.max(totals.missed, totals.unsolved)}</Text></View>
          </View> : null}
          {data?.subjects.length ? <View className="mt-7"><Text className="mb-1 text-xl font-bold text-foreground">Podle předmětů</Text>{threshold != null ? <Text className="mb-3 text-xs text-muted">Limit školy: {threshold.toLocaleString("cs-CZ")} % zameškaných hodin</Text> : <View className="mb-3" />}<SwipeCardDeck cards={data.subjects.map((item) => ({ key: item.id, content: renderSubject(item) }))} accessibilityLabel="Absence podle předmětů" /></View> : null}
          {data?.days.length ? <Text className="mb-3 mt-4 text-xl font-bold text-foreground">Po dnech</Text> : null}
          {data?.days.length ? <SwipeCardDeck cards={data.days.map((item) => ({ key: item.date, content: renderDay({ item }) }))} accessibilityLabel="Absence podle dnů" /> : null}
          {data?.subjects.length || data?.days.length ? null : emptyState}
        </View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  card: { marginBottom: 10, borderRadius: 18, padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  track: { marginTop: 10, height: 6, borderRadius: 3, overflow: "hidden" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retry: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
