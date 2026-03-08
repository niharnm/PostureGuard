# PostureGaurd

PostureGaurd is a hackathon-ready, real-time posture coaching app built with Next.js. The `Gaurd` spelling is intentional.

It now includes:
- Stronger calibration with quality checks
- Deviation-from-baseline posture scoring with temporal smoothing + hysteresis
- Confidence-aware tracking to reduce false BAD/WARN spikes
- Session insights and history
- In-app assistant **Victor** (Posture Coach) powered by OpenRouter-compatible API

## Updated Feature Set

1. Real-time webcam posture detection (MediaPipe)
2. Stable posture score (0-100) with GOOD/WARN/BAD state logic
3. Calibration capture over multiple frames with motion/visibility validation
4. Confidence filtering and tracking instability handling
5. Dominant-issue coaching tips (top 1-2 tips only)
6. Optional developer debug panel for baseline/live/deviation tuning
7. User authentication
8. Per-user calibration persistence
9. Session tracking + session summary
10. Session history trend dashboard
11. Victor chat assistant using structured app posture/session context
12. Optional Arduino integration (Web Serial protocol: GOOD/WARN/BAD/BREAK)

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- NextAuth
- Prisma + PostgreSQL
- MediaPipe Pose (`@mediapipe/tasks-vision`)
- OpenRouter-compatible chat completion API

## Project Structure

```txt
app/
  api/
    auth/[...nextauth]/route.ts
    signup/route.ts
    calibration/route.ts
    sessions/route.ts
    sessions/[id]/route.ts
    victor/route.ts
  layout.tsx
  page.tsx
  providers.tsx
components/
  AuthPanel.tsx
  LiveDashboard.tsx
  VictorPanel.tsx
  SessionControls.tsx
  SessionInsights.tsx
  SessionSummaryModal.tsx
  SessionHistoryPanel.tsx
  ArduinoCard.tsx
  Hero.tsx
  Footer.tsx
hooks/
  usePostureMonitor.ts
  useArduinoSerial.ts
lib/
  auth.ts
  api-auth.ts
  posture.ts
  prisma.ts
  serial.ts
  types.ts
prisma/
  schema.prisma
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` from `.env.example` and set values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-long-random-secret"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="openai/gpt-4o-mini"
```

Notes:
- Production deployments (including Vercel) must use PostgreSQL. SQLite local files are not reliable for serverless functions.
- For local development, use a Postgres instance (Docker, Neon, Supabase, Railway, etc.) and point `DATABASE_URL` to it.
- Leave Google vars empty if you only want email/password auth.
- For Google OAuth, create a Google Cloud OAuth client and add the exact NextAuth callback URL: `http://localhost:3000/api/auth/callback/google` for local development, plus your production callback URL `https://your-domain/api/auth/callback/google`.
- If Google shows "you don't have permission to sign in", the OAuth consent screen is usually still restricted. Use an `External` app, add your Google account under `Test users`, or publish the app.
- `OPENROUTER_API_KEY` is required for Victor responses.
- API keys are server-side only (`/api/victor`), never exposed in frontend code.

### 3. Generate Prisma client and create DB schema

```bash
npm run prisma:generate
npm run db:push
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Vercel Deployment (PostgreSQL Required)

1. Provision a PostgreSQL database (Neon/Supabase/Railway/managed Postgres).
2. In Vercel Project Settings -> Environment Variables, set:
   - `DATABASE_URL` to your Postgres connection string
   - `NEXTAUTH_URL` to your production domain (for example: `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`
   - any optional OAuth/OpenRouter keys you use
3. In Google Cloud Console, make sure the OAuth client allows:
   - Authorized JavaScript origin: your app origin, for example `https://your-app.vercel.app`
   - Authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
   - OAuth consent screen user type: `External`, with the intended accounts added as test users until the app is published
4. Push schema to the production database:
   - locally with production `DATABASE_URL`: `npm run prisma:generate && npm run db:push`
5. Deploy to Vercel.
6. After deploy, verify signup/login and session persistence in production.

## Posture Accuracy Improvements

### Calibration flow

1. Start monitoring
2. Click **Calibrate Posture**
3. Follow prompt: **"Sit in your ideal upright posture and hold still."**
4. App captures multiple frames for several seconds
5. Calibration succeeds only if:
   - Landmark confidence is high enough
   - Motion during capture is low enough
6. On success, baseline metrics are used for live posture scoring
7. If logged in, baseline is saved to your account

### Scoring and state stability

- Live frame metrics are converted to deviations from your calibrated baseline
- Weighted penalty model computes raw score
- Rolling smoothing window stabilizes score
- Hysteresis + persistence thresholds control GOOD/WARN/BAD transitions
- Recovery to GOOD requires sustained improvement
- Low-confidence frames are downweighted and can show **Tracking unstable**

### Coaching feedback

- Dominant issue detection drives coaching (forward head, shoulder imbalance, head tilt, torso lean)
- Only top 1-2 actionable tips are shown

### Debug metrics panel

Live dashboard includes a collapsible developer panel with:
- Baseline metrics
- Raw live metrics
- Deviations
- Metric penalties
- Raw/smoothed score
- Tracking confidence/stability
- Current state and dominant issue

## Victor (In-App Posture Coach)

Victor is embedded in dashboard UI and supports:
- Session summaries
- Score explanation
- Calibration guidance
- Trend comments based on recent sessions
- Actionable posture coaching

Victor guardrails:
- Stays within posture/session/calibration/product guidance scope
- Rejects unrelated chat
- Avoids medical diagnosis
- Uses structured app context passed from frontend

## Arduino Protocol (Official Firmware)

PostureGaurd's web app is aligned to the official Arduino firmware in [`arduino/postureguard.ino`](arduino/postureguard.ino).

Serial transport contract:
- Baud rate: `9600`
- Message framing: newline-terminated ASCII commands
- Accepted commands: `GOOD`, `WARN`, `BAD`, `BREAK`

Runtime behavior:
- App sends `GOOD` / `WARN` / `BAD` whenever posture state changes.
- App sends `BREAK` when prolonged BAD posture triggers the in-app warning banner.
- Firmware handles RGB fade transitions, BAD buzzer reminders, LCD messaging, and BREAK breathing-purple mode.
- `NO_PERSON` is not sent to hardware.

## Validation / Demo Test Plan

### A. Calibration quality test

1. Start monitoring and run calibration while sitting still upright
2. Confirm status transitions: `NOT_CALIBRATED -> CALIBRATING -> CALIBRATED`
3. Confirm success message appears
4. Re-run while moving or with poor lighting
5. Confirm rejection message: calibration failed and retry prompt

### B. GOOD/WARN/BAD transition test

1. Start with upright posture and hold for 5-10s (expect GOOD)
2. Slowly drift forward/lean to trigger WARN first
3. Sustain poor posture long enough to reach BAD
4. Brief spikes should not instantly flip state
5. Return upright and hold; state should recover gradually (BAD->WARN->GOOD)

### C. Tracking confidence test

1. Partially leave frame or reduce lighting
2. Confirm tracking becomes unstable
3. Confirm state/score do not aggressively oscillate
4. Re-enter clear frame and verify recovery

### D. Victor response test

1. Ask: "How did I do this session?"
2. Ask: "What should I improve?"
3. Ask: "Explain my posture score"
4. Ask unrelated question (e.g., sports); confirm Victor redirects to posture scope
5. Temporarily unset `OPENROUTER_API_KEY`; confirm safe configuration message

### E. Login vs demo mode

With login:
- Calibration persists after refresh
- Session history persists

Without login (demo mode):
- Calibration works in current session
- Session history is not persisted
- Victor still works with live/current session context

### F. With and without Arduino

Without Arduino:
- Full app works (posture, sessions, Victor)

With Arduino:
- Connect via Web Serial
- Verify posture state messages (`GOOD/WARN/BAD`) still send during live tracking
- Hold BAD posture until the prolonged-warning banner appears; verify `BREAK` behavior on device

## Notes

- Webcam permission is required.
- Web Serial is supported in Chromium-based desktop browsers.
- OpenRouter key is required only for Victor API calls.
