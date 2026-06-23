"use client";

import { AppHeader } from "@/src/components/AppHeader";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Feedback = { kind: "error" | "success"; message: string } | null;

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,16}$/;

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }

  return fallback;
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
      <path
        d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      {!visible ? <path d="M4 4 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : null}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
      <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  invalid: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className="h-[58px] w-full rounded-[5px] border border-[var(--color-gray-20)] bg-[var(--color-white)] px-4 pr-14 typo-body-16-r text-[var(--color-gray-100)] outline-none placeholder:text-[var(--color-gray-30)] focus:border-[var(--color-primary-50)] focus:ring-1 focus:ring-[var(--color-primary-50)] aria-[invalid=true]:border-[var(--color-wrong)]"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-[var(--color-gray-30)]"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}

export default function PasswordChangePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("onui_access_token")) {
      router.replace("/login?role=student");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      setFeedback({ kind: "error", message: "현재 비밀번호를 입력해 주세요." });
      return;
    }

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setFeedback({ kind: "error", message: "새 비밀번호는 8~16자 영문, 숫자, 특수문자를 모두 포함해야 합니다." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ kind: "error", message: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다." });
      return;
    }

    const token = localStorage.getItem("onui_access_token");
    if (!token) {
      router.replace("/login?role=student");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("onui_access_token");
          localStorage.removeItem("onui_user");
          window.dispatchEvent(new Event("storage"));
          router.replace("/login?role=student");
          return;
        }
        throw new Error(getErrorMessage(payload, "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요."));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ kind: "success", message: "비밀번호가 변경되었습니다. 마이페이지로 이동합니다." });
      window.setTimeout(() => router.replace("/profile"), 800);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-white)] text-[var(--color-gray-100)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--color-white)] md:max-w-[720px]">
        <AppHeader />

        <section className="relative flex h-[60px] items-center justify-center border-b border-[var(--color-gray-stroke)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-6 grid h-11 w-11 place-items-center text-[var(--color-gray-60-icon)]"
            aria-label="마이페이지로 돌아가기"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="typo-sub-18-r">비밀번호 변경</h1>
        </section>

        <form noValidate onSubmit={handleSubmit} className="px-7 pb-10 pt-7">
          <div className="flex items-center gap-3">
            <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[6px] bg-[var(--color-primary-10)] text-[var(--color-primary-50)]">
              <LockIcon />
            </div>
            <p className="typo-body-16-r leading-7 text-[var(--color-gray-70)]">
              안전한 계정 관리를 위해
              <br />
              주기적으로 비밀번호를 변경해 주세요.
            </p>
          </div>

          <label htmlFor="current-password" className="mt-8 block typo-tab-15-m">
            현재 비밀번호
          </label>
          <div className="mt-3">
            <PasswordField
              id="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="현재 비밀번호를 입력하세요."
              autoComplete="current-password"
              invalid={feedback?.kind === "error" && !currentPassword}
            />
          </div>

          <label htmlFor="new-password" className="mt-8 block typo-tab-15-m">
            새 비밀번호
          </label>
          <div className="mt-3">
            <PasswordField
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="새 비밀번호를 입력하세요."
              autoComplete="new-password"
              invalid={feedback?.kind === "error" && Boolean(newPassword) && !PASSWORD_PATTERN.test(newPassword)}
            />
          </div>
          <p className="mt-2 typo-cap-13-m text-[var(--color-gray-50)]">8~16자 영문, 숫자, 특수문자 조합</p>

          <label htmlFor="confirm-password" className="mt-8 block typo-tab-15-m">
            새 비밀번호 확인
          </label>
          <div className="mt-3">
            <PasswordField
              id="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="새 비밀번호를 다시 입력하세요."
              autoComplete="new-password"
              invalid={feedback?.kind === "error" && Boolean(confirmPassword) && newPassword !== confirmPassword}
            />
          </div>

          {feedback ? (
            <p
              role="alert"
              className={`mt-4 typo-body-14-r ${
                feedback.kind === "success" ? "text-[var(--color-secondary-90)]" : "text-[var(--color-wrong)]"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-12 flex h-[54px] w-full items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "변경 중..." : "변경하기"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="mt-3 flex h-[54px] w-full items-center justify-center rounded-[5px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-50)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
        </form>
      </div>
    </main>
  );
}
