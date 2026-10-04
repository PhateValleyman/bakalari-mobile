import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthState } from "@/lib/auth-context";
import { createOfflineUnlockToken, createPairingCode, importPairingCode } from "@/lib/parental-control";
import { useParentalControl } from "@/lib/parental-context";
import { exportLocalBackup, importLocalBackup } from "@/lib/local-backup";
import { THEME_STORAGE_KEY, useThemeContext } from "@/lib/theme-provider";

export default function SettingsScreen() {
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { user, signOut } = useAuthState();
  const { state: parentalState, nativeStatus, setRole, lock } = useParentalControl();
  const [busy, setBusy] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [unlockCode, setUnlockCode] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const runBackup = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await action(); Alert.alert("Hotovo", success); }
    catch (error) { Alert.alert("Operace se nezdařila", error instanceof Error ? error.message : "Operaci se nepodařilo dokončit."); }
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

  const openScanner = async () => {
    if (!permission?.granted) { await requestPermission(); return; }
    setScannerOpen(true);
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View className="pt-3"><Text className="text-sm font-semibold text-primary">Aplikace</Text><Text className="mt-1 text-3xl font-bold text-foreground">Nastavení</Text><Text className="mt-1 text-sm text-muted">Přizpůsob si aplikaci a spravuj lokální data.</Text></View>

        <Text className="mb-3 mt-6 text-xl font-bold text-foreground">Rodičovský režim</Text>
        <View className="rounded-3xl bg-surface p-4" style={styles.card}>
          <Text className="text-sm leading-5 text-muted">Rodičovský účet spravuje kiosk a může tablet odemknout offline. Žákovský režim může tablet uzamknout do dokončení úkolů.</Text>
          <View className="mt-4 flex-row gap-2">
            <RoleButton active={parentalState.role === "parent"} label="Rodič · root" onPress={() => { void setRole("parent"); }} colors={colors} />
            <RoleButton active={parentalState.role === "student"} label="Žák" onPress={() => { void setRole("student"); }} colors={colors} />
          </View>
          <View className="mt-4 rounded-2xl p-3" style={{ backgroundColor: `${nativeStatus.isDeviceOwner ? colors.success : colors.warning}16` }}>
            <Text className="text-xs font-bold" style={{ color: nativeStatus.isDeviceOwner ? colors.success : colors.warning }}>Device Owner: {nativeStatus.isDeviceOwner ? "aktivní" : "zatím není nastavený"}</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">{nativeStatus.isDeviceOwner ? "Tablet může běžet v plném Lock Task Mode." : "Web preview a Expo Go používají jen soft-lock simulaci."}</Text>
          </View>
          {parentalState.role === "student" ? <>
            <Pressable onPress={async () => setPairingCode(await createPairingCode())} style={styles.actionRow}><IconSymbol name="qr-code" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Zobrazit párovací QR pro rodiče</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>
            <Pressable onPress={() => { void lock(); }} style={styles.lockButton}><IconSymbol name="lock" size={20} color={colors.error} /><Text className="flex-1 text-sm font-bold text-error">Uzamknout tablet do dokončení úkolů</Text></Pressable>
          </> : <>
            <Pressable onPress={() => { void openScanner(); }} style={styles.actionRow}><IconSymbol name="qr-code" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Spárovat tablet skenem QR</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>
            <Pressable onPress={async () => { try { setUnlockCode(await createOfflineUnlockToken()); } catch (error) { Alert.alert("Párování chybí", error instanceof Error ? error.message : "Nejdříve spáruj tablet."); } }} style={styles.actionRow}><IconSymbol name="unlock" size={20} color={colors.success} /><Text className="flex-1 text-sm font-bold text-foreground">Vygenerovat offline QR odemčení</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>
          </>}
          {pairingCode ? <QrCard title="Párovací QR" subtitle="Rodič ho naskenuje ve své aplikaci." value={pairingCode} onClose={() => setPairingCode(null)} colors={colors} /> : null}
          {unlockCode ? <QrCard title="QR odemčení" subtitle="Žák ho naskenuje na uzamčeném tabletu. Platí 15 minut." value={unlockCode} onClose={() => setUnlockCode(null)} colors={colors} /> : null}
        </View>

        <View className="mt-6 overflow-hidden rounded-3xl bg-surface" style={styles.card}><View className="flex-row items-center gap-3 p-4"><View className="rounded-xl p-2" style={{ backgroundColor: `${colors.primary}18` }}><IconSymbol name="settings" size={21} color={colors.primary} /></View><View className="flex-1"><Text className="text-base font-bold text-foreground">Vzhled aplikace</Text><Text className="mt-1 text-xs text-muted">Aktuálně: {colorScheme === "dark" ? "tmavé téma" : "světlé téma"}</Text></View><Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View></View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Lokální záloha</Text>
        <View className="overflow-hidden rounded-3xl bg-surface" style={styles.card}><Text className="p-4 pb-2 text-xs leading-5 text-muted">Záloha obsahuje rozvrh, známky, úkoly a volbu tématu. Přihlašovací tokeny ani rodičovské tajemství se neexportují.</Text><Pressable disabled={busy} onPress={() => { void runBackup(exportLocalBackup, "Soubor zálohy byl připraven ke sdílení nebo stažení."); }} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, busy && styles.disabled]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Exportovat zálohu</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable><View style={[styles.divider, { backgroundColor: colors.border }]} /><Pressable disabled={busy} onPress={() => { void restore(); }} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, busy && styles.disabled]}><IconSymbol name="book.closed" size={20} color={colors.primary} /><Text className="flex-1 text-sm font-bold text-foreground">Obnovit ze souboru</Text><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable></View>

        <Text className="mb-3 mt-7 text-xl font-bold text-foreground">Školní účet</Text>
        <View className="rounded-3xl bg-surface p-4" style={styles.card}><Text className="text-sm font-bold text-foreground">{user?.email ?? "—"}</Text><Text className="mt-1 text-xs text-muted">{user?.schoolUrl ?? "Škola není připojená"}</Text><Pressable onPress={() => Alert.alert("Odhlásit se?", "Lokální cache zůstane v zařízení.", [{ text: "Zrušit", style: "cancel" }, { text: "Odhlásit", style: "destructive", onPress: () => { void signOut(); } }])} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-error">Odhlásit se</Text></Pressable></View>
        <Text className="mb-6 mt-6 text-center text-xs text-muted">Bakaláři Mobile · lokální data zůstávají pod tvou kontrolou.</Text>
      </ScrollView>
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}><View className="flex-1 bg-background p-5"><Text className="mb-4 mt-10 text-2xl font-bold text-foreground">Naskenuj QR párování</Text><View className="flex-1 overflow-hidden rounded-3xl"><CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={async ({ data }) => { setScannerOpen(false); Alert.alert((await importPairingCode(data)) ? "Tablet spárován" : "Neplatný QR kód"); }} /></View><Pressable onPress={() => setScannerOpen(false)} style={styles.closeButton}><Text className="font-bold text-foreground">Zrušit</Text></Pressable></View></Modal>
    </ScreenContainer>
  );
}

function RoleButton({ active, label, onPress, colors }: { active: boolean; label: string; onPress: () => void; colors: ReturnType<typeof useColors> }) { return <Pressable onPress={onPress} style={[styles.roleButton, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}16` : "transparent" }]}><Text className="text-xs font-bold" style={{ color: active ? colors.primary : colors.muted }}>{label}</Text></Pressable>; }
function QrCard({ title, subtitle, value, onClose, colors }: { title: string; subtitle: string; value: string; onClose: () => void; colors: ReturnType<typeof useColors> }) { return <View className="mt-4 items-center rounded-2xl bg-background p-4"><Text className="text-base font-bold text-foreground">{title}</Text><Text className="mt-1 text-center text-xs text-muted">{subtitle}</Text><View className="mt-4 rounded-xl bg-white p-3"><QRCode value={value} size={180} color="#111827" backgroundColor="#FFFFFF" /></View><Pressable onPress={onClose} style={{ marginTop: 12 }}><Text className="text-sm font-bold" style={{ color: colors.primary }}>Zavřít QR</Text></Pressable></View>; }

const styles = StyleSheet.create({ content: { paddingBottom: 28 }, card: { shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, lockButton: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#E5EAF2" }, roleButton: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 12 }, divider: { height: 1, marginLeft: 48 }, logoutButton: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 14 }, closeButton: { alignItems: "center", borderRadius: 16, backgroundColor: "#E5EAF2", padding: 15 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.45 } });
