import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { THEME_STORAGE_KEY } from "@/lib/theme-provider";

const CACHE_PREFIX = "bakalari-mobile/cache/v1/";
const BACKUP_VERSION = 1;

type BackupEntry = [string, string];
type BackupPayload = { app: "bakalari-mobile"; version: number; createdAt: string; entries: BackupEntry[] };

export async function exportLocalBackup(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(CACHE_PREFIX) || key === THEME_STORAGE_KEY);
  const entries = (await AsyncStorage.multiGet(keys)).filter((entry): entry is BackupEntry => typeof entry[1] === "string");
  const payload: BackupPayload = { app: "bakalari-mobile", version: BACKUP_VERSION, createdAt: new Date().toISOString(), entries };
  const json = JSON.stringify(payload, null, 2);

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `bakalari-zaloha-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.documentDirectory}bakalari-zaloha-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Sdílet zálohu Bakaláři" });
}

async function readAsset(uri: string): Promise<string> {
  if (Platform.OS === "web") return fetch(uri).then((response) => response.text());
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

export async function importLocalBackup(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return 0;
  const parsed = JSON.parse(await readAsset(result.assets[0].uri)) as Partial<BackupPayload>;
  if (parsed.app !== "bakalari-mobile" || parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.entries)) throw new Error("Soubor není platná záloha aplikace Bakaláři.");
  const validEntries = parsed.entries.filter((entry): entry is BackupEntry => Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string" && (entry[0].startsWith(CACHE_PREFIX) || entry[0] === THEME_STORAGE_KEY));
  await AsyncStorage.multiSet(validEntries);
  return validEntries.length;
}
