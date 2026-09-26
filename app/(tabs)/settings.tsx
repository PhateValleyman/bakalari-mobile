import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { exportBackup, importBackup } from "@/lib/backup";
import { useAuthState } from "@/lib/auth-context";
import { useThemeContext } from "@/lib/theme-provider";

function ping() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user } = useAuthState();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [busy, setBusy] = useState(false);
  const isDark = colorScheme === "dark";

  const handleExport = async () => {
    if (!user || busy) return;
    ping();
    setBusy(true);
    try {
      await exportBackup(user, colorScheme);
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
      if (backup.theme) setColorScheme(backup.theme);
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
            <View className="rounded-2xl p-3" style={{ backgroundColor: `${colors.primary}18` }}>
              <IconSymbol name={isDark ? "moon" : "sun"} size={22} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">Tmavý režim</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">Volba se uloží i po restartu aplikace.</Text>
            </View>
            <Switch value={isDark} onValueChange={(value) => { ping(); setColorScheme(value ? "dark" : "light"); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
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
  action: { marginTop: 12, minHeight: 50, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
});
