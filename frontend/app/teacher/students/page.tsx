"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type ClassStudent = {
  id: number;
  name: string;
  email: string;
  joined_at?: string | null;
};

type ManagedStudent = ClassStudent & {
  classIds: number[];
  classNames: string[];
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function classLabel(classNames: string[]) {
  return classNames.length ? classNames.join(", ") : "미배정";
}

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classStudents, setClassStudents] = useState<Record<number, ClassStudent[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [removingStudentKey, setRemovingStudentKey] = useState("");
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);

  const students = useMemo(() => {
    const map = new Map<number, ManagedStudent>();

    classes.forEach((teacherClass) => {
      (classStudents[teacherClass.id] ?? []).forEach((student) => {
        const current = map.get(student.id);
        if (current) {
          if (!current.classIds.includes(teacherClass.id)) current.classIds.push(teacherClass.id);
          if (!current.classNames.includes(teacherClass.name)) current.classNames.push(teacherClass.name);
          return;
        }

        map.set(student.id, {
          ...student,
          classIds: [teacherClass.id],
          classNames: [teacherClass.name],
        });
      });
    });

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [classes, classStudents]);

  const filteredStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return students;

    return students.filter((student) =>
      [student.name, student.email, ...student.classNames].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [searchTerm, students]);

  const totalStudentCount = students.length;

  const loadStudentsForClasses = async (token: string, nextClasses: TeacherClass[]) => {
    const entries = await Promise.all(
      nextClasses.map(async (teacherClass) => {
        const response = await fetch(`${API_BASE_URL}/classes/teacher/${teacherClass.id}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return [teacherClass.id, []] as const;
        return [teacherClass.id, (await response.json()) as ClassStudent[]] as const;
      }),
    );
    setClassStudents(Object.fromEntries(entries));
  };

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
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const nextClasses = (await response.json()) as TeacherClass[];
      setClasses(nextClasses);
      await loadStudentsForClasses(token, nextClasses);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    void loadClasses();
  }, [authorized]);

  const openStudentDetail = (studentId: number) => {
    router.push(`/teacher/students/${studentId}`);
  };

  const removeStudent = async (classId: number, studentId: number) => {
    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=teacher");
      return;
    }

    const removingKey = `${classId}:${studentId}`;
    setRemovingStudentKey(removingKey);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/classes/teacher/${classId}/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(await readErrorMessage(response));

      setClassStudents((current) => ({
        ...current,
        [classId]: (current[classId] ?? []).filter((student) => student.id !== studentId),
      }));
      setClasses((current) =>
        current.map((teacherClass) =>
          teacherClass.id === classId
            ? { ...teacherClass, student_count: Math.max(0, teacherClass.student_count - 1) }
            : teacherClass,
        ),
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "학생 연결을 해제하지 못했습니다.");
    } finally {
      setRemovingStudentKey("");
    }
  };

  const deleteClass = async (classId: number, className: string) => {
    if (!window.confirm(`"${className}" 반을 삭제할까요? 연결된 학생도 이 반에서 해제됩니다.`)) return;

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

      if (!response.ok) throw new Error(await readErrorMessage(response));

      setClasses((current) => current.filter((teacherClass) => teacherClass.id !== classId));
      setClassStudents((current) => {
        const next = { ...current };
        delete next[classId];
        return next;
      });
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

        <section className="px-[18px] pb-10 pt-7 md:px-10">
          <p className="typo-body-14-r text-[var(--color-gray-60-icon)]">학생 관리</p>
          <h1 className="mt-1 typo-tit-24-b text-[var(--color-gray-100)]">
            {teacherName} 선생님 학생 검색
          </h1>
          <p className="mt-2 typo-body-14-r text-[var(--color-gray-60-icon)]">
            학생을 검색해서 선택하면 학생 상세 화면에서 시험 응시와 학습점검 발음 내역을 확인할 수 있습니다.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <section className="rounded-[12px] bg-[var(--color-white)] p-5">
              <p className="typo-cap-13-m text-[var(--color-gray-50)]">개설한 반</p>
              <strong className="mt-1 block typo-tit-24-b text-[var(--color-primary-50)]">{classes.length}</strong>
            </section>
            <section className="rounded-[12px] bg-[var(--color-white)] p-5">
              <p className="typo-cap-13-m text-[var(--color-gray-50)]">연결 학생</p>
              <strong className="mt-1 block typo-tit-24-b text-[var(--color-secondary-90)]">{totalStudentCount}</strong>
            </section>
          </div>

          {errorText ? (
            <p className="mt-4 rounded-xl bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">
              {errorText}
            </p>
          ) : null}

          <section className="mt-5 rounded-[12px] bg-[var(--color-white)] p-5">
            <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">학생 검색</h2>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="이름, 이메일, 반 이름 검색"
              className="mt-3 h-11 w-full rounded-xl border border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4 typo-tab-15-m outline-none focus:border-[var(--color-primary-50)]"
            />

            <div className="mt-4 space-y-2">
              {isLoading ? (
                <p className="rounded-xl bg-[var(--color-gray-8g)] px-4 py-4 text-center typo-body-14-r text-[var(--color-gray-50)]">
                  학생 목록을 불러오는 중입니다.
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="rounded-xl bg-[var(--color-gray-8g)] px-4 py-4 text-center typo-body-14-r text-[var(--color-gray-50)]">
                  검색된 학생이 없습니다.
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => openStudentDetail(student.id)}
                    className="w-full rounded-xl bg-[var(--color-gray-8g)] px-4 py-3 text-left transition hover:bg-[var(--color-primary-10)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate typo-tag-14-sb text-[var(--color-gray-100)]">{student.name}</p>
                        <p className="truncate typo-inf-12-m text-[var(--color-gray-50)]">{student.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--color-white)] px-3 py-1 typo-inf-12-m text-[var(--color-primary-50)]">
                        상세
                      </span>
                    </div>
                    <p className="mt-2 truncate typo-inf-12-m text-[var(--color-gray-60-icon)]">
                      {classLabel(student.classNames)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="mt-5 space-y-4">
            <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">반별 관리</h2>
            {classes.map((teacherClass) => {
              const studentsInClass = classStudents[teacherClass.id] ?? [];

              return (
                <article key={teacherClass.id} className="rounded-[12px] bg-[var(--color-white)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate typo-sub-16-b text-[var(--color-gray-100)]">{teacherClass.name}</h3>
                      <p className="mt-1 typo-body-14-r text-[var(--color-gray-60-icon)]">학생 {studentsInClass.length}명</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-primary-10)] px-3 py-1 typo-inf-12-m text-[var(--color-primary-50)]">
                      {teacherClass.invite_code}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={deletingClassId === teacherClass.id}
                      onClick={() => void deleteClass(teacherClass.id, teacherClass.name)}
                      className="h-8 rounded-lg border border-[var(--color-wrong)] px-3 typo-inf-12-m text-[var(--color-wrong)] disabled:opacity-50"
                    >
                      {deletingClassId === teacherClass.id ? "삭제 중" : "반 삭제"}
                    </button>
                  </div>

                  {studentsInClass.length === 0 ? (
                    <p className="mt-4 rounded-xl bg-[var(--color-gray-8g)] px-4 py-4 text-center typo-body-14-r text-[var(--color-gray-50)]">
                      아직 연결된 학생이 없습니다.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {studentsInClass.map((student) => {
                        const removingKey = `${teacherClass.id}:${student.id}`;

                        return (
                          <div key={student.id} className="rounded-xl bg-[var(--color-gray-8g)] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => openStudentDetail(student.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="truncate typo-tag-14-sb text-[var(--color-gray-100)]">{student.name}</p>
                                <p className="truncate typo-inf-12-m text-[var(--color-gray-50)]">{student.email}</p>
                                {student.joined_at ? (
                                  <p className="mt-1 typo-inf-12-m text-[var(--color-gray-40)]">
                                    연결일 {formatDate(student.joined_at)}
                                  </p>
                                ) : null}
                              </button>
                              <button
                                type="button"
                                disabled={removingStudentKey === removingKey}
                                onClick={() => void removeStudent(teacherClass.id, student.id)}
                                className="h-8 shrink-0 rounded-lg border border-[var(--color-wrong)] px-3 typo-inf-12-m text-[var(--color-wrong)] disabled:opacity-50"
                              >
                                {removingStudentKey === removingKey ? "해제 중" : "연결 해제"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </section>
      </div>
    </main>
  );
}
