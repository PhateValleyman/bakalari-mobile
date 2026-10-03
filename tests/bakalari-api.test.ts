import { describe, expect, it, vi } from "vitest";

// Keep the pure URL tests independent from Expo native module loading in Node.
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureStorage.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { secureStorage.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { secureStorage.delete(key); }),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
const secureStorage = new Map<string, string>();
const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import { BakalariApiError, loginToBakalari, normalizeSchoolUrl } from "../lib/bakalari-api";
import { bakalariCache, formatCacheAge } from "../lib/bakalari-cache";
import { calculateAverage, fetchActualTimetable, normalizeAbsence, normalizeHomeworks, normalizeMarks, normalizeTimetable } from "../lib/bakalari-data";

describe("normalizeSchoolUrl", () => {
  it("adds https and removes a trailing slash", () => {
    expect(normalizeSchoolUrl("school.example.cz/")).toBe("https://school.example.cz");
  });

  it("preserves an explicit http origin for legacy school servers", () => {
    expect(normalizeSchoolUrl("http://school.example.cz/app/")).toBe("http://school.example.cz/app");
  });

  it("rejects an empty or unsupported address", () => {
    expect(() => normalizeSchoolUrl("")).toThrow(BakalariApiError);
    expect(() => normalizeSchoolUrl("ftp://school.example.cz")).toThrow(BakalariApiError);
  });
});

describe("Bakalari data normalization", () => {
  it("resolves timetable ids to a displayable lesson", () => {
    const week = normalizeTimetable({
      Hours: [{ Id: 3, Caption: "1", BeginTime: "8:00", EndTime: "8:45" }],
      Days: [{ Date: "2026-09-25T00:00:00+02:00", DayOfWeek: 5, Atoms: [{ HourId: 3, SubjectId: "S1", TeacherId: "T1", RoomId: "R1" }] }],
      Subjects: [{ Id: "S1", Abbrev: "MAT", Name: "Matematika" }],
      Teachers: [{ Id: "T1", Abbrev: "Nov", Name: "Mgr. Novák" }],
      Rooms: [{ Id: "R1", Abbrev: "214", Name: "214" }],
    });
    expect(week.days[0].lessons[0]).toMatchObject({ subject: "Matematika", teacher: "Mgr. Novák", room: "214", time: "8:00" });
  });

  it("keeps the latest mark and subject averages", () => {
    const grades = normalizeMarks({
      Subjects: [{
        Subject: { Id: "S1", Abbrev: "MAT", Name: "Matematika" },
        AverageText: "1,50",
        Marks: [
          { MarkDate: "2026-09-20T00:00:00Z", MarkText: "2", Caption: "Test" },
          { MarkDate: "2026-09-25T00:00:00Z", MarkText: "1", Caption: "Písemka" },
        ],
      }],
    });
    expect(grades[0]).toMatchObject({ subject: "Matematika", latestMark: "1", latestCaption: "Písemka", average: "1,50" });
    expect(calculateAverage(grades)).toBe("1,50");
  });
});

describe("offline cache", () => {
  it("stores and reads schedule data per school", async () => {
    const data = { days: [], rangeLabel: "Test" };
    await bakalariCache.writeSchedule("school.example.cz", data);
    await expect(bakalariCache.readSchedule("https://school.example.cz")).resolves.toMatchObject({ data });
  });

  it("formats cache age for the UI", () => {
    expect(formatCacheAge(Date.now())).toBe("právě teď");
    expect(formatCacheAge(null)).toBeNull();
  });
});

describe("homework normalization", () => {
  it("normalizes API homework fields and due labels", () => {
    const homeworks = normalizeHomeworks({ Homeworks: [{ Id: "H1", Subject: { Id: "S1", Name: "Matematika" }, Title: "Procvičit funkce", DueDate: "2099-01-02T12:00:00Z", Done: false }] });
    expect(homeworks[0]).toMatchObject({ id: "H1", subject: "Matematika", title: "Procvičit funkce", due: "2099-01-02", completed: false });
  });
});

describe("absence normalization", () => {
  it("normalizes subject absence and percentage threshold", () => {
    const result = normalizeAbsence({ PercentageThreshold: 0.18, Absences: [{ Date: "2026-09-25T00:00:00+02:00", Missed: 2, Ok: 5, Late: 1 }], AbsencesPerSubject: [{ SubjectName: "Matematika", LessonsCount: 20, Base: 2, Late: 1, Soon: 0, School: 0 }] });
    expect(result).toMatchObject({ thresholdPercent: 18, totals: { missed: 2, late: 1 } });
    expect(result.subjects[0]).toMatchObject({ subject: "Matematika", absence: 2, percent: 10 });
  });
});

describe("authenticated timetable flow", () => {
  it("logs in and loads the current timetable with the stored access token", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); requests.push({ url, init });
      if (url.endsWith("/api/login")) return new Response(JSON.stringify({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 600, "bak:UserId": "student-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ Hours: [], Days: [], Subjects: [], Teachers: [], Rooms: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    try {
      await loginToBakalari("school.example.cz", "student", "secret");
      const week = await fetchActualTimetable("school.example.cz", "2026-10-03");
      expect(week.days).toEqual([]);
      expect(requests[0].url).toBe("https://school.example.cz/api/login");
      expect(String(requests[0].init?.body)).toContain("grant_type=password");
      expect(requests[1].url).toBe("https://school.example.cz/api/3/timetable/actual?date=2026-10-03");
      expect(new Headers(requests[1].init?.headers).get("Authorization")).toBe("Bearer access-1");
    } finally { globalThis.fetch = originalFetch; }
  });
});
