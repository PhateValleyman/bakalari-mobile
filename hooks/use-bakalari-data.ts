import { useCallback, useEffect, useState } from "react";

import { errorMessage, fetchActualTimetable, fetchMarks, type ScheduleWeek } from "@/lib/bakalari-data";
import { useAuthState } from "@/lib/auth-context";
import type { Grade } from "@/shared/bakalari-data";

export function useBakalariSchedule() {
  const { user } = useAuthState();
  const [data, setData] = useState<ScheduleWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    if (!user?.schoolUrl) {
      setData(null);
      setLoading(false);
      setError("Školní účet není připojený.");
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    fetchActualTimetable(user.schoolUrl)
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.schoolUrl, reloadKey]);

  return { data, loading, error, refresh };
}

export function useBakalariGrades() {
  const { user } = useAuthState();
  const [data, setData] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    if (!user?.schoolUrl) {
      setData([]);
      setLoading(false);
      setError("Školní účet není připojený.");
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    fetchMarks(user.schoolUrl)
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.schoolUrl, reloadKey]);

  return { data, loading, error, refresh };
}
