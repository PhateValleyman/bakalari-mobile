import { bakalariFetch } from "./bakalari-api";
import type { AbsenceDay, AbsenceSubject, AbsenceSummary, Grade, Homework, ScheduleItem } from "../shared/bakalari-data";

export type BakalariEntity = {
  Id?: string | number;
  Abbrev?: string;
  Name?: string;
};

type BakalariHour = { Id?: number; Caption?: string; BeginTime?: string; EndTime?: string };
type BakalariChange = { ChangeType?: string; Description?: string; Time?: string };
type BakalariAtom = { HourId?: number; SubjectId?: string | number | null; TeacherId?: string | number | null; RoomId?: string | number | null; Theme?: string | null; Change?: BakalariChange | null };
type BakalariDay = { Atoms?: BakalariAtom[]; DayOfWeek?: number; Date?: string; DayDescription?: string; DayType?: string };
type BakalariTimetableResponse = { Hours?: BakalariHour[]; Days?: BakalariDay[]; Subjects?: BakalariEntity[]; Teachers?: BakalariEntity[]; Rooms?: BakalariEntity[] };
type BakalariMark = { MarkDate?: string; EditDate?: string; Caption?: string; MarkText?: string; PointsText?: string; Weight?: number | null; IsPoints?: boolean; IsNew?: boolean };
type BakalariMarkSubject = { Marks?: BakalariMark[]; Subject?: BakalariEntity; AverageText?: string };
type BakalariMarksResponse = { Subjects?: BakalariMarkSubject[] };
type BakalariHomework = {
  Id?: string | number;
  Subject?: BakalariEntity;
  SubjectId?: string | number;
  Title?: string;
  Description?: string;
  Content?: string;
  Date?: string;
  DueDate?: string;
  Deadline?: string;
  Done?: boolean;
  Finished?: boolean;
  HomeworkDone?: boolean;
};
type BakalariHomeworksResponse = BakalariHomework[] | { Homeworks?: BakalariHomework[] };

export type ScheduleDay = { key: string; label: string; date: string; dateLabel: string; dayType?: string; description?: string; lessons: ScheduleItem[] };
export type ScheduleWeek = { days: ScheduleDay[]; rangeLabel: string };

const subjectColors = ["#2F7DF6", "#F2994A", "#9B51E0", "#27AE60", "#EB5757", "#00A6A6"];
const czechDayLabels = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function text(value: unknown): string { return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim(); }
function entityMap(entities: BakalariEntity[] | undefined): Map<string, BakalariEntity> {
  const map = new Map<string, BakalariEntity>();
  for (const entity of entities ?? []) {
    const rawId = entity.Id == null ? "" : String(entity.Id);
    if (!rawId) continue;
    map.set(rawId, entity);
    map.set(rawId.trim(), entity);
  }
  return map;
}
function resolveEntity(map: Map<string, BakalariEntity>, id: string | number | null | undefined): BakalariEntity | undefined { return id == null ? undefined : map.get(String(id)) ?? map.get(String(id).trim()); }
function isoDate(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function todayIsoDate(): string { return isoDate(); }
function datePart(value: string | undefined): string { return value?.slice(0, 10) ?? ""; }
function dayKey(date: string, dayOfWeek?: number): string {
  if (date) { const parsed = new Date(`${date}T12:00:00`); if (!Number.isNaN(parsed.getTime())) return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][parsed.getDay()]; }
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][Math.max(0, Math.min(6, (dayOfWeek ?? 1) % 7))];
}
function formatDate(date: string): string { if (!date) return ""; const [year, month, day] = date.split("-"); return `${Number(day)}. ${Number(month)}. ${year}`; }
function colorForSubject(id: string): string { let hash = 0; for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0; return subjectColors[Math.abs(hash) % subjectColors.length]; }
function hourLabel(hour: BakalariHour | undefined, fallback: number): string { if (!hour) return `${fallback}. hod`; const begin = text(hour.BeginTime); const end = text(hour.EndTime); return begin && end ? begin : `${text(hour.Caption) || fallback}. hod`; }

export function normalizeTimetable(payload: BakalariTimetableResponse): ScheduleWeek {
  const hours = new Map((payload.Hours ?? []).map((hour) => [hour.Id ?? -1, hour]));
  const subjects = entityMap(payload.Subjects); const teachers = entityMap(payload.Teachers); const rooms = entityMap(payload.Rooms);
  const days = (payload.Days ?? []).map((day) => {
    const date = datePart(day.Date);
    const lessons = (day.Atoms ?? []).map((atom, index) => {
      const subjectId = text(atom.SubjectId); const subject = resolveEntity(subjects, atom.SubjectId); const teacher = resolveEntity(teachers, atom.TeacherId); const room = resolveEntity(rooms, atom.RoomId); const change = atom.Change;
      const note = [text(atom.Theme), text(change?.Description), text(change?.Time)].filter(Boolean).join(" · ");
      return { id: `${date || "day"}-${atom.HourId ?? index}-${subjectId || index}`, time: hourLabel(hours.get(atom.HourId ?? -1), index + 1), subject: text(subject?.Name) || text(subject?.Abbrev) || "Neurčený předmět", teacher: text(teacher?.Name) || text(teacher?.Abbrev) || "", room: text(room?.Name) || text(room?.Abbrev) || "—", color: colorForSubject(subjectId), note: note || undefined } satisfies ScheduleItem;
    });
    lessons.sort((left, right) => left.time.localeCompare(right.time, "cs", { numeric: true }));
    const key = dayKey(date, day.DayOfWeek);
    return { key, label: czechDayLabels[new Date(`${date || isoDate()}T12:00:00`).getDay()] ?? key, date, dateLabel: formatDate(date), dayType: day.DayType, description: text(day.DayDescription), lessons } satisfies ScheduleDay;
  });
  return { days, rangeLabel: days.length ? `${days[0].dateLabel} – ${days[days.length - 1].dateLabel}` : "Rozvrh není dostupný" };
}
export async function fetchActualTimetable(schoolUrl: string, date = todayIsoDate()): Promise<ScheduleWeek> { const payload = await bakalariFetch<BakalariTimetableResponse>(schoolUrl, `/api/3/timetable/actual?date=${encodeURIComponent(date)}`); return normalizeTimetable(payload); }

function parseAverage(value: string | undefined): number | null { const parsed = Number.parseFloat(text(value).replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; }
function markValue(mark: BakalariMark): string { return text(mark.MarkText) || text(mark.PointsText) || "—"; }
export function normalizeMarks(payload: BakalariMarksResponse): Grade[] {
  return (payload.Subjects ?? []).map((entry, index) => {
    const subjectId = text(entry.Subject?.Id) || `subject-${index}`;
    const marks = [...(entry.Marks ?? [])].sort((left, right) => (left.EditDate || left.MarkDate || "").localeCompare(right.EditDate || right.MarkDate || ""));
    const latest = marks.at(-1); const average = text(entry.AverageText) || "—";
    return { id: subjectId, subject: text(entry.Subject?.Name) || text(entry.Subject?.Abbrev) || "Neurčený předmět", abbreviation: text(entry.Subject?.Abbrev) || "—", grades: marks.map(markValue), average, trend: "steady", color: colorForSubject(subjectId), latestMark: latest ? markValue(latest) : undefined, latestDate: latest ? datePart(latest.EditDate || latest.MarkDate) : undefined, latestCaption: latest ? text(latest.Caption) : undefined } satisfies Grade;
  }).filter((grade) => grade.grades.length > 0);
}
export async function fetchMarks(schoolUrl: string): Promise<Grade[]> { const payload = await bakalariFetch<BakalariMarksResponse>(schoolUrl, "/api/3/marks"); return normalizeMarks(payload); }

function homeworkList(payload: BakalariHomeworksResponse): BakalariHomework[] { return Array.isArray(payload) ? payload : payload.Homeworks ?? []; }
function dueLabel(value: string): string {
  if (!value) return "termín neuveden";
  const due = new Date(value); if (Number.isNaN(due.getTime())) return value;
  const today = new Date(`${isoDate()}T00:00:00`); const dueDay = new Date(`${datePart(value)}T00:00:00`); const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "po termínu"; if (days === 0) return "dnes"; if (days === 1) return "zítra";
  return dueDay.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}
export function normalizeHomeworks(payload: BakalariHomeworksResponse): Homework[] {
  return homeworkList(payload).map((item, index) => {
    const id = text(item.Id) || `homework-${index}`; const due = item.DueDate || item.Deadline || ""; const subject = item.Subject;
    return { id, subject: text(subject?.Name) || text(subject?.Abbrev) || "Ostatní", title: text(item.Title) || text(item.Description) || text(item.Content) || "Domácí úkol", due: datePart(due), dueLabel: dueLabel(due), color: colorForSubject(text(subject?.Id) || id), completed: Boolean(item.Done ?? item.Finished ?? item.HomeworkDone) } satisfies Homework;
  }).sort((left, right) => (left.due || "9999").localeCompare(right.due || "9999"));
}
export async function fetchHomeworks(schoolUrl: string): Promise<Homework[]> { const payload = await bakalariFetch<BakalariHomeworksResponse>(schoolUrl, "/api/3/homeworks"); return normalizeHomeworks(payload); }

export function calculateAverage(grades: Grade[]): string { const values = grades.map((grade) => parseAverage(grade.average)).filter((value): value is number => value !== null); if (!values.length) return "—"; return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2).replace(".", ","); }
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "Data se nepodařilo načíst."; }

type BakalariAbsenceDay = { Date?: string; Unsolved?: number; Ok?: number; Missed?: number; Late?: number; Soon?: number; School?: number };
type BakalariAbsenceSubject = { SubjectName?: string; LessonsCount?: number; Base?: number; Absence?: number; Late?: number; Soon?: number; School?: number };
type BakalariAbsenceResponse = { Absences?: BakalariAbsenceDay[]; AbsencesPerSubject?: BakalariAbsenceSubject[]; PercentageThreshold?: number };

function count(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0; }
export function normalizeAbsence(payload: BakalariAbsenceResponse): AbsenceSummary {
  const days = (payload.Absences ?? []).map((day) => {
    const date = datePart(day.Date);
    return { date, dateLabel: formatDate(date), ok: count(day.Ok), missed: count(day.Missed), late: count(day.Late), soon: count(day.Soon), school: count(day.School), unsolved: count(day.Unsolved) } satisfies AbsenceDay;
  }).filter((day) => day.ok + day.missed + day.late + day.soon + day.school + day.unsolved > 0).sort((left, right) => right.date.localeCompare(left.date));
  const subjects = (payload.AbsencesPerSubject ?? []).map((entry, index) => {
    const name = text(entry.SubjectName) || "Neurčený předmět"; const lessons = count(entry.Base) || count(entry.LessonsCount); const absence = count(entry.Absence);
    return { id: `${index}-${name}`, subject: name, lessons, absence, late: count(entry.Late), soon: count(entry.Soon), school: count(entry.School), percent: lessons ? Math.round((absence / lessons) * 1000) / 10 : 0, color: colorForSubject(name) } satisfies AbsenceSubject;
  }).sort((left, right) => right.percent - left.percent || left.subject.localeCompare(right.subject, "cs"));
  const threshold = Number(payload.PercentageThreshold);
  const thresholdPercent = Number.isFinite(threshold) && threshold > 0 ? (threshold <= 1 ? Math.round(threshold * 1000) / 10 : threshold) : null;
  const totals = days.reduce((sum, day) => ({ ok: sum.ok + day.ok, missed: sum.missed + day.missed, late: sum.late + day.late, soon: sum.soon + day.soon, school: sum.school + day.school, unsolved: sum.unsolved + day.unsolved }), { ok: 0, missed: 0, late: 0, soon: 0, school: 0, unsolved: 0 });
  return { days, subjects, thresholdPercent, totals };
}
export async function fetchAbsence(schoolUrl: string): Promise<AbsenceSummary> { const payload = await bakalariFetch<BakalariAbsenceResponse>(schoolUrl, "/api/3/absence/student"); return normalizeAbsence(payload); }
