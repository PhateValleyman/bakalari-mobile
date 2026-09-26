import AsyncStorage from "@react-native-async-storage/async-storage";

const HOMEWORK_NOTIFICATIONS_KEY = "bakalari-mobile.homework-notifications";

export async function getHomeworkNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HOMEWORK_NOTIFICATIONS_KEY);
    return value !== "0";
  } catch {
    return true;
  }
}

export async function setHomeworkNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HOMEWORK_NOTIFICATIONS_KEY, enabled ? "1" : "0");
  } catch {
    // Notifications remain usable for the current session when storage is unavailable.
  }
}
