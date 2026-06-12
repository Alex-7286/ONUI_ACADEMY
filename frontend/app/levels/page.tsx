"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/src/components/AppHeader";
import { PROGRESS_EVENT_NAME, getCurrentOpenWeek, getLessonProgress, getWeekProgress } from "@/src/lib/progress";

type Lesson = {
  lesson: number;
  title: string;
  progress: number;
};

type Week = {
  week: number;
  label?: string;
  progress: number;
  lessons: Lesson[];
  disabled?: boolean;
  locked?: boolean;
};

type LessonSlideSet = {
  week: number;
  lesson: number;
  title: string;
};

type LessonSlideSets = Record<string, LessonSlideSet>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const weeks: Week[] = [
  {
    week: 1,
    progress: 100,
    lessons: [
      { lesson: 1, title: "1차시 - 이름 말하기", progress: 100 },
      { lesson: 2, title: "2차시 - 국적 말하기", progress: 100 },
    ],
  },
  {
    week: 2,
    progress: 50,
    lessons: [
      { lesson: 1, title: "1차시 - 기본 인사 표현 이해", progress: 100 },
      { lesson: 2, title: "2차시 - 상황에 맞게 인사 말하기", progress: 0 },
    ],
  },
  {
    week: 3,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 학생·전공 어휘 이해", progress: 0 },
      { lesson: 2, title: "2차시 - 은/는 사용하여 자기 정보 말하기", progress: 0 },
    ],
  },
  {
    week: 4,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 이/그/저 이해", progress: 0 },
      { lesson: 2, title: "2차시 - 있어요로 위치 말하기", progress: 0 },
    ],
  },
  {
    week: 5,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 숫자 체계 이해", progress: 0 },
      { lesson: 2, title: "2차시 - 시간 말하기", progress: 0 },
    ],
  },
  {
    week: 6,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 현재형 이해", progress: 0 },
      { lesson: 2, title: "2차시 - 일상 말하기", progress: 0 },
    ],
  },
  {
    week: 7,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 음식 어휘 이해", progress: 0 },
      { lesson: 2, title: "2차시 - 주문 말하기", progress: 0 },
    ],
  },
  { week: 8, label: "중간고사", progress: 0, lessons: [], disabled: true },
  {
    week: 9,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 중간 복습", progress: 0 },
      { lesson: 2, title: "2차시 - 가격 표현 이해", progress: 0 },
    ],
  },
  {
    week: 10,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 쇼핑 말하기", progress: 0 },
      { lesson: 2, title: "2차시 - 장소·교통 어휘", progress: 0 },
    ],
  },
  {
    week: 11,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 에 가요 사용", progress: 0 },
      { lesson: 2, title: "2차시 - 취미 어휘", progress: 0 },
    ],
  },
  {
    week: 12,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 하고 싶어요 사용", progress: 0 },
      { lesson: 2, title: "2차시 - 요일·계획 어휘", progress: 0 },
    ],
  },
  {
    week: 13,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - (으)ㄹ 거예요", progress: 0 },
      { lesson: 2, title: "2차시 - 현재 시제 확장 사용", progress: 0 },
    ],
  },
  {
    week: 14,
    progress: 0,
    lessons: [
      { lesson: 1, title: "1차시 - 초급1 핵심 문법·어휘 복습", progress: 0 },
      { lesson: 2, title: "2차시 - 최종 복습", progress: 0 },
    ],
  },
  { week: 15, label: "기말고사", progress: 0, lessons: [], disabled: true },
];

const levelItems = ["초급 1", "초급 2", "중급 1", "중급 2", "고급 1", "고급 2"];

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WeekAccordion({ item, isOpen, onToggle, level }: { item: Week; isOpen: boolean; onToggle: () => void; level: string }) {
  const displayLabel = item.label ?? `${item.week}주차`;
  const isLocked = item.locked || item.disabled || item.lessons.length === 0;

  return (
    <div>
      <button
        type="button"
        onClick={isLocked ? undefined : onToggle}
        disabled={isLocked}
        className={`relative flex h-[46px] w-full items-center justify-between rounded-[3px] px-5 text-left ${
          isLocked
            ? "bg-[var(--color-gray-30)] text-[var(--color-gray-100)]"
            : isOpen
              ? "bg-[var(--color-primary-50)] text-[var(--color-white)]"
              : "bg-[var(--color-primary-10)] text-[var(--color-gray-100)]"
        }`}
      >
        <span className="typo-sub-16-b">{displayLabel}</span>

        {isLocked ? (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-white)]">
            <LockIcon />
          </span>
        ) : null}

        <span className="flex items-center gap-4">
          <span
            className={
              isLocked
                ? "text-[var(--color-gray-70)]"
                : isOpen
                ? "text-[var(--color-white)]"
                : item.progress === 100
                  ? "text-[var(--color-primary-50)]"
                  : "text-[var(--color-gray-70)]"
            }
          >
            {item.progress}%
          </span>
          <ChevronDownIcon open={isOpen} />
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-3 bg-[var(--color-gray-8g)] px-4 py-4">
          {item.lessons.map((lesson) => (
            <Link
              key={lesson.lesson}
              href={`/lesson?level=${encodeURIComponent(level)}&week=${item.week}&lesson=${lesson.lesson}&title=${encodeURIComponent(lesson.title)}`}
              className="flex h-[44px] items-center justify-between rounded-[3px] bg-[var(--color-white)] px-4 transition hover:bg-[var(--color-primary-10)]"
            >
              <span className="typo-tab-15-m text-[var(--color-gray-100)]">{lesson.title}</span>
              <span className="typo-tab-15-m text-[var(--color-gray-70)]">{lesson.progress}%</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}


function LevelsContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") ?? "초급 1";
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [progressVersion, setProgressVersion] = useState(0);
  const [slideSets, setSlideSets] = useState<LessonSlideSets | null>(null);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);


  useEffect(() => {
    const syncProgress = () => {
      setHydrated(true);
      setProgressVersion((version) => version + 1);
    };

    syncProgress();
    window.addEventListener("storage", syncProgress);
    window.addEventListener("focus", syncProgress);
    window.addEventListener(PROGRESS_EVENT_NAME, syncProgress);

    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener("focus", syncProgress);
      window.removeEventListener(PROGRESS_EVENT_NAME, syncProgress);
    };
  }, [level]);

  useEffect(() => {
    let active = true;

    setSlideSets(null);

    fetch(`${API_BASE_URL}/lectures/slides?level=${encodeURIComponent(level)}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("차시 정보를 불러오지 못했습니다.");
        }

        return response.json() as Promise<LessonSlideSets>;
      })
      .then((data) => {
        if (active) setSlideSets(data);
      })
      .catch(() => {
        if (active) setSlideSets(null);
      });

    return () => {
      active = false;
    };
  }, [level]);

  const weeksWithProgress = useMemo(() => {
    let previousLearningComplete = true;

    return weeks.map((week) => {
        const lessons = week.lessons.map((lesson) => ({
          ...lesson,
          title: slideSets?.[`${week.week}-${lesson.lesson}`]?.title
            ? `${lesson.lesson}차시 - ${slideSets[`${week.week}-${lesson.lesson}`].title}`
            : lesson.title,
          progress: hydrated ? getLessonProgress(level, week.week, lesson.lesson) : 0,
        }));
        const progress = getWeekProgress(level, { ...week, lessons });
        const locked = !previousLearningComplete;

        if (lessons.length > 0 && progress < 100) {
          previousLearningComplete = false;
        }

        return {
          ...week,
          lessons,
          progress,
          locked,
        };
      });
  }, [hydrated, level, progressVersion, slideSets]);

  useEffect(() => {
    if (!hydrated) return;
    setOpenWeek(getCurrentOpenWeek(level, weeksWithProgress));
  }, [hydrated, level, weeksWithProgress]);

  return (
    <main className="min-h-screen bg-[var(--color-gray-bg)] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px] bg-[var(--color-gray-bg)]">
        <AppHeader />

        <section className="relative flex h-[72px] items-center justify-between border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
          <Link href="/" className="grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]" aria-label="뒤로가기">
            <BackIcon />
          </Link>

          <button
            type="button"
            onClick={() => setLevelDropdownOpen((current) => !current)}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 typo-sub-18-r text-[var(--color-gray-100)]"
            aria-expanded={levelDropdownOpen}
          >
            {level}
            <ChevronDownIcon open={levelDropdownOpen} />
          </button>

          {levelDropdownOpen ? (
            <div className="absolute left-1/2 top-[62px] z-30 w-[160px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
              {levelItems.map((item) => (
                <Link
                  key={item}
                  href={`/levels?level=${encodeURIComponent(item)}`}
                  onClick={() => setLevelDropdownOpen(false)}
                  className={`block px-4 py-3 text-center typo-sub-16-b transition hover:bg-[var(--color-primary-10)] ${
                    item === level ? "text-[var(--color-primary-50)]" : "text-[var(--color-gray-80)]"
                  }`}
                >
                  {item}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="w-9" />
        </section>

        <section className="space-y-2 px-2 py-5">
          {weeksWithProgress.map((item) => (
            <WeekAccordion
              key={item.week}
              item={item}
              isOpen={openWeek === item.week}
              onToggle={() => setOpenWeek(openWeek === item.week ? null : item.week)}
              level={level}
            />
          ))}
        </section>
      </div>

    </main>
  );
}

export default function LevelsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--color-gray-bg)]" />}>
      <LevelsContent />
    </Suspense>
  );
}







