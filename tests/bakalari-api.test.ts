import { describe, expect, it, vi } from "vitest";

// Keep the pure URL tests independent from Expo native module loading in Node.
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

import { BakalariApiError, normalizeSchoolUrl } from "../lib/bakalari-api";
import { calculateAverage, normalizeMarks, normalizeTimetable } from "../lib/bakalari-data";

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
