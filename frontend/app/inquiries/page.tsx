"use client";

import { AppHeader } from "@/src/components/AppHeader";
import { useState } from "react";

type InquiryStatus = "답변 대기" | "답변 완료";

type Inquiry = {
  id: number;
  status: InquiryStatus;
  title: string;
  preview: string;
  createdAt: string;
  answeredAt?: string;
};

const inquiries: Inquiry[] = [
  {
    id: 1,
    status: "답변 완료",
    title: "13주차 2차시 과제 제출 관련 문의",
    preview: "안녕하세요. 13주차 2차시 과제 제출 기간이 언제까지인지 궁금합니다.",
    createdAt: "2025.05.20",
    answeredAt: "2025.05.21",
  },
  {
    id: 2,
    status: "답변 대기",
    title: "중간고사 응시 방법 문의",
    preview: "중간고사 응시는 어디에서 할 수 있나요?",
    createdAt: "2025.05.20",
  },
  {
    id: 3,
    status: "답변 완료",
    title: "강의 자료 다운로드가 안돼요",
    preview: "강의 자료를 다운로드하려고 하면 오류가 발생합니다.",
    createdAt: "2025.05.19",
    answeredAt: "2025.05.20",
  },
];

const tabItems = [
  { key: "전체", label: "전체" },
  { key: "답변 대기", label: "답변 대기" },
  { key: "답변 완료", label: "답변 완료" },
] as const;

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v6M12 7.5v.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function InquiriesPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabItems)[number]["key"]>("전체");
  const visibleInquiries = activeTab === "전체" ? inquiries : inquiries.filter((inquiry) => inquiry.status === activeTab);

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div
        className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]"
        style={{ backgroundColor: "var(--color-white)" }}
      >
        <AppHeader />
        <section className="flex h-[60px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
          <h1 className="typo-sub-18-r">1:1 문의</h1>
        </section>

        <nav className="grid h-[54px] grid-cols-3 border-b border-[var(--color-gray-stroke)]" aria-label="문의 상태">
          {tabItems.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative typo-tab-15-m ${active ? "text-[var(--color-primary-50)]" : "text-[var(--color-gray-50)]"}`}
              >
                {tab.label}
                {active ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--color-primary-50)]" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-6">
          <div className="flex gap-2 rounded-[6px] bg-[var(--color-primary-10)] px-4 py-3 text-[var(--color-primary-90)]">
            <span className="mt-0.5 shrink-0"><InfoIcon /></span>
            <p className="typo-cap-13-m leading-6">
              문의하신 내용은 순차적으로 답변드리고 있습니다.
              <br />
              평일 기준 1~2일 이내 답변을 드립니다.
            </p>
          </div>

          <div className="mt-2">
            {visibleInquiries.map((inquiry) => (
              <button key={inquiry.id} type="button" className="flex w-full items-start gap-3 border-b border-[var(--color-gray-stroke)] py-6 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-[5px] px-2 py-1 typo-inf-12-m ${
                      inquiry.status === "답변 완료"
                        ? "bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]"
                        : "bg-[var(--color-point-10)] text-[var(--color-point-90)]"
                    }`}>
                      {inquiry.status}
                    </span>
                    <h2 className="truncate typo-sub-16-b">{inquiry.title}</h2>
                  </div>
                  <p className="mt-3 truncate typo-body-14-r text-[var(--color-gray-70)]">{inquiry.preview}</p>
                  <div className="mt-2 flex items-center gap-2 typo-cap-13-m text-[var(--color-gray-50)]">
                    <span>{inquiry.createdAt}</span>
                    {inquiry.answeredAt ? (
                      <>
                        <span className="h-3 w-px bg-[var(--color-gray-stroke)]" />
                        <span>답변일: {inquiry.answeredAt}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <span className="mt-5 shrink-0 text-[var(--color-gray-60-icon)]"><ChevronRightIcon /></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
