"use client";

import Link from "next/link";
import { AppHeader } from "@/src/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

function LevelBar({ level }: { level: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative flex h-[48px] items-center justify-between border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
      <Link href={`/levels?level=${encodeURIComponent(level)}`} className="grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]" aria-label="뒤로가기">
        <BackIcon />
      </Link>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 typo-sub-18-r text-[var(--color-gray-100)]"
        aria-expanded={open}
      >
        {level}
        <ChevronDownIcon open={open} />
      </button>

      {open ? (
        <div className="absolute left-1/2 top-[44px] z-30 w-[160px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
          {levelItems.map((item) => (
            <Link
              key={item}
              href={`/levels?level=${encodeURIComponent(item)}`}
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
  );
}

function LessonContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") ?? "초급 1";
  const lesson = searchParams.get("lesson") ?? "2";
  const title = searchParams.get("title") ?? `${lesson}차시 - 인사표현`;
  const week = searchParams.get("week") ?? "2";
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [lectureSummary, setLectureSummary] = useState("");
  const [learningObjective, setLearningObjective] = useState("");

  useEffect(() => {
    let active = true;

    setLectureSummary("");
    setLearningObjective("");

    fetch(`/api/lectures/slides?level=${encodeURIComponent(level)}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("강의 정보를 불러오지 못했습니다.");
        }

        return response.json();
      })
      .then((data) => {
        if (!active) return;

        const lessonData = data[`${week}-${lesson}`] as
          | {
              summary?: string;
              slides?: Array<{ content?: string }>;
            }
          | undefined;
        const subtopic = lessonData?.slides
          ?.map((slide) => slide.content?.match(/^소주제\s*:\s*(.+)$/m)?.[1]?.trim())
          .find(Boolean);

        setLectureSummary(lessonData?.summary?.trim() ?? "");
        setLearningObjective(subtopic ?? "");
      })
      .catch(() => {
        if (!active) return;
        setLectureSummary("");
        setLearningObjective("");
      });

    return () => {
      active = false;
    };
  }, [level, week, lesson]);

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
        <AppHeader />
        <LevelBar level = {level} />

        <section className="px-[18px] md:px-10 py-5">
          <div className="overflow-hidden rounded-[3px] bg-[var(--color-white)]">
            <h1 className="px-5 py-4 typo-tit-20-sb text-[var(--color-gray-100)]">{title}</h1>
            <button
              type="button"
              onClick={() => setSummaryOpen((current) => !current)}
              className="flex h-[39px] w-full items-center justify-between bg-[var(--color-primary-90)] px-5 typo-sub-16-m text-[var(--color-white)]"
              aria-expanded={summaryOpen}
            >
              강의 요약본 보기
              <ChevronDownIcon open={summaryOpen} />
            </button>
            {summaryOpen ? (
              <div className="whitespace-pre-line border-x border-b border-[var(--color-gray-stroke)] px-5 py-4 typo-body-14-r leading-[1.7] text-[var(--color-gray-70)]">
                {lectureSummary || "강의 요약 정보가 없습니다."}
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-[3px] bg-[var(--color-white)] px-5 py-5">
            <dl className="grid grid-cols-[74px_1fr] gap-y-3 typo-body-16-r">
              <dt className="typo-sub-16-m text-[var(--color-gray-100)]">기간</dt>
              <dd className="typo-body-16-r text-[var(--color-gray-70)]">2026.08.01 ~ 2026.08.14</dd>
              <dt className="typo-sub-16-m text-[var(--color-gray-100)]">수준</dt>
              <dd className="typo-body-16-r text-[var(--color-gray-70)]">{level.replace(" ", "")}</dd>
              <dt className="typo-sub-16-m text-[var(--color-gray-100)]">학습목표</dt>
              <dd className="typo-body-16-r text-[var(--color-gray-70)]">{learningObjective || "학습목표 정보 없음"}</dd>
            </dl>

            <Link
              href={`/study?level=${encodeURIComponent(level)}&week=${searchParams.get("week") ?? "2"}&lesson=${lesson}`}
              className="mt-6 flex h-[44px] w-full items-center justify-center rounded-[3px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
            >
              수강하기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<main className="min-h-screen web-screen-bg" />}>
      <LessonContent />
    </Suspense>
  );
}


