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
import { calculateAverage, changeLabel, getScheduleTimelineState, isCurrentLesson, normalizeHomework, normalizeMarks, normalizeTimetable, shiftWeekIsoDate, weekMondayIsoDate } from "../lib/bakalari-data";
import { buildHomeworkReminderPlan } from "../lib/homework-notification-plan";
import { nextTabPath } from "../lib/tab-navigation";

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
      Days: [{ Date: "2026-09-25T00:00:00+02:00", DayOfWeek: 5, Atoms: [{ HourId: 3, SubjectId: "S1", TeacherId: "T1", RoomId: "R1", HomeworkIds: ["H1"], Change: { ChangeType: "Substitution", Description: "Změna učitele" } }] }],
      Subjects: [{ Id: "S1", Abbrev: "MAT", Name: "Matematika" }],
      Teachers: [{ Id: "T1", Abbrev: "Nov", Name: "Mgr. Novák" }],
      Rooms: [{ Id: "R1", Abbrev: "214", Name: "214" }],
    });
    expect(week.days[0].lessons[0]).toMatchObject({ subject: "Matematika", teacher: "Mgr. Novák", room: "214", time: "8:00", homeworkCount: 1, changeType: "Substitution", changeLabel: "Změna učitele" });
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

  it("normalizes homework and labels its due date", () => {
    const homework = normalizeHomework({
      Homeworks: [{ Id: "H1", Subject: { Id: "S1", Name: "Matematika" }, Title: "Procvičit funkce", EndDate: `${new Date().getFullYear()}-12-31`, IsDone: false }],
    });
    expect(homework[0]).toMatchObject({ id: "H1", subject: "Matematika", title: "Procvičit funkce", dueLabel: expect.stringContaining("31.") });
  });

  it("plans two future reminders only for open homework", () => {
    const reminders = buildHomeworkReminderPlan([
      { id: "H1", subject: "Matematika", title: "Procvičit funkce", due: "2026-09-28", dueLabel: "do 28. 9.", color: "#2F7DF6", completed: false },
      { id: "H2", subject: "Dějepis", title: "Mapa Evropy", due: "2026-09-28", dueLabel: "do 28. 9.", color: "#F2994A", completed: true },
    ], new Date("2026-09-26T09:00:00"));
    expect(reminders).toHaveLength(2);
    expect(reminders.map((item) => item.label)).toEqual(["den předem", "ráno v den termínu"]);
    expect(reminders.every((item) => item.homeworkId === "H1")).toBe(true);
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

describe("swipe tab navigation", () => {
  it("moves left and right without leaving the tab range", () => {
    expect(nextTabPath("/homework", -100)).toBe("/settings");
    expect(nextTabPath("/homework", 100)).toBe("/grades");
    expect(nextTabPath("/", 100)).toBeNull();
    expect(nextTabPath("/settings", -100)).toBeNull();
    expect(nextTabPath("/homework", 20)).toBeNull();
  });
});

describe("schedule navigation helpers", () => {
  it("returns Monday for any date and shifts whole weeks", () => {
    expect(weekMondayIsoDate(new Date("2026-09-27T12:00:00"))).toBe("2026-09-21");
    expect(shiftWeekIsoDate(1, new Date("2026-09-27T12:00:00"))).toBe("2026-09-28");
    expect(shiftWeekIsoDate(-1, new Date("2026-09-27T12:00:00"))).toBe("2026-09-14");
  });

  it("identifies the current lesson from its start time", () => {
    expect(isCurrentLesson("8:00", new Date("2026-09-26T08:20:00"), "8:45")).toBe(true);
    expect(isCurrentLesson("8:00", new Date("2026-09-26T08:45:00"), "8:45")).toBe(false);
    expect(isCurrentLesson("8:00", new Date("2026-09-26T09:00:00"))).toBe(false);
    expect(changeLabel("Substitution")).toBe("Změna učitele");
    expect(changeLabel("Removed")).toBe("Zrušená hodina");
  });

  it("calculates the current marker between the first and last lesson", () => {
    const state = getScheduleTimelineState([
      { id: "one", time: "8:00", endTime: "8:45", subject: "Matematika", teacher: "", room: "", color: "#000" },
      { id: "two", time: "9:00", endTime: "9:45", subject: "Fyzika", teacher: "", room: "", color: "#000" },
    ], new Date("2026-09-27T08:30:00"));
    expect(state).toMatchObject({ startMinutes: 480, endMinutes: 585, currentLessonId: "one", isTeachingTime: true });
    expect(state?.progress).toBeCloseTo(30 / 105, 5);
    expect(getScheduleTimelineState([], new Date("2026-09-27T08:30:00"))).toBeNull();
  });
});
