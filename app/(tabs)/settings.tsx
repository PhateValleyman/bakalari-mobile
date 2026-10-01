import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthState } from "@/lib/auth-context";
import { bakalariCache } from "@/lib/bakalari-cache";
import { cancelHomeworkReminders, getRemindersEnabled, requestReminderPermission, setRemindersEnabled, syncHomeworkReminders } from "@/lib/homework-reminders";
import { exportLocalBackup, importLocalBackup } from "@/lib/local-backup";
import { THEME_STORAGE_KEY, useThemeContext } from "@/lib/theme-provider";

export default function SettingsScreen() {
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { user, signOut } = useAuthState();
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState(false);

  useEffect(() => { void getRemindersEnabled().then(setReminders); }, []);

  const toggleReminders = async (value: boolean) => {
    if (!value) { setReminders(false); await setRemindersEnabled(false); await cancelHomeworkReminders(); return; }
    const permission = await requestReminderPermission();
    if (permission !== "granted") {
      Alert.alert(permission === "unsupported" ? "Nepodporováno" : "Oznámení jsou zakázána", permission === "unsupported" ? "Lokální upozornění fungují jen v mobilní aplikaci." : "Povol oznámení pro Bakaláře v nastavení telefonu.");
      return;
    }
    setReminders(true); await setRemindersEnabled(true);
    const cached = user?.schoolUrl ? await bakalariCache.readHomeworks(user.schoolUrl) : null;
    if (cached) await syncHomeworkReminders(cached.data);
  };

  const runBackup = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await action(); Alert.alert("Hotovo", success); }
    catch (error) { Alert.alert("Záloha se nezdařila", error instanceof Error ? error.message : "Operaci se nepodařilo dokončit."); }
    finally { setBusy(false); }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const count = await importLocalBackup();
      if (!count) return;
      const restoredTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (restoredTheme === "light" || restoredTheme === "dark") setColorScheme(restoredTheme);
      Alert.alert("Obnova dokončena", `Obnoveno položek: ${count}. Pro načtení obnovených dat potáhni seznamy dolů.`);
    } catch (error) { Alert.alert("Obnova se nezdařila", error instanceof Error ? error.message : "Soubor se nepodařilo načíst."); }
    finally { setBusy(false); }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View className="pt-3"><Text className="text-sm font-semibold text-primary">Aplikace</Text><Text className="mt-1 text-3xl font-bold text-foreground">Nastavení</Text><Text className="mt-1 text-sm text-muted">Přizpůsob si aplikaci a spravuj lokální data.</Text></View>

        <View className="mt-6 overflow-hidden rounded-3xl bg-surface" style={styles.card}>
          <View className="flex-row items-center gap-3 p-4"><View className="rounded-xl p-2" style={{ backgroundColor: `${colors.primary}18` }}><IconSymbol name="settings" size={21} color={colors.primary} /></View><View className="flex-1"><Text className="text-base font-bold text-foreground">Vzhled aplikace</Text><Text className="mt-1 text-xs text-muted">Aktuálně: {colorScheme === "dark" ? "tmavé téma" : "světlé téma"}</Text></View><Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View>
        </View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Upozornění</Text>
        <View className="overflow-hidden rounded-3xl bg-surface" style={styles.card}>
          <View className="flex-row items-center gap-3 p-4"><View className="rounded-xl p-2" style={{ backgroundColor: `${colors.primary}18` }}><IconSymbol name="bell.fill" size={21} color={colors.primary} /></View><View className="flex-1"><Text className="text-base font-bold text-foreground">Termíny úkolů</Text><Text className="mt-1 text-xs leading-5 text-muted">Připomene nedokončené úkoly den předem v 18:00 a v den termínu v 7:00.</Text></View><Switch value={reminders} onValueChange={(value) => { void toggleReminders(value); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View>
        </View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Lokální záloha</Text>
        <View className="overflow-hidden rounded-3xl bg-surface" style={styles.card}>
          <Text className="p-4 pb-2 text-xs leading-5 text-muted">Záloha obsahuje rozvrh, známky, úkoly a volbu tématu. Přihlašovací tokeny se nikdy neexportují.</Text>
          <Pressable disabled={busy} onPress={() => { void runBackup(exportLocalBackup, "Soubor zálohy byl připraven ke sdílení nebo stažení."); }} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, busy && styles.disabled]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Exportovat zálohu</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable disabled={busy} onPress={() => { void restore(); }} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, busy && styles.disabled]}><IconSymbol name="book.closed" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Obnovit ze souboru</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>
        </View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Školní účet</Text>
        <View className="rounded-3xl bg-surface p-4" style={styles.card}><Text className="text-sm font-bold text-foreground">{user?.email ?? "—"}</Text><Text className="mt-1 text-xs text-muted">{user?.schoolUrl ?? "Škola není připojená"}</Text><Pressable onPress={() => Alert.alert("Odhlásit se?", "Lokální cache zůstane v zařízení.", [{ text: "Zrušit", style: "cancel" }, { text: "Odhlásit", style: "destructive", onPress: () => { void signOut(); } }])} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-error">Odhlásit se</Text></Pressable></View>
        <Text className="mb-6 mt-6 text-center text-xs text-muted">Bakaláři Mobile · lokální data zůstávají pod tvou kontrolou.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: 28 }, card: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, divider: { height: 1, marginLeft: 48 }, logoutButton: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 14 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.45 } });
