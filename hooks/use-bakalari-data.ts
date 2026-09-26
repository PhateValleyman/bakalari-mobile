import { useCallback, useEffect, useState } from "react";

import { errorMessage, fetchActualTimetable, fetchMarks, type ScheduleWeek } from "@/lib/bakalari-data";
import { bakalariCache, formatCacheAge } from "@/lib/bakalari-cache";
import { useAuthState } from "@/lib/auth-context";
import type { Grade } from "@/shared/bakalari-data";

type CacheState = { savedAt: number | null; source: "cache" | "network" | null };
const emptyCacheState: CacheState = { savedAt: null, source: null };

export function useBakalariSchedule() {
  const { user } = useAuthState();
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
      setData(null); setLoading(false); setRefreshing(false); setError("Školní účet není připojený."); setCacheState(emptyCacheState);
      return () => { active = false; };
    }
    setLoading(true); setRefreshing(false); setError(null); setCacheState(emptyCacheState);
    void bakalariCache.readSchedule(schoolUrl).then((cached) => {
      if (!active || networkResolved || !cached) return;
      setData(cached.data); setLoading(false); setCacheState({ savedAt: cached.savedAt, source: "cache" });
    });
    void fetchActualTimetable(schoolUrl)
      .then(async (nextData) => {
        networkResolved = true;
        await bakalariCache.writeSchedule(schoolUrl, nextData);
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
