"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AppHeader } from "../../../src/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type StoredUser = {
  name?: string;
  email?: string;
  role?: "student" | "teacher";
};

type TeacherClass = {
  id: number;
  name: string;
  teacher_id: number;
  teacher_name: string;
  invite_code: string;
  student_count: number;
  created_at?: string | null;
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M8 8.5V6.8C8 5.8 8.8 5 9.8 5h7.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8h-1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 8.5h7.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8H4.8c-1 0-1.8-.8-1.8-1.8v-7.4c0-1 .8-1.8 1.8-1.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [className, setClassName] = useState("");
  const [origin, setOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [errorText, setErrorText] = useState("");

  const studentCount = classes.reduce((total, item) => total + item.student_count, 0);

  useEffect(() => {
    setOrigin(window.location.origin);

    const storedUser = localStorage.getItem("onui_user");
    const token = localStorage.getItem("onui_access_token");

    if (!storedUser || !token) {
      router.replace("/login?role=teacher");
      return;
    }

    try {
      const user = JSON.parse(storedUser) as StoredUser;
      if (user.role !== "teacher") {
        router.replace("/");
        return;
      }

      setTeacherName(user.name || user.email || "선생님");
      setAuthorized(true);
    } catch {
      router.replace("/login?role=teacher");
    }
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    const loadClasses = async () => {
      const token = localStorage.getItem("onui_access_token");
      if (!token) {
        router.replace("/login?role=teacher");
        return;
      }

      setIsLoading(true);
      setErrorText("");

      try {
        const response = await fetch(`${API_BASE_URL}/classes/teacher`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401 || response.status === 403) {
          router.replace("/login?role=teacher");
          return;
        }

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const nextClasses = (await response.json()) as TeacherClass[];
        setClasses(nextClasses);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "반 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadClasses();
  }, [authorized, router]);

  const makeInviteLink = (inviteCode: string) => {
    const path = `/join?code=${encodeURIComponent(inviteCode)}`;
    return origin ? `${origin}${path}` : path;
  };

  const createClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = className.trim();

    if (!name) {
      setErrorText("반 이름을 입력해주세요.");
      return;
    }

    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=teacher");
      return;
    }

    setIsCreating(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/classes/teacher`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const created = (await response.json()) as TeacherClass;
      setClasses((current) => [created, ...current]);
      setClassName("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "반을 만들지 못했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = async (inviteCode: string) => {
    const inviteLink = makeInviteLink(inviteCode);

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedCode(inviteCode);
      window.setTimeout(() => setCopiedCode(""), 1600);
    } catch {
      setErrorText("복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.");
    }
  };

  const deleteClass = async (classId: number, className: string) => {
    if (!window.confirm(`"${className}" 반을 삭제할까요? 연결된 학생도 이 반에서 해제됩니다.`)) {
      return;
    }

    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=teacher");
      return;
    }

    setDeletingClassId(classId);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/classes/teacher/${classId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setClasses((current) => current.filter((teacherClass) => teacherClass.id !== classId));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "반을 삭제하지 못했습니다.");
    } finally {
      setDeletingClassId(null);
    }
  };

  if (!authorized) {
    return <main className="min-h-screen bg-[#EEF2F6]" />;
  }

  return (
    <main className="min-h-screen bg-[#DDE5EE] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] shadow-[0_0_0_1px_rgba(15,23,42,0.08)] md:max-w-[720px]">
        <AppHeader />

        <section className="px-[18px] pb-10 pt-7">
        <p className="typo-body-14-r text-[var(--color-gray-60-icon)]">선생님 대시보드</p>
        <h1 className="mt-1 typo-tit-24-b text-[var(--color-gray-100)]">
          {teacherName} 선생님, 안녕하세요.
        </h1>
        <p className="mt-2 typo-body-14-r text-[var(--color-gray-60-icon)]">
          반 초대 링크를 만들어 학생과 연결하세요.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <section className="rounded-[12px] bg-[var(--color-white)] p-5">
            <p className="typo-cap-13-m text-[var(--color-gray-50)]">개설한 반</p>
            <strong className="mt-1 block typo-tit-24-b text-[var(--color-primary-50)]">
              {classes.length}
            </strong>
          </section>
          <section className="rounded-[12px] bg-[var(--color-white)] p-5">
            <p className="typo-cap-13-m text-[var(--color-gray-50)]">연결 학생</p>
            <strong className="mt-1 block typo-tit-24-b text-[var(--color-secondary-90)]">
              {studentCount}
            </strong>
          </section>
        </div>

        <form onSubmit={createClass} className="mt-5 rounded-[12px] bg-[var(--color-white)] p-5">
          <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">반 만들기</h2>
          <p className="mt-1 typo-body-14-r text-[var(--color-gray-60-icon)]">
            같은 반 이름도 만들 수 있고 초대코드는 자동으로 다르게 생성됩니다.
          </p>

          <label htmlFor="class-name" className="mt-4 block typo-cap-13-m text-[var(--color-gray-70)]">
            반 이름
          </label>
          <input
            id="class-name"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="반 이름을 입력하세요"
            className="mt-2 h-12 w-full rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none focus:border-[var(--color-primary-50)]"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-primary-50)] px-4 typo-inf-12-m text-[var(--color-white)] disabled:opacity-60"
            >
              {isCreating ? "생성 중..." : "초대 링크 만들기"}
            </button>
          </div>
        </form>

        {errorText ? (
          <p className="mt-4 rounded-xl bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">
            {errorText}
          </p>
        ) : null}

        <section className="mt-5 rounded-[12px] bg-[var(--color-white)]">
          <div className="border-b border-[var(--color-gray-stroke)] px-5 py-4">
            <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">초대 링크</h2>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">
              반 목록을 불러오는 중입니다.
            </p>
          ) : classes.length === 0 ? (
            <p className="px-5 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">
              아직 만든 반이 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-gray-stroke)]">
              {classes.map((teacherClass) => {
                const inviteLink = makeInviteLink(teacherClass.invite_code);

                return (
                  <article key={teacherClass.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="typo-sub-16-b text-[var(--color-gray-100)]">
                          {teacherClass.name}
                        </h3>
                        <p className="mt-1 typo-body-14-r text-[var(--color-gray-60-icon)]">
                          학생 {teacherClass.student_count}명
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-primary-10)] px-3 py-1 typo-inf-12-m text-[var(--color-primary-50)]">
                        {teacherClass.invite_code}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-gray-8g)] px-4 py-3">
                      <p className="min-w-0 flex-1 break-all typo-body-14-r text-[var(--color-gray-70)]">
                        {inviteLink}
                      </p>
                      <button
                        type="button"
                        aria-label={`${teacherClass.name} 초대 링크 복사`}
                        onClick={() => void copyInviteLink(teacherClass.invite_code)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--color-primary-50)] text-[var(--color-primary-50)]"
                      >
                        <CopyIcon />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="typo-inf-12-m text-[var(--color-primary-50)]">
                        {copiedCode === teacherClass.invite_code ? "복사 완료" : ""}
                      </span>
                      <button
                        type="button"
                        disabled={deletingClassId === teacherClass.id}
                        onClick={() => void deleteClass(teacherClass.id, teacherClass.name)}
                        className="h-8 shrink-0 rounded-lg border border-[var(--color-wrong)] px-3 typo-inf-12-m text-[var(--color-wrong)] disabled:opacity-50"
                      >
                        {deletingClassId === teacherClass.id ? "삭제 중" : "반 삭제"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </section>
      </div>
    </main>
  );
}
