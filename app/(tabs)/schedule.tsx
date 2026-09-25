import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariSchedule } from "@/hooks/use-bakalari-data";
import { todayIsoDate, type ScheduleDay } from "@/lib/bakalari-data";
import type { ScheduleItem } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function ScheduleScreen() {
  const colors = useColors();
  const { data: week, loading, error, refresh } = useBakalariSchedule();
  const [selectedDayKey, setSelectedDayKey] = useState("");

  useEffect(() => {
    if (!week?.days.length) return;
    const today = week.days.find((day) => day.date === todayIsoDate());
    setSelectedDayKey((current) => current && week.days.some((day) => day.key === current) ? current : today?.key ?? week.days[0].key);
  }, [week]);

  const selectedDay = useMemo<ScheduleDay | null>(
    () => week?.days.find((day) => day.key === selectedDayKey) ?? week?.days[0] ?? null,
    [selectedDayKey, week],
  );
  const lessons = selectedDay?.lessons ?? [];

  const renderLesson = ({ item, index }: { item: ScheduleItem; index: number }) => (
    <View style={styles.lessonRow}>
      <View style={styles.timeBlock}>
        <Text className="text-sm font-bold text-foreground">{item.time}</Text>
        <View className="mt-1 h-7 w-px" style={{ backgroundColor: colors.border }} />
      </View>
      <View className="flex-1 rounded-2xl bg-surface p-4" style={[styles.lessonCard, { borderLeftColor: item.color }]}> 
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View style={[styles.subjectDot, { backgroundColor: item.color }]} />
            <Text className="flex-1 text-base font-bold text-foreground">{item.subject}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <IconSymbol name="location" size={15} color={colors.muted} />
            <Text className="text-xs font-semibold text-muted">{item.room}</Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-muted">{item.teacher || "Učitel neuveden"}</Text>
          <Text className="text-xs font-semibold text-muted">{index + 1}. hodina</Text>
        </View>
        {item.note ? (
          <View className="mt-3 flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: `${item.color}12` }}>
            <IconSymbol name="info.circle" size={16} color={item.color} />
            <Text className="flex-1 text-xs font-semibold" style={{ color: item.color }}>{item.note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const emptyState = loading ? (
    <View className="items-center rounded-2xl bg-surface p-6">
      <ActivityIndicator color={colors.primary} />
      <Text className="mt-3 text-sm text-muted">Načítám aktuální rozvrh…</Text>
    </View>
  ) : error ? (
    <View className="rounded-2xl bg-surface p-5">
      <Text className="text-sm font-bold text-foreground">Rozvrh se nepodařilo načíst</Text>
      <Text className="mt-2 text-xs leading-5 text-muted">{error}</Text>
      <Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text className="text-sm font-bold text-primary">Zkusit znovu</Text>
        <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
      </Pressable>
    </View>
  ) : (
    <Text className="rounded-2xl bg-surface p-5 text-center text-sm text-muted">Na tento den není rozvrh.</Text>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderLesson}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View className="pt-3">
              <Text className="text-sm font-semibold text-primary">Aktuální data školy</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-3xl font-bold text-foreground">Rozvrh</Text>
                <Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-muted">{week?.rangeLabel ?? "Načítám školní týden…"}</Text>
            </View>
            {week?.days.length ? (
              <View className="mt-6 flex-row justify-between rounded-2xl bg-surface p-2" style={styles.dayPicker}>
                {week.days.map((day) => {
                  const active = day.key === (selectedDay?.key ?? selectedDayKey);
                  return (
                    <Pressable
                      key={`${day.key}-${day.date}`}
                      onPress={() => { ping(); setSelectedDayKey(day.key); }}
                      style={({ pressed }) => [styles.dayButton, active && styles.dayButtonActive, pressed && styles.pressed]}
                    >
                      <Text className="text-xs font-semibold" style={{ color: active ? "#FFFFFF" : colors.muted }}>{day.label}</Text>
                      <Text className="mt-1 text-base font-bold" style={{ color: active ? "#FFFFFF" : colors.foreground }}>{day.date ? Number(day.date.split("-")[2]) : "—"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <View className="mb-4 mt-7 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">{selectedDay?.label ?? "Dnes"} {selectedDay?.dateLabel ?? ""}</Text>
              <Text className="text-sm font-semibold text-muted">{loading ? "…" : `${lessons.length} ${lessons.length === 1 ? "hodina" : "hodin"}`}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={emptyState}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  dayPicker: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  dayButton: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 9 },
  dayButtonActive: { backgroundColor: "#2F7DF6", shadowColor: "#2F7DF6", shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lessonRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  timeBlock: { width: 45, alignItems: "center", paddingTop: 15 },
  lessonCard: { borderLeftWidth: 4, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  subjectDot: { width: 9, height: 9, borderRadius: 5 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
