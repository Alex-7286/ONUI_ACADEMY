# ONUI_ACADEMY

Video learning platform scaffold with a DANO-style architecture.

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Mobile: React Native + Expo + TypeScript
- Backend: FastAPI (Python)
- API style: Frontend and backend are separated (`frontend/`, `backend/`)

## Project structure
```text
ONUI_ACADEMY/
  frontend/
    app/
    src/
    package.json
  mobile/
    App.tsx
    src/
    package.json
  backend/
    app/
      api/
      core/
      schemas/
    data/
    requirements.txt
```

## Run locally

### 1) Backend
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Frontend
```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Open:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### 3) Mobile app
```bash
cd mobile
npm install
npm run start
```

Use Expo Go for device testing, or open the iOS/Android simulators from Expo Dev Tools.
For browser preview, run `npm run web` from `mobile/` and open the local URL shown by Expo.

## API endpoints
- `GET /health`
- `GET /api/videos`
- `GET /api/videos/{video_id}`
