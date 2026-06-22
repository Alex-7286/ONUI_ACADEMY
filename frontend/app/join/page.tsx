"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppHeader } from "../../src/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const PENDING_INVITE_KEY = "onui_pending_invite_code";

type InvitePreview = {
  class_id: number;
  class_name: string;
  teacher_name: string;
  invite_code: string;
};

type JoinedClass = {
  class_id: number;
  class_name: string;
  teacher_name: string;
  invite_code: string;
  joined_at?: string | null;
};

type StoredUser = {
  name?: string;
  email?: string;
  role?: "student" | "teacher";
};

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? "요청을 처리하지 못했습니다.";
}

function JoinPageContent() {
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [joinedClass, setJoinedClass] = useState<JoinedClass | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const codeFromUrl = searchParams.get("code")?.trim().toUpperCase() ?? "";
    const storedCode = localStorage.getItem(PENDING_INVITE_KEY)?.trim().toUpperCase() ?? "";
    const nextCode = codeFromUrl || storedCode;

    setInviteCode(nextCode);
    setHasToken(Boolean(localStorage.getItem("onui_access_token")));

    const storedUser = localStorage.getItem("onui_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as StoredUser);
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }

    if (nextCode) {
      localStorage.setItem(PENDING_INVITE_KEY, nextCode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!inviteCode) {
      setIsLoading(false);
      setErrorText("초대코드가 없습니다.");
      return;
    }

    const loadPreview = async () => {
      setIsLoading(true);
      setErrorText("");

      try {
        const response = await fetch(`${API_BASE_URL}/classes/invite/${encodeURIComponent(inviteCode)}`);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        setPreview((await response.json()) as InvitePreview);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "초대 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreview();
  }, [inviteCode]);

  const joinClass = async () => {
    const token = localStorage.getItem("onui_access_token");
    if (!token) return;

    setIsJoining(true);
    setErrorText("");

    try {
      const response = await fetch(`${API_BASE_URL}/classes/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const joined = (await response.json()) as JoinedClass;
      localStorage.removeItem(PENDING_INVITE_KEY);
      setJoinedClass(joined);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "반 참여에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-[var(--color-gray-bg)] md:max-w-[720px]">
      <AppHeader />

      <section className="px-[18px] pb-10 pt-7">
        <p className="typo-body-14-r text-[var(--color-gray-60-icon)]">반 초대</p>
        <h1 className="mt-1 typo-tit-24-b text-[var(--color-gray-100)]">
          선생님 반에 참여하기
        </h1>

        <section className="mt-6 rounded-[12px] bg-[var(--color-white)] p-5 shadow-[0_5px_16px_rgba(15,23,42,0.04)]">
          {isLoading ? (
            <p className="py-10 text-center typo-body-14-r text-[var(--color-gray-50)]">
              초대 정보를 확인하는 중입니다.
            </p>
          ) : errorText && !preview ? (
            <div className="text-center">
              <p className="typo-sub-16-b text-[var(--color-wrong)]">{errorText}</p>
              <Link
                href="/"
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
              >
                홈으로
              </Link>
            </div>
          ) : joinedClass ? (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--color-secondary-10)] text-[32px] text-[var(--color-secondary-90)]">
                ✓
              </div>
              <h2 className="mt-5 typo-tit-20-sb">반 참여가 완료되었습니다.</h2>
              <p className="mt-3 typo-body-16-r text-[var(--color-gray-60-icon)]">
                {joinedClass.teacher_name} 선생님의
                <br />
                {joinedClass.class_name}에 연결되었습니다.
              </p>
              <Link
                href="/"
                className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
              >
                학습 시작하기
              </Link>
            </div>
          ) : preview ? (
            <>
              <div className="rounded-xl bg-[var(--color-primary-10)] p-4">
                <p className="typo-cap-13-m text-[var(--color-primary-50)]">초대코드 {preview.invite_code}</p>
                <h2 className="mt-2 typo-tit-20-sb text-[var(--color-gray-100)]">
                  {preview.class_name}
                </h2>
                <p className="mt-2 typo-body-14-r text-[var(--color-gray-60-icon)]">
                  {preview.teacher_name} 선생님이 초대했습니다.
                </p>
              </div>

              {!hasToken ? (
                <div className="mt-5">
                  <p className="typo-body-14-r text-[var(--color-gray-60-icon)]">
                    반에 참여하려면 학생 계정으로 로그인하거나 회원가입해주세요.
                  </p>
                  <Link
                    href="/login?role=student"
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
                  >
                    학생 로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[var(--color-gray-stroke)] typo-but-16-b text-[var(--color-gray-70)]"
                  >
                    학생 회원가입
                  </Link>
                </div>
              ) : user?.role === "teacher" ? (
                <p className="mt-5 rounded-xl bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">
                  선생님 계정은 반에 학생으로 참여할 수 없습니다. 학생 계정으로 로그인해주세요.
                </p>
              ) : (
                <>
                  {errorText ? (
                    <p className="mt-5 rounded-xl bg-[var(--color-wrong-bg)] px-4 py-3 typo-body-14-r text-[var(--color-wrong)]">
                      {errorText}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void joinClass()}
                    disabled={isJoining}
                    className="mt-5 h-12 w-full rounded-xl bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:opacity-60"
                  >
                    {isJoining ? "참여 중..." : "이 반에 참여하기"}
                  </button>
                </>
              )}
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--color-gray-bg)]" />}>
      <JoinPageContent />
    </Suspense>
  );
}
