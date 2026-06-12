export type LessonProgress = {
  level: string;
  week: number;
  lesson: number;
  title?: string;
  percent: number;
  updatedAt: number;
};

export type RecentProgress = LessonProgress;

export type LessonProgressSource = {
  lesson: number;
  title?: string;
  progress?: number;
};

export type WeekProgressSource = {
  week: number;
  lessons: LessonProgressSource[];
  disabled?: boolean;
};

const PROGRESS_STORAGE_KEY = "onui_learning_progress";
const RECENT_STORAGE_KEY = "onui_recent_progress";
export const PROGRESS_EVENT_NAME = "onui_learning_progress_changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizePercent(percent: number) {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function progressKey(level: string, week: number, lesson: number) {
  return `${level}|${week}|${lesson}`;
}

export function readProgressMap(): Record<string, LessonProgress> {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, LessonProgress>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgressMap(progressMap: Record<string, LessonProgress>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
}

export function getLessonProgress(level: string, week: number, lesson: number) {
  return readProgressMap()[progressKey(level, week, lesson)]?.percent ?? 0;
}

export function readRecentProgress(): RecentProgress | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecentProgress;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setLessonProgress(level: string, week: number, lesson: number, percent: number, title?: string) {
  if (!canUseStorage()) return;

  const key = progressKey(level, week, lesson);
  const progressMap = readProgressMap();
  const previous = progressMap[key];
  const nextPercent = Math.max(previous?.percent ?? 0, normalizePercent(percent));
  const nextProgress: LessonProgress = {
    level,
    week,
    lesson,
    title: title ?? previous?.title,
    percent: nextPercent,
    updatedAt: Date.now(),
  };

  progressMap[key] = nextProgress;
  writeProgressMap(progressMap);
  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextProgress));
  window.dispatchEvent(new Event(PROGRESS_EVENT_NAME));
}

export function getWeekProgress(_level: string, week: WeekProgressSource) {
  if (week.lessons.length === 0) return 0;

  const total = week.lessons.reduce((sum, lesson) => sum + normalizePercent(lesson.progress ?? 0), 0);
  return normalizePercent(total / week.lessons.length);
}

export function getCurrentOpenWeek(level: string, weeks: WeekProgressSource[]) {
  const availableWeeks = weeks.filter((week) => !week.disabled && week.lessons.length > 0);
  const firstIncomplete = availableWeeks.find((week) => getWeekProgress(level, week) < 100);
  return firstIncomplete?.week ?? availableWeeks[availableWeeks.length - 1]?.week ?? null;
}
