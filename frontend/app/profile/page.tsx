"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { AppHeader } from "@/src/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: "student" | "teacher";
};

type Grade = "A" | "B" | "C" | "D";

type ProfileData = {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt?: string | null;
    lastLoginAt?: string | null;
  };
  classes: Array<{
    class_name: string;
    teacher_name: string;
    joined_at?: string | null;
  }>;
  learning: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
  attendance: {
    days: number;
    totalDays: number;
    percent: number;
  };
  examStatuses: Array<{
    level: string;
    midterm: "응시" | "미응시";
    final: "응시" | "미응시";
  }>;
  grades: {
    averageScore: number;
    subjectCount: number;
    counts: Record<Grade, number>;
  };
};

const gradeMeta: Record<Grade, { label: string; color: string; className: string }> = {
  A: { label: "90점 이상", color: "var(--color-primary-50)", className: "bg-[var(--color-primary-50)]" },
  B: { label: "80점~89점", color: "var(--color-secondary-50)", className: "bg-[var(--color-secondary-50)]" },
  C: { label: "70점~79점", color: "var(--color-point-50)", className: "bg-[var(--color-point-50)]" },
  D: { label: "70점 미만", color: "var(--color-wrong)", className: "bg-[var(--color-wrong)]" },
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  return typeof payload?.detail === "string" ? payload.detail : "마이페이지 정보를 불러오지 못했습니다.";
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-gray-40)]">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-16 w-16 text-[var(--color-gray-20)]">
      <circle cx="32" cy="32" r="31" fill="currentColor" />
      <circle cx="32" cy="24" r="11" fill="white" opacity=".92" />
      <path d="M13 54c3.7-10.1 11-15.2 19-15.2S47.3 43.9 51 54" fill="white" opacity=".92" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[var(--color-primary-50)]">
      <rect x="4" y="3.5" width="16" height="17" rx="2" fill="currentColor" opacity=".85" />
      <path d="M8 8h8M8 12h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[var(--color-primary-50)]">
      <rect x="4" y="5" width="16" height="15" rx="2" fill="currentColor" opacity=".85" />
      <path d="M7 3v4M17 3v4M7 10h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m9 15 2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-gray-60-icon)]">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1v-4Zm16 0h-3v5h2a1 1 0 0 0 1-1v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-gray-60-icon)]">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.8 12h16.4M12 3.5c2.1 2.2 3.2 5 3.2 8.5S14.1 18.3 12 20.5C9.9 18.3 8.8 15.5 8.8 12S9.9 5.7 12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-gray-60-icon)]">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-[var(--color-gray-60-icon)]">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRow({
  label,
  value,
  current,
  total,
  icon,
}: {
  label: string;
  value: number;
  current: number;
  total: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3 first:pt-1 last:pb-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] bg-[var(--color-primary-10)]">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="typo-cap-13-m text-[var(--color-gray-60-icon)]">{label}</p>
            <strong className="typo-tit-20-sb text-[var(--color-primary-50)]">{value}%</strong>
          </div>
          <span className="pb-1 typo-inf-12-m text-[var(--color-gray-50)]">
            {current} / {total}
            {label === "출석률" ? "일" : "차시"}
          </span>
        </div>
        <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[var(--color-gray-stroke)]">
          <div className="h-full rounded-full bg-[var(--color-primary-50)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
      </div>
    </div>
  );
}

function gradeRing(counts: Record<Grade, number>) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!total) return "conic-gradient(var(--color-gray-10) 0 100%)";

  let position = 0;
  const segments = (Object.keys(gradeMeta) as Grade[]).map((grade) => {
    const next = position + (counts[grade] / total) * 100;
    const segment = `${gradeMeta[grade].color} ${position}% ${next}%`;
    position = next;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function ExamStatus({ value }: { value: "응시" | "미응시" }) {
  return (
    <span className={`rounded-full px-2 py-1 typo-inf-12-m ${value === "응시" ? "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]" : "bg-[var(--color-point-10)] text-[var(--color-point-90)]"}`}>
      {value}
    </span>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("onui_user");
    const token = localStorage.getItem("onui_access_token");

    if (!storedUser || !token) {
      router.replace("/login?role=student");
      return;
    }

    try {
      const user = JSON.parse(storedUser) as StoredUser;
      if (user.role === "teacher") {
        router.replace("/teacher/dashboard");
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
        return response.json() as Promise<ProfileData>;
      })
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((error) => {
        if (active) setErrorText(error instanceof Error ? error.message : "마이페이지 정보를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [router]);

  const primaryClass = profile?.classes[0];
  const gradeBackground = useMemo(() => (profile ? gradeRing(profile.grades.counts) : "conic-gradient(var(--color-gray-10) 0 100%)"), [profile]);

  const logout = () => {
    if (!window.confirm("로그아웃하시겠습니까?")) return;
    localStorage.removeItem("onui_access_token");
    localStorage.removeItem("onui_user");
    window.dispatchEvent(new Event("storage"));
    router.replace("/");
  };

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] md:max-w-[720px]">
        <AppHeader />
        <section className="flex h-[64px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <h1 className="typo-tit-20-sb">마이페이지</h1>
        </section>

        <div className="space-y-3 px-4 py-4 md:px-8 md:py-7">
          {errorText ? (
            <p className="rounded-[12px] bg-[var(--color-wrong-bg)] px-4 py-4 typo-body-14-r text-[var(--color-wrong)]">{errorText}</p>
          ) : !profile ? (
            <p className="rounded-[12px] bg-[var(--color-white)] px-4 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">마이페이지 정보를 불러오는 중입니다.</p>
          ) : (
            <>
              <section className="flex items-center gap-3 rounded-[12px] bg-[var(--color-white)] p-4">
                <UserIcon />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate typo-sub-16-b">{profile.user.name}</h2>
                    <span className="rounded-[5px] bg-[var(--color-point-10)] px-2 py-0.5 typo-inf-12-m text-[var(--color-point-90)]">학생</span>
                  </div>
                  <p className="mt-1 truncate typo-inf-12-m text-[var(--color-gray-60-icon)]">{profile.user.email}</p>
                  <p className="mt-1 truncate typo-cap-13-m text-[var(--color-gray-50)]">
                    {primaryClass ? `${primaryClass.class_name} · ${primaryClass.teacher_name} 선생님` : "배정된 반이 없습니다."}
                  </p>
                </div>
                <ChevronRightIcon />
              </section>

              <section className="rounded-[12px] bg-[var(--color-white)] p-4">
                <h2 className="typo-sub-16-b">전체 학습 현황</h2>
                <div className="mt-3 divide-y divide-[var(--color-gray-stroke)]">
                  <ProgressRow label="전체 진도율" value={profile.learning.percent} current={profile.learning.completedLessons} total={profile.learning.totalLessons} icon={<BookIcon />} />
                  <ProgressRow label="출석률" value={profile.attendance.percent} current={profile.attendance.days} total={profile.attendance.totalDays} icon={<CalendarIcon />} />
                </div>
              </section>

              <section className="rounded-[12px] bg-[var(--color-white)] p-4">
                <h2 className="typo-sub-16-b">시험 현황</h2>
                <div className="mt-4 grid grid-cols-[1fr_70px_70px] border-b border-[var(--color-gray-stroke)] pb-2 typo-cap-13-m text-[var(--color-gray-50)]">
                  <span>단계</span>
                  <span className="text-center">중간고사</span>
                  <span className="text-center">기말고사</span>
                </div>
                <div className="divide-y divide-[var(--color-gray-stroke)]">
                  {profile.examStatuses.map((exam) => (
                    <div key={exam.level} className="grid grid-cols-[1fr_70px_70px] items-center py-2.5 typo-body-14-r">
                      <span>{exam.level}</span>
                      <span className="text-center"><ExamStatus value={exam.midterm} /></span>
                      <span className="text-center"><ExamStatus value={exam.final} /></span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[12px] bg-[var(--color-white)] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="typo-sub-16-b">성적 현황</h2>
                  <Link href="/stats" className="flex items-center gap-1 typo-inf-12-m text-[var(--color-gray-50)]">
                    전체보기 <ChevronRightIcon />
                  </Link>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative grid h-[130px] w-[130px] shrink-0 place-items-center rounded-full" style={{ background: gradeBackground }}>
                    <div className="grid h-[100px] w-[100px] place-items-center rounded-full bg-[var(--color-white)] text-center">
                      <div>
                        <p className="typo-cap-13-m text-[var(--color-gray-50)]">평균 점수</p>
                        <strong className="typo-tit-20-sb">{profile.grades.subjectCount ? profile.grades.averageScore : "-"}점</strong>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {(Object.keys(gradeMeta) as Grade[]).map((grade) => (
                      <div key={grade} className="flex items-center justify-between gap-2 typo-cap-13-m text-[var(--color-gray-70)]">
                        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${gradeMeta[grade].className}`} />{grade} ({gradeMeta[grade].label})</span>
                        <strong>{profile.grades.counts[grade]}과목</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[12px] bg-[var(--color-white)]">
                <h2 className="px-4 pt-4 typo-sub-16-b">상담 / 문의</h2>
                <button type="button" className="mt-2 flex w-full items-center gap-3 px-4 py-4 text-left">
                  <HeadsetIcon />
                  <span className="flex-1 typo-tab-15-m">1:1 문의</span>
                  <ChevronRightIcon />
                </button>
              </section>

              <section className="overflow-hidden rounded-[12px] bg-[var(--color-white)]">
                <h2 className="px-4 pt-4 typo-sub-16-b">설정</h2>
                <button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left">
                  <GlobeIcon />
                  <span className="flex-1 typo-tab-15-m">언어 설정</span>
                  <ChevronRightIcon />
                </button>
                <button type="button" className="flex w-full items-center gap-3 border-t border-[var(--color-gray-stroke)] px-4 py-4 text-left">
                  <LockIcon />
                  <span className="flex-1 typo-tab-15-m">비밀번호 변경</span>
                  <ChevronRightIcon />
                </button>
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 border-t border-[var(--color-gray-stroke)] px-4 py-4 text-left">
                  <LogoutIcon />
                  <span className="flex-1 typo-tab-15-m">로그아웃</span>
                  <ChevronRightIcon />
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
