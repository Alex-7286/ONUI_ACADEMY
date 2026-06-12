"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const levelItems = ["초급 1", "초급 2", "중급 1", "중급 2", "고급 1", "고급 2"];

const menuItems = [
  { label: "시험 응시", href: "/student_assignments" },
  { label: "성적 현황", href: "/stats" },
  { label: "공지사항", href: "/notices" },
  { label: "마이페이지", href: "/profile" },
  { label: "1:1 문의", href: "" },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M15 17H5.5c.9-1 1.5-2.2 1.5-3.6V10a5 5 0 1 1 10 0v3.4c0 1.4.6 2.6 1.5 3.6H15m0 0a3 3 0 0 1-6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AcademyLogo() {
  return (
    <Link href="/" className="flex items-center gap-1.5" aria-label="홈으로 이동">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-50)] typo-tit-18-b text-[var(--color-white)]">
        e
      </span>
      <span className="typo-tit-24-b text-[var(--color-primary-90)]">Academy</span>
    </Link>
  );
}

function useCurrentUserName() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem("onui_user");
      if (!storedUser) {
        setUserName(null);
        return;
      }

      try {
        const parsed = JSON.parse(storedUser) as { name?: string | null; email?: string | null };
        setUserName(parsed.name || parsed.email || null);
      } catch {
        setUserName(null);
      }
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("focus", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  return { userName, setUserName };
}

export function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean,
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return(
    <div className="fixed inset-y-0 left-1/2 z-[80] flex w-full max-w-[430px] -translate-x-1/2 items-center justify-center px-[18px] md:max-w-[720px] md:px-10">
      <button
        type="button"
        aria-label="로그아웃 취소"
        onClick={onCancel}
        className="absolute inset-0 bg-black/35"
      />
        
      <section className="relative z-10 w-full rounded-[12px] bg-[var(--color-white)] px-7 pb-7 pt-8 text-center">
        <h2 className="typo-tit-20-sb text-[var(--color-gray-90)]">
          로그아웃 하시겠습니까?
        </h2>

        <p className="mt-5 typo-body-14-r leading-7 text-[var(--color-gray-70)]">
          로그아웃 시 모든 데이터는 안전하게 보호됩니다.
          <br/>
          다시 로그인하면 이어서 학습할 수 있어요.
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="mt-8 flex h-[58px] w-full items-center justify-center rounded-[5px] border border-[var(--color-gray-stroke)] typo-tit-18-b text-[var(--color-gray-50)]"
        >
          취소  
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-4 flex h-[58px] w-full items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-tit-18-b text-[var(--color-white)]"  
        >
          로그아웃
        </button>
      
      </section>
    </div>
  )
}

function SideDrawer({
  open,
  onClose,
  userName,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  userName: string | null;
  onLogout: () => void;
}) {
  const [lectureOpen, setLectureOpen] = useState(true);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-[61px] z-50 h-[calc(var(--app-page-height)-61px)] w-full max-w-[430px] md:max-w-[720px] -translate-x-1/2">
      <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/35" onClick={onClose} />

      <aside
        className="absolute bottom-0 left-0 top-0 flex w-[250px] md:w-[320px] flex-col overflow-hidden bg-[var(--color-white)] shadow-[12px_0_36px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex h-[118px] flex-col justify-between px-5 pb-4 pt-5 text-[var(--color-white)]"
          style={{ background: "linear-gradient(90deg, #6DBFE6 0%, var(--color-primary-50) 100%)" }}
        >
          {userName ? (
            <div className="typo-tit-18-b">
              {userName}{"님"}
              <br />
              {"안녕하세요."}
            </div>
          ) : (
            <div className="typo-tit-18-b">
              {"e-Academy에 오신 걸"}
              <br />
              {"환영합니다."}
            </div>
          )}

          <div className="flex justify-end gap-3 typo-cap-13-m">
            {userName ? (
              <button type="button" onClick={onLogout} className="transition hover:opacity-90">
                {"로그아웃"}
              </button>
            ) : (
              <>
                <Link href="/login" className="transition hover:opacity-90" onClick={onClose}>
                  {"로그인"}
                </Link>
                <Link href="/signup" className="transition hover:opacity-90" onClick={onClose}>
                  {"회원가입"}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[var(--color-white)]">
          <button
            type="button"
            onClick={() => setLectureOpen((current) => !current)}
            className="flex h-[62px] w-full items-center justify-between border-b border-[var(--color-gray-stroke)] px-5 text-left typo-sub-16-b text-[var(--color-gray-100)] transition hover:bg-[var(--color-primary-10)]"
          >
            <span>{"강의"}</span>
            <ChevronDownIcon open={lectureOpen} />
          </button>

          {lectureOpen ? (
            <div className="border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] pb-3 pt-1">
              {levelItems.map((level) => (
                <Link
                  key={level}
                  href={`/levels?level=${encodeURIComponent(level)}`}
                  onClick={onClose}
                  className="block px-9 py-2 typo-body-16-r text-[var(--color-gray-80)] transition hover:bg-[var(--color-primary-10)]"
                >
                  {level}
                </Link>
              ))}
            </div>
          ) : null}

          {menuItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="flex h-[50px] w-full items-center border-b border-[var(--color-gray-stroke)] px-5 text-left typo-tit-18-b text-[var(--color-gray-100)] transition hover:bg-[var(--color-primary-10)]"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onClose();
                  window.alert("1:1 문의는 준비 중입니다.");
                }}
                className="flex h-[50px] w-full items-center border-b border-[var(--color-gray-stroke)] px-5 text-left typo-tit-18-b text-[var(--color-gray-100)] transition hover:bg-[var(--color-primary-10)]"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      </aside>
    </div>
  );
}

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { userName, setUserName } = useCurrentUserName();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("onui_access_token");
    localStorage.removeItem("onui_user");
    setUserName(null);
    setMenuOpen(false);
  };

  const handleLogoutRequest = () => {
    setMenuOpen(false);
    setLogoutModalOpen(true);
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem("onui_access_token");
    localStorage.removeItem("onui_user");
    window.dispatchEvent(new Event("storage"));

    setUserName(null);
    setLogoutModalOpen(false);
  }



  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4 py-3">
        <div className="flex h-9 items-center justify-between">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]"
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          <AcademyLogo />

          <div className="flex items-center gap-2">
            <button type="button" className="relative grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]" aria-label="알림">
              <BellIcon />
              <span className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#f05a24] px-1 typo-inf-12-m leading-none text-[var(--color-white)]">
                2
              </span>
            </button>
            <span className="text-[22px] leading-none">{"\u{1F1FA}\u{1F1F8}"}</span>
          </div>
        </div>
      </header>

      <SideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} userName={userName} onLogout={handleLogoutRequest} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}  
      />
    </>
  );
}
