"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    name: string;
    created_at?: string | null;
    last_login_at?: string | null;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const nextEmail = searchParams.get("email") ?? "";
    if (nextEmail) setEmail(nextEmail);
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorText("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as LoginResponse;
      localStorage.setItem("onui_access_token", data.access_token);
      localStorage.setItem("onui_user", JSON.stringify(data.user));
      router.replace("/");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-gray-bg)] px-4 py-5 text-[var(--color-gray-100)]">
      <div className="mx-auto flex min-h-[calc(var(--app-page-height)-2.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(180deg,var(--color-primary-50)_0%,#4b86e9_100%)] px-5 py-6 text-white">
          <Link href="/" className="inline-flex items-center gap-2 typo-tag-14-sb opacity-90 transition hover:opacity-100">
            <span aria-hidden="true">←</span>
            홈으로
          </Link>
          <h1 className="mt-6 typo-tit-24-b">로그인</h1>
          <p className="mt-2 typo-body-14-r text-white/85">기존 계정으로 이어서 학습을 시작하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 py-6">
          <label className="typo-cap-13-m text-[var(--color-gray-70)]" htmlFor="login-email">
            이메일
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일을 입력하세요"
            className="mt-2 h-12 rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none transition focus:border-[var(--color-primary-50)]"
          />

          <label className="mt-4 typo-cap-13-m text-[var(--color-gray-70)]" htmlFor="login-password">
            비밀번호
          </label>
          <div className="relative mt-2">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="h-12 w-full rounded-xl border border-[var(--color-gray-stroke)] px-4 pr-14 typo-tab-15-m outline-none transition focus:border-[var(--color-primary-50)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 typo-inf-12-m text-[var(--color-gray-50)]"
            >
              {showPassword ? "숨기기" : "보기"}
            </button>
          </div>

          {errorText ? <p className="mt-3 typo-cap-13-m text-red-500">{errorText}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 h-12 rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-white transition hover:brightness-105 disabled:opacity-70"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>

          <p className="mt-5 text-center typo-body-14-r text-[var(--color-gray-50)]">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="typo-tag-14-sb text-[var(--color-primary-50)]">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--color-gray-bg)] px-4 py-5 text-[var(--color-gray-100)]" />}>
      <LoginPageContent />
    </Suspense>
  );
}





