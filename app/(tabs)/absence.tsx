import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariAbsence } from "@/hooks/use-bakalari-data";
import type { AbsenceDay, AbsenceSubject } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

type HistoryItem =
  | { type: "day"; value: AbsenceDay }
  | { type: "subject"; value: AbsenceSubject };

type HistorySection = {
  title: string;
  description: string;
  data: HistoryItem[];
};

const EMPTY_DAYS: AbsenceDay[] = [];
const EMPTY_SUBJECTS: AbsenceSubject[] = [];

export default function AbsenceScreen() {
  const colors = useColors();
  const { data, loading, refreshing, error, cacheAge, fromCache, refresh } = useBakalariAbsence();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const subjects = data?.subjects ?? EMPTY_SUBJECTS;
  const days = data?.days ?? EMPTY_DAYS;
  const shouldShowEmpty = !loading && (Boolean(error) || (!days.length && !subjects.length));

  const sections = useMemo<HistorySection[]>(() => [
    {
      title: "Historie podle dnů",
      description: "Klepnutím rozbalíš podrobný součet konkrétního dne.",
      data: days.map((value) => ({ type: "day", value })),
    },
    {
      title: "Přehled podle předmětů",
      description: "Předměty jsou dostupné, pokud je škola poskytuje v API.",
      data: subjects.map((value) => ({ type: "subject", value })),
    },
  ], [days, subjects]);

  const renderDay = (item: AbsenceDay) => {
    const isExpanded = expandedDay === item.date;
    const totalEvents = item.missed + item.late + item.soon + item.school + item.unsolved;
    return (
      <Pressable
        onPress={() => {
          ping();
          setExpandedDay(isExpanded ? null : item.date);
        }}
        style={({ pressed }) => [styles.historyCard, { backgroundColor: colors.surface }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Absence ${item.dateLabel}`}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${colors.primary}16` }}>
            <IconSymbol name="calendar" size={21} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">{item.dateLabel}</Text>
            <Text className="mt-1 text-xs text-muted">
              {item.missed} zameškané · {item.late} pozdě · {item.ok} omluvené
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-bold" style={{ color: item.missed > 0 ? colors.error : colors.success }}>
              {totalEvents}
            </Text>
            <IconSymbol name={isExpanded ? "chevron.left" : "chevron.right"} size={17} color={colors.muted} />
          </View>
        </View>
        {isExpanded ? (
          <View className="mt-4 flex-row flex-wrap gap-2 border-t border-border pt-3">
            <DetailPill label="Zameškané" value={item.missed} color={colors.error} />
            <DetailPill label="Pozdě" value={item.late} color={colors.warning} />
            <DetailPill label="Brzký odchod" value={item.soon} color={colors.primary} />
            <DetailPill label="Školní akce" value={item.school} color={colors.success} />
            <DetailPill label="Nevyřešené" value={item.unsolved} color={colors.error} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderSubject = (item: AbsenceSubject) => {
    const limit = data?.thresholdPercent ?? 18;
    const overLimit = item.percent >= limit;
    return (
      <View className="mb-3 rounded-2xl bg-surface p-4" style={styles.subjectCard}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color}20` }}>
              <IconSymbol name="book.closed" size={18} color={item.color} />
            </View>
            <Text className="flex-1 text-base font-bold text-foreground">{item.subject}</Text>
          </View>
          <Text className="text-sm font-bold" style={{ color: overLimit ? colors.error : colors.primary }}>
            {item.percent.toFixed(1).replace(".", ",")} %
          </Text>
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.border }}>
          <View className="h-2 rounded-full" style={{ width: `${Math.min(100, item.percent)}%`, backgroundColor: overLimit ? colors.error : item.color }} />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-muted">{item.absence} zameškaných z {item.lessons} hodin</Text>
          <Text className="text-xs font-semibold text-muted">pozdě: {item.late}</Text>
        </View>
      </View>
    );
  };

  const emptyState = loading ? (
    <View className="items-center rounded-2xl bg-surface p-6">
      <ActivityIndicator color={colors.primary} />
      <Text className="mt-3 text-sm text-muted">Načítám historii absence…</Text>
    </View>
  ) : error ? (
    <View className="rounded-2xl bg-surface p-5">
      <Text className="text-sm font-bold text-foreground">Absenci se nepodařilo načíst</Text>
      <Text className="mt-2 text-xs leading-5 text-muted">{error}</Text>
      <Pressable onPress={() => { ping(); refresh(); }} style={styles.retry}>
        <Text className="text-sm font-bold text-primary">Zkusit znovu</Text>
        <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
      </Pressable>
    </View>
  ) : (
    <View className="items-center rounded-2xl bg-surface p-6">
      <IconSymbol name="info.circle" size={30} color={colors.primary} />
      <Text className="mt-3 text-base font-bold text-foreground">Žádná data absence</Text>
      <Text className="mt-1 text-center text-sm text-muted">Škola neposkytla historii absence.</Text>
    </View>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <SectionList<HistoryItem, HistorySection>
        sections={sections}
        keyExtractor={(item, index) => item.type === "day" ? `day-${item.value.date}-${index}` : `subject-${item.value.id}`}
        renderItem={({ item }) => item.type === "day" ? renderDay(item.value) : renderSubject(item.value)}
        renderSectionHeader={({ section }) => (
          <View className="mb-3 mt-6">
            <Text className="text-xl font-bold text-foreground">{section.title}</Text>
            <Text className="mt-1 text-xs text-muted">{section.description}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={() => { ping(); refresh(); }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-center justify-between pt-3">
              <View>
                <Text className="text-sm font-semibold text-primary">Docházka školy</Text>
                <Text className="mt-1 text-3xl font-bold text-foreground">Absence</Text>
              </View>
              <Pressable onPress={() => { ping(); refresh(); }} style={styles.iconButton} accessibilityLabel="Obnovit absenci">
                <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-muted">Historie zameškaných hodin podle dnů a předmětů.</Text>
            {fromCache ? <Text className="mt-1 text-xs font-semibold text-warning">Offline cache · {cacheAge ?? "uloženo"}</Text> : null}
            <View className="mt-6 flex-row gap-2">
              <Metric label="Zameškané" value={data?.totals.missed} loading={loading} color={colors.error} />
              <Metric label="Pozdě" value={data?.totals.late} loading={loading} color={colors.warning} />
              <Metric label="Dny" value={days.length} loading={loading} color={colors.primary} />
            </View>
            {shouldShowEmpty ? emptyState : null}
          </View>
        }
        ListEmptyComponent={null}
        ListFooterComponent={days.length || subjects.length ? <Text className="mb-5 mt-3 text-center text-xs leading-5 text-muted">Historie dnů obsahuje souhrny z API. Rozpad podle předmětů závisí na oprávnění školy.</Text> : null}
      />
    </ScreenContainer>
  );
}

function DetailPill({ label, value, color }: { label: string; value: number; color: string }) {
  return <View className="rounded-xl px-3 py-2" style={{ backgroundColor: `${color}16` }}><Text className="text-[11px] font-semibold" style={{ color }}>{label}</Text><Text className="mt-0.5 text-base font-bold" style={{ color }}>{value}</Text></View>;
}

function Metric({ label, value, loading, color }: { label: string; value?: number; loading: boolean; color: string }) {
  return <View className="flex-1 rounded-2xl bg-surface p-3" style={styles.metricCard}><Text className="text-xs font-semibold text-muted">{label}</Text><Text className="mt-1 text-2xl font-bold" style={{ color }}>{loading ? "…" : value ?? 0}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  historyCard: { marginBottom: 10, borderRadius: 18, padding: 15, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  subjectCard: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  metricCard: { minHeight: 78 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retry: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
