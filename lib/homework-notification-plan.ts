import type { Homework } from "@/shared/bakalari-data";

export type HomeworkReminderPlan = {
  homeworkId: string;
  subject: string;
  title: string;
  due: string;
  fireAt: Date;
  label: "den předem" | "ráno v den termínu";
};

function localDate(date: string, hour: number): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const result = new Date(`${date}T00:00:00`);
  if (Number.isNaN(result.getTime())) return null;
  result.setHours(hour, 0, 0, 0);
  return result;
}

export function buildHomeworkReminderPlan(homework: Homework[], now = new Date()): HomeworkReminderPlan[] {
  return homework
    .filter((item) => !item.completed && item.due)
    .flatMap((item) => {
      const morning = localDate(item.due, 7);
      const previousEvening = localDate(item.due, 18);
      if (!morning || !previousEvening) return [];
      previousEvening.setDate(previousEvening.getDate() - 1);
      return [
        { homeworkId: item.id, subject: item.subject, title: item.title, due: item.due, fireAt: previousEvening, label: "den předem" as const },
        { homeworkId: item.id, subject: item.subject, title: item.title, due: item.due, fireAt: morning, label: "ráno v den termínu" as const },
      ];
    })
    .filter((reminder) => reminder.fireAt.getTime() > now.getTime())
    .sort((left, right) => left.fireAt.getTime() - right.fireAt.getTime());
}
