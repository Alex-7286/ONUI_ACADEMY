"use client";

import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/src/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getLessonProgress, setLessonProgress } from "@/src/lib/progress";

type LessonSlide = {
  page: number;
  title: string;
  content: string;
  script: string;
  vocabulary?: string;
  image: string | null;
};

type LessonSlideSet = {
  week: number;
  lesson: number;
  title: string;
  slides: LessonSlide[];
};

type LessonSlideSets = Record<string, LessonSlideSet>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const IMAGE_EXTENSION_RE = /\.(webp|png|jpe?g|gif|svg)$/i;

function getLessonImageCandidates(level: string, image?: string | null) {
  const fileName = image?.trim().replace(/\/+$/, "");

  if (!fileName || fileName.toLowerCase() === "null" || !IMAGE_EXTENSION_RE.test(fileName)) {
    return [];
  }

  const extension = fileName.match(IMAGE_EXTENSION_RE)?.[1]?.toLowerCase();
  const baseName = fileName.replace(IMAGE_EXTENSION_RE, "");
  const extensions = [extension, "webp", "png", "jpg", "jpeg"].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
  );
  const levelFolder = level.replace(/\s+/g, "");

  return extensions.map(
    (candidateExtension) =>
      `/images/${encodeURIComponent(levelFolder)}/${encodeURIComponent(`${baseName}.${candidateExtension}`)}`,
  );
}

function LessonImage({ level, image, alt }: { level: string; image?: string | null; alt: string }) {
  const candidates = getLessonImageCandidates(level, image);
  const [candidateIndex, setCandidateIndex] = useState(0);

  if (candidateIndex >= candidates.length) {
    return null;
  }

  return (
    <Image
      unoptimized
      src={candidates[candidateIndex]}
      alt={alt}
      width={700}
      height={500}
      className="h-auto w-full object-contain"
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" opacity="0.75" />
      <path d="M16 9.5c1.2 1.4 1.2 3.6 0 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 7c2.2 2.8 2.2 7.2 0 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M12 14a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LessonTopBar({ level, week, lesson, title }: { level: string; week: number; lesson: number; title: string }) {
  return (
    <section className="relative flex h-[48px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4">
      <Link
        href={`/lesson?level=${encodeURIComponent(level)}&week=${week}&lesson=${lesson}`}
        className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]"
        aria-label="뒤로가기"
      >
        <BackIcon />
      </Link>

      <div className="text-center typo-sub-18-r text-[var(--color-gray-100)]">
        {lesson}차시 - {title}
      </div>
    </section>
  );
}

function ProgressCard({ current, total }: { current: number; total: number }) {
  const value = total > 0 ? current / total : 0;

  return (
    <section className="flex h-[44px] items-center rounded-[5px] bg-[var(--color-white)] px-7">
      <div className="flex w-full items-center gap-6">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-gray-stroke)]">
          <div className="h-full rounded-full bg-[var(--color-primary-50)]" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
        </div>
        <span className="min-w-[60px] text-right typo-tag-14-sb text-[var(--color-gray-70)]">
          {current}/{total}
        </span>
      </div>
    </section>
  );
}

function TextBlock({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap typo-body-16-r text-[var(--color-gray-90)]">
      {content}
    </div>
  );
}

function FoldButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[4px] border border-[var(--color-secondary-50)] bg-[var(--color-secondary-10)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-[42px] w-full items-center justify-between px-4 typo-tag-14-sb text-[var(--color-secondary-90)]"
        aria-expanded={open}
      >
        {title}
        <ChevronDownIcon open={open} />
      </button>
      {open ? <div className="border-t border-[var(--color-secondary-50)] px-4 py-4 typo-body-14-r text-[var(--color-gray-80)] whitespace-pre-wrap">{children}</div> : null}
    </div>
  );
}

function parseVocabularyEntries(content: string) {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const entries: Array<{ word: string; meaning: string }> = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const lines = blocks[index];

    if (lines.length > 1) {
      entries.push({ word: lines[0], meaning: lines.slice(1).join(" ") });
      continue;
    }

    const line = lines[0];
    const colonIndex = line.indexOf(":");

    if (colonIndex > 0) {
      entries.push({
        word: line.slice(0, colonIndex).trim(),
        meaning: line.slice(colonIndex + 1).trim(),
      });
      continue;
    }

    const nextLines = blocks[index + 1];

    if (nextLines?.length) {
      entries.push({ word: line, meaning: nextLines.join(" ") });
      index += 1;
    } else {
      entries.push({ word: line, meaning: "" });
    }
  }

  return entries;
}

function VocabularyBlock({ content }: { content: string }) {
  const entries = parseVocabularyEntries(content);

  if (entries.length === 0) {
    return <div className="typo-body-16-r text-[var(--color-gray-80)]">등록된 단어장이 없습니다.</div>;
  }

  return (
    <div className="space-y-5 whitespace-normal typo-body-14-r leading-[1.75] text-[var(--color-gray-90)]">
      {entries.map((entry, index) => (
        <p key={`${entry.word}-${entry.meaning}-${index}`}>
          <strong className="typo-body-14-r-b text-[var(--color-gray-90)]">{entry.word}</strong>
          {entry.meaning ? `: ${entry.meaning}` : null}
        </p>
      ))}
    </div>
  );
}

function getTopicFromFirstSlide(content?: string) {
  const subtopic = content?.match(/^소주제\s*:\s*(.+)$/m)?.[1]?.trim();
  const topic = content?.match(/^주제\s*:\s*(.+)$/m)?.[1]?.trim();
  return subtopic || topic || null;
}

function getNumberParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type QuizQuestion = {
  question: string;
  prompt?: string;
  options: string[];
  correctIndex: number | null;
};

function parseCorrectAnswers(answerContent?: string) {
  if (!answerContent) return [];

  return Array.from(answerContent.matchAll(/정답:\s*(\d+)/g)).map((match) => Number.parseInt(match[1], 10) - 1);
}

function parseQuizQuestions(content: string, answerContent?: string): QuizQuestion[] {
  const answers = parseCorrectAnswers(answerContent);
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const blocks = Array.from(normalized.matchAll(/(?:^|\n\n)Q(\d+)\.\s*([\s\S]*?)(?=\n\nQ\d+\.|$)/g));
  const questions: QuizQuestion[] = [];

  blocks.forEach((match) => {
    const lines = match[2]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const question = lines[0] ?? "";
    const optionStartIndex = lines.findIndex((line, lineIndex) => lineIndex > 0 && /^\d+\)/.test(line));
    const prompt = optionStartIndex > 1 ? lines.slice(1, optionStartIndex).join("\n") : undefined;
    const optionLines = optionStartIndex >= 0 ? lines.slice(optionStartIndex) : [];
    const options = optionLines.filter((line) => /^\d+\)/.test(line)).map((line) => line.replace(/^\d+\)\s*/, ""));

    if (!question || options.length === 0) return;

    questions.push({
      question,
      ...(prompt ? { prompt } : {}),
      options,
      correctIndex: answers[questions.length] ?? null,
    });
  });

  return questions;
}

type QuizOptionStatus = "idle" | "selected" | "correct" | "wrong";

function QuizOption({
  index,
  text,
  selected,
  onSelect,
  disabled = false,
  status = "idle",
}: {
  index: number;
  text: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  status?: QuizOptionStatus;
}) {
  const statusClass =
    status === "correct"
      ? "border-[var(--color-secondary-50)] bg-[var(--color-secondary-10)] text-[var(--color-secondary-90)]"
      : status === "wrong"
        ? "border-[var(--color-wrong)] bg-[var(--color-wrong-bg)] text-[var(--color-wrong)]"
        : selected
          ? "border-[var(--color-primary-50)] bg-[var(--color-primary-10)] text-[var(--color-gray-100)]"
          : "border-[var(--color-gray-stroke)] bg-[var(--color-white)] text-[var(--color-gray-90)]";
  const circleClass =
    status === "correct"
      ? "border-[var(--color-secondary-50)] bg-[var(--color-secondary-10)] text-[var(--color-secondary-50)]"
      : status === "wrong"
        ? "border-[var(--color-wrong)] bg-[var(--color-wrong-bg)] text-[var(--color-wrong)]"
        : selected
          ? "border-[var(--color-primary-50)] bg-[var(--color-primary-10)] text-[var(--color-primary-50)]"
          : "border-[var(--color-gray-stroke)] bg-[var(--color-white)] text-[var(--color-gray-70)]";
  const optionShapeClass =
    status === "correct" || status === "wrong"
      ? "h-[40px] rounded-[8px] border-2 px-3"
      : "h-[40px] rounded-[8px] border px-3";
  const markBorderClass = status === "idle" ? "border" : "border-2";
  const showDot = selected || status === "correct" || status === "wrong";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center gap-3 text-left typo-body-16-r transition ${optionShapeClass} ${statusClass}`}
      aria-pressed={selected}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full typo-body-16-r ${markBorderClass} ${circleClass}`}>
        {showDot ? <span className="h-3 w-3 rounded-full bg-current" /> : index + 1}
      </span>
      <span className="min-w-0 flex-1">{text}</span>
      {status === "correct" ? (
        <span className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-secondary-50)]" aria-hidden="true">
          <span className="h-3.5 w-3.5 rounded-full bg-[var(--color-secondary-10)]" />
        </span>
      ) : null}
      {status === "wrong" ? (
        <svg className="ml-auto h-7 w-7 shrink-0 text-[var(--color-wrong)]" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M7 7L25 25M25 7L7 25" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </svg>
      ) : null}
    </button>
  );
}

function QuizQuestionCard({
  question,
  index,
  selectedIndex,
  onSelect,
  submitted = false,
}: {
  question: QuizQuestion;
  index: number;
  selectedIndex: number | null;
  onSelect: (optionIndex: number) => void;
  submitted?: boolean;
}) {
  return (
    <section className="rounded-[5px] bg-[var(--color-white)] px-5 py-6">
      <h2 className="typo-body-16-r text-[var(--color-gray-100)]">
        {index + 1}. {question.question}
      </h2>

      {question.prompt ? (
        <div className="mt-6 whitespace-pre-wrap rounded-[4px] bg-[var(--color-primary-10)] px-4 py-3 typo-body-16-r text-[var(--color-gray-90)]">
          {question.prompt}
        </div>
      ) : null}

      <div className="mt-7 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = optionIndex === selectedIndex;
          const isCorrect = submitted && optionIndex === question.correctIndex;
          const isWrong = submitted && isSelected && selectedIndex !== question.correctIndex;
          const status: QuizOptionStatus = isWrong ? "wrong" : isCorrect ? "correct" : isSelected ? "selected" : "idle";

          return (
            <QuizOption
              key={`${optionIndex}-${option}`}
              index={optionIndex}
              text={option}
              selected={isSelected}
              status={status}
              disabled={submitted}
              onSelect={() => onSelect(optionIndex)}
            />
          );
        })}
      </div>
    </section>
  );
}

function QuizHeader({ level, week, lesson }: { level: string; week: number; lesson: number }) {
  return (
    <header className="relative flex h-[53px] items-center justify-center border-b border-[var(--color-gray-stroke)] bg-[var(--color-white)]">
      <Link
        href={`/lesson?level=${encodeURIComponent(level)}&week=${week}&lesson=${lesson}`}
        className="absolute left-4 grid h-9 w-9 place-items-center text-[var(--color-gray-60-icon)]"
        aria-label="뒤로가기"
      >
        <BackIcon />
      </Link>
      <h1 className="typo-sub-18-r text-[var(--color-gray-100)]">학습 점검 하기</h1>
    </header>
  );
}

type SpeechEvaluateResponse = {
  success: boolean;
  score?: number;
  raw_score?: number;
  recognized_text?: string;
  error?: string;
};

function parsePronunciationPracticeTexts(content?: string) {
  const normalized = (content ?? "").replace(/\r\n/g, "\n");
  const numbered = normalized
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^\d+\.\s*(.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line));

  return numbered.length > 0 ? numbered : ["한국어 공부는 재미있어요."];
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function SpeechPracticeCard({
  text,
  number,
  level,
  week,
  lesson,
  onSpeechResult,
  onSpeechBusy,
}: {
  text: string;
  number: number;
  level: string;
  week: number;
  lesson: number;
  onSpeechResult: (result: SpeechEvaluateResponse | null) => void;
  onSpeechBusy: (busy: boolean) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateBlob = async (blob: Blob) => {
    setLoading(true);
    onSpeechBusy(true);
    setError(null);
    onSpeechResult(null);

    try {
      const audioBase64 = await blobToBase64(blob);
      const response = await fetch(`${API_BASE_URL}/speech/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          audio_base64: audioBase64,
          mime_type: blob.type || "audio/webm",
          filename: "record.webm",
          level,
          topic: `${week}-${lesson}`,
        }),
      });
      const data = (await response.json()) as SpeechEvaluateResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || "발음 평가에 실패했습니다.");
      }
      setRecorded(true);
      onSpeechResult(data);
    } catch (caught) {
      setRecorded(false);
      onSpeechResult(null);
      onSpeechBusy(false);
      setError(caught instanceof Error ? caught.message : "발음 평가에 실패했습니다.");
    } finally {
      setLoading(false);
      onSpeechBusy(false);
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (loading || recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setRecorded(false);
      onSpeechResult(null);
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        stopTracks();
        void evaluateBlob(blob);
      };
      recorder.start();
      setRecording(true);
      setError(null);
    } catch {
      stopTracks();
      onSpeechBusy(false);
      setError("마이크 권한을 허용한 뒤 다시 시도해주세요.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    setRecording(false);
  };

  return (
    <section className="rounded-[5px] bg-[var(--color-white)] px-5 py-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-[4px] border border-[var(--color-primary-90)] px-2 py-0.5 typo-cap-13-m text-[var(--color-primary-90)]">
          SpeechPro
        </span>
        <span className="typo-cap-13-m text-[var(--color-primary-90)]">발음과 유창성을 평가합니다.</span>
      </div>

      <p className="mb-5 typo-body-14-r text-[var(--color-gray-100)]">{number}. 다음 문장을 읽어보세요.</p>
      <div className="mb-7 rounded-[4px] bg-[var(--color-primary-10)] px-4 py-4 text-center typo-sub-18-r text-[var(--color-gray-100)]">
        {`"${text}"`}
      </div>

      <button
        type="button"
        disabled
        className="mb-3 flex h-[40px] w-full items-center gap-3 rounded-[5px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] px-4 text-left typo-tab-15-m text-[var(--color-gray-40)] opacity-60"
      >
        <SpeakerIcon />
        예시 듣기
        <span className="ml-auto typo-body-14-r">준비중</span>
      </button>

      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={loading}
        className="flex h-[40px] w-full items-center gap-3 rounded-[5px] bg-[var(--color-primary-90)] px-4 text-left typo-tab-15-m text-[var(--color-white)] disabled:opacity-60"
      >
        <MicIcon />
        {loading ? "분석 중..." : recording ? "녹음 중지" : recorded ? "다시 녹음하기" : "녹음하기"}
      </button>

      {recorded && !loading ? <p className="mt-3 typo-body-14-r text-[var(--color-gray-60-icon)]">녹음이 완료되었습니다. 점수는 제출 후 확인해주세요.</p> : null}
      {error ? <p className="mt-3 typo-body-14-r text-[var(--color-point-90)]">{error}</p> : null}
    </section>
  );
}

function getSpeechGrade(score?: number) {
  if (score === undefined) return "-";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

function SpeechResultCard({
  text,
  number,
  speechResult,
}: {
  text: string;
  number: number;
  speechResult: SpeechEvaluateResponse | null;
}) {
  return (
    <section className="rounded-[5px] bg-[var(--color-white)] px-5 py-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-[4px] border border-[var(--color-primary-90)] px-2 py-0.5 typo-body-16-r text-[var(--color-primary-90)]">
          SpeechPro
        </span>
        <span className="typo-body-16-r text-[var(--color-primary-90)]">발음과 유창성을 평가합니다.</span>
      </div>
      <p className="mb-4 typo-body-14-r text-[var(--color-gray-100)]">{number}. 다음 문장을 읽어보세요.</p>
      <div className="mb-4 rounded-[4px] bg-[var(--color-primary-10)] px-4 py-4 text-center typo-body-16-r text-[var(--color-gray-100)]">
        {`"${text}"`}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <button type="button" className="flex h-[42px] items-center justify-center rounded-[4px] border border-[var(--color-gray-stroke)] bg-[var(--color-white)] typo-body-14-r text-[var(--color-gray-70)]">
          다시 녹음하기
        </button>
        <button type="button" className="flex h-[42px] items-center justify-center rounded-[4px] bg-[var(--color-primary-90)] typo-body-14-r text-[var(--color-white)]">
          결과보기{speechResult?.score !== undefined ? ` (${speechResult.score}점 / ${getSpeechGrade(speechResult.score)})` : ""}
        </button>
      </div>
    </section>
  );
}

function PassTrophyIcon() {
  return (
    <Image
      src="/images/pass-trophy.png"
      alt="학습 점검 통과"
      width={470}
      height={512}
      className="h-[82px] w-auto object-contain"
    />
  );
}

function RetryArmIcon() {
  return (
    <Image
      src="/images/retry-arm.png"
      alt="다시 도전"
      width={512}
      height={485}
      className="h-[96px] w-auto object-contain"
    />
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M19 8a7 7 0 1 0 1 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QuizResultScreen({
  level,
  week,
  lesson,
  lessonTitle,
  questions,
  selectedAnswers,
  practiceTexts,
  speechResults,
  onRetake,
}: {
  level: string;
  week: number;
  lesson: number;
  lessonTitle: string;
  questions: QuizQuestion[];
  selectedAnswers: Array<number | null>;
  practiceTexts: string[];
  speechResults: Array<SpeechEvaluateResponse | null>;
  onRetake: () => void;
}) {
  const speechWeights = speechResults.map(() => 1);

  const totalWeight = speechWeights.reduce(
    (total, weight) => total + weight,
    0,
  );

  const correctCount = questions.reduce((count, question, index) => count + (selectedAnswers[index] === question.correctIndex ? 1 : 0), 0);
  const objectiveScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 60): 0;
  const speechAverage =
  speechResults.length > 0 && totalWeight > 0
    ? speechResults.reduce((total, result, index) => {
        const score = Math.min(
          100,
          Math.max(0, result?.score ?? 0),
        );

        return total + score * speechWeights[index];
      }, 0) / totalWeight
    : 0;
  const speechScorePart = Math.round((speechAverage / 100) * 40);
  
  const totalScore = Math.min(100, objectiveScore + speechScorePart);

  const objectedPassed = objectiveScore >= 30;
  const speechPassed = speechScorePart >= 20;

  const passed = totalScore >= 60 && objectedPassed && speechPassed;

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
        <AppHeader />
        <QuizHeader level = {level} week={week} lesson={lesson} />
        <section className="space-y-5 px-6 py-6 md:px-10">
          <section className="overflow-hidden rounded-[6px] bg-[var(--color-white)]">
            <div
              className={`flex items-center justify-between gap-3 px-6 ${
                passed ? "min-h-[120px] py-4" : "min-h-[154px] py-5"
              } ${
                passed ? "bg-[var(--color-point-10)]" : "bg-[var(--color-wrong-bg)]"
              }`}
            >
              <div className="min-w-0">
                <p className="typo-cap-13-m text-[var(--color-gray-80)]">
                  {passed ? "학습 점검 통과!" : "70점 이상 달성해야"}
                </p>
                <p className="mt-1 typo-cap-13-m leading-5 text-[var(--color-gray-80)]">
                  {passed ? "다음 차시로 이동할 수 있습니다!" : "다음 차시로 이동할 수 있어요."}
                </p>
                <div
                  className={`${passed ? "mt-3" : "mt-5"} flex items-end gap-1 ${
                    passed ? "text-[var(--color-primary-50)]" : "text-[var(--color-wrong)]"
                  }`}
                >
                  <span className={`${passed ? "text-[46px]" : "text-[54px]"} font-bold leading-none`}>{totalScore}</span>
                  <span className="pb-0.5 typo-tit-20-sb">점</span>
                </div>
              </div>

              <div className="shrink-0">
                {passed ? <PassTrophyIcon /> : <RetryArmIcon />}
              </div>
            </div>

            <div className={`grid grid-cols-2 items-center px-4 ${passed ? "min-h-[56px] py-2" : "min-h-[64px] py-3"}`}>
              <div className="flex items-baseline justify-center gap-2 border-r border-[var(--color-gray-stroke)]">
                <span className="typo-sub-16-m text-[var(--color-gray-60-icon)]">객관식</span>
                <strong className="typo-tit-20-sb text-[var(--color-gray-100)]">{objectiveScore}점</strong>
                <span className="typo-sub-16-m text-[var(--color-gray-50)]">
                  ({correctCount}/{questions.length})
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="typo-sub-16-m text-[var(--color-gray-60-icon)]">말하기</span>
                <strong className="typo-tit-20-sb text-[var(--color-gray-100)]">{speechScorePart}점</strong>
              </div>
            </div>
          </section>

          {passed ? (
            <div className="space-y-2">
              <Link
                href={`/levels?level=${encodeURIComponent(level)}`}
                onClick={() => setLessonProgress(level, week, lesson, 100, lessonTitle)}
                className="flex h-[44px] w-full items-center justify-center rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
              >
                학습 완료
              </Link>
              <button
                type="button"
                onClick={onRetake}
                className="flex h-[44px] w-full items-center justify-center rounded-[5px] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-50)] shadow-[0_0_0_1px_var(--color-gray-stroke)]"
              >
                틀린 문제 다시 풀기
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRetake}
              className="flex h-[44px] w-full items-center justify-center gap-3 rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)]"
            >
              <RetryIcon />
              다시 풀기
            </button>
          )}

          {questions.map((question, index) => (
            <QuizQuestionCard
              key={`result-${index}-${question.question}`}
              question={question}
              index={index}
              selectedIndex={selectedAnswers[index] ?? null}
              submitted
              onSelect={() => undefined}
            />
          ))}
          {practiceTexts.map((text, index) => (
            <SpeechResultCard
              key={`result-speech-${index}-${text}`}
              text={text}
              number={questions.length + index + 1}
              speechResult={speechResults[index] ?? null}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function DailyQuizScreen({
  level,
  week,
  lesson,
  lessonTitle,
  questions,
  practiceTexts,
}: {
  level: string;
  week: number;
  lesson: number;
  lessonTitle: string;
  questions: QuizQuestion[];
  practiceTexts: string[];
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [speechResults, setSpeechResults] = useState<Array<SpeechEvaluateResponse | null>>(() => practiceTexts.map(() => null));
  const [speechBusyStates, setSpeechBusyStates] = useState<boolean[]>(() => practiceTexts.map(() => false));
  const [attempt, setAttempt] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const speechBusy = speechBusyStates.some(Boolean);
  const speechCompleted = speechResults.length > 0 && speechResults.every((result) => result?.score !== undefined);

  const saveQuizSubmission = async () => {
    const token = localStorage.getItem("onui_access_token");
    if (!token) return;

    const correctCount = questions.reduce((count, question, index) => count + (selectedAnswers[index] === question.correctIndex ? 1 : 0), 0);
    const objectiveScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 60) : 0;
    const speechAverage =
      speechResults.length > 0
        ? speechResults.reduce((total, result) => total + Math.min(100, Math.max(0, result?.score ?? 0)), 0) / speechResults.length
        : 0;
    const speechScore = Math.round((speechAverage / 100) * 40);
    const totalScore = Math.min(100, objectiveScore + speechScore);
    const passed = totalScore >= 60 && objectiveScore >= 30 && speechScore >= 20;

    await fetch(`${API_BASE_URL}/submissions/quiz`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        week,
        lesson,
        lesson_title: lessonTitle,
        question_count: questions.length,
        correct_count: correctCount,
        objective_score: objectiveScore,
        speech_score: speechScore,
        total_score: totalScore,
        passed,
        answers: questions.map((question, index) => ({
          question: question.question,
          selected_index: selectedAnswers[index],
          correct_index: question.correctIndex,
          selected_text: selectedAnswers[index] !== null ? question.options[selectedAnswers[index] ?? 0] : null,
          correct_text: question.correctIndex !== null ? question.options[question.correctIndex] : null,
        })),
        speech_results: practiceTexts.map((text, index) => ({
          text,
          score: speechResults[index]?.score ?? null,
          raw_score: speechResults[index]?.raw_score ?? null,
          recognized_text: speechResults[index]?.recognized_text ?? "",
        })),
      }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!submitted) return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [submitted]);

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((current) => current.map((answer, index) => (index === questionIndex ? optionIndex : answer)));
  };

  const retake = () => {
    setSubmitted(false);
    setSelectedAnswers(questions.map(() => null));
    setSpeechResults(practiceTexts.map(() => null));
    setSpeechBusyStates(practiceTexts.map(() => false));
    setAttempt((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <QuizResultScreen
        level={level}
        week={week}
        lesson={lesson}
        lessonTitle={lessonTitle}
        questions={questions}
        selectedAnswers={selectedAnswers}
        practiceTexts={practiceTexts}
        speechResults={speechResults}
        onRetake={retake}
      />
    );
  }

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
        <AppHeader />
        <QuizHeader level={level} week={week} lesson={lesson} />
        <section className="space-y-2 px-6 py-6 md:px-10">
          {questions.map((question, index) => (
            <QuizQuestionCard
              key={`${index}-${question.question}`}
              question={question}
              index={index}
              selectedIndex={selectedAnswers[index] ?? null}
              onSelect={(optionIndex) => selectAnswer(index, optionIndex)}
            />
          ))}
          {practiceTexts.map((text, index) => (
            <SpeechPracticeCard
              key={`${attempt}-${index}-${text}`}
              text={text}
              number={questions.length + index + 1}
              level={level}
              week={week}
              lesson={lesson}
              onSpeechResult={(result) =>
                setSpeechResults((current) =>
                  current.map((value, resultIndex) => (resultIndex === index ? result : value)),
                )
              }
              onSpeechBusy={(busy) =>
                setSpeechBusyStates((current) =>
                  current.map((value, busyIndex) => (busyIndex === index ? busy : value)),
                )
              }
            />
          ))}
        </section>
        <div className="space-y-4 px-2 pb-6 md:px-10">
          <button
            type="button"
            onClick={() => {
              setSubmitted(true);
              void saveQuizSubmission();
            }}
            disabled={speechBusy || !speechCompleted}
            className={`flex h-[58px] w-full items-center justify-center rounded-[4px] typo-but-16-b text-[var(--color-white)] ${speechBusy || !speechCompleted ? "bg-[var(--color-gray-30)]" : "bg-[var(--color-primary-50)]"}`}
          >
            {speechBusy ? "분석 중..." : "제출하기"}
          </button>
          <Link
            href={`/lesson?level=${encodeURIComponent(level)}&week=${week}&lesson=${lesson}`}
            className="flex h-[58px] w-full items-center justify-center rounded-[4px] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-50)] shadow-[0_0_0_1px_var(--color-gray-stroke)]"
          >
            이전으로
          </Link>
        </div>
      </div>
    </main>
  );
}

function StudyContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") ?? "초급 1";
  const week = getNumberParam(searchParams.get("week"), 2);
  const lesson = getNumberParam(searchParams.get("lesson"), 2);
  const lessonKey = `${week}-${lesson}`;
  const initialPage = Math.max(1, getNumberParam(searchParams.get("page"), 1));
  const [currentIndex, setCurrentIndex] = useState(initialPage - 1);
  const [slideSets, setSlideSets] = useState<LessonSlideSets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setSlideSets(null);
    setLoadError(null);

    fetch(`${API_BASE_URL}/lectures/slides?level=${encodeURIComponent(level)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || "교안 데이터를 불러오지 못했습니다.");
        }

        return response.json() as Promise<LessonSlideSets>;
      })
      .then((data) => {
        if (active) setSlideSets(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "교안 데이터를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, [level]);

  useEffect(() => {
    setCurrentIndex(initialPage - 1);
  }, [initialPage, lessonKey]);

  const slideSet = slideSets?.[lessonKey];

  const safeIndex = useMemo(() => {
    if (!slideSet?.slides.length) return 0;
    return Math.max(0, Math.min(slideSet.slides.length - 1, currentIndex));
  }, [currentIndex, slideSet]);

  useEffect(() => {
    if (!slideSet) return;
    setLessonProgress(level, week, lesson, getLessonProgress(level, week, lesson), slideSet.title);
  }, [level, week, lesson, slideSet]);

  if (!slideSets && !loadError) {
    return (
      <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
        <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
          <AppHeader />
          <LessonTopBar level={level} week={week} lesson={lesson} title="학습" />
          <section className="px-4 py-6">
            <div className="rounded-[5px] bg-[var(--color-white)] p-5 typo-body-16-r text-[var(--color-gray-70)]">
              {"교안 데이터를 불러오는 중입니다."}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
        <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
          <AppHeader />
          <LessonTopBar level={level} week={week} lesson={lesson} title="학습" />
          <section className="px-4 py-6">
            <div className="rounded-[5px] bg-[var(--color-white)] p-5 typo-body-16-r text-[var(--color-gray-70)]">
              {loadError}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!slideSet) {
    return (
      <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
        <div className="web-mobile-frame mx-auto min-h-screen w-full max-w-[430px] md:max-w-[720px]">
          <AppHeader />
          <LessonTopBar level={level} week={week} lesson={lesson} title="학습" />
          <section className="px-4 py-6">
            <div className="rounded-[5px] bg-[var(--color-white)] p-5 typo-body-16-r text-[var(--color-gray-70)]">
              {"아직 등록된 교안이 없습니다."}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const slide = slideSet.slides[safeIndex];
  const currentPage = safeIndex + 1;
  const totalPages = slideSet.slides.length;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < totalPages - 1;
  const lessonTopic = getTopicFromFirstSlide(slideSet.slides[0]?.content) ?? slideSet.title;
  const tagText = `${week}주차-${lesson}차시-${slideSet.title}`;
  const isDailyQuizSlide = slide.title.includes("일일 퀴즈") && !slide.title.includes("정답");
  const answerSlide = isDailyQuizSlide
    ? slideSet.slides.find((candidate) => candidate.page === slide.page + 1 && candidate.title.includes("정답"))
    : undefined;
  const quizQuestions = isDailyQuizSlide ? parseQuizQuestions(slide.content, answerSlide?.content) : [];
  const pronunciationSlide = isDailyQuizSlide
    ? (slideSet.slides.find((candidate) => candidate.page === slide.page + 2 && candidate.title.includes("발음")) ??
      slideSet.slides.find((candidate) => candidate.title.includes("발음")))
    : undefined;
  const practiceTexts = parsePronunciationPracticeTexts(pronunciationSlide?.content);

  if (isDailyQuizSlide && quizQuestions.length > 0) {
    return <DailyQuizScreen level={level} week={week} lesson={lesson} lessonTitle={slideSet.title} questions={quizQuestions} practiceTexts={practiceTexts} />;
  }

  const goPrev = () => {
    if (!canPrev) return;
    setCurrentIndex((index) => index - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    if (!canNext) return;
    setCurrentIndex((index) => index + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen web-screen-bg text-[var(--color-gray-100)]">
      <div className="web-mobile-frame mx-auto flex min-h-screen w-full max-w-[430px] md:max-w-[720px] flex-col">
        <AppHeader />
        <LessonTopBar level={level} week={week} lesson={lesson} title={lessonTopic} />

        <div className="px-[30px] md:px-10 pb-0 pt-6">
          <ProgressCard current={currentPage} total={totalPages} />

          <section className="mt-5 h-[var(--study-card-height)] overflow-y-auto rounded-[5px] bg-[var(--color-white)] px-6 py-6">
            <div className="mb-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-[28px] w-[55px] items-center justify-center rounded-[7px] bg-[var(--color-point-10)] typo-sub-16-b text-[var(--color-point-90)]">
                  {level.replace(" ", "")}
                </span>
                <span className="flex h-[28px] min-w-[72px] items-center justify-center rounded-[7px] bg-[var(--color-point-10)] px-4 typo-sub-16-b text-[var(--color-point-90)]">
                  학습
                </span>
              </div>
              <span className="inline-flex h-[28px] items-center justify-center rounded-[7px] bg-[var(--color-point-10)] px-4 typo-sub-16-b text-[var(--color-point-90)]">
                {tagText}
              </span>
            </div>

            <h2 className="mb-2 typo-tit-20-sb text-[var(--color-gray-100)]">{slide.title}</h2>

            <LessonImage key={`${level}-${slide.image}`} level={level} image={slide.image} alt={slide.title} />

            <TextBlock content={slide.content} />

            <div className="mt-9 space-y-3">
              <FoldButton title="AI 스크립트 보기">
                {slide.script || "등록된 AI 스크립트가 없습니다."}
              </FoldButton>
              <FoldButton title="단어장 보기">
                <VocabularyBlock content={slide.vocabulary || ""} />
              </FoldButton>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-[#EEF2F6] px-[30px] md:px-10 pb-5 pt-5">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="flex h-[44px] items-center justify-center gap-3 rounded-[5px] bg-[var(--color-white)] typo-but-16-b text-[var(--color-gray-100)] shadow-[0_0_0_1px_var(--color-gray-stroke)] disabled:opacity-40"
          >
            <ChevronLeftIcon />
            이전
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="flex h-[44px] items-center justify-center gap-3 rounded-[5px] bg-[var(--color-primary-50)] typo-but-16-b text-[var(--color-white)] disabled:opacity-40"
          >
            다음
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </main>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen web-screen-bg" />}>
      <StudyContent />
    </Suspense>
  );
}













