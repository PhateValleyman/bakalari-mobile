import { describe, expect, it, vi } from "vitest";

// Keep the pure URL tests independent from Expo native module loading in Node.
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import { BakalariApiError, normalizeSchoolUrl } from "../lib/bakalari-api";
import { bakalariCache, formatCacheAge } from "../lib/bakalari-cache";
import { calculateAverage, normalizeHomeworks, normalizeMarks, normalizeTimetable } from "../lib/bakalari-data";

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

import { planHomeworkReminders } from "../lib/homework-reminder-plan";

describe("homework reminder plan", () => {
  const base = { subject: "Matematika", title: "Funkce", dueLabel: "", color: "#000" };
  const now = new Date(2026, 8, 30, 12, 0, 0);

  it("schedules an eve and a morning reminder for open future tasks", () => {
    const plan = planHomeworkReminders([{ ...base, id: "a", due: "2026-10-02", completed: false }], now);
    expect(plan.map((item) => [item.kind, item.at.getDate(), item.at.getHours()])).toEqual([["eve", 1, 18], ["morning", 2, 7]]);
  });

  it("skips completed tasks, missing deadlines and reminders in the past", () => {
    const plan = planHomeworkReminders([
      { ...base, id: "done", due: "2026-10-02", completed: true },
      { ...base, id: "none", due: "", completed: false },
      { ...base, id: "today", due: "2026-09-30", completed: false },
    ], now);
    expect(plan).toEqual([]);
  });
});
