import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { bakalariCache } from "@/lib/bakalari-cache";
import type { ColorScheme } from "@/constants/theme";
import type { AuthUser } from "@/lib/auth-context";

type BackupPayload = {
  version: 1;
  exportedAt: string;
  user: Pick<AuthUser, "email" | "schoolUrl">;
  theme: ColorScheme;
  schedule: Awaited<ReturnType<typeof bakalariCache.readSchedule>>;
  grades: Awaited<ReturnType<typeof bakalariCache.readGrades>>;
  homework: Awaited<ReturnType<typeof bakalariCache.readHomework>>;
};

export async function exportBackup(user: AuthUser, theme: ColorScheme): Promise<void> {
  const [schedule, grades, homework] = await Promise.all([
    bakalariCache.readSchedule(user.schoolUrl),
    bakalariCache.readGrades(user.schoolUrl),
    bakalariCache.readHomework(user.schoolUrl),
  ]);
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { email: user.email, schoolUrl: user.schoolUrl },
    theme,
    schedule,
    grades,
    homework,
  };
  const uri = `${FileSystem.cacheDirectory}bakalari-backup.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sdílení souborů není na tomto zařízení dostupné.");
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Záloha Bakaláři Mobile" });
}

export async function importBackup(schoolUrl: string): Promise<{ theme?: ColorScheme; exportedAt?: string }> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return {};
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload = JSON.parse(raw) as Partial<BackupPayload>;
  if (payload.version !== 1 || payload.user?.schoolUrl !== schoolUrl) {
    throw new Error("Soubor není platná záloha pro tento školní účet.");
  }
  await Promise.all([
    payload.schedule?.data ? bakalariCache.writeSchedule(schoolUrl, payload.schedule.data) : Promise.resolve(),
    payload.grades?.data ? bakalariCache.writeGrades(schoolUrl, payload.grades.data) : Promise.resolve(),
    payload.homework?.data ? bakalariCache.writeHomework(schoolUrl, payload.homework.data) : Promise.resolve(),
  ]);
  return { theme: payload.theme, exportedAt: payload.exportedAt };
}
