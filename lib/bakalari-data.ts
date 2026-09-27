import { bakalariFetch } from "./bakalari-api";
import type { Grade, Homework, ScheduleItem } from "../shared/bakalari-data";

export type BakalariEntity = {
  Id?: string | number;
  Abbrev?: string;
  Name?: string;
};

type BakalariHour = {
  Id?: number;
  Caption?: string;
  BeginTime?: string;
  EndTime?: string;
};

type BakalariChange = {
  ChangeType?: string;
  Description?: string;
  Time?: string;
};

type BakalariAtom = {
  HourId?: number;
  SubjectId?: string | number | null;
  TeacherId?: string | number | null;
  RoomId?: string | number | null;
  Theme?: string | null;
  HomeworkIds?: Array<string | number>;
  Change?: BakalariChange | null;
};

type BakalariDay = {
  Atoms?: BakalariAtom[];
  DayOfWeek?: number;
  Date?: string;
  DayDescription?: string;
  DayType?: string;
};

type BakalariTimetableResponse = {
  Hours?: BakalariHour[];
  Days?: BakalariDay[];
  Subjects?: BakalariEntity[];
  Teachers?: BakalariEntity[];
  Rooms?: BakalariEntity[];
};

type BakalariMark = {
  MarkDate?: string;
  EditDate?: string;
  Caption?: string;
  MarkText?: string;
  PointsText?: string;
  Weight?: number | null;
  IsPoints?: boolean;
  IsNew?: boolean;
};

type BakalariMarkSubject = {
  Marks?: BakalariMark[];
  Subject?: BakalariEntity;
  AverageText?: string;
};

type BakalariMarksResponse = {
  Subjects?: BakalariMarkSubject[];
};

type BakalariHomework = {
  Id?: string | number;
  Subject?: BakalariEntity;
  Title?: string;
  Description?: string;
  Date?: string;
  StartDate?: string;
  EndDate?: string;
  DueDate?: string;
  IsDone?: boolean;
  Completed?: boolean;
};

type BakalariHomeworkResponse = {
  Homeworks?: BakalariHomework[];
};

export type ScheduleDay = {
  key: string;
  label: string;
  date: string;
  dateLabel: string;
  dayType?: string;
  description?: string;
  lessons: ScheduleItem[];
};

export type ScheduleWeek = {
  days: ScheduleDay[];
  rangeLabel: string;
};

const subjectColors = ["#2F7DF6", "#F2994A", "#9B51E0", "#27AE60", "#EB5757", "#00A6A6"];
const czechDayLabels = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function entityMap(entities: BakalariEntity[] | undefined): Map<string, BakalariEntity> {
  const map = new Map<string, BakalariEntity>();
  for (const entity of entities ?? []) {
    const rawId = entity.Id == null ? "" : String(entity.Id);
    if (!rawId) continue;
    map.set(rawId, entity);
    const trimmedId = rawId.trim();
    if (!map.has(trimmedId)) map.set(trimmedId, entity);
  }
  return map;
}

function resolveEntity(map: Map<string, BakalariEntity>, id: string | number | null | undefined): BakalariEntity | undefined {
  if (id == null) return undefined;
  return map.get(String(id)) ?? map.get(String(id).trim());
}

function isoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return isoDate();
}

export function weekMondayIsoDate(date = new Date()): string {
  const monday = new Date(date);
  const day = monday.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + distance);
  return isoDate(monday);
}

export function shiftWeekIsoDate(weekOffset: number, date = new Date()): string {
  const monday = new Date(`${weekMondayIsoDate(date)}T12:00:00`);
  monday.setDate(monday.getDate() + weekOffset * 7);
  return isoDate(monday);
}

function minutesFromTime(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isCurrentLesson(time: string, now = new Date(), endTime?: string): boolean {
  const minutes = minutesFromTime(time);
  if (minutes === null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const end = endTime ? minutesFromTime(endTime) : null;
  return current >= minutes && current < (end ?? minutes + 50);
}

export function changeLabel(changeType: string | undefined): string | undefined {
  const labels: Record<string, string> = {
    added: "Přidaná hodina",
    removed: "Zrušená hodina",
    cancelled: "Zrušená hodina",
    substitution: "Změna učitele",
    moved: "Přesunutá hodina",
  };
  return changeType ? labels[changeType.toLowerCase()] ?? "Změna v rozvrhu" : undefined;
}

function datePart(value: string | undefined): string {
  return value?.slice(0, 10) ?? "";
}

function dayKey(date: string, dayOfWeek?: number): string {
  if (date) {
    const parsed = new Date(`${date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][parsed.getDay()];
  }
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][Math.max(0, Math.min(6, (dayOfWeek ?? 1) % 7))];
}

function formatDate(date: string): string {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${Number(day)}. ${Number(month)}. ${year}`;
}

function colorForSubject(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return subjectColors[Math.abs(hash) % subjectColors.length];
}

function hourLabel(hour: BakalariHour | undefined, fallback: number): string {
  if (!hour) return `${fallback}. hod`;
  const begin = text(hour.BeginTime);
  const end = text(hour.EndTime);
  return begin && end ? `${begin}` : `${text(hour.Caption) || fallback}. hod`;
}

export function normalizeTimetable(payload: BakalariTimetableResponse): ScheduleWeek {
  const hours = new Map((payload.Hours ?? []).map((hour) => [hour.Id ?? -1, hour]));
  const subjects = entityMap(payload.Subjects);
  const teachers = entityMap(payload.Teachers);
  const rooms = entityMap(payload.Rooms);
  const days = (payload.Days ?? []).map((day) => {
    const date = datePart(day.Date);
    const lessons = (day.Atoms ?? []).map((atom, index) => {
      const subjectId = text(atom.SubjectId);
      const subject = resolveEntity(subjects, atom.SubjectId);
      const teacher = resolveEntity(teachers, atom.TeacherId);
      const room = resolveEntity(rooms, atom.RoomId);
      const hour = hours.get(atom.HourId ?? -1);
      const change = atom.Change;
      const note = [text(atom.Theme), text(change?.Description), text(change?.Time)].filter(Boolean).join(" · ");
      const changeType = text(change?.ChangeType);
      return {
        id: `${date || "day"}-${atom.HourId ?? index}-${subjectId || index}`,
        time: hourLabel(hour, index + 1),
        endTime: text(hour?.EndTime) || undefined,
        subject: text(subject?.Name) || text(subject?.Abbrev) || "Neurčený předmět",
        subjectAbbreviation: text(subject?.Abbrev) || undefined,
        teacher: text(teacher?.Name) || text(teacher?.Abbrev) || "",
        teacherAbbreviation: text(teacher?.Abbrev) || undefined,
        room: text(room?.Name) || text(room?.Abbrev) || "—",
        color: colorForSubject(subjectId),
        note: note || undefined,
        homeworkCount: atom.HomeworkIds?.length ?? 0,
        changeType: changeType || undefined,
        changeLabel: text(change?.Description) || undefined,
        cancelled: changeType.toLowerCase() === "removed" || changeType.toLowerCase() === "cancelled",
      } satisfies ScheduleItem;
    });
    lessons.sort((left, right) => left.time.localeCompare(right.time, "cs", { numeric: true }));
    const key = dayKey(date, day.DayOfWeek);
    return {
      key,
      label: czechDayLabels[new Date(`${date || isoDate()}T12:00:00`).getDay()] ?? key,
      date,
      dateLabel: formatDate(date),
      dayType: day.DayType,
      description: text(day.DayDescription),
      lessons,
    } satisfies ScheduleDay;
  });
  return {
    days,
    rangeLabel: days.length ? `${days[0].dateLabel} – ${days[days.length - 1].dateLabel}` : "Rozvrh není dostupný",
  };
}

export async function fetchActualTimetable(schoolUrl: string, date = todayIsoDate()): Promise<ScheduleWeek> {
  const payload = await bakalariFetch<BakalariTimetableResponse>(schoolUrl, `/api/3/timetable/actual?date=${encodeURIComponent(date)}`);
  return normalizeTimetable(payload);
}

export async function fetchPermanentTimetable(schoolUrl: string): Promise<ScheduleWeek> {
  const payload = await bakalariFetch<BakalariTimetableResponse>(schoolUrl, "/api/3/timetable/permanent");
  return normalizeTimetable(payload);
}

function parseAverage(value: string | undefined): number | null {
  const parsed = Number.parseFloat(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function markValue(mark: BakalariMark): string {
  return text(mark.MarkText) || text(mark.PointsText) || "—";
}

export function normalizeMarks(payload: BakalariMarksResponse): Grade[] {
  return (payload.Subjects ?? []).map((entry, index) => {
    const subjectId = text(entry.Subject?.Id) || `subject-${index}`;
    const marks = [...(entry.Marks ?? [])].sort((left, right) => {
      const leftDate = left.EditDate || left.MarkDate || "";
      const rightDate = right.EditDate || right.MarkDate || "";
      return leftDate.localeCompare(rightDate);
    });
    const latest = marks.at(-1);
    const average = text(entry.AverageText) || "—";
    return {
      id: subjectId,
      subject: text(entry.Subject?.Name) || text(entry.Subject?.Abbrev) || "Neurčený předmět",
      abbreviation: text(entry.Subject?.Abbrev) || "—",
      grades: marks.map(markValue),
      average,
      trend: "steady",
      color: colorForSubject(subjectId),
      latestMark: latest ? markValue(latest) : undefined,
      latestDate: latest ? datePart(latest.EditDate || latest.MarkDate) : undefined,
      latestCaption: latest ? text(latest.Caption) : undefined,
    } satisfies Grade;
  }).filter((grade) => grade.grades.length > 0);
}

export async function fetchMarks(schoolUrl: string): Promise<Grade[]> {
  const payload = await bakalariFetch<BakalariMarksResponse>(schoolUrl, "/api/3/marks");
  return normalizeMarks(payload);
}

function homeworkDate(value: string): string {
  return datePart(value) || value.slice(0, 10);
}

function homeworkDueLabel(date: string): string {
  if (!date) return "bez termínu";
  const due = new Date(`${date}T12:00:00`);
  if (Number.isNaN(due.getTime())) return date;
  const today = new Date(`${todayIsoDate()}T12:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "po termínu";
  if (days === 0) return "dnes";
  if (days === 1) return "zítra";
  return `do ${due.getDate()}. ${due.getMonth() + 1}.`;
}

export function normalizeHomework(payload: BakalariHomeworkResponse): Homework[] {
  return (payload.Homeworks ?? []).map((item, index) => {
    const subjectId = text(item.Subject?.Id) || `subject-${index}`;
    const due = homeworkDate(item.EndDate || item.DueDate || item.Date || "");
    return {
      id: text(item.Id) || `homework-${index}`,
      subject: text(item.Subject?.Name) || text(item.Subject?.Abbrev) || "Úkol",
      title: text(item.Title) || text(item.Description) || "Bez názvu",
      due,
      dueLabel: homeworkDueLabel(due),
      color: colorForSubject(subjectId),
      completed: Boolean(item.IsDone ?? item.Completed),
    } satisfies Homework;
  }).sort((left, right) => (left.due || "9999").localeCompare(right.due || "9999"));
}

export async function fetchHomework(schoolUrl: string): Promise<Homework[]> {
  const payload = await bakalariFetch<BakalariHomeworkResponse>(schoolUrl, "/api/3/homeworks");
  return normalizeHomework(payload);
}

export function calculateAverage(grades: Grade[]): string {
  const values = grades.map((grade) => parseAverage(grade.average)).filter((value): value is number => value !== null);
  if (!values.length) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2).replace(".", ",");
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Data se nepodařilo načíst.";
}
