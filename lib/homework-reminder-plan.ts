import type { Homework } from "../shared/bakalari-data";

// Pure planning logic (no native imports) so it can be unit-tested in Node.
export type ReminderKind = "eve" | "morning";
export type PlannedReminder = {
  identifier: string;
  homeworkId: string;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
};

export const EVE_HOUR = 18; // day before the deadline
export const MORNING_HOUR = 7; // morning of the deadline
export const MAX_SCHEDULED = 60; // iOS keeps at most 64 pending local notifications
const MIN_LEAD_MS = 5_000;

function localDate(iso: string, hour: number, dayOffset = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayOffset, hour, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function planHomeworkReminders(homework: Homework[], now = new Date()): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const item of homework) {
    if (item.completed || !item.due) continue;
    const candidates: [ReminderKind, Date | null, string][] = [
      ["eve", localDate(item.due, EVE_HOUR, -1), "termín je zítra"],
      ["morning", localDate(item.due, MORNING_HOUR), "termín je dnes"],
    ];
    for (const [kind, at, when] of candidates) {
      if (!at || at.getTime() - now.getTime() < MIN_LEAD_MS) continue;
      planned.push({
        identifier: `homework-${item.id}-${kind}`,
        homeworkId: item.id,
        kind,
        at,
        title: `Úkol: ${item.subject}`,
        body: `${item.title} – ${when}`,
      });
    }
  }
  return planned.sort((left, right) => left.at.getTime() - right.at.getTime()).slice(0, MAX_SCHEDULED);
}
