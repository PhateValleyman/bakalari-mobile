import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Homework } from "@/shared/bakalari-data";
import { buildHomeworkReminderPlan } from "@/lib/homework-notification-plan";

const CHANNEL_ID = "homework-deadlines";
const NOTIFICATION_TAG = "bakalari-homework";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestHomeworkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Termíny úkolů",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2F7DF6",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function scheduleHomeworkNotifications(homework: Homework[], now = new Date()): Promise<number> {
  if (Platform.OS === "web") return 0;
  const granted = await requestHomeworkNotificationPermission();
  if (!granted) return 0;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((notification) => notification.content.data?.tag === NOTIFICATION_TAG)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );

  const plan = buildHomeworkReminderPlan(homework, now);
  await Promise.all(
    plan.map((reminder) => Notifications.scheduleNotificationAsync({
      content: {
        title: `${reminder.subject} · termín ${reminder.label}`,
        body: reminder.title,
        data: { tag: NOTIFICATION_TAG, homeworkId: reminder.homeworkId, url: "/homework" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
    })),
  );
  return plan.length;
}

export async function cancelHomeworkNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((notification) => notification.content.data?.tag === NOTIFICATION_TAG)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}
