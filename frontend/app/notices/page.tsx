"use client";

import { AppHeader } from "@/src/components/AppHeader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NoticeCategory = "중요" | "학사" | "점검" | "이벤트";

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

const categoryStyle: Record<NoticeCategory, string> = {
  중요: "bg-[var(--color-wrong-bg)] text-[var(--color-wrong)]",
  학사: "bg-[var(--color-primary-10)] text-[var(--color-primary-50)]",
  점검: "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]",
  이벤트: "bg-[var(--color-point-10)] text-[var(--color-point-90)]",
};

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
      <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10).replaceAll("-", ".");
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return "공지사항을 불러오지 못했습니다.";
}

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("onui_access_token");
    const storedUser = localStorage.getItem("onui_user");
    if (!token || !storedUser) {
      router.replace("/login?role=student");
      return;
    }

    try {
      const user = JSON.parse(storedUser) as { role?: string };
      if (user.role === "teacher") {
        router.replace("/teacher/notices");
        return;
      }
    } catch {
      router.replace("/login?role=student");
      return;
    }

    let active = true;
    fetch("/api/notices", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getErrorMessage(payload));
        return payload as Notice[];
      })
      .then((data) => {
        if (active) setNotices(data);
      })
      .catch((error) => {
        if (active) setErrorText(error instanceof Error ? error.message : "공지사항을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div
        className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]"
        style={{ backgroundColor: "var(--color-white)" }}
      >
        <AppHeader />
        
        <section className="relative flex h-[60px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-5 grid h-10 w-10 place-items-center text-[var(--color-gray-60-icon)]"
            aria-label="공지사항 목록으로 돌아가기"
          >
          <ChevronLeftIcon />
        </button>
          <h1 className="typo-sub-18-r">공지사항</h1>
        </section>

        {loading ? (
          <p className="px-5 py-12 text-center typo-body-14-r text-[var(--color-gray-50)]">공지사항을 불러오는 중입니다.</p>
        ) : errorText ? (
          <p className="mx-5 mt-5 rounded-[8px] bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">{errorText}</p>
        ) : notices.length === 0 ? (
          <p className="px-5 py-12 text-center typo-body-14-r text-[var(--color-gray-50)]">받은 공지사항이 없습니다.</p>
        ) : (
          <div className="px-5">
            {notices.map((notice) => (
              <button
                key={notice.id}
                type="button"
                onClick={() => router.push(`/notices/${notice.id}`)}
                className="flex w-full border-b border-[var(--color-gray-stroke)] py-6 text-left"
              >
                <div className="flex w-full items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-[5px] px-2 py-1 typo-inf-12-m ${categoryStyle[notice.category]}`}>{notice.category}</span>
                      <h2 className="truncate typo-sub-16-b">{notice.title}</h2>
                    </div>
                    <p className="mt-3 truncate typo-body-14-r leading-6 text-[var(--color-gray-70)]">{notice.content}</p>
                    <div className="mt-2 flex items-center gap-2 typo-cap-13-m text-[var(--color-gray-50)]">
                      <span>{formatDate(notice.created_at)}</span>
                      <span className="h-3 w-px bg-[var(--color-gray-stroke)]" />
                      <span>{notice.class_name}</span>
                    </div>
                  </div>
                  <span className="mt-5 mr-1 shrink-0 text-[var(--color-gray-60-icon)]"><ChevronRightIcon /></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
