import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Homework } from "../shared/bakalari-data";
import { planHomeworkReminders } from "./homework-reminder-plan";

export const REMINDERS_ENABLED_KEY = "bakalari-mobile/settings/homework-reminders";
const CHANNEL_ID = "homework-deadlines";
const SOURCE = "homework-reminder";

export type ReminderPermission = "granted" | "denied" | "unsupported";

export function configureNotifications(): void {
  if (Platform.OS === "web") return;
  // Show reminders even while the app is in the foreground.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Termíny úkolů",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
  });
}

export async function getRemindersEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(REMINDERS_ENABLED_KEY)) === "1"; } catch { return false; }
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, enabled ? "1" : "0");
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === "web") return "unsupported";
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "denied";
  const next = await Notifications.requestPermissionsAsync();
  return next.granted ? "granted" : "denied";
}

export async function cancelHomeworkReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.source === SOURCE)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

/** Idempotent: drops previously scheduled homework reminders and schedules the current plan. */
export async function syncHomeworkReminders(homework: Homework[]): Promise<number> {
  if (Platform.OS === "web") return 0;
  try {
    await cancelHomeworkReminders();
    if (!(await getRemindersEnabled())) return 0;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return 0;
    await ensureChannel();
    const plan = planHomeworkReminders(homework);
    for (const reminder of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.identifier,
        content: { title: reminder.title, body: reminder.body, sound: true, data: { source: SOURCE, homeworkId: reminder.homeworkId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at, channelId: CHANNEL_ID },
      });
    }
    return plan.length;
  } catch {
    // Reminders are best-effort and must never break data loading.
    return 0;
  }
}
