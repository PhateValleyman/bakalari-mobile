// Shared types and local preview data for the Bakaláři mobile experience.
export type ScheduleItem = {
  id: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  note?: string;
};

export type Grade = {
  id: string;
  subject: string;
  abbreviation: string;
  grades: string[];
  average: string;
  trend: "up" | "steady" | "down";
  color: string;
  latestMark?: string;
  latestDate?: string;
  latestCaption?: string;
};

export type Homework = {
  id: string;
  subject: string;
  title: string;
  due: string;
  dueLabel: string;
  color: string;
  completed: boolean;
};

export const weekDays = [
  { key: "mon", label: "Po", date: "21" },
  { key: "tue", label: "Út", date: "22" },
  { key: "wed", label: "St", date: "23" },
  { key: "thu", label: "Čt", date: "24" },
  { key: "fri", label: "Pá", date: "25" },
];

export const schedule: Record<string, ScheduleItem[]> = {
  mon: [
    { id: "mon-1", time: "7:45", subject: "Matematika", teacher: "Mgr. Nováková", room: "214", color: "#2F7DF6" },
    { id: "mon-2", time: "8:40", subject: "Český jazyk", teacher: "Mgr. Dvořák", room: "102", color: "#F2994A" },
    { id: "mon-3", time: "9:35", subject: "Fyzika", teacher: "RNDr. Vlček", room: "318", color: "#9B51E0" },
    { id: "mon-4", time: "10:45", subject: "Angličtina", teacher: "Bc. Thomas", room: "305", color: "#27AE60" },
  ],
  tue: [
    { id: "tue-1", time: "7:45", subject: "Informatika", teacher: "Ing. Král", room: "LAB", color: "#EB5757" },
    { id: "tue-2", time: "8:40", subject: "Dějepis", teacher: "Mgr. Veselý", room: "201", color: "#F2994A" },
    { id: "tue-3", time: "9:35", subject: "Matematika", teacher: "Mgr. Nováková", room: "214", color: "#2F7DF6" },
  ],
  wed: [
    { id: "wed-1", time: "7:45", subject: "Český jazyk", teacher: "Mgr. Dvořák", room: "102", color: "#F2994A" },
    { id: "wed-2", time: "8:40", subject: "Biologie", teacher: "RNDr. Jelínková", room: "116", color: "#27AE60" },
    { id: "wed-3", time: "10:45", subject: "Angličtina", teacher: "Bc. Thomas", room: "305", color: "#27AE60" },
  ],
  thu: [
    { id: "thu-1", time: "7:45", subject: "Matematika", teacher: "Mgr. Nováková", room: "214", color: "#2F7DF6" },
    { id: "thu-2", time: "8:40", subject: "Chemie", teacher: "RNDr. Bílá", room: "224", color: "#9B51E0" },
    { id: "thu-3", time: "9:35", subject: "Informatika", teacher: "Ing. Král", room: "LAB", color: "#EB5757" },
  ],
  fri: [
    { id: "fri-1", time: "7:45", subject: "Matematika", teacher: "Mgr. Nováková", room: "214", color: "#2F7DF6", note: "Písemka z funkcí" },
    { id: "fri-2", time: "8:40", subject: "Český jazyk", teacher: "Mgr. Dvořák", room: "102", color: "#F2994A" },
    { id: "fri-3", time: "9:35", subject: "Informatika", teacher: "Ing. Král", room: "LAB", color: "#EB5757", note: "Skupina A" },
    { id: "fri-4", time: "10:45", subject: "Angličtina", teacher: "Bc. Thomas", room: "305", color: "#27AE60" },
  ],
};

export const grades: Grade[] = [
  { id: "math", subject: "Matematika", abbreviation: "M", grades: ["1", "1", "2"], average: "1,3", trend: "up", color: "#2F7DF6" },
  { id: "czech", subject: "Český jazyk", abbreviation: "ČJ", grades: ["1", "2"], average: "1,5", trend: "steady", color: "#F2994A" },
  { id: "informatics", subject: "Informatika", abbreviation: "INF", grades: ["1", "1"], average: "1,0", trend: "up", color: "#EB5757" },
  { id: "english", subject: "Angličtina", abbreviation: "AJ", grades: ["2", "1"], average: "1,5", trend: "down", color: "#27AE60" },
  { id: "physics", subject: "Fyzika", abbreviation: "FYZ", grades: ["1", "2", "1"], average: "1,3", trend: "steady", color: "#9B51E0" },
];

export const initialHomework: Homework[] = [
  { id: "hw-1", subject: "Matematika", title: "Procvičit kvadratické funkce", due: "2026-09-26", dueLabel: "zítra", color: "#2F7DF6", completed: false },
  { id: "hw-2", subject: "Český jazyk", title: "Čtenářský deník: Bílá nemoc", due: "2026-09-28", dueLabel: "po 28. 9.", color: "#F2994A", completed: false },
  { id: "hw-3", subject: "Fyzika", title: "Dopsat laboratorní protokol", due: "2026-09-30", dueLabel: "st 30. 9.", color: "#9B51E0", completed: false },
  { id: "hw-4", subject: "Dějepis", title: "Mapa Evropy po roce 1918", due: "2026-10-02", dueLabel: "pá 2. 10.", color: "#F2994A", completed: true },
];

export const todayKey = "fri";
