import { useCallback, useEffect, useState } from "react";

import { errorMessage, fetchActualTimetable, fetchHomework, fetchMarks, fetchPermanentTimetable, type ScheduleWeek } from "@/lib/bakalari-data";
import { bakalariCache, formatCacheAge } from "@/lib/bakalari-cache";
import { scheduleHomeworkNotifications } from "@/lib/homework-notifications";
import { getHomeworkNotificationsEnabled } from "@/lib/notification-settings";
import { useAuthState } from "@/lib/auth-context";
import type { Grade, Homework } from "@/shared/bakalari-data";

type CacheState = { savedAt: number | null; source: "cache" | "network" | null };
const emptyCacheState: CacheState = { savedAt: null, source: null };

export function useBakalariSchedule(options: { date?: string; permanent?: boolean } = {}) {
  const { user } = useAuthState();
  const date = options.date ?? "current";
  const permanent = options.permanent ?? false;
  const [data, setData] = useState<ScheduleWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>(emptyCacheState);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    let networkResolved = false;
    const schoolUrl = user?.schoolUrl;
    if (!schoolUrl) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError("Školní účet není připojený.");
      setCacheState(emptyCacheState);
      return () => { active = false; };
    }

    setLoading(true);
    setRefreshing(false);
    setError(null);
    setCacheState(emptyCacheState);
    const scope = permanent ? "permanent" : date;
    const loadSchedule = permanent
      ? fetchPermanentTimetable(schoolUrl)
      : fetchActualTimetable(schoolUrl, date === "current" ? undefined : date);

    void bakalariCache.readSchedule(schoolUrl, scope).then((cached) => {
      if (!active || networkResolved || !cached) return;
      setData(cached.data);
      setLoading(false);
      setCacheState({ savedAt: cached.savedAt, source: "cache" });
    });

    void loadSchedule
      .then(async (nextData) => {
        networkResolved = true;
        await bakalariCache.writeSchedule(schoolUrl, nextData, scope);
        if (!active) return;
        setData(nextData);
        setCacheState({ savedAt: Date.now(), source: "network" });
        setError(null);
      })
      .catch((reason) => {
        networkResolved = true;
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => { active = false; };
  }, [date, permanent, user?.schoolUrl, reloadKey]);

  return {
    data,
    loading,
    refreshing,
    error,
    cacheAge: formatCacheAge(cacheState.savedAt),
    fromCache: cacheState.source === "cache",
    refresh: () => {
      setRefreshing(true);
      refresh();
    },
  };
}

export function useBakalariGrades() {
  const { user } = useAuthState();
  const [data, setData] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>(emptyCacheState);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    let networkResolved = false;
    const schoolUrl = user?.schoolUrl;
    if (!schoolUrl) {
      setData([]); setLoading(false); setRefreshing(false); setError("Školní účet není připojený."); setCacheState(emptyCacheState);
      return () => { active = false; };
    }
    setLoading(true); setRefreshing(false); setError(null); setCacheState(emptyCacheState);
    void bakalariCache.readGrades(schoolUrl).then((cached) => {
      if (!active || networkResolved || !cached) return;
      setData(cached.data); setLoading(false); setCacheState({ savedAt: cached.savedAt, source: "cache" });
    });
    void fetchMarks(schoolUrl)
      .then(async (nextData) => {
        networkResolved = true;
        await bakalariCache.writeGrades(schoolUrl, nextData);
        if (!active) return;
        setData(nextData); setCacheState({ savedAt: Date.now(), source: "network" }); setError(null);
      })
      .catch((reason) => { networkResolved = true; if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) { setLoading(false); setRefreshing(false); } });
    return () => { active = false; };
  }, [user?.schoolUrl, reloadKey]);

  return {
    data, loading, refreshing, error,
    cacheAge: formatCacheAge(cacheState.savedAt),
    fromCache: cacheState.source === "cache",
    refresh: () => { setRefreshing(true); refresh(); },
  };
}

export function useBakalariHomework() {
  const { user } = useAuthState();
  const [data, setData] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>(emptyCacheState);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const update = useCallback((nextData: Homework[]) => {
    setData(nextData);
    if (user?.schoolUrl) void bakalariCache.writeHomework(user.schoolUrl, nextData);
  }, [user?.schoolUrl]);

  useEffect(() => {
    let active = true;
    let networkResolved = false;
    const schoolUrl = user?.schoolUrl;
    if (!schoolUrl) {
      setData([]); setLoading(false); setRefreshing(false); setError("Školní účet není připojený."); setCacheState(emptyCacheState);
      return () => { active = false; };
    }
    setLoading(true); setRefreshing(false); setError(null); setCacheState(emptyCacheState);
    void bakalariCache.readHomework(schoolUrl).then((cached) => {
      if (!active || networkResolved || !cached) return;
      setData(cached.data); setLoading(false); setCacheState({ savedAt: cached.savedAt, source: "cache" });
    });
    void fetchHomework(schoolUrl)
      .then(async (nextData) => {
        networkResolved = true;
        await bakalariCache.writeHomework(schoolUrl, nextData);
        if (!active) return;
        setData(nextData); setCacheState({ savedAt: Date.now(), source: "network" }); setError(null);
      })
      .catch((reason) => { networkResolved = true; if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) { setLoading(false); setRefreshing(false); } });
    return () => { active = false; };
  }, [user?.schoolUrl, reloadKey]);

  useEffect(() => {
    if (!data.length) return;
    void getHomeworkNotificationsEnabled().then((enabled) => {
      if (enabled) void scheduleHomeworkNotifications(data);
    });
  }, [data]);

  return {
    data, loading, refreshing, error,
    cacheAge: formatCacheAge(cacheState.savedAt),
    fromCache: cacheState.source === "cache",
    refresh: () => { setRefreshing(true); refresh(); },
    update,
  };
}
