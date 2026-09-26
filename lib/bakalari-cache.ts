import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeSchoolUrl } from "./bakalari-api";
import type { ScheduleWeek } from "./bakalari-data";
import type { Grade } from "../shared/bakalari-data";

const CACHE_VERSION = 1;
const CACHE_PREFIX = "bakalari-mobile/cache/v1";

export type CachedValue<T> = {
  data: T;
  savedAt: number;
};

type StoredCache<T> = CachedValue<T> & {
  version: number;
};

function cacheKey(schoolUrl: string, resource: "schedule" | "grades"): string {
  // encodeURIComponent keeps the school origin isolated and the key portable across native and web storage.
  return `${CACHE_PREFIX}/${resource}/${encodeURIComponent(normalizeSchoolUrl(schoolUrl))}`;
}

async function readCache<T>(key: string): Promise<CachedValue<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCache<T>>;
    if (parsed.version !== CACHE_VERSION || typeof parsed.savedAt !== "number" || parsed.data == null) return null;
    return { data: parsed.data as T, savedAt: parsed.savedAt };
  } catch {
    // Corrupt or unavailable cache must never block the live API request.
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const payload: StoredCache<T> = { version: CACHE_VERSION, savedAt: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage can be full or unavailable; live API data remains usable.
  }
}

export const bakalariCache = {
  readSchedule(schoolUrl: string) {
    return readCache<ScheduleWeek>(cacheKey(schoolUrl, "schedule"));
  },
  writeSchedule(schoolUrl: string, data: ScheduleWeek) {
    return writeCache(cacheKey(schoolUrl, "schedule"), data);
  },
  readGrades(schoolUrl: string) {
    return readCache<Grade[]>(cacheKey(schoolUrl, "grades"));
  },
  writeGrades(schoolUrl: string, data: Grade[]) {
    return writeCache(cacheKey(schoolUrl, "grades"), data);
  },
};

export function formatCacheAge(savedAt: number | null): string | null {
  if (!savedAt) return null;
  const minutes = Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
  if (minutes < 1) return "právě teď";
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `před ${hours} h`;
}
