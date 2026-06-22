"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SignupRole = "student" | "teacher";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password) {
      setErrorText("이름, 이메일, 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      if (role === "teacher") {
        setSignupComplete(true);
        return;
      }

      router.replace(`/login?email=${encodeURIComponent(normalizedEmail)}&role=student`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupComplete) {
    return (
      <main className="min-h-screen bg-[var(--color-gray-bg)] px-4 py-5 text-[var(--color-gray-100)]">
        <section className="mx-auto flex min-h-[calc(var(--app-page-height)-2.5rem)] w-full max-w-[430px] flex-col items-center justify-center rounded-[28px] bg-[var(--color-white)] px-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary-10)] text-[32px] text-[var(--color-primary-50)]">
            ✓
          </div>
          <h1 className="mt-6 typo-tit-24-b">선생님 가입 신청 완료</h1>
          <p className="mt-3 typo-body-16-r text-[var(--color-gray-60-icon)]">
            관리자가 신청 정보를 확인하고 있습니다.
            <br />
            승인 완료 후 선생님 로그인이 가능합니다.
          </p>
          <Link
            href="/login?role=teacher"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
          >
            선생님 로그인으로
          </Link>
          <Link
            href="/"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[var(--color-gray-stroke)] typo-but-16-b text-[var(--color-gray-70)]"
          >
            홈으로
          </Link>
          <Link
            href="/admin"
            className="mt-3 inline-flex h-10 items-center justify-center px-4 typo-tag-14-sb text-[var(--color-gray-50)]"
          >
            관리자 로그인
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-gray-bg)] px-4 py-5 text-[var(--color-gray-100)]">
      <div className="mx-auto flex min-h-[calc(var(--app-page-height)-2.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(180deg,var(--color-primary-50)_0%,#4b86e9_100%)] px-5 py-6 text-white">
          <Link href="/" className="inline-flex items-center gap-2 typo-tag-14-sb opacity-90 transition hover:opacity-100">
            <span aria-hidden="true">←</span>
            홈으로
          </Link>
          <h1 className="mt-6 typo-tit-24-b">
            {role === "teacher" ? "선생님 회원가입" : "학생 회원가입"}
          </h1>
          <p className="mt-2 typo-body-14-r text-white/85">
            {role === "teacher"
              ? "가입 신청 후 관리자 승인을 받아 교사용 계정을 사용하세요."
              : "새 계정을 만들고 학습을 시작하세요."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 py-6">
          <div
            className="grid h-12 grid-cols-2 rounded-xl bg-[var(--color-gray-bg)] p-1"
            role="tablist"
            aria-label="회원가입 유형"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === "student"}
              onClick={() => {
                setRole("student");
                setErrorText("");
              }}
              className={`rounded-[9px] typo-but-16-b transition ${
                role === "student"
                  ? "bg-[var(--color-white)] text-[var(--color-primary-50)] shadow-sm"
                  : "text-[var(--color-gray-50)]"
              }`}
            >
              학생
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === "teacher"}
              onClick={() => {
                setRole("teacher");
                setErrorText("");
              }}
              className={`rounded-[9px] typo-but-16-b transition ${
                role === "teacher"
                  ? "bg-[var(--color-white)] text-[var(--color-primary-50)] shadow-sm"
                  : "text-[var(--color-gray-50)]"
              }`}
            >
              선생님
            </button>
          </div>

          <label className="mt-6 typo-cap-13-m text-[var(--color-gray-70)]" htmlFor="signup-name">
            이름
          </label>
          <input
            id="signup-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="이름을 입력하세요"
            className="mt-2 h-12 rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none transition focus:border-[var(--color-primary-50)]"
          />

          <label className="mt-4 typo-cap-13-m text-[var(--color-gray-70)]" htmlFor="signup-email">
            이메일
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일을 입력하세요"
            className="mt-2 h-12 rounded-xl border border-[var(--color-gray-stroke)] px-4 typo-tab-15-m outline-none transition focus:border-[var(--color-primary-50)]"
          />

          <label className="mt-4 typo-cap-13-m text-[var(--color-gray-70)]" htmlFor="signup-password">
            비밀번호
          </label>
          <div className="relative mt-2">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상 입력하세요"
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
            {isSubmitting
              ? "가입 중..."
              : role === "teacher"
                ? "선생님 가입 신청"
                : "학생 회원가입"}
          </button>

          <p className="mt-5 text-center typo-body-14-r text-[var(--color-gray-50)]">
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login?role=${role}`}
              className="typo-tag-14-sb text-[var(--color-primary-50)]"
            >
              로그인
            </Link>
          </p>

          <div className="mt-6 border-t border-[var(--color-gray-stroke)] pt-5 text-center">
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 typo-tag-14-sb text-[var(--color-gray-50)] transition hover:bg-[var(--color-gray-bg)] hover:text-[var(--color-primary-50)]"
            >
              관리자 로그인
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}




