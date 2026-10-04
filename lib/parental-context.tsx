import { CameraView, useCameraPermissions } from "expo-camera";
import { router, usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from "react-native";

import DeviceKiosk from "@/modules/device-kiosk";
import { useColors } from "@/hooks/use-colors";
import { lockForHomework, readParentalState, setParentalRole, unlockLocally, verifyOfflineUnlockToken, type ParentalControlState, type ParentalRole } from "@/lib/parental-control";

const INITIAL_STATE: ParentalControlState = { role: "student", locked: false, lockReason: null, lockedAt: null };

type ParentalContextValue = {
  state: ParentalControlState;
  nativeStatus: ReturnType<typeof DeviceKiosk.getStatus>;
  setRole: (role: ParentalRole) => Promise<void>;
  lock: () => Promise<void>;
  unlock: (rawToken: string) => Promise<boolean>;
  completeHomework: () => Promise<void>;
};

const ParentalContext = createContext<ParentalContextValue | null>(null);

export function ParentalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ParentalControlState>(INITIAL_STATE);
  const [nativeStatus, setNativeStatus] = useState(() => DeviceKiosk.getStatus());

  useEffect(() => { void readParentalState().then(setState); }, []);
  useEffect(() => { setNativeStatus(DeviceKiosk.getStatus()); }, [state.locked]);

  const setRole = useCallback(async (role: ParentalRole) => { setState(await setParentalRole(role)); }, []);
  const lock = useCallback(async () => { const next = await lockForHomework(); setState(next); if (Platform.OS === "android") { await DeviceKiosk.startKiosk(); setNativeStatus(DeviceKiosk.getStatus()); } }, []);
  const unlock = useCallback(async (rawToken: string) => { if (!(await verifyOfflineUnlockToken(rawToken))) return false; const next = await unlockLocally(); setState(next); if (Platform.OS === "android") { await DeviceKiosk.stopKiosk(); setNativeStatus(DeviceKiosk.getStatus()); } return true; }, []);
  const completeHomework = useCallback(async () => { const next = await unlockLocally(); setState(next); if (Platform.OS === "android") { await DeviceKiosk.stopKiosk(); setNativeStatus(DeviceKiosk.getStatus()); } }, []);
  const value = useMemo(() => ({ state, nativeStatus, setRole, lock, unlock, completeHomework }), [completeHomework, lock, nativeStatus, setRole, state, unlock]);
  return <ParentalContext.Provider value={value}>{children}</ParentalContext.Provider>;
}

export function useParentalControl(): ParentalContextValue {
  const context = useContext(ParentalContext);
  if (!context) throw new Error("useParentalControl must be used inside ParentalProvider");
  return context;
}

export function ParentalLockOverlay() {
  const colors = useColors();
  const { state, nativeStatus, unlock } = useParentalControl();
  const pathname = usePathname();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [message, setMessage] = useState("Tablet je uzamčený do dokončení domácích úkolů.");

  if (!state.locked || pathname.endsWith("/homework")) return null;
  const canScan = Platform.OS !== "web";
  return <Modal visible transparent animationType="fade"><View className="flex-1 items-center justify-center bg-background px-6"><View className="w-full max-w-md rounded-3xl bg-surface p-6"><Text className="text-center text-3xl font-bold text-foreground">Čas na úkoly</Text><Text className="mt-3 text-center text-sm leading-6 text-muted">{message}</Text><Text className="mt-4 text-center text-xs text-warning">Device Owner: {nativeStatus.isDeviceOwner ? "aktivní" : "není nastavený"}</Text><Pressable onPress={() => router.push("/(tabs)/homework")} style={({ pressed }) => [{ marginTop: 16, borderRadius: 16, backgroundColor: colors.primary, padding: 15, alignItems: "center" }, pressed && { opacity: 0.8 }]}><Text className="font-bold text-white">Otevřít domácí úkoly</Text></Pressable><Pressable onPress={async () => { if (!canScan) { setMessage("QR odemčení je dostupné v nativním Android buildu, ne ve webovém preview."); return; } if (!permission?.granted) { await requestPermission(); return; } setScannerOpen(true); }} style={({ pressed }) => [{ marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15, alignItems: "center" }, pressed && { opacity: 0.8 }]}><Text className="font-bold text-foreground">Odemknout QR kódem rodiče</Text></Pressable>{scannerOpen ? <View className="mt-5 overflow-hidden rounded-2xl" style={{ height: 240 }}><CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={async ({ data }) => { setScannerOpen(false); setMessage((await unlock(data)) ? "Odemčeno." : "QR kód je neplatný nebo expirovaný."); }} /></View> : null}<ActivityIndicator className="mt-5" color={colors.primary} /></View></View></Modal>;
}
