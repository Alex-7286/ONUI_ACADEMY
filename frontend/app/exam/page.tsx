"use client";

import { AppHeader } from "@/src/components/AppHeader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
 
type ExamQuestion = {
  id: string;
  week: number | null;
  lesson: number | null;
  type: string;
  prompt: string;
  passage: string;
  options: string[];
};

type ExamData = {
  level: string;
  type: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  questions: ExamQuestion[];
};

type ExamResult = {
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  score: number;
  passed: boolean;
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v4l2.5 1.5M9 3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden="true" className="h-6 w-6">
      <path d="M7 4h10v16l-5-3-5 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M10 6h9M10 12h9M10 18h9M5 6h.01M5 12h.01M5 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SubmitIllustration() {
  return (
    <svg viewBox="0 0 220 190" role="img" aria-label="시험 제출 확인" className="mx-auto h-auto w-[190px] max-w-full">
      <ellipse cx="108" cy="135" rx="92" ry="50" fill="#EEF5FF" />
      <path d="M55 55h75l32 31v73H55V55Z" fill="#FFFFFF" />
      <path d="M130 55v31h32L130 55Z" fill="#BEE5FF" />
      <path d="M73 82h39M73 103h68M73 124h68M73 145h48" stroke="#9DD9F7" strokeWidth="9" strokeLinecap="square" />
      <circle cx="147" cy="126" r="43" fill="#FFD016" />
      <path d="m125 125 14 14 30-35" fill="none" stroke="#4FA4F5" strokeWidth="13" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="m38 16 6 17 17 6-17 6-6 17-6-17-17-6 17-6 6-17Z" fill="#FFD016" />
    </svg>
  );
}

function CompletionIllustration() {
  return (
    <svg viewBox="0 0 260 250" role="img" aria-label="시험 제출 완료" className="mx-auto h-auto w-[220px] max-w-full">
      <ellipse cx="130" cy="202" rx="105" ry="46" fill="#FFF8EC" />
      <path d="M56 82H24v35c0 31 18 53 49 61" fill="none" stroke="#FFD000" strokeWidth="13" />
      <path d="M204 82h32v35c0 31-18 53-49 61" fill="none" stroke="#FFA000" strokeWidth="13" />
      <path d="M42 126v83l24-23 24 23v-74L42 126Z" fill="#FF4B55" />
      <path d="M170 126v83l24-23 24 23v-83h-48Z" fill="#FF002D" />
      <path d="M65 42h130v88c0 57-36 91-65 91s-65-34-65-91V42Z" fill="#FFE477" />
      <path d="M130 42h65v88c0 57-36 91-65 91V42Z" fill="#FFC400" />
      <path d="m130 73 13 27 30 4-22 21 6 30-27-14-27 14 6-30-22-21 30-4 13-27Z" fill="#FFA000" />
      <path d="M123 220h14v25h-14z" fill="#FFA000" />
      <path d="M95 239h70c8 0 14 6 14 14H81c0-8 6-14 14-14Z" fill="#FFD95A" />
      <path d="m202 15 6 17 17 6-17 6-6 17-6-17-17-6 17-6 6-17Z" fill="#FFBE3D" />
      <path d="m224 55 4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z" fill="#FFBE3D" />
    </svg>
  );
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatSubmittedAt(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function StatusCount({
  color,
  label,
  count,
  bookmark = false,
}: {
  color?: string;
  label: string;
  count: number;
  bookmark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center border-r border-[var(--color-gray-stroke)] last:border-r-0">
      <div className="flex items-center gap-2 typo-body-14-r">
        {bookmark ? (
          <span className="text-[var(--color-gray-60-icon)]">
            <BookmarkIcon filled />
          </span>
        ) : (
          <span className={`h-5 w-5 rounded-full ${color}`} />
        )}
        {label}
      </div>
      <strong className="mt-1 typo-tit-20-sb">{count}</strong>
    </div>
  );
}

function Legend({
  color,
  bookmarkColor,
  label,
}: {
  color?: string;
  bookmarkColor?: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      {bookmarkColor ? (
        <span style={{ color: bookmarkColor }}>
          <BookmarkIcon filled />
        </span>
      ) : (
        <span className={`h-5 w-5 rounded-full ${color}`} />
      )}
      {label}
    </span>
  );
}

function ExamContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") ?? "초급 1";
  const examType = searchParams.get("type") ?? "midterm";
  const examTitle = examType === "final" ? "기말고사" : "중간고사";
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [questionListOpen, setQuestionListOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionReviewOpen, setSubmissionReviewOpen] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/exams/questions?level=${encodeURIComponent(level)}&type=${encodeURIComponent(examType)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(payload?.detail ?? "시험 문제를 불러오지 못했습니다.");
        }
        return response.json() as Promise<ExamData>;
      })
      .then((data) => {
        if (!active) return;
        setExam(data);
        setAnswers(Array(data.questions.length).fill(null));
        setRemainingSeconds(data.durationMinutes * 60);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "시험 문제를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [examType, level]);

  useEffect(() => {
    if (!exam || result) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exam, result]);

  useEffect(() => {
    if (!questionListOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [questionListOpen]);

  const answeredCount = useMemo(() => answers.filter((answer) => answer !== null).length, [answers]);
  const question = exam?.questions[currentIndex];
  const progress = exam?.questionCount ? ((currentIndex + 1) / exam.questionCount) * 100 : 0;

  const selectAnswer = (optionIndex: number) => {
    setAnswers((current) => {
      const next = [...current];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const toggleBookmark = () => {
    setBookmarked((current) => {
      const next = new Set(current);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const openSubmissionReview = () => {
    setQuestionListOpen(false);
    setSubmissionReviewOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitExam = async () => {
    if (!exam || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          exam_type: examType,
          answers: exam.questions.map((item, index) => ({
            question_id: item.id,
            selected_index: answers[index],
          })),
        }),
      });

      if (!response.ok) throw new Error("시험 제출에 실패했습니다.");
      setSubmittedAt(new Date());
      setSubmissionReviewOpen(false);
      setResult((await response.json()) as ExamResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch(error) {
      window.alert(error instanceof Error ? error.message : "시험 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };


  

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#EEF2F6]">
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
          <AppHeader />
          <div className="relative flex h-[52px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
            <Link href="/student_assignments" className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]">
              <BackIcon />
            </Link>
            <h1 className="typo-tit-20-sb">{examTitle}</h1>
          </div>
          <div className="m-5 rounded-[8px] bg-[var(--color-white)] p-5 typo-body-16-r text-[var(--color-gray-70)]">{loadError}</div>
        </div>
      </main>
    );
  }

  if (!exam || !question) {
    return <main className="min-h-screen bg-[#EEF2F6]" />;
  }

  if (submissionReviewOpen) {
    const unansweredCount = exam.questionCount - answeredCount;

    return (
      <main className="min-h-screen bg-[#EEF2F6] text-[var(--color-gray-100)]">
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
          <AppHeader />
          <header className="sticky top-[61px] z-10 flex h-[52px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
            <button
              type="button"
              onClick={() => setSubmissionReviewOpen(false)}
              className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]"
              aria-label="시험으로 돌아가기"
            >
              <BackIcon />
            </button>
            <h1 className="typo-tit-20-sb">{exam.title}</h1>
          </header>

          <section className="px-5 py-7 md:px-10">
            <div className="rounded-[6px] bg-[var(--color-white)] px-7 pb-7 pt-6 text-center md:px-10">
              <SubmitIllustration />

              <h2 className="mt-5 typo-tit-20-sb text-[var(--color-gray-100)]">시험을 종료하시겠습니까?</h2>
              <p className="mt-3 typo-sub-16-m text-[var(--color-gray-60-icon)]">제출 전, 답안을 다시 확인해주세요.</p>

              <dl className="mt-8 space-y-4 bg-[var(--color-primary-10)] px-7 py-6 typo-sub-16-m">
                <div className="flex items-center justify-between">
                  <dt className="typo-tag-14-sb text-[var(--color-gray-60-icon)]">전체 문항</dt>
                  <dd className="typo-tag-14-sb text-[var(--color-gray-90)]">{exam.questionCount}문항</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="typo-tag-14-sb text-[var(--color-gray-60-icon)]">답변 완료</dt>
                  <dd className="typo-tag-14-sb text-[var(--color-gray-90)]">{answeredCount}문항</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="typo-tag-14-sb text-[var(--color-gray-60-icon)]">미답변</dt>
                  <dd className="typo-tag-14-sb text-[var(--color-gray-90)]">{unansweredCount}문항</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubmissionReviewOpen(false)}
                className="flex h-[64px] items-center justify-center rounded-[5px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-100)]"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => void submitExam()}
                disabled={submitting}
                className="flex h-[64px] items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:opacity-50"
              >
                {submitting ? "제출 중" : "제출하기"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (result) {
    const elapsedSeconds = Math.max(0, exam.durationMinutes * 60 - remainingSeconds);

    return (
      <main className="min-h-screen bg-[#EEF2F6] text-[var(--color-gray-100)]">
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
          <AppHeader />
          <header className="sticky top-[61px] z-10 flex h-[52px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
            <Link href="/student_assignments" className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]">
              <BackIcon />
            </Link>
            <h1 className="typo-tit-20-sb">{exam.title}</h1>
          </header>

          <section className="px-5 py-7 md:px-10">
            <div className="rounded-[6px] bg-[var(--color-white)] px-7 pb-7 pt-6 text-center md:px-10">
              <CompletionIllustration />

              <h2 className="mt-5 typo-tit-20-sb text-[var(--color-gray-100)]">수고하셨습니다!</h2>
              <p className="mt-3 typo-sub-16-m text-[var(--color-gray-60-icon)]">시험이 정상적으로 제출되었습니다.</p>

              <dl className="mt-8 space-y-4 bg-[var(--color-primary-10)] px-7 py-6 typo-sub-16-m">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--color-gray-60-icon)]">응답 문항</dt>
                  <dd className="typo-sub-16-b text-[var(--color-gray-90)]">
                    {result.answeredCount} / {result.questionCount}문항
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--color-gray-60-icon)]">소요 시간</dt>
                  <dd className="typo-sub-16-b text-[var(--color-gray-90)]">{formatTime(elapsedSeconds)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--color-gray-60-icon)]">제출 시간</dt>
                  <dd className="typo-sub-16-b text-[var(--color-gray-90)]">
                    {formatSubmittedAt(submittedAt ?? new Date())}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/student_assignments"
              className="mt-7 flex h-[64px] w-full items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-sub-16-m text-[var(--color-white)]"
            >
              확인
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF2F6] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
        <AppHeader />
        <header className="sticky top-[61px] z-10 flex h-[52px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
          <Link href="/student_assignments" className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]" aria-label="시험 목록으로">
            <BackIcon />
          </Link>
          <h1 className="typo-tit-20-sb">{exam.title}</h1>
        </header>

        <section className="space-y-3 px-5 py-6 md:px-10">
          <div className="flex h-[64px] items-center justify-between rounded-[5px] bg-[var(--color-white)] px-6">
            <div className="flex items-center gap-2 typo-tag-14-sb text-[var(--color-secondary-90)]">
              <ClockIcon />
              <span>남은시간 : {formatTime(remainingSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={openSubmissionReview}
              disabled={submitting} 
              className="flex h-[44px] items-center gap-2 rounded-[5px] border border-[var(--color-primary-50)] px-4 typo-but-16-b text-[var(--color-primary-50)] disabled:opacity-50"
            >
              {submitting ? "제출 중" : "제출하기"}
              <ChevronRightIcon />
            </button>
          </div>

          <div className="rounded-[5px] bg-[var(--color-white)] px-6 py-5">
            <div className="flex items-end gap-1">
              <strong className="typo-tit-24-b text-[var(--color-gray-100)]">{currentIndex + 1}</strong>
              <span className="pb-0.5 typo-sub-16-m text-[var(--color-gray-50)]">/ {exam.questionCount} 문제</span>
            </div>
            <div className="mt-3 h-[10px] overflow-hidden rounded-full bg-[var(--color-gray-stroke)]">
              <div className="h-full rounded-full bg-[var(--color-primary-50)] transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <article className="overflow-hidden rounded-[5px] bg-[var(--color-white)]">
            <div className="px-5 pb-5 pt-6">
              <p className="typo-but-14-r leading-7 text-[var(--color-gray-100)]">{question.prompt}</p>

              {question.passage ? (
                <div className="mt-5 whitespace-pre-line rounded-[5px] bg-[var(--color-primary-10)] px-4 py-4 typo-sub-16-m leading-8 text-[var(--color-gray-80)]">
                  {question.passage}
                </div>
              ) : null}

              <div className="mt-7 space-y-3">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[currentIndex] === optionIndex;
                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      onClick={() => selectAnswer(optionIndex)}
                      className={`flex min-h-[52px] w-full items-center gap-3 rounded-[5px] border px-3 py-2 text-left typo-sub-16-m transition ${
                        selected
                          ? "border-[var(--color-primary-50)] bg-[var(--color-primary-10)] text-[var(--color-gray-80)] !font-bold"
                          : "border-[var(--color-gray-stroke)] bg-[var(--color-white)] text-[var(--color-gray-70)]"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                          selected
                            ? "border-[var(--color-primary-50)] text-[var(--color-primary-50)]"
                            : "border-[var(--color-gray-stroke)] text-transparent"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${selected ? "bg-[var(--color-primary-50)]" : "bg-transparent"}`} />
                      </span>
                      <span className="whitespace-pre-line">{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid h-[60px] grid-cols-2 border-t border-[var(--color-gray-stroke)]">
              <button
                type="button"
                onClick={toggleBookmark}
                className={`flex items-center justify-center gap-2 typo-tab-15-m ${
                  bookmarked.has(currentIndex) ? "text-[var(--color-point-90)]" : "text-[var(--color-gray-60-icon)]"
                }`}
              >
                <BookmarkIcon filled={bookmarked.has(currentIndex)} />
                다시보기
              </button>
              <button
                type="button"
                onClick={() => setQuestionListOpen((open) => !open)}
                className="flex items-center justify-center gap-2 border-l border-[var(--color-gray-stroke)] typo-tab-15-m text-[var(--color-gray-60-icon)]"
              >
                <ListIcon />
                문제 목록
              </button>
            </div>
          </article>

          {questionListOpen ? (
  <div className="fixed inset-y-0 left-1/2 z-50 !mt-0 flex w-full max-w-[430px] -translate-x-1/2 items-start justify-center overflow-y-auto bg-black/35 px-[clamp(8px,4vw,24px)] pb-[clamp(20px,4vh,40px)] pt-[clamp(20px,6vh,60px)] md:max-w-[720px]">
    <section className="max-h-[90dvh] w-full max-w-[372px] overflow-y-auto rounded-[16px] bg-white px-4 pb-5 pt-6 min-[390px]:px-7 min-[390px]:pb-6 min-[390px]:pt-7 md:max-w-[520px] md:px-8">
      <h2 className="text-center typo-tit-20-sb">시험 진행 현황</h2>

      <div className="mt-6 grid grid-cols-3 border-b border-[var(--color-gray-stroke)]">
        {[
          ["전체", exam.questionCount],
          ["미답", exam.questionCount - answeredCount],
          ["다시보기", bookmarked.size],
        ].map(([label, count], index) => (
          <button
            key={label}
            type="button"
            className={`border-b-2 pb-4 typo-sub-16-m ${
              index === 0
                ? "border-[var(--color-primary-50)] text-[var(--color-primary-50)]"
                : "border-transparent text-[var(--color-gray-60-icon)]"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 rounded-[6px] bg-[var(--color-primary-10)] py-3">
        <StatusCount
          color="bg-[var(--color-primary-50)]"
          label="응답"
          count={answeredCount}
        />
        <StatusCount
          color="bg-[var(--color-gray-10)]"
          label="미답"
          count={exam.questionCount - answeredCount}
        />
        <StatusCount
          bookmark
          label="다시보기"
          count={bookmarked.size}
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-x-1 gap-y-2 typo-inf-12-m">
        <Legend color="bg-[var(--color-primary-50)]" label="응답" />
        <Legend color="bg-[var(--color-gray-10)]" label="미답" />
        <Legend bookmarkColor="var(--color-point-50)" label="응답+다시보기" />
        <Legend bookmarkColor="var(--color-wrong)" label="미답+다시보기" />
      </div>

      <div className="mt-5 grid grid-cols-8 gap-1.5 min-[390px]:gap-[10px] md:gap-3">
        {exam.questions.map((item, index) => {
          const answered = answers[index] !== null;
          const saved = bookmarked.has(index);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentIndex(index);
                setQuestionListOpen(false);
                window.scrollTo({ top: 0 });
              }}
              className={`relative grid aspect-square place-items-center rounded-[5px] typo-cap-13-m ${
                saved
                  ? answered
                    ? "border-2 border-[var(--color-point-50)] bg-[var(--color-white)] text-[var(--color-point-50)]"
                    : "border-2 border-[var(--color-wrong)] bg-[var(--color-white)] text-[var(--color-wrong)]"
                  : answered
                    ? "bg-[var(--color-primary-50)] text-white"
                    : "bg-[var(--color-gray-10)] text-[var(--color-gray-80)]"
              }`}
            >
              {saved ? (
                <span className="grid place-items-center">
                  <BookmarkIcon filled />
                </span>
              ) : (
                index + 1
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-right typo-cap-13-m text-[var(--color-gray-60-icon)]">
        *번호를 선택하면 해당 문제로 이동합니다.
      </p>

      <button
        type="button"
        onClick={() => setQuestionListOpen(false)}
        className="mt-7 flex h-[56px] w-full items-center justify-center rounded-[5px] border border-[var(--color-gray-stroke)] typo-tit-18-b text-[var(--color-gray-60-icon)]"
      >
        문제 목록 닫기
      </button>
    </section>
  </div>
) : null}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((index) => Math.max(0, index - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentIndex === 0}
              className="flex h-[58px] items-center justify-center gap-2 rounded-[5px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-100)] disabled:text-[var(--color-gray-30)]"
            >
              <span className="rotate-180"><ChevronRightIcon /></span>
              이전 문제
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentIndex === exam.questionCount - 1) {
                  openSubmissionReview();
                  return;
                }
                setCurrentIndex((index) => Math.min(exam.questionCount - 1, index + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex h-[58px] items-center justify-center gap-2 rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
            >
              {currentIndex === exam.questionCount - 1 ? "제출하기" : "다음 문제"}
              <ChevronRightIcon />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#EEF2F6]" />}>
      <ExamContent />
    </Suspense>
  );
}
