"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!adminId.trim() || !password) {
      setErrorText("관리자 아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: adminId.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as { access_token: string };
      localStorage.setItem("onui_admin_token", data.access_token);
      router.replace("/admin/teachers");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-gray-bg)] px-4 py-5 text-[var(--color-gray-100)]">
      <section className="mx-auto flex min-h-[calc(var(--app-page-height)-2.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-[var(--color-white)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <header className="bg-[var(--color-primary-90)] px-5 py-6 text-[var(--color-white)]">
          <Link href="/" className="inline-flex items-center gap-2 typo-tag-14-sb text-white/90">
            <span aria-hidden="true">←</span>
            홈으로
          </Link>
          <h1 className="mt-6 typo-tit-24-b">관리자 로그인</h1>
          <p className="mt-2 typo-body-14-r text-white/80">
            선생님 가입 신청을 승인하거나 반려합니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 py-7">
          <label htmlFor="admin-id" className="typo-cap-13-m text-[var(--color-gray-70)]">
            관리자 아이디
          </label>
          <input
            id="admin-id"
            value={adminId}
            onChange={(event) => setAdminId(event.target.value)}
            autoComplete="username"
            placeholder="관리자 아이디"
            className="mt-2 h-12 rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none focus:border-[var(--color-primary-50)]"
          />

          <label htmlFor="admin-password" className="mt-4 typo-cap-13-m text-[var(--color-gray-70)]">
            비밀번호
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="비밀번호"
            className="mt-2 h-12 rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none focus:border-[var(--color-primary-50)]"
          />

          {errorText ? <p className="mt-3 typo-cap-13-m text-[var(--color-wrong)]">{errorText}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 h-12 rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:opacity-60"
          >
            {isSubmitting ? "로그인 중..." : "관리자 로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
