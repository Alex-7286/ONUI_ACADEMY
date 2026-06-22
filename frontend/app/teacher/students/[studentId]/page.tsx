"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "../../../../src/components/AppHeader";

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

type ExamSubmission = {
  id: number;
  student_id: number;
  level: string;
  exam_type: string;
  question_count: number;
  answered_count: number;
  correct_count: number;
  score: number;
  submitted_at: string;
};

type QuizSubmission = {
  id: number;
  student_id: number;
  level: string;
  week: number;
  lesson: number;
  lesson_title: string;
  question_count: number;
  correct_count: number;
  objective_score: number;
  speech_score: number;
  total_score: number;
  passed: boolean;
  submitted_at: string;
  speech_results: Array<{
    text: string;
    score?: number | null;
    raw_score?: number | null;
    recognized_text?: string | null;
  }>;
};

type SubmissionResponse = {
  examSubmissions: ExamSubmission[];
  quizSubmissions: QuizSubmission[];
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

function examTypeLabel(type: string) {
  return type === "final" ? "기말고사" : "중간고사";
}

function classLabel(classNames: string[]) {
  return classNames.length ? classNames.join(", ") : "미배정";
}

function scoreGrade(score?: number | null) {
  const normalizedScore = Number(score ?? 0);

  if (normalizedScore >= 90) {
    return { label: "A", colorClass: "text-[var(--color-primary-50)]", dotClass: "bg-[var(--color-primary-50)]" };
  }
  if (normalizedScore >= 80) {
    return { label: "B", colorClass: "text-[var(--color-secondary-50)]", dotClass: "bg-[var(--color-secondary-50)]" };
  }
  if (normalizedScore >= 70) {
    return { label: "C", colorClass: "text-[var(--color-point-50)]", dotClass: "bg-[var(--color-point-50)]" };
  }

  return { label: "D", colorClass: "text-[var(--color-wrong)]", dotClass: "bg-[var(--color-wrong)]" };
}

function ScoreBadge({ score }: { score?: number | null }) {
  const grade = scoreGrade(score);

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 typo-tit-20-sb ${grade.colorClass}`}>
      <span className={`h-3 w-3 rounded-full ${grade.dotClass}`} aria-hidden="true" />
      <span>{grade.label}</span>
      <span>{score ?? "-"}점</span>
    </span>
  );
}

function DropdownChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 28 18"
      fill="none"
      aria-hidden="true"
      className={`h-[12px] w-[22px] text-[var(--color-gray-40)] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M3 5L14 14L25 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildManagedStudents(classes: TeacherClass[], classStudents: Record<number, ClassStudent[]>) {
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

  return Array.from(map.values());
}

export default function TeacherStudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const studentId = Number(params.studentId);

  const [authorized, setAuthorized] = useState(false);
  const [student, setStudent] = useState<ManagedStudent | null>(null);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [openQuizSubmissionId, setOpenQuizSubmissionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const selectedExamSubmissions = useMemo(
    () => examSubmissions.filter((item) => item.student_id === studentId),
    [examSubmissions, studentId],
  );

  const selectedQuizSubmissions = useMemo(
    () => quizSubmissions.filter((item) => item.student_id === studentId),
    [quizSubmissions, studentId],
  );

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

    return Object.fromEntries(entries) as Record<number, ClassStudent[]>;
  };

  const loadSubmissions = async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/submissions/teacher`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(await readErrorMessage(response));

    const data = (await response.json()) as SubmissionResponse;
    setExamSubmissions(data.examSubmissions ?? []);
    setQuizSubmissions(data.quizSubmissions ?? []);
  };

  const loadDetail = async () => {
    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=teacher");
      return;
    }

    if (!Number.isFinite(studentId)) {
      setErrorText("학생 정보가 올바르지 않습니다.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorText("");
    setOpenQuizSubmissionId(null);

    try {
      const classesResponse = await fetch(`${API_BASE_URL}/classes/teacher`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (classesResponse.status === 401 || classesResponse.status === 403) {
        router.replace("/login?role=teacher");
        return;
      }
      if (!classesResponse.ok) throw new Error(await readErrorMessage(classesResponse));

      const nextClasses = (await classesResponse.json()) as TeacherClass[];
      const classStudents = await loadStudentsForClasses(token, nextClasses);
      const managedStudents = buildManagedStudents(nextClasses, classStudents);
      const nextStudent = managedStudents.find((item) => item.id === studentId) ?? null;

      if (!nextStudent) {
        setStudent(null);
        setErrorText("선택한 학생을 찾을 수 없습니다.");
        return;
      }

      setStudent(nextStudent);
      await loadSubmissions(token);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "학생 상세 정보를 불러오지 못했습니다.");
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

      setAuthorized(true);
    } catch {
      router.replace("/login?role=teacher");
    }
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    void loadDetail();
  }, [authorized, studentId]);

  if (!authorized) {
    return <main className="min-h-screen bg-[#EEF2F6]" />;
  }

  return (
    <main className="min-h-screen bg-[#DDE5EE] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#EEF2F6] shadow-[0_0_0_1px_rgba(15,23,42,0.08)] md:max-w-[720px]">
        <AppHeader />

        <section className="px-[18px] pb-10 pt-5 md:px-10">
          <button
            type="button"
            onClick={() => router.push("/teacher/students")}
            className="mb-5 flex h-10 items-center gap-2 typo-body-14-r text-[var(--color-gray-60-icon)]"
          >
            <span aria-hidden="true">‹</span>
            학생관리로 돌아가기
          </button>

          {isLoading ? (
            <p className="rounded-[12px] bg-[var(--color-white)] px-4 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">
              학생 상세 정보를 불러오는 중입니다.
            </p>
          ) : errorText ? (
            <p className="rounded-xl bg-[var(--color-wrong-bg)] px-4 py-4 typo-body-14-r text-[var(--color-wrong)]">
              {errorText}
            </p>
          ) : student ? (
            <div className="space-y-4">
              <article className="rounded-[12px] bg-[var(--color-white)] p-5">
                <p className="typo-body-14-r text-[var(--color-gray-60-icon)]">학생 상세</p>
                <h1 className="mt-1 typo-tit-24-b text-[var(--color-gray-100)]">{student.name}</h1>
                <p className="mt-1 typo-body-14-r text-[var(--color-gray-50)]">{student.email}</p>
                <p className="mt-3 rounded-xl bg-[var(--color-primary-10)] px-4 py-3 typo-body-14-r text-[var(--color-primary-50)]">
                  {classLabel(student.classNames)}
                </p>
              </article>

              <article className="rounded-[12px] bg-[var(--color-white)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">시험 응시</h2>
                  <span className="typo-inf-12-m text-[var(--color-gray-50)]">{selectedExamSubmissions.length}건</span>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedExamSubmissions.length === 0 ? (
                    <p className="rounded-xl bg-[var(--color-gray-8g)] px-4 py-4 text-center typo-body-14-r text-[var(--color-gray-50)]">
                      시험 응시 내역이 없습니다.
                    </p>
                  ) : (
                    selectedExamSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-xl bg-[var(--color-gray-8g)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="typo-tag-14-sb text-[var(--color-gray-100)]">
                              {submission.level} · {examTypeLabel(submission.exam_type)}
                            </p>
                            <p className="mt-1 typo-inf-12-m text-[var(--color-gray-50)]">
                              {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                          <ScoreBadge score={submission.score} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 typo-body-14-r text-[var(--color-gray-70)]">
                          <span>정답 {submission.correct_count}/{submission.question_count}</span>
                          <span>답변 {submission.answered_count}/{submission.question_count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-[12px] bg-[var(--color-white)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="typo-sub-16-b text-[var(--color-gray-100)]">학습점검 · 발음</h2>
                  <span className="typo-inf-12-m text-[var(--color-gray-50)]">{selectedQuizSubmissions.length}건</span>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedQuizSubmissions.length === 0 ? (
                    <p className="rounded-xl bg-[var(--color-gray-8g)] px-4 py-4 text-center typo-body-14-r text-[var(--color-gray-50)]">
                      학습점검 내역이 없습니다.
                    </p>
                  ) : (
                    selectedQuizSubmissions.map((submission) => {
                      const isOpen = openQuizSubmissionId === submission.id;

                      return (
                        <div key={submission.id} className="rounded-xl bg-[var(--color-gray-8g)] p-4">
                          <button
                            type="button"
                            onClick={() => setOpenQuizSubmissionId(isOpen ? null : submission.id)}
                            aria-expanded={isOpen}
                            className="flex w-full items-start justify-between gap-3 text-left"
                          >
                            <div className="min-w-0">
                              <p className="typo-tag-14-sb text-[var(--color-gray-100)]">
                                {submission.level} {submission.week}주차 {submission.lesson}차시
                              </p>
                              <p className="mt-1 truncate typo-inf-12-m text-[var(--color-gray-50)]">
                                {submission.lesson_title}
                              </p>
                              <p className="mt-2 typo-inf-12-m text-[var(--color-gray-50)]">
                                {isOpen ? "접기" : "상세 보기"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <ScoreBadge score={submission.total_score} />
                              <DropdownChevron open={isOpen} />
                            </div>
                          </button>

                          {isOpen ? (
                            <>
                              <div className="mt-3 grid grid-cols-2 gap-2 typo-body-14-r text-[var(--color-gray-70)]">
                                <span>객관식 {submission.objective_score}점</span>
                                <span>말하기 {submission.speech_score}점</span>
                                <span>정답 {submission.correct_count}/{submission.question_count}</span>
                                <span>{submission.passed ? "통과" : "미통과"}</span>
                              </div>

                              <div className="mt-3 space-y-2">
                                {submission.speech_results.map((speech, index) => (
                                  <div key={`${submission.id}-${index}`} className="rounded-lg bg-[var(--color-white)] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="typo-body-14-r text-[var(--color-gray-80)]">{speech.text}</p>
                                      <strong className={`shrink-0 typo-sub-16-b ${scoreGrade(speech.score).colorClass}`}>
                                        {speech.score ?? "-"}점
                                      </strong>
                                    </div>
                                    {speech.recognized_text ? (
                                      <p className="mt-2 typo-inf-12-m text-[var(--color-gray-50)]">
                                        인식: {speech.recognized_text}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
