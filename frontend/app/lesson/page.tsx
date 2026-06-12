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

function LessonIllustration() {
  return (
    <svg viewBox="0 0 348 220" role="img" aria-label="인사표현 일러스트" className="block h-[220px] w-full">
      <rect width="348" height="220" fill="#F8F8F8" />
      <rect x="48" y="0" width="4" height="220" fill="#BDB5D4" />
      <rect x="198" y="0" width="4" height="220" fill="#BDB5D4" />
      <rect x="272" y="0" width="4" height="220" fill="#BDB5D4" />
      <rect x="48" y="92" width="300" height="4" fill="#BDB5D4" />
      <rect x="248" y="155" width="100" height="65" fill="#766898" />
      <path d="M22 170c-2-26 11-55 34-76" stroke="#258A59" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M18 137c16-6 31-3 45 9-16 6-31 3-45-9Zm4 32c17-9 34-7 49 7-17 8-34 6-49-7Zm18-57c17-1 30 6 39 22-17 1-30-6-39-22Z" fill="#258A59" />
      <rect x="58" y="178" width="43" height="42" fill="#F2A07C" />
      <path d="M67 178h25l-5 42H72l-5-42Z" fill="#F5B195" />

      <path d="M97 85c8-26 48-22 54 3 7 28-13 48-28 48-18 0-34-23-26-51Z" fill="#6B371C" />
      <circle cx="124" cy="72" r="20" fill="#7B3E1D" />
      <path d="M108 72c14-18 34-16 43 2-13-3-26-1-43-2Z" fill="#4A2413" />
      <rect x="116" y="95" width="20" height="22" rx="8" fill="#9C5B37" />
      <path d="M84 132c4-25 22-38 43-38 24 0 39 16 43 39l11 70H77l7-71Z" fill="#283F3F" />
      <path d="M116 117h22l8 86h-39l9-86Z" fill="#F9F9F9" />
      <path d="M124 116l8 87h-12l-2-87h6Z" fill="#F47B20" />
      <rect x="82" y="141" width="25" height="70" rx="8" fill="#2F4C4C" />
      <rect x="156" y="139" width="22" height="70" rx="8" fill="#2F4C4C" />
      <rect x="148" y="172" width="36" height="21" rx="4" fill="#1F2D35" />
      <rect x="157" y="165" width="18" height="12" rx="3" fill="none" stroke="#1F2D35" strokeWidth="4" />
      <path d="M143 133c21 20 41 27 61 21" stroke="#9C5B37" strokeWidth="14" strokeLinecap="round" />
      <circle cx="205" cy="154" r="8" fill="#9C5B37" />

      <path d="M231 83c10-23 45-18 52 5 5 20-7 42-28 43-23 1-36-23-24-48Z" fill="#F0A17D" />
      <path d="M228 80c15-18 39-20 55-1-7 7-20 7-55 1Z" fill="#6B3F46" />
      <path d="M240 102c11 8 23 8 35 0-3 13-11 20-20 20-8 0-13-7-15-20Z" fill="#6B3F46" />
      <rect x="247" y="105" width="20" height="22" rx="8" fill="#E58C6A" />
      <path d="M214 133c2-24 21-39 44-39 24 0 42 16 45 41l6 85H211l3-87Z" fill="#E9EDF4" />
      <path d="M249 122h19l7 98h-34l8-98Z" fill="#F9F9F9" />
      <path d="M257 121l10 99h-12l-3-99h5Z" fill="#2683D9" />
      <path d="M219 139c-8 15-18 20-33 17" stroke="#E58C6A" strokeWidth="14" strokeLinecap="round" />
      <circle cx="185" cy="156" r="8" fill="#E58C6A" />
      <path d="M276 138l-3 82h46l-8-72c-2-16-23-23-35-10Z" fill="#DDE3ED" />
      <rect x="232" y="204" width="88" height="16" fill="#8A5326" />
    </svg>
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
    <main className="min-h-screen bg-[#EEF2F6] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px] bg-[#EEF2F6]">
        <AppHeader />
        <LevelBar level={level} />

        <section className="px-[18px] md:px-10 py-5">
          <div className="overflow-hidden rounded-[3px] bg-[var(--color-white)]">
            <h1 className="px-5 py-4 typo-tit-20-sb text-[var(--color-gray-100)]">{title}</h1>
            <LessonIllustration />
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
    <Suspense fallback={<main className="min-h-screen bg-[#EEF2F6]" />}>
      <LessonContent />
    </Suspense>
  );
}


