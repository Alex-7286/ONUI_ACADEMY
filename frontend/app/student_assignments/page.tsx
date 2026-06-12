"use client";

import Link from "next/link";
import { AppHeader } from "@/src/components/AppHeader";
import { useEffect, useState } from "react";

type ExamStatus = "available" | "scheduled";

type Exam = {
  id: string;
  type: "midterm" | "final";
  title: string;
  status: ExamStatus;
  periodLabel: string;
  period: string;
  questionCount?: number;
  durationMinutes: number;
  passingScore: number;
  remainingDays?: number;
};

const exams: Exam[] = [
  {
    id: "beginner-1-midterm",
    type: "midterm",
    title: "초급 1 중간고사",
    status: "available",
    periodLabel: "응시 기간",
    period: "2025.05.20 (화) 10:00 ~ 2025.05.27 (화) 24:00",
    durationMinutes: 60,
    passingScore: 70,
  },
  {
    id: "beginner-1-final",
    type: "final",
    title: "초급 1 기말고사",
    status: "available",
    periodLabel: "응시 시작일",
    period: "2025.06.25 (수) 10:00",
    durationMinutes: 60,
    passingScore: 70,
    remainingDays: 36,
  },
];

function ExamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--color-primary-50)]">
      <path d="M6 3.5h9.5L19 7v13.5H6V3.5Z" fill="currentColor" opacity=".72" />
      <path d="M15.5 3.5V7H19M9 10h7M9 13h7M9 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusBadge({ status }: { status: ExamStatus }) {
  const available = status === "available";

  return (
    <span
      className={`rounded-[8px] px-3 py-1 typo-tag-14-sb ${
        available
          ? "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]"
          : "bg-[var(--color-point-10)] text-[var(--color-point-90)]"
      }`}
    >
      {available ? "응시 가능" : "응시 예정"}
    </span>
  );
}

function ExamCard({ exam, questionCount }: { exam: Exam; questionCount?: number }) {
  const available = exam.status === "available";

  return (
    <article className="rounded-[12px] bg-[var(--color-white)] px-6 py-7 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <ExamIcon />
          <h2 className="truncate typo-tit-20-sb text-[var(--color-gray-100)]">{exam.title}</h2>
        </div>
        <StatusBadge status={exam.status} />
      </div>

      <dl className="mt-7 grid grid-cols-[minmax(90px,1fr)_minmax(0,1.35fr)] gap-x-4 gap-y-3 typo-body-16-r text-[var(--color-gray-70)]">
        <dt>{exam.periodLabel}</dt>
        <dd className="min-w-0 break-keep">{exam.period}</dd>

        <dt>문항 수</dt>
        <dd>{questionCount ?? exam.questionCount ?? "전체"} 문항</dd>

        <dt>제한 시간</dt>
        <dd>{exam.durationMinutes}분</dd>

        <dt>합격 기준</dt>
        <dd>{exam.passingScore}점 이상</dd>
      </dl>

      {available ? (
        <Link
          href={`/exam?level=${encodeURIComponent("초급 1")}&type=${exam.type}`}
          className="mt-8 flex h-[58px] w-full items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-tit-20-sb text-[var(--color-white)] transition hover:brightness-95 active:brightness-90"
        >
          시험 시작하기
        </Link>
      ) : (
        <div className="mt-8 flex h-[52px] w-full items-center justify-center rounded-[5px] border border-[var(--color-gray-20)] bg-[var(--color-gray-10)] typo-tit-20-sb text-[var(--color-gray-50)]">
          D-{exam.remainingDays}
        </div>
      )}
    </article>
  );
}

export default function StudentAssignmentsPage() {
  const [questionCounts, setQuestionCounts] = useState<Partial<Record<Exam["type"], number>>>({});

  useEffect(() => {
    let active = true;

    Promise.all(
      exams.map((exam) =>
        fetch(`/api/exams/questions?level=${encodeURIComponent("초급 1")}&type=${exam.type}`, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { questionCount?: number } | null) => [exam.type, data?.questionCount] as const),
      ),
    )
      .then((entries) => {
        if (!active) return;

        setQuestionCounts(
          Object.fromEntries(entries.filter((entry): entry is [Exam["type"], number] => entry[1] !== undefined)),
        );
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#EEF2F6] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
        <AppHeader />

        <section className="flex h-[64px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <h1 className="typo-tit-20-sb text-[var(--color-gray-100)]">시험 응시</h1>
        </section>

        <section className="space-y-4 px-[18px] py-7 md:px-10">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} questionCount={questionCounts[exam.type]} />
          ))}

          <aside className="rounded-[12px] bg-[var(--color-primary-10)] px-4 py-5 md:px-6">
            <h2 className="typo-sub-16-m text-[var(--color-primary-90)]">안내 사항</h2>
            <ul className="mt-3 space-y-2 pl-5 typo-body-14-r leading-6 text-[var(--color-gray-70)]">
              <li className="list-disc">시험 기간 내에만 응시와 제출이 가능합니다.</li>
              <li className="list-disc">시험 시작 후에는 일시정지나 나가기가 불가능합니다.</li>
              <li className="list-disc">부정 행위가 적발될 경우, 해당 시험은 0점 처리될 수 있습니다.</li>
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
