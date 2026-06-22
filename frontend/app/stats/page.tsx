"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/src/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type Grade = "A" | "B" | "C" | "D";

type LevelGrade = {
  level: string;
  averageScore: number | null;
  grade: Grade | null;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  midtermScore: number | null;
  finalScore: number | null;
  locked: boolean;
};

type StatsData = {
  levelGrades: LevelGrade[];
  currentLevel: LevelGrade;
};

const gradeClass: Record<Grade, string> = {
  A: "text-[var(--color-primary-50)]",
  B: "text-[var(--color-secondary-50)]",
  C: "text-[var(--color-point-50)]",
  D: "text-[var(--color-wrong)]",
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  return typeof payload?.detail === "string" ? payload.detail : "성적 정보를 불러오지 못했습니다.";
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 28 18"
      fill="none"
      aria-hidden="true"
      className={`h-[12px] w-[20px] text-[var(--color-gray-60-icon)] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M3 5L14 14L25 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[var(--color-white)]">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-primary-90)]">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5v5M12 7.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function scoreText(score: number | null) {
  return score === null ? "미응시" : `${score}점 / 100`;
}

function ScoreDetail({ label, score }: { label: string; score: number | null }) {
  const grade = score === null ? null : score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D";

  return (
    <div className="flex items-center justify-between rounded-[8px] bg-[var(--color-white)] px-3 py-3">
      <span className="typo-body-14-r text-[var(--color-gray-70)]">{label}</span>
      <span className={`typo-sub-16-b ${grade ? gradeClass[grade] : "text-[var(--color-gray-40)]"}`}>
        {score === null ? "미응시" : `${score}점 (${grade})`}
      </span>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("onui_user");
    const token = localStorage.getItem("onui_access_token");

    if (!storedUser || !token) {
      router.replace("/login?role=student");
      return;
    }

    try {
      const user = JSON.parse(storedUser) as { role?: string };
      if (user.role !== "student") {
        router.replace(user.role === "teacher" ? "/teacher/dashboard" : "/");
        return;
      }
    } catch {
      router.replace("/login?role=student");
      return;
    }

    let active = true;
    fetch(`${API_BASE_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response));
        return response.json() as Promise<StatsData>;
      })
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((error) => {
        if (active) setErrorText(error instanceof Error ? error.message : "성적 정보를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [router]);

  const current = stats?.currentLevel;
  const currentGradeClass = current?.grade ? gradeClass[current.grade] : "text-[var(--color-white)]";
  const currentAverage = current?.averageScore === null || current?.averageScore === undefined ? "-" : current.averageScore;
  const currentProgress = Math.max(0, Math.min(100, current?.progress ?? 0));
  const infoText = useMemo(() => "각 단계 성적은 중간고사와 기말고사의 최초 응시 점수 평균입니다.", []);

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] bg-[var(--color-white)] md:max-w-[720px]">
        <AppHeader />
        <section className="flex h-[64px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <h1 className="typo-tit-20-sb">성적 현황</h1>
        </section>

        <div className="space-y-6 px-6 py-7 md:px-10">
          {errorText ? (
            <p className="rounded-[12px] bg-[var(--color-wrong-bg)] px-4 py-4 typo-body-14-r text-[var(--color-wrong)]">{errorText}</p>
          ) : !stats || !current ? (
            <p className="rounded-[12px] bg-[var(--color-gray-8g)] px-4 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">성적 정보를 불러오는 중입니다.</p>
          ) : (
            <>
              <section className="rounded-[12px] bg-[var(--color-primary-50)] px-6 py-6 text-[var(--color-white)] shadow-[0_10px_22px_rgba(45,117,235,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="typo-tit-24-b">{current.level}</h2>
                  <div className="flex items-center gap-2">
                    <strong className="typo-tit-24-b">{currentAverage}점</strong>
                    <span className="typo-body-16-r text-white/80">/ 100</span>
                    <span className={`ml-1 grid h-9 w-9 place-items-center rounded-[6px] bg-[var(--color-white)] typo-tit-20-sb ${currentGradeClass}`}>
                      {current.grade ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="mt-5 h-px bg-white/65" />
                <div className="mt-4 flex items-center gap-3">
                  <span className="typo-body-14-r">진행률</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/35">
                    <div className="h-full rounded-full bg-[var(--color-white)]" style={{ width: `${currentProgress}%` }} />
                  </div>
                  <strong className="typo-sub-16-b">{currentProgress}%</strong>
                </div>
              </section>

              <section>
                <h2 className="mb-3 typo-tab-15-m">단계별 성적</h2>
                <div className="space-y-3">
                  {stats.levelGrades.map((item) => {
                    const isOpen = openLevel === item.level;
                    const canOpen = !item.locked;
                    const scoreClass = item.grade ? gradeClass[item.grade] : "text-[var(--color-gray-50)]";

                    return (
                      <article key={item.level} className={`overflow-hidden rounded-[8px] ${item.locked ? "bg-[var(--color-gray-30)]" : "bg-[var(--color-gray-8g)]"}`}>
                        <button
                          type="button"
                          disabled={!canOpen}
                          onClick={() => setOpenLevel(isOpen ? null : item.level)}
                          aria-expanded={isOpen}
                          className={`relative flex min-h-[64px] w-full items-center px-4 text-left ${
                            item.locked ? "cursor-not-allowed text-[var(--color-gray-60-icon)]" : ""
                          }`}
                        >
                          <strong className="typo-sub-16-b">{item.level}</strong>
                          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
                            {item.locked ? (
                              <LockIcon />
                            ) : (
                              <span className="typo-sub-16-b">
                                {item.averageScore === null ? "-" : `${item.averageScore}점`} <span className="typo-body-14-r text-[var(--color-gray-50)]">/ 100</span>
                              </span>
                            )}
                            <span className={`typo-sub-16-b ${item.locked ? "text-[var(--color-gray-60-icon)]" : scoreClass}`}>
                              {item.locked ? "미학습" : item.grade ?? "미응시"}
                            </span>
                          </div>
                            <div className="ml-auto flex items-center gap-3">
                              <span
                                className={`typo-body-14-r ${
                                  item.locked
                                    ? "text-[var(--color-gray-60-icon)]"
                                    : item.progress === 100
                                      ? "text-[var(--color-primary-50)]"
                                      : "text-[var(--color-gray-70)]"
                                }`}
                              >
                                {item.locked ? "미학습" : `${item.progress}%`}
                              </span>
                              {item.locked ? <ChevronDown open={false} /> : <ChevronDown open={isOpen} />}
                            </div>
                        </button>

                        {isOpen ? (
                          <div className="border-t border-[var(--color-gray-stroke)] bg-[var(--color-primary-10)] px-4 py-3">
                            <div className="mb-2 flex items-center justify-between typo-inf-12-m text-[var(--color-gray-60-icon)]">
                              <span>중간 · 기말 평균</span>
                              <strong className={scoreClass}>{scoreText(item.averageScore)}</strong>
                            </div>
                            <div className="space-y-2">
                              <ScoreDetail label="중간고사" score={item.midtermScore} />
                              <ScoreDetail label="기말고사" score={item.finalScore} />
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className="flex items-start gap-2 rounded-[8px] bg-[var(--color-primary-10)] px-4 py-4 typo-body-14-r text-[var(--color-primary-90)]">
                <InfoIcon />
                <p>{infoText}</p>
              </aside>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
