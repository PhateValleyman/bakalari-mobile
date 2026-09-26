import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariSchedule } from "@/hooks/use-bakalari-data";
import { changeLabel, isCurrentLesson, shiftWeekIsoDate, todayIsoDate, type ScheduleDay } from "@/lib/bakalari-data";
import type { ScheduleItem } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function weekTitle(offset: number, permanent: boolean): string {
  if (permanent) return "Stálý rozvrh";
  if (offset === 0) return "Tento týden";
  if (offset === -1) return "Minulý týden";
  if (offset === 1) return "Příští týden";
  return offset > 0 ? `Za ${offset} týdny` : `${Math.abs(offset)} týdny zpět`;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const [weekOffset, setWeekOffset] = useState(0);
  const [permanent, setPermanent] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<ScheduleItem | null>(null);
  const weekStart = shiftWeekIsoDate(weekOffset);
  const { data: week, loading, error, refreshing, cacheAge, fromCache, refresh } = useBakalariSchedule({ date: weekStart, permanent });

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
  const todayDay = week?.days.find((day) => day.date === todayIsoDate());
  const currentLessonId = !permanent && selectedDay?.date === todayIsoDate()
    ? lessons.find((lesson) => isCurrentLesson(lesson.time))?.id
    : undefined;

  const renderLesson = ({ item, index }: { item: ScheduleItem; index: number }) => {
    const active = item.id === currentLessonId;
    const change = changeLabel(item.changeType);
    return (
      <Pressable onPress={() => { ping(); setSelectedLesson(item); }} style={({ pressed }) => [styles.lessonRow, pressed && styles.pressed]}>
        <View style={styles.timeBlock}>
          <Text className="text-sm font-bold text-foreground">{item.time}</Text>
          <Text className="mt-1 text-[10px] font-semibold text-muted">{index + 1}. hod.</Text>
          <View className="mt-1 h-7 w-px" style={{ backgroundColor: colors.border }} />
        </View>
        <View style={[styles.lessonCard, { borderLeftColor: item.cancelled ? colors.error : item.color, backgroundColor: colors.surface }, active && { borderColor: colors.primary, borderWidth: 1, borderLeftWidth: 4 }, item.cancelled && { opacity: 0.68 }]}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <View style={[styles.subjectDot, { backgroundColor: item.cancelled ? colors.error : item.color }]} />
              <Text className="flex-1 text-base font-bold text-foreground">{item.subjectAbbreviation || item.subject}</Text>
              {active ? <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${colors.primary}18` }}><Text className="text-[10px] font-bold text-primary">TEĎ</Text></View> : null}
            </View>
            <View className="flex-row items-center gap-1">
              <IconSymbol name="location" size={15} color={colors.muted} />
              <Text className="text-xs font-semibold text-muted">{item.room}</Text>
            </View>
          </View>
          <Text className="mt-2 text-xs text-muted">{item.subject}</Text>
          <View className="mt-3 flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-xs text-muted">{item.teacherAbbreviation || item.teacher || "Učitel neuveden"}</Text>
            <View className="flex-row items-center gap-2">
              {item.homeworkCount ? <View className="flex-row items-center gap-1"><IconSymbol name="checklist" size={14} color={colors.warning} /><Text className="text-[10px] font-bold text-warning">{item.homeworkCount}</Text></View> : null}
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
          </View>
          {change || item.note ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: `${item.cancelled ? colors.error : item.color}12` }}>
              <IconSymbol name={item.cancelled ? "close.circle" : "info.circle"} size={16} color={item.cancelled ? colors.error : item.color} />
              <Text className="flex-1 text-xs font-semibold" style={{ color: item.cancelled ? colors.error : item.color }}>{change ?? item.note}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const emptyState = loading ? (
    <View className="items-center rounded-2xl bg-surface p-6"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Načítám rozvrh…</Text></View>
  ) : error ? (
    <View className="rounded-2xl bg-surface p-5"><Text className="text-sm font-bold text-foreground">Rozvrh se nepodařilo načíst</Text><Text className="mt-2 text-xs leading-5 text-muted">{error}</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-primary">Zkusit znovu</Text><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /></Pressable></View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View>
            <View className="pt-3">
              <Text className="text-sm font-semibold text-primary">Rychlý offline přehled</Text>
              <View className="mt-1 flex-row items-center justify-between"><Text className="text-3xl font-bold text-foreground">Rozvrh</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, { backgroundColor: `${colors.primary}16` }, pressed && styles.pressed]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /></Pressable></View>
              <View className="mt-1 flex-row items-center justify-between gap-3"><Text className="flex-1 text-sm text-muted">{permanent ? "Opakující se rozvrh školy" : week?.rangeLabel ?? "Načítám školní týden…"}</Text>{fromCache ? <Text className="text-xs font-semibold text-warning">offline · {cacheAge}</Text> : null}</View>
            </View>

            <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-surface p-2" style={styles.weekSwitcher}>
              <Pressable accessibilityLabel="Předchozí týden" onPress={() => { ping(); setPermanent(false); setWeekOffset((value) => value - 1); }} style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}><IconSymbol name="chevron.left" size={19} color={colors.primary} /></Pressable>
              <Pressable onPress={() => { ping(); setPermanent(false); setWeekOffset(0); }} style={({ pressed }) => [styles.weekTitle, pressed && styles.pressed]}><Text className="text-[11px] font-bold uppercase tracking-widest text-primary">{weekTitle(weekOffset, permanent)}</Text><Text className="mt-1 text-sm font-bold text-foreground">{permanent ? "Stálý rozvrh" : week?.rangeLabel ?? "—"}</Text></Pressable>
              <Pressable accessibilityLabel="Následující týden" onPress={() => { ping(); setPermanent(false); setWeekOffset((value) => value + 1); }} style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}><IconSymbol name="chevron.right" size={19} color={colors.primary} /></Pressable>
            </View>
            <View className="mt-3 flex-row gap-2"><Pressable onPress={() => { ping(); setPermanent(false); setWeekOffset(0); }} style={({ pressed }) => [styles.modeChip, !permanent && weekOffset === 0 && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: !permanent && weekOffset === 0 ? "#FFF" : colors.muted }}>Tento týden</Text></Pressable><Pressable onPress={() => { ping(); setPermanent(true); }} style={({ pressed }) => [styles.modeChip, permanent && { backgroundColor: colors.primary }, pressed && styles.pressed]}><IconSymbol name="infinite" size={14} color={permanent ? "#FFF" : colors.muted} /><Text className="text-xs font-bold" style={{ color: permanent ? "#FFF" : colors.muted }}>Stálý</Text></Pressable></View>

            {week?.days.length ? <View className="mt-5 flex-row justify-between rounded-2xl bg-surface p-2" style={styles.dayPicker}>{week.days.map((day) => { const active = day.key === (selectedDay?.key ?? selectedDayKey); return <Pressable key={`${day.key}-${day.date}`} onPress={() => { ping(); setSelectedDayKey(day.key); }} style={({ pressed }) => [styles.dayButton, active && [styles.dayButtonActive, { backgroundColor: colors.primary }], pressed && styles.pressed]}><Text className="text-xs font-semibold" style={{ color: active ? "#FFF" : colors.muted }}>{day.label}</Text><Text className="mt-1 text-base font-bold" style={{ color: active ? "#FFF" : colors.foreground }}>{day.date ? Number(day.date.split("-")[2]) : "—"}</Text>{day.date === todayDay?.date ? <Text className="mt-0.5 text-[9px] font-bold" style={{ color: active ? "#FFF" : colors.primary }}>dnes</Text> : null}</Pressable>; })}</View> : null}
            <View className="mb-4 mt-7 flex-row items-center justify-between"><View className="flex-1"><Text className="text-xl font-bold text-foreground">{selectedDay?.label ?? "Dnes"} {selectedDay?.dateLabel ?? ""}</Text>{selectedDay?.description ? <Text className="mt-1 text-xs font-semibold text-warning">{selectedDay.description}</Text> : null}</View><Text className="text-sm font-semibold text-muted">{loading ? "…" : `${lessons.length} ${lessons.length === 1 ? "hodina" : "hodin"}`}</Text></View>
          </View>
        }
        ListEmptyComponent={emptyState}
        ListFooterComponent={<Text className="mt-2 mb-4 text-center text-xs leading-5 text-muted">Klepni na hodinu pro detaily. Přejetím mezi taby přepneš hlavní části aplikace.</Text>}
      />

      <Modal visible={Boolean(selectedLesson)} transparent animationType="fade" onRequestClose={() => setSelectedLesson(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.surface }]}>{selectedLesson ? <><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-widest text-primary">{selectedLesson.time}</Text><Text className="mt-1 text-2xl font-bold text-foreground">{selectedLesson.subject}</Text></View><Pressable onPress={() => setSelectedLesson(null)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><IconSymbol name="close" size={20} color={colors.muted} /></Pressable></View><View className="mt-5 gap-3"><View className="flex-row items-center gap-3"><IconSymbol name="person.crop.circle" size={20} color={colors.primary} /><Text className="text-sm text-foreground">{selectedLesson.teacher || "Učitel neuveden"}</Text></View><View className="flex-row items-center gap-3"><IconSymbol name="location" size={20} color={colors.primary} /><Text className="text-sm text-foreground">Místnost {selectedLesson.room}</Text></View>{selectedLesson.homeworkCount ? <View className="flex-row items-center gap-3"><IconSymbol name="checklist" size={20} color={colors.warning} /><Text className="text-sm text-foreground">{selectedLesson.homeworkCount} domácí úkol{selectedLesson.homeworkCount === 1 ? "" : "y"}</Text></View> : null}{selectedLesson.note ? <View className="rounded-2xl p-3" style={{ backgroundColor: `${selectedLesson.color}12` }}><Text className="text-sm font-semibold" style={{ color: selectedLesson.color }}>{selectedLesson.note}</Text></View> : null}</View></> : null}</View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  weekSwitcher: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  weekArrow: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  weekTitle: { flex: 1, alignItems: "center", paddingVertical: 4 },
  modeChip: { borderRadius: 999, backgroundColor: "#EEF2F8", paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  dayPicker: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  dayButton: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 9 },
  dayButtonActive: { shadowColor: "#2F7DF6", shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lessonRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  timeBlock: { width: 45, alignItems: "center", paddingTop: 15 },
  lessonCard: { flex: 1, borderLeftWidth: 4, borderRadius: 18, padding: 15, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  subjectDot: { width: 9, height: 9, borderRadius: 5 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalBackdrop: { flex: 1, backgroundColor: "#06101F99", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EEF2F8", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
