import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { exportBackup, importBackup } from "@/lib/backup";
import { useAuthState } from "@/lib/auth-context";
import { bakalariCache } from "@/lib/bakalari-cache";
import { cancelHomeworkNotifications, requestHomeworkNotificationPermission, scheduleHomeworkNotifications } from "@/lib/homework-notifications";
import { getHomeworkNotificationsEnabled, setHomeworkNotificationsEnabled } from "@/lib/notification-settings";
import { useThemeContext } from "@/lib/theme-provider";

function ping() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user } = useAuthState();
  const { colorScheme, themeVariant, accentColor, setColorScheme, setThemeVariant, setAccentColor } = useThemeContext();
  const [busy, setBusy] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    void getHomeworkNotificationsEnabled().then(setNotificationsEnabled);
  }, []);

  const handleNotificationsChanged = async (enabled: boolean) => {
    ping();
    setNotificationsEnabled(enabled);
    await setHomeworkNotificationsEnabled(enabled);
    if (!enabled) {
      await cancelHomeworkNotifications();
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Upozornění jsou pro mobil", "Na webovém náhledu se místní upozornění nespouštějí. V nativní aplikaci budou fungovat na pozadí.");
      return;
    }
    const granted = await requestHomeworkNotificationPermission();
    if (!granted) {
      setNotificationsEnabled(false);
      await setHomeworkNotificationsEnabled(false);
      Alert.alert("Oprávnění zamítnuto", "Povol upozornění v nastavení zařízení, aby aplikace mohla hlídat termíny úkolů.");
      return;
    }
    const cached = user ? await bakalariCache.readHomework(user.schoolUrl) : null;
    const count = await scheduleHomeworkNotifications(cached?.data ?? []);
    Alert.alert("Upozornění zapnutá", count ? `Naplánováno ${count} připomenutí podle uložených úkolů.` : "Aktuálně nejsou naplánována žádná budoucí připomenutí.");
  };

  const handleExport = async () => {
    if (!user || busy) return;
    ping();
    setBusy(true);
    try {
      await exportBackup(user, themeVariant === "black" ? "black" : colorScheme);
    } catch (error) {
      Alert.alert("Záloha se nepodařila", error instanceof Error ? error.message : "Soubor se nepodařilo vytvořit.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!user || busy) return;
    ping();
    setBusy(true);
    try {
      const backup = await importBackup(user.schoolUrl);
      if (backup.theme === "black") setThemeVariant("black");
      else if (backup.theme) setColorScheme(backup.theme);
      if (backup.exportedAt) {
        Alert.alert("Obnova dokončena", `Data ze zálohy z ${new Date(backup.exportedAt).toLocaleString("cs-CZ")} jsou připravena v offline cache.`);
      }
    } catch (error) {
      Alert.alert("Obnova se nepodařila", error instanceof Error ? error.message : "Soubor se nepodařilo načíst.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View className="pt-3">
          <Text className="text-sm font-semibold text-primary">Bakaláři Mobile</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">Nastavení</Text>
          <Text className="mt-1 text-sm text-muted">Přizpůsob si aplikaci a spravuj offline data.</Text>
        </View>

        <View className="mt-7 rounded-3xl bg-surface p-5" style={[styles.card, { backgroundColor: colors.surface }]}>
          <View className="flex-row items-center gap-3">
            <View className="rounded-2xl p-3" style={{ backgroundColor: `${colors.primary}18` }}><IconSymbol name={themeVariant === "light" ? "sun" : "moon"} size={22} color={colors.primary} /></View>
            <View className="flex-1"><Text className="text-base font-bold text-foreground">Vzhled aplikace</Text><Text className="mt-1 text-xs leading-5 text-muted">Předvolba se uloží i po restartu aplikace.</Text></View>
          </View>
          <View className="mt-4 flex-row gap-2"><Pressable onPress={() => { ping(); setThemeVariant("system"); }} style={({ pressed }) => [styles.themeChip, themeVariant === "system" && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: themeVariant === "system" ? "#FFF" : colors.muted }}>Systém</Text></Pressable><Pressable onPress={() => { ping(); setThemeVariant("light"); }} style={({ pressed }) => [styles.themeChip, themeVariant === "light" && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: themeVariant === "light" ? "#FFF" : colors.muted }}>Světlý</Text></Pressable><Pressable onPress={() => { ping(); setThemeVariant("dark"); }} style={({ pressed }) => [styles.themeChip, themeVariant === "dark" && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: themeVariant === "dark" ? "#FFF" : colors.muted }}>Tmavý</Text></Pressable><Pressable onPress={() => { ping(); setThemeVariant("black"); }} style={({ pressed }) => [styles.themeChip, themeVariant === "black" && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: themeVariant === "black" ? "#FFF" : colors.muted }}>Černý</Text></Pressable></View>
          <Text className="mt-4 text-xs font-bold text-muted">Akcentní barva</Text>
          <View className="mt-2 flex-row gap-3">{["#2F7DF6", "#8B5CF6", "#0F9D8A", "#E07A35", "#D94F70"].map((color) => <Pressable key={color} accessibilityLabel={`Akcentní barva ${color}`} onPress={() => { ping(); setAccentColor(color); }} style={({ pressed }) => [styles.colorSwatch, { backgroundColor: color }, accentColor === color && styles.colorSwatchActive, pressed && styles.pressed]} />)}</View>
          <View className="my-5 h-px" style={{ backgroundColor: colors.border }} />
          <View className="flex-row items-center gap-3">
            <View className="rounded-2xl p-3" style={{ backgroundColor: `${colors.warning}18` }}>
              <IconSymbol name="bell.fill" size={22} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">Termíny úkolů</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">Připomene den předem a ráno v den termínu.</Text>
            </View>
            <Switch value={notificationsEnabled} onValueChange={(value) => void handleNotificationsChanged(value)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Záloha a obnova</Text>
        <View className="rounded-3xl bg-surface p-5" style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text className="text-sm leading-5 text-muted">Záloha obsahuje nastavení a poslední uložený rozvrh, známky a úkoly. Přístupové údaje se do souboru nikdy neukládají.</Text>
          <Pressable disabled={busy} onPress={() => void handleExport()} style={({ pressed }) => [styles.action, { backgroundColor: `${colors.primary}12` }, pressed && styles.pressed, busy && styles.disabled]}>
            <IconSymbol name="arrow.down.circle" size={20} color={colors.primary} />
            <Text className="flex-1 text-sm font-bold text-primary">{busy ? "Pracuji…" : "Vytvořit zálohu"}</Text>
            <IconSymbol name="chevron.right" size={18} color={colors.primary} />
          </Pressable>
          <Pressable disabled={busy} onPress={() => void handleImport()} style={({ pressed }) => [styles.action, { backgroundColor: `${colors.border}55` }, pressed && styles.pressed, busy && styles.disabled]}>
            <IconSymbol name="arrow.up.circle" size={20} color={colors.foreground} />
            <Text className="flex-1 text-sm font-bold text-foreground">Obnovit ze souboru</Text>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View className="mt-7 rounded-2xl border border-border p-4">
          <View className="flex-row items-center gap-3">
            <IconSymbol name="person.crop.circle" size={21} color={colors.muted} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">Připojený účet</Text>
              <Text className="mt-1 text-xs text-muted">{user?.email ?? "—"}</Text>
              <Text className="mt-1 text-xs text-muted">{user?.schoolUrl ?? "—"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  card: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  themeChip: { borderRadius: 999, backgroundColor: "#EEF2F8", paddingHorizontal: 11, paddingVertical: 8 },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  colorSwatchActive: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#172033", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  action: { marginTop: 12, minHeight: 50, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
});
