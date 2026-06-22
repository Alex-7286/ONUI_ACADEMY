"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type NoticeItem = {
  label?: string;
  title: string;
  date: string;
};

type UserRole = "student" | "teacher";

type JoinedClass = {
  class_id: number;
  class_name: string;
  teacher_name: string;
  invite_code: string;
  joined_at?: string | null;
};

type HomeProgress = {
  level: string;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  nextLesson: {
    week: number;
    lesson: number;
    title: string;
  } | null;
};

const notices: NoticeItem[] = [
  {
    label: "필독",
    title: "2025학년도 1학기 기말고사 안내",
    date: "05.25",
  },
  {
    title: "TOPIK 특강 프로그램 안내",
    date: "05.25",
  },
];

const defaultHomeProgress: HomeProgress = {
  level: "초급 1",
  percent: 0,
  completedLessons: 0,
  totalLessons: 0,
  nextLesson: {
    week: 1,
    lesson: 1,
    title: "이름 말하기",
  },
};

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 text-[var(--color-point-90)]"
    >
      <path d="m12 17.3-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 4l2.6 5.4 5.8.8-4.2 4.1 1 5.8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M8 3v3M16 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M14 6 8.5 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3.5L14 18V6Zm0 0 5 3v6l-5 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressBar({ value, variant = "default" }: { value: number; variant?: "default" | "hero" }) {
  const trackColor = variant === "hero" ? "color-mix(in srgb, var(--color-white) 30%, transparent)" : "var(--color-gray-stroke)";
  const fillColor = variant === "hero" ? "var(--color-white)" : "var(--color-primary-50)";

  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: fillColor }}
      />
    </div>
  );
}

function CardShell({
  title,
  rightLabel,
  icon,
  children,
}: {
  title: string;
  rightLabel: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[18px] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary-10)] text-[var(--color-primary-50)]">
            {icon}
          </span>
          <h2 className="sub_16_px_b text-[var(--color-gray-100)]">{title}</h2>
        </div>
        <span className="rounded-full bg-[var(--color-point-10)] px-2.5 py-1 typo-inf-12-m text-[var(--color-point-90)]">
          {rightLabel}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function HomePage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [homeProgress, setHomeProgress] = useState<HomeProgress | null>(null);
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([]);
  const [isClassLoading, setIsClassLoading] = useState(false);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem("onui_user");
      if (!storedUser) {
        setUserName(null);
        setUserRole(null);
        setJoinedClasses([]);
        setHomeProgress(null);
        return;
      }

      try {
        const parsed = JSON.parse(storedUser) as {
          name?: string | null;
          email?: string | null;
          role?: UserRole;
        };
        setUserName(parsed.name || parsed.email || null);
        setUserRole(parsed.role === "teacher" ? "teacher" : "student");
      } catch {
        setUserName(null);
        setUserRole(null);
        setJoinedClasses([]);
        setHomeProgress(null);
      }
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("focus", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  useEffect(() => {
    if (userRole !== "student") {
      setJoinedClasses([]);
      return;
    }

    const loadJoinedClasses = async () => {
      const token = localStorage.getItem("onui_access_token");
      if (!token) {
        setJoinedClasses([]);
        return;
      }

      setIsClassLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/classes/student`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setJoinedClasses([]);
          return;
        }

        setJoinedClasses((await response.json()) as JoinedClass[]);
      } finally {
        setIsClassLoading(false);
      }
    };

    void loadJoinedClasses();
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "student") {
      setHomeProgress(null);
      return;
    }

    let active = true;

    const loadHomeProgress = async () => {
      const token = localStorage.getItem("onui_access_token");
      if (!token) {
        if (active) setHomeProgress(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error();

        const data = (await response.json()) as { homeProgress?: HomeProgress };
        if (active) setHomeProgress(data.homeProgress ?? null);
      } catch {
        if (active) setHomeProgress(null);
      }
    };

    void loadHomeProgress();
    window.addEventListener("focus", loadHomeProgress);

    return () => {
      active = false;
      window.removeEventListener("focus", loadHomeProgress);
    };
  }, [userRole]);

  const activeHomeProgress = homeProgress ?? defaultHomeProgress;
  const nextLesson = activeHomeProgress.nextLesson;
  const levelPercent = Math.max(0, Math.min(100, activeHomeProgress.percent));
  const continueHref = nextLesson
    ? `/study?level=${encodeURIComponent(activeHomeProgress.level)}&week=${nextLesson.week}&lesson=${nextLesson.lesson}`
    : `/levels?level=${encodeURIComponent(activeHomeProgress.level)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-gray-bg)] text-[var(--color-gray-100)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(47,111,228,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute -left-12 top-24 h-40 w-40 rounded-full bg-[rgba(45,117,235,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-48 h-48 w-48 rounded-full bg-[rgba(255,199,87,0.12)] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] md:max-w-[720px] flex-col overflow-hidden bg-[var(--color-gray-bg)] shadow-[0_0_0_1px_rgba(15,23,42,0.04)]">
        <AppHeader />

        <div className="flex-1 px-4 pb-6 pt-4">
          <section className="space-y-1 px-1">
            <h1 className="typo-tit-20-sb text-[var(--color-gray-100)]">
              {userName ? (
                <>
                  안녕하세요, <span className="text-[var(--color-primary-50)]">{userName}</span> 님
                </>
              ) : (
                "안녕하세요, 반가워요"
              )}
            </h1>
            <p className="typo-body-14-r leading-5 text-[var(--color-gray-40)]">
              오늘도 꾸준한 학습이 목표 달성의 지름길이에요!
            </p>
          </section>

          <section className="mt-4 rounded-[16px] bg-[var(--color-primary-50)] px-4 py-4 text-white shadow-[0_12px_30px_rgba(45,117,235,0.28)]">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 typo-inf-12-m text-[var(--color-point-90)]">
              <StarIcon />
              <span>Level</span>
            </div>

            <p className="mt-3 typo-tit-18-b">{activeHomeProgress.level}</p>
            <p className="mt-1 typo-body-14-r leading-5 text-white/86">
              나의 학습 진도: {activeHomeProgress.completedLessons} / {activeHomeProgress.totalLessons}차시
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar value={levelPercent / 100} variant="hero" />
              </div>
              <span className="typo-tab-15-m">{levelPercent}%</span>
            </div>

            <Link
              href={continueHref}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-white py-3 typo-but-16-b text-[var(--color-primary-50)] shadow-sm transition hover:bg-slate-50"
            >
              {nextLesson ? `${nextLesson.week}주차 ${nextLesson.lesson}차시 학습하기` : "레벨 현황 보기"}
              <ChevronRightIcon />
            </Link>
          </section>

          {userName && userRole === "student" ? (
            <section className="mt-4 rounded-[18px] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="typo-cap-13-m text-[var(--color-gray-50)]">내 반</p>
                  <h2 className="mt-1 sub_16_px_b text-[var(--color-gray-100)]">
                    {isClassLoading
                      ? "불러오는 중"
                      : joinedClasses[0]?.class_name ?? "참여한 반이 없습니다"}
                  </h2>
                </div>
                {joinedClasses[0] ? (
                  <span className="rounded-full bg-[var(--color-primary-10)] px-3 py-1 typo-inf-12-m text-[var(--color-primary-50)]">
                    {joinedClasses[0].invite_code}
                  </span>
                ) : null}
              </div>

              {joinedClasses[0] ? (
                <p className="mt-3 typo-body-14-r text-[var(--color-gray-60-icon)]">
                  {joinedClasses[0].teacher_name} 선생님 반에 연결되어 있습니다.
                </p>
              ) : (
                <p className="mt-3 typo-body-14-r text-[var(--color-gray-60-icon)]">
                  선생님에게 받은 초대 링크로 반에 참여할 수 있습니다.
                </p>
              )}

              {joinedClasses.length > 1 ? (
                <div className="mt-3 space-y-2 border-t border-[var(--color-gray-stroke)] pt-3">
                  {joinedClasses.slice(1).map((joinedClass) => (
                    <div key={joinedClass.class_id} className="flex items-center justify-between gap-3">
                      <p className="typo-body-14-r text-[var(--color-gray-70)]">
                        {joinedClass.class_name}
                      </p>
                      <span className="typo-inf-12-m text-[var(--color-gray-40)]">
                        {joinedClass.teacher_name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="mt-4 space-y-3">
            <CardShell title="이번주 목표" rightLabel="D-2" icon={<CheckIcon />}>
              <div className="flex items-center justify-between gap-3 typo-body-14-r">
                <p className="typo-tag-14-sb text-[var(--color-gray-100)]">6차시 학습하기</p>
                <p className="typo-cap-13-m text-[var(--color-gray-50)]">
                  <span className="typo-cap-13-m text-[var(--color-primary-50)]">4</span> / 6 완료
                </p>
              </div>
              <div className="mt-3">
                <ProgressBar value={0.67} />
              </div>
            </CardShell>

            <CardShell title="다가오는 시험" rightLabel="D-3" icon={<CalendarIcon />}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="typo-tag-14-sb text-[var(--color-gray-100)]">중간고사</p>
                  <p className="mt-1 typo-cap-13-m text-[var(--color-gray-50)]">2026.05.20 (화) 10:00</p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-primary-50)] px-3.5 py-2 typo-tag-14-sb text-[var(--color-primary-50)]"
                >
                  응시하기
                  <ChevronRightIcon />
                </button>
              </div>
            </CardShell>

            <section className="rounded-[18px] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary-10)] text-[var(--color-primary-50)]">
                    <MegaphoneIcon />
                  </span>
                  <h2 className="sub_16_px_b text-[var(--color-gray-100)]">공지사항</h2>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 typo-cap-13-m text-[var(--color-gray-50)] transition hover:text-[var(--color-gray-100)]"
                >
                  더보기
                  <ChevronRightIcon />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {notices.map((notice) => (
                  <div key={`${notice.title}-${notice.date}`} className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {notice.label ? (
                        <span className="rounded-full bg-[var(--color-point-10)] px-2 py-0.5 typo-cap-13-m text-[var(--color-point-90)]">
                          {notice.label}
                        </span>
                      ) : null}
                      <p className="min-w-0 flex-1 typo-tag-14-sb leading-5 text-[var(--color-gray-100)]">
                        {notice.title}
                      </p>
                    </div>
                    <span className="shrink-0 typo-cap-13-m text-[var(--color-gray-30)]">{notice.date}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

    </main>
  );
}








