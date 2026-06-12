# ONUI Academy

한국어 학습용 15주 강의 사이트 입니다.

## 기술 스택

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, Uvicorn
- Database: SQLite (`backend/data/app.db`)
- Content: Excel (`openpyxl`)
- Pronunciation evaluation: SpeechPro

## 프로젝트 구조

```text
ONUI_ACADEMY/
├─ frontend/
│  ├─ app/
│  │  ├─ exam/
│  │  ├─ lesson/
│  │  ├─ levels/
│  │  ├─ login/
│  │  ├─ signup/
│  │  ├─ student_assignments/
│  │  └─ study/
│  ├─ public/
│  │  └─ images/
│  │     ├─ 초급1/초급2/중급1/중급2/고급1/고급2
│  ├─ src/
│  ├─ .env.local.example
│  └─ package.json
├─ backend/
│  ├─ app/
│  │  ├─ api/routes/
│  │  └─ core/
│  ├─ data/
│  │  ├─ lecture/
│  │  │  ├─ 컨텐츠_초급1.xlsx
│  │  │  └─ 컨텐츠_초급2.xlsx
│  │  └─ app.db
│  ├─ .env.example
│  └─ requirements.txt
└─ README.md
```

## 로컬 실행

### 요구 환경

- Node.js 20
- npm
- Python 3.11
- FFmpeg

### 1. 백엔드

`app.main`을 찾을 수 있도록 반드시 `backend` 폴더에서 실행합니다.

```powershell
cd C:\ONUI_ACADEMY\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install -r requirements.txt
Copy-Item .env.example .env

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

### 2. 프론트엔드

cd C:\ONUI_ACADEMY\frontend

Copy-Item .env.local.example .env.local
npm install
npm run dev -- --hostname 0.0.0.0
```

- 웹 화면: http://localhost:3000
- 프론트의 `/api/*` 요청은 `BACKEND_INTERNAL_URL`의 FastAPI 서버로 전달됩니다.

## 환경변수

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_INTERNAL_URL=http://localhost:8000
```

### `backend/.env`

```env
FRONTEND_ORIGINS=http://localhost:3000
FRONTEND_ORIGIN_REGEX=^https://.*\.ngrok-free\.dev$
JWT_SECRET_KEY=change-this-in-production
JWT_EXPIRE_MINUTES=120
```

SpeechPro 또는 FFmpeg 설정을 변경해야 할 때 다음 값을 추가할 수 있습니다.

```env
SPEECHPRO_ENGINE_URL=http://서버주소/speechpro
SPEECHPRO_SCORE_PATH=scorefile
SPEECHPRO_TIMEOUT_GTP=15
SPEECHPRO_TIMEOUT_MODEL=15
SPEECHPRO_TIMEOUT_SCORE=25
SPEECH_SCORE_BONUS=3.5
FFMPEG_BIN=ffmpeg
```

## 콘텐츠 관리

- 강의·요약·AI 스크립트·단어장: `backend/data/lecture/컨텐츠_초급1.xlsx`, `컨텐츠_초급2.xlsx`
- 강의 이미지: `frontend/public/images/초급1`, `frontend/public/images/초급2`
- Excel에 입력한 이미지 파일명과 실제 파일명이 정확히 일치해야 합니다.
- Excel을 변경한 뒤에는 백엔드를 다시 시작해 강의 캐시를 갱신합니다.
- 중간고사와 기말고사는 각 레벨 Excel의 해당 시험 시트에서 읽습니다.

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 레벨·주차·차시별 순차 학습 및 잠금 처리
- Excel 기반 강의 슬라이드, 강의 요약, AI 스크립트, 단어장
- 학습 진도 저장 및 최근 학습 이어보기
- 객관식 학습 점검과 SpeechPro 발음 평가
- 중간고사·기말고사 응시, 문제 목록, 제출 결과
- 모바일·태블릿 반응형 UI와 공통 헤더·사이드 메뉴

## 주요 API

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /lectures/slides`
- `GET /exams/questions`
- `POST /exams/submit`
- `POST /speech/evaluate`
- `GET /api/videos`
- `GET /api/videos/{video_id}`

## 빌드 확인

```powershell
cd C:\ONUI_ACADEMY\frontend
npm run build
```
