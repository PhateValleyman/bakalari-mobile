import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { initialHomework, type Homework } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function HomeworkScreen() {
  const colors = useColors();
  const [homework, setHomework] = useState(initialHomework);
  const [showCompleted, setShowCompleted] = useState(false);
  const visibleHomework = useMemo(() => homework.filter((item) => showCompleted || !item.completed), [homework, showCompleted]);
  const openCount = homework.filter((item) => !item.completed).length;

  const toggleHomework = (id: string) => {
    ping();
    setHomework((items) => items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const renderHomework = ({ item }: { item: Homework }) => (
    <Pressable onPress={() => toggleHomework(item.id)} style={({ pressed }) => [styles.taskCard, pressed && styles.pressed]}>
      <View className="flex-row items-start gap-3">
        <View className="pt-1">
          <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: item.completed ? colors.success : "transparent", borderWidth: item.completed ? 0 : 2, borderColor: item.color }}>
            {item.completed ? <IconSymbol name="checkmark.circle.fill" size={24} color="#FFFFFF" /> : <IconSymbol name="circle" size={24} color={item.color} />}
          </View>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className={`text-xs font-bold ${item.completed ? "text-muted" : "text-primary"}`}>{item.subject}</Text>
            <View className="flex-row items-center gap-1">
              <IconSymbol name="clock" size={14} color={item.completed ? colors.muted : item.color} />
              <Text className="text-xs font-semibold" style={{ color: item.completed ? colors.muted : item.color }}>{item.completed ? "hotovo" : item.dueLabel}</Text>
            </View>
          </View>
          <Text className={`mt-2 text-base font-bold ${item.completed ? "text-muted line-through" : "text-foreground"}`}>{item.title}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={visibleHomework}
        keyExtractor={(item) => item.id}
        renderItem={renderHomework}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View className="pt-3">
              <Text className="text-sm font-semibold text-primary">Co je potřeba stihnout</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">Úkoly</Text>
              <Text className="mt-1 text-sm text-muted">Měj všechny termíny na jednom místě.</Text>
            </View>
            <View className="mt-6 flex-row items-center justify-between rounded-3xl bg-primary p-5" style={styles.summaryCard}>
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: "#DCEAFF" }}>K dokončení</Text>
                <Text className="mt-1 text-3xl font-bold text-white">{openCount}</Text>
                <Text className="mt-1 text-sm" style={{ color: "#DCEAFF" }}>{openCount === 1 ? "otevřený úkol" : "otevřené úkoly"}</Text>
              </View>
              <View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF22" }}>
                <IconSymbol name="checklist" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View className="mb-4 mt-7 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Seznam</Text>
              <Pressable
                onPress={() => {
                  ping();
                  setShowCompleted((value) => !value);
                }}
                style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
              >
                <Text className="text-xs font-bold text-primary">{showCompleted ? "Skrýt hotové" : "Zobrazit hotové"}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<View className="items-center rounded-2xl bg-surface p-6"><IconSymbol name="checkmark.circle.fill" size={30} color={colors.success} /><Text className="mt-3 text-base font-bold text-foreground">Vše hotovo</Text><Text className="mt-1 text-center text-sm text-muted">Máš volno. Užij si den.</Text></View>}
        ListFooterComponent={<Text className="mt-5 mb-4 text-center text-xs leading-5 text-muted">Klepnutím označíš úkol jako hotový.</Text>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  summaryCard: { shadowColor: "#2F7DF6", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  taskCard: { marginBottom: 10, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  filterButton: { borderRadius: 999, backgroundColor: "#E5EEFF", paddingHorizontal: 12, paddingVertical: 8 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
