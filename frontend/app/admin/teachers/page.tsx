"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type ApprovalStatus = "pending" | "approved" | "rejected";

type TeacherApplication = {
  id: number;
  email: string;
  name: string;
  approval_status: ApprovalStatus;
  created_at?: string | null;
};

const statusText: Record<ApprovalStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

export default function AdminTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState("");

  const loadTeachers = useCallback(async () => {
    const token = localStorage.getItem("onui_admin_token");
    if (!token) {
      router.replace("/admin");
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("onui_admin_token");
        router.replace("/admin");
        return;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setTeachers((await response.json()) as TeacherApplication[]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "선생님 신청 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const counts = useMemo(
    () => ({
      pending: teachers.filter((teacher) => teacher.approval_status === "pending").length,
      approved: teachers.filter((teacher) => teacher.approval_status === "approved").length,
      rejected: teachers.filter((teacher) => teacher.approval_status === "rejected").length,
    }),
    [teachers],
  );

  const reviewTeacher = async (teacherId: number, action: "approve" | "reject") => {
    const token = localStorage.getItem("onui_admin_token");
    if (!token) {
      router.replace("/admin");
      return;
    }

    setProcessingId(teacherId);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const updated = (await response.json()) as TeacherApplication;
      setTeachers((current) =>
        current.map((teacher) => (teacher.id === updated.id ? updated : teacher)),
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "승인 상태를 변경하지 못했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("onui_admin_token");
    router.replace("/admin");
  };

  return (
    <main className="min-h-screen bg-[var(--color-gray-bg)] text-[var(--color-gray-100)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
        <div className="mx-auto flex h-[64px] w-full max-w-[960px] items-center justify-between px-5">
          <div>
            <p className="typo-inf-12-m text-[var(--color-primary-50)]">ONUI Academy</p>
            <h1 className="typo-tit-18-b">선생님 가입 관리</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-[var(--color-gray-stroke)] px-4 py-2 typo-tag-14-sb text-[var(--color-gray-70)]"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[960px] px-5 py-6">
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[var(--color-white)] p-4">
            <p className="typo-cap-13-m text-[var(--color-gray-50)]">승인 대기</p>
            <strong className="mt-1 block typo-tit-24-b text-[var(--color-point-90)]">{counts.pending}</strong>
          </div>
          <div className="rounded-xl bg-[var(--color-white)] p-4">
            <p className="typo-cap-13-m text-[var(--color-gray-50)]">승인 완료</p>
            <strong className="mt-1 block typo-tit-24-b text-[var(--color-secondary-90)]">{counts.approved}</strong>
          </div>
          <div className="rounded-xl bg-[var(--color-white)] p-4">
            <p className="typo-cap-13-m text-[var(--color-gray-50)]">반려</p>
            <strong className="mt-1 block typo-tit-24-b text-[var(--color-wrong)]">{counts.rejected}</strong>
          </div>
        </section>

        {errorText ? (
          <p className="mt-4 rounded-xl bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">
            {errorText}
          </p>
        ) : null}

        <section className="mt-5 overflow-hidden rounded-xl bg-[var(--color-white)]">
          <div className="border-b border-[var(--color-gray-stroke)] px-5 py-4">
            <h2 className="typo-sub-16-b">가입 신청 목록</h2>
          </div>

          {loading ? (
            <p className="px-5 py-10 text-center typo-body-14-r text-[var(--color-gray-50)]">
              목록을 불러오는 중입니다.
            </p>
          ) : teachers.length === 0 ? (
            <p className="px-5 py-10 text-center typo-body-14-r text-[var(--color-gray-50)]">
              선생님 가입 신청이 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-gray-stroke)]">
              {teachers.map((teacher) => (
                <article key={teacher.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="typo-sub-16-b">{teacher.name}</h3>
                      <p className="mt-1 typo-body-14-r text-[var(--color-gray-60-icon)]">
                        {teacher.email}
                      </p>
                      <p className="mt-1 typo-inf-12-m text-[var(--color-gray-40)]">
                        신청일 {teacher.created_at?.slice(0, 10) ?? "-"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 typo-cap-13-m ${
                        teacher.approval_status === "approved"
                          ? "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]"
                          : teacher.approval_status === "rejected"
                            ? "bg-[var(--color-wrong-bg)] text-[var(--color-wrong)]"
                            : "bg-[var(--color-point-10)] text-[var(--color-point-90)]"
                      }`}
                    >
                      {statusText[teacher.approval_status]}
                    </span>
                  </div>

                  {teacher.approval_status === "pending" ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={processingId === teacher.id}
                        onClick={() => void reviewTeacher(teacher.id, "reject")}
                        className="h-11 rounded-lg border border-[var(--color-wrong)] typo-but-16-b text-[var(--color-wrong)] disabled:opacity-50"
                      >
                        반려
                      </button>
                      <button
                        type="button"
                        disabled={processingId === teacher.id}
                        onClick={() => void reviewTeacher(teacher.id, "approve")}
                        className="h-11 rounded-lg bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:opacity-50"
                      >
                        승인
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
