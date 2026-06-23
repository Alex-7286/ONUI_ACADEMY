"use client";

import { AppHeader } from "@/src/components/AppHeader";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type NoticeCategory = "중요" | "학사" | "점검" | "이벤트";

type TeacherClass = {
  id: number;
  name: string;
  student_count: number;
};

type Notice = {
  id: number;
  class_id: number;
  class_name: string;
  teacher_name: string;
  category: NoticeCategory;
  title: string;
  content: string;
  created_at: string;
};

const categoryOptions: NoticeCategory[] = ["중요", "학사", "점검", "이벤트"];

const categoryStyle: Record<NoticeCategory, string> = {
  중요: "bg-[var(--color-wrong-bg)] text-[var(--color-wrong)]",
  학사: "bg-[var(--color-primary-10)] text-[var(--color-primary-50)]",
  점검: "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]",
  이벤트: "bg-[var(--color-point-10)] text-[var(--color-point-90)]",
};

function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

function getErrorMessage(payload: unknown, fallback = "요청을 처리하지 못했습니다.") {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function TeacherNoticesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [classId, setClassId] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("학사");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("onui_access_token");
    const storedUser = localStorage.getItem("onui_user");
    if (!token || !storedUser) {
      router.replace("/login?role=teacher");
      return;
    }

    try {
      const user = JSON.parse(storedUser) as { role?: string };
      if (user.role !== "teacher") {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/login?role=teacher");
      return;
    }

    let active = true;
    Promise.all([
      fetch("/api/classes/teacher", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      fetch("/api/notices/teacher", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
    ])
      .then(async ([classesResponse, noticesResponse]) => {
        const classesPayload: unknown = await classesResponse.json().catch(() => null);
        const noticesPayload: unknown = await noticesResponse.json().catch(() => null);
        if (!classesResponse.ok) throw new Error(getErrorMessage(classesPayload, "반 목록을 불러오지 못했습니다."));
        if (!noticesResponse.ok) throw new Error(getErrorMessage(noticesPayload, "공지사항을 불러오지 못했습니다."));
        return { classes: classesPayload as TeacherClass[], notices: noticesPayload as Notice[] };
      })
      .then((data) => {
        if (!active) return;
        setClasses(data.classes);
        setNotices(data.notices);
        setClassId(data.classes[0] ? String(data.classes[0].id) : "");
        setAuthorized(true);
      })
      .catch((error) => {
        if (active) setErrorText(error instanceof Error ? error.message : "정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const sendNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!classId) {
      setErrorText("발송할 반을 선택해주세요.");
      return;
    }

    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=teacher");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: Number(classId),
          category,
          title,
          content,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(payload, "공지사항을 발송하지 못했습니다."));

      setNotices((current) => [payload as Notice, ...current]);
      setTitle("");
      setContent("");
      setSuccessText("선택한 반 학생에게 공지사항을 발송했습니다.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "공지사항을 발송하지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!authorized && loading) {
    return <main className="min-h-screen bg-[var(--color-gray-bg)]" />;
  }

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] bg-[var(--color-gray-bg)] md:max-w-[720px]">
        <AppHeader />
        <section className="flex h-[60px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <h1 className="typo-sub-18-r">공지사항 관리</h1>
        </section>

        <div className="space-y-4 px-5 py-5">
          <form onSubmit={sendNotice} className="rounded-[12px] bg-[var(--color-white)] p-5">
            <h2 className="typo-sub-16-b">공지사항 보내기</h2>
            <p className="mt-1 typo-body-14-r text-[var(--color-gray-60-icon)]">선택한 반에 연결된 학생에게만 공지가 표시됩니다.</p>

            <label htmlFor="notice-class" className="mt-5 block typo-cap-13-m text-[var(--color-gray-70)]">발송할 반</label>
            <select
              id="notice-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              disabled={classes.length === 0 || sending}
              className="mt-2 h-12 w-full rounded-[6px] border border-[var(--color-gray-20)] bg-[var(--color-white)] px-3 typo-body-16-r outline-none focus:border-[var(--color-primary-50)] disabled:bg-[var(--color-gray-bg)]"
            >
              {classes.length === 0 ? <option value="">만든 반이 없습니다.</option> : null}
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · 학생 {item.student_count}명</option>)}
            </select>

            <span className="mt-5 block typo-cap-13-m text-[var(--color-gray-70)]">분류</span>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {categoryOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`h-9 rounded-[6px] border typo-inf-12-m ${
                    category === item
                      ? "border-[var(--color-primary-50)] bg-[var(--color-primary-10)] text-[var(--color-primary-50)]"
                      : "border-[var(--color-gray-stroke)] text-[var(--color-gray-60-icon)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <label htmlFor="notice-title" className="mt-5 block typo-cap-13-m text-[var(--color-gray-70)]">제목</label>
            <input
              id="notice-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="공지 제목을 입력하세요."
              className="mt-2 h-12 w-full rounded-[6px] border border-[var(--color-gray-20)] px-3 typo-body-16-r outline-none placeholder:text-[var(--color-gray-30)] focus:border-[var(--color-primary-50)]"
            />

            <label htmlFor="notice-content" className="mt-5 block typo-cap-13-m text-[var(--color-gray-70)]">내용</label>
            <textarea
              id="notice-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              placeholder="학생에게 전달할 내용을 입력하세요."
              className="mt-2 min-h-[132px] w-full resize-none rounded-[6px] border border-[var(--color-gray-20)] p-3 typo-body-16-r outline-none placeholder:text-[var(--color-gray-30)] focus:border-[var(--color-primary-50)]"
            />

            {errorText ? <p className="mt-3 typo-body-14-r text-[var(--color-wrong)]">{errorText}</p> : null}
            {successText ? <p className="mt-3 typo-body-14-r text-[var(--color-secondary-90)]">{successText}</p> : null}

            <button
              type="submit"
              disabled={sending || classes.length === 0}
              className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[6px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "발송 중..." : "공지사항 발송하기"}
            </button>
          </form>

          <section className="overflow-hidden rounded-[12px] bg-[var(--color-white)]">
            <h2 className="border-b border-[var(--color-gray-stroke)] px-5 py-4 typo-sub-16-b">발송한 공지</h2>
            {loading ? (
              <p className="px-5 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">공지사항을 불러오는 중입니다.</p>
            ) : notices.length === 0 ? (
              <p className="px-5 py-8 text-center typo-body-14-r text-[var(--color-gray-50)]">아직 발송한 공지사항이 없습니다.</p>
            ) : (
              <div className="divide-y divide-[var(--color-gray-stroke)]">
                {notices.map((notice) => (
                  <article key={notice.id} className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-[5px] px-2 py-1 typo-inf-12-m ${categoryStyle[notice.category]}`}>{notice.category}</span>
                      <h3 className="min-w-0 flex-1 truncate typo-tab-15-m">{notice.title}</h3>
                    </div>
                    <p className="mt-2 line-clamp-1 typo-body-14-r text-[var(--color-gray-70)]">{notice.content}</p>
                    <p className="mt-2 typo-cap-13-m text-[var(--color-gray-50)]">{notice.class_name} · {formatDate(notice.created_at)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
