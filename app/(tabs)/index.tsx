import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthState } from "@/lib/auth-context";
import { initialHomework, schedule, todayKey, type ScheduleItem } from "@/shared/bakalari-data";

const dateLabel = "Pátek 25. září";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function HomeScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthState();
  const todaysSchedule = useMemo(() => schedule[todayKey] ?? [], []);
  const openHomework = initialHomework.filter((item) => !item.completed).length;
  const displayName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : "Jonáš";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleConnectionInfo = () => {
    ping();
    Alert.alert(
      "Připojení školy",
      `Účet: ${user?.email ?? "—"}\nServer: ${user?.schoolUrl ?? "—"}\n\nAccess token se obnovuje automaticky přes refresh token. Přehledná data v této MVP verzi jsou zatím lokální ukázka.`,
      [{ text: "Rozumím", style: "default" }],
    );
  };

  const renderScheduleItem = ({ item }: { item: ScheduleItem }) => (
    <View style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text className="text-sm font-bold text-foreground">{item.time}</Text>
        <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
      </View>
      <View className="flex-1 rounded-2xl bg-surface px-4 py-3" style={styles.lessonCard}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">{item.subject}</Text>
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${item.color}18` }}>
            <Text style={{ color: item.color }} className="text-xs font-bold">{item.room}</Text>
          </View>
        </View>
        <Text className="mt-1 text-xs text-muted">{item.teacher}</Text>
        {item.note ? <Text className="mt-2 text-xs font-semibold text-primary">{item.note}</Text> : null}
      </View>
    </View>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={todaysSchedule}
        keyExtractor={(item) => item.id}
        renderItem={renderScheduleItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-center justify-between pt-3">
              <View>
                <Text className="text-sm font-semibold text-primary">Bakaláři Mobile</Text>
                <Text className="mt-1 text-3xl font-bold text-foreground">Ahoj, {displayName}</Text>
                <Text className="mt-1 text-sm text-muted">{dateLabel} · {user?.schoolUrl ?? "lokální náhled"}</Text>
              </View>
              <Pressable
                accessibilityLabel="Otevřít profil"
                onPress={() => {
                  ping();
                  Alert.alert("Profil", `${user?.email ?? "demo@example.cz"}\n\nToto je lokální náhled session.`, [
                    { text: "Zůstat přihlášen", style: "cancel" },
                    { text: "Odhlásit se", style: "destructive", onPress: () => { void signOut().then(() => router.replace("/login")); } },
                  ]);
                }}
                style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              >
                <Text className="text-lg font-bold text-primary">{initials}</Text>
              </Pressable>
            </View>

            <View className="mt-5 rounded-3xl bg-primary p-5" style={styles.heroCard}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: "#DCEAFF" }}>Dnešní program</Text>
                  <Text className="mt-2 text-2xl font-bold text-white">{todaysSchedule.length} vyučovací hodiny</Text>
                  <Text className="mt-1 text-sm" style={{ color: "#DCEAFF" }}>Nejbližší hodina začíná v {todaysSchedule[0]?.time ?? "—"}.</Text>
                </View>
                <View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF22" }}>
                  <IconSymbol name="calendar" size={25} color="#FFFFFF" />
                </View>
              </View>
              <Pressable
                onPress={() => {
                  ping();
                  router.push("/schedule");
                }}
                style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
              >
                <Text className="text-sm font-bold text-primary">Zobrazit celý rozvrh</Text>
                <IconSymbol name="chevron.right" size={18} color={colors.primary} />
              </Pressable>
            </View>

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-surface p-4" style={styles.metricCard}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-muted">Průměr</Text>
                  <IconSymbol name="chart.bar.fill" size={18} color="#2F7DF6" />
                </View>
                <Text className="mt-2 text-2xl font-bold text-foreground">1,4</Text>
                <Text className="mt-1 text-xs font-semibold" style={{ color: colors.success }}>+0,2 tento měsíc</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-surface p-4" style={styles.metricCard}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-muted">Úkoly</Text>
                  <IconSymbol name="checklist" size={18} color="#F0A33A" />
                </View>
                <Text className="mt-2 text-2xl font-bold text-foreground">{openHomework}</Text>
                <Text className="mt-1 text-xs font-semibold text-warning">čekají na odevzdání</Text>
              </View>
            </View>

            <View className="mt-7 mb-3 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Dnešní rozvrh</Text>
              <Pressable
                onPress={() => router.push("/schedule")}
                style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
              >
                <Text className="text-sm font-bold text-primary">Vše</Text>
                <IconSymbol name="chevron.right" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          <View className="mt-6 mb-4 rounded-2xl border border-border bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <View className="rounded-xl p-2" style={{ backgroundColor: "#2F7DF618" }}>
                <IconSymbol name="link" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">Škola je připojená</Text>
                <Text className="mt-1 text-xs leading-5 text-muted">Přihlášení proběhlo přes Bakaláři API. Obsah přehledu je zatím lokální ukázka připravená pro další synchronizaci.</Text>
              </View>
            </View>
            <Pressable onPress={handleConnectionInfo} style={({ pressed }) => [styles.connectButton, pressed && styles.pressed]}>
              <Text className="text-sm font-bold text-primary">Zobrazit stav připojení</Text>
              <IconSymbol name="info.circle" size={17} color={colors.primary} />
            </Pressable>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  heroCard: { shadowColor: "#2F7DF6", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  metricCard: { minHeight: 116, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  avatarButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#E5EEFF" },
  heroAction: { marginTop: 18, backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingLeft: 8 },
  timelineRow: { flexDirection: "row", alignItems: "stretch", gap: 10, marginBottom: 10 },
  timeColumn: { width: 44, alignItems: "center", paddingTop: 14, gap: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  lessonCard: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  connectButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
