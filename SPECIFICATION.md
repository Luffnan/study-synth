# Brain Buffet — Technical Specification

## Overview

Brain Buffet is a web application that helps students turn their study material into structured notes and quizzes. Students upload textbooks, lecture slides, handwritten notes, screenshots, or YouTube videos. Brain Buffet extracts the subject knowledge, organises it into topics and subtopics, identifies key terms, and generates quizzes — calibrated to the student's year level.

**Live URL:** https://brainbuffet.study  
**Repository:** https://github.com/Luffnan/study-synth  
**Hosting:** Vercel (Hobby, Brain-Buffet team)

---

## Product Goals

- Reduce study prep time by automating note summarisation
- Preserve accuracy — only information present in the source material is included (no hallucination)
- Present information in a logical, scannable hierarchy
- Support real-world input formats: PDFs, scanned documents, handwritten note photos, YouTube videos
- Calibrate language and depth to the student's year level
- Allow students to build up notes over time by adding sources to existing topics

---

## Tech Stack

### Frontend
| Concern | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Styling | Tailwind CSS (custom theme — brand red `#E22028`, navy `#1E4380`) |
| Font | Space Grotesk (Google Fonts) |
| Icons | Lucide React |
| Hosting | Vercel (static) |

### Backend
| Concern | Technology |
|---|---|
| Runtime | Vercel Serverless Functions (Node.js, ESM) |
| File parsing | Formidable (multipart/form-data) |
| Image compression | Sharp (resize images to <9 MB before sending to Claude) |
| AI | Anthropic Claude API (`claude-opus-4-7`, `max_tokens: 32000`, streaming) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password + Google OAuth) |
| File storage | Supabase Storage (`temp-uploads` bucket for large files, `diagrams` bucket for extracted diagram images) |

### Infrastructure
| Service | Purpose |
|---|---|
| Vercel | Frontend hosting + serverless API |
| Supabase | Postgres DB + Auth + Storage (Asia-Pacific region) |
| Anthropic | Claude API for summarisation, concise notes, quizzes |
| GitHub | Source control (`Luffnan/study-synth`) |
| Namecheap | Domain registrar (`brainbuffet.study`) |

---

## Repository Structure

```
study-synth/
├── api/                          # Vercel serverless functions
│   ├── summarise.js              # Upload files → generate notes
│   ├── youtube.js                # YouTube URL → generate notes or add video to topic
│   ├── lib/
│   │   ├── parse-files.js        # Unified file parser (FormData + Supabase Storage paths)
│   │   ├── year-level.js         # AI prompt modifier per year level
│   │   └── youtube-transcript.js # Transcript fetching + formatting
│   └── notes/
│       ├── index.js              # GET all notes for user
│       └── [id]/
│           ├── index.js          # GET/DELETE single note
│           ├── concise.js        # POST → generate concise version
│           ├── ingest.js         # POST → merge new files into existing note
│           └── merge-video.js    # POST → merge/unmerge video notes into topic notes
├── frontend/
│   ├── index.html                # Title, favicon, Google Fonts
│   ├── tailwind.config.js        # Theme config (THEME block at top for easy restyling)
│   ├── public/
│   │   ├── brain.png             # Site logo (black brain outline)
│   │   └── fork.png              # Landing page hero pill icon
│   └── src/
│       ├── App.jsx               # Root — session, routing, lifted state
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── AuthPage.jsx
│       │   ├── OnboardingPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── UploadPage.jsx
│       │   ├── NotesPage.jsx
│       │   ├── QuizPage.jsx
│       │   └── ProfilePage.jsx
│       ├── components/
│       │   └── BrainLogo.jsx     # SVG brain icon component
│       ├── lib/
│       │   ├── api.js            # apiFetch wrapper (attaches auth header)
│       │   ├── supabase.js       # Supabase client
│       │   ├── upload.js         # Smart file upload (FormData <4 MB, Supabase Storage >4 MB)
│       │   └── profile.js        # YEAR_LEVELS, yearLevelLabel, getProfile, saveProfile, searchSchools
│       └── utils/
│           └── generateDocx.js   # Client-side .docx generation
├── lib/
│   ├── supabase.js               # Server-side Supabase client
│   └── store.js                  # DB helpers: saveNote, getNoteById, updateNoteContent, addVideoSource
├── package.json                  # Root deps (API functions)
└── SPECIFICATION.md
```

---

## Pages

### LandingPage
Public marketing page. No AI mentions. Copy focuses on "your material, organised properly". Sections: hero, Why choose Brain Buffet, How it works, Works with anything, Feature list, CTA.

### AuthPage
Email/password sign up + sign in + Google OAuth. Redirects to Onboarding on first sign up.

### OnboardingPage
3-step flow: state selector → school search (Australian schools DB) → year level. Saves to `profiles` table. Can be skipped.

### DashboardPage
Grid of note cards grouped by subject. Subjects are colour-coded pills. Actions per card: open, move to subject, delete. "Upload Notes" and "New Subject" buttons in header.

### UploadPage
Files tab (drag & drop PDFs/images) and YouTube tab. Shows `ProcessingPanel` during generation (hides hero/tabs). On success, navigates to NotesPage.

### NotesPage
Two-column layout: sidebar (topic list + "Add source" button) + content pane.
- Standard / Concise mode toggle (concise generated on demand, cached in App state)
- Formula detection — inline monospace chip for equation-like bullet points
- Video sources panel with timecoded navigation and merge toggle
- Download modal (.docx or .md, select topics)
- "Add source" modal (files → ingest/merge, YouTube → add as new video source)
- Quiz button

### QuizPage
Generates questions from selected topics. Multiple choice, true/false, fill-in-the-blank, short answer. Auto-marked with feedback. Calibrated to year level.

### ProfilePage
Two tabs: Profile (name, email, school, year level dropdown) and Password. Year level affects language/depth of future note generation.

---

## Core Features

### File Upload & Processing
- Accepted: PDF, JPEG, PNG, WEBP, HEIC
- Files ≤4 MB → multipart FormData direct to API
- Files >4 MB → uploaded to Supabase Storage `temp-uploads`, signed URL passed to API, cleaned up after
- Images are compressed via Sharp before sending to Claude (max 9 MB, progressive resize + JPEG conversion)
- PDFs sent as base64 document blocks; images as base64 vision blocks

### Note Generation (`/api/summarise`)
- Model: `claude-opus-4-7`, `max_tokens: 32000`, streaming (`finalMessage()`)
- Target compression: ~30–35% of source
- Excludes: exam technique, study tips, activity/exercise instructions
- IMPORTANT DISTINCTION prompt: extracts the underlying concept from activity content rather than copying the task steps
- Returns JSON: `{ title, topics[{ name, subtopics[{ name, points[] }] }], keyTerms[{ term, definition }] }`
- Year level modifier prepended to system prompt (see below)

### Year Level Calibration
Values: `year7`, `year8`, `year9`, `year10`, `year11`, `year12`, `university`, `adult`
- Year 7–8: simple language, concrete examples, generous marking, warm feedback
- Year 9–10: moderate complexity, cause-effect, mix of recall and application
- Year 11–12: precise terminology, exam-ready depth, higher-order questions, exam-standard marking
- University: academic language, specialist depth, critical analysis
- Adult/Professional: clear, practical, real-world application focus

### Concise Notes (`/api/notes/[id]/concise`)
Generated on demand when user switches to Concise mode. Cached in App.jsx state — does not regenerate on tab switch. Invalidated when notes are updated (ingest or video merge).

### YouTube Integration (`/api/youtube`)
- `POST { url }` → creates new note from video transcript
- `POST { url, noteId }` → adds video as new source to existing note (no auto-merge)
- Returns structured notes + `videoNotes` (8–15 timecoded sections)
- Merge toggle in VideoPane integrates video notes into topic hierarchy

### Add Source to Existing Note
"Add source" button at top of sidebar in NotesPage.
- **Files** → `POST /api/notes/[id]/ingest` → merges new content using MERGE_PROMPT (adds subtopics/points, never removes existing content, deduplicates)
- **YouTube** → `POST /api/youtube` with `noteId` → adds video source, no auto-merge

### Subjects & Organisation
- Subjects stored in `subjects` table (user-scoped, colour-coded)
- Notes can be moved between subjects via dropdown in DashboardPage
- "New Subject" button top-right of dashboard

### Quiz Generation
- Questions generated from selected topic notes
- Types: multiple choice, true/false, fill-in-the-blank, short answer
- Auto-marked with feedback calibrated to year level
- Accessible via Quiz button in NotesPage header

### Download
- `.docx` — client-side via `generateDocx.js`
- `.md` — client-side markdown builder
- Selectable topics + key terms in download modal
- Standard or Concise version (if generated)

---

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/summarise` | Upload files → generate + save notes |
| POST | `/api/youtube` | YouTube URL → generate notes or add video to existing note |
| GET | `/api/notes` | Fetch all notes for authenticated user |
| GET | `/api/notes/[id]` | Fetch full note |
| DELETE | `/api/notes/[id]` | Delete note |
| POST | `/api/notes/[id]/concise` | Generate concise version |
| POST | `/api/notes/[id]/ingest` | Merge new files into existing note |
| POST | `/api/notes/[id]/merge-video` | Merge or unmerge video notes into topic notes |

All routes require `Authorization: Bearer <supabase_access_token>` header.

---

## Database Schema (Supabase Postgres)

### `notes`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| title | text | Inferred from content |
| notes | jsonb | Full notes JSON (topics, subtopics, keyTerms, videoSources) |
| file_names | text[] | Original filenames |
| subject_id | uuid | Foreign key → subjects (nullable) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `subjects`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| name | text | Subject name |
| color | text | Tailwind colour key |
| created_at | timestamptz | |

### `profiles`
| Column | Type | Description |
|---|---|---|
| id | uuid | Foreign key → auth.users |
| school_id | uuid | Foreign key → schools (nullable) |
| school_name_custom | text | Free-text school name (nullable) |
| year_level | text | e.g. `year11`, `university` |
| updated_at | timestamptz | |

### `schools`
Australian schools reference table: `id`, `name`, `suburb`, `state`, `sector`.

---

## Authentication

- Supabase Auth (email/password + Google OAuth)
- Email confirmation currently **disabled** (Supabase built-in SMTP unreliable — set up Resend SMTP for production)
- Google OAuth redirect URIs registered in Google Cloud Console: `https://brainbuffet.study/`, `https://gaxcxpglujzmsbwxghlb.supabase.co/auth/v1/callback`
- Supabase Site URL: `https://brainbuffet.study`
- Supabase Redirect URLs: `https://brainbuffet.study/**`
- All API routes check auth via `tryGetUserId(req)` before parsing body

---

## Theme

Configured in `frontend/tailwind.config.js` — single `THEME` block at top for easy restyling.

| Token | Value | Usage |
|---|---|---|
| `brand-500` | `#E22028` | Buttons, active states, highlights (Flavour United Red) |
| `ink-900` | `#1E4380` | Dark buttons, nav, header (Flavour United Navy) |
| `accent-yellow` | `#FBBA16` | Accent |
| `accent-teal` | `#9BCCD0` | Accent |
| Font | Space Grotesk | All text |

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Vercel env + local `.env` | Anthropic API key |
| `SUPABASE_URL` | Vercel env + local `.env` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Vercel env + local `.env` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env + local `.env` | Supabase service role key (server-side only) |

**Security:** API keys must never be pasted in chat. Keys go only in `backend/.env` (local) or Vercel environment variables dashboard. `.gitignore` excludes `.env`, `.env.local`, `backend/.env`.

---

## Local Development

```bash
# Install dependencies
npm install && cd frontend && npm install

# Add environment variables
cp .env.example .env
# Edit .env with your keys (never commit this file)

# Run frontend (port 5173, proxies /api to Vercel dev)
cd frontend && npm run dev

# Run API locally via Vercel CLI (port 3000)
npx vercel dev
```

---

## Known Issues / Deferred Features

| Item | Notes |
|---|---|
| Email verification | Supabase built-in SMTP rate-limited. Set up **Resend** SMTP for production email delivery (verification, password reset) |
| KaTeX / LaTeX equation rendering | Basic formula detection + monospace chip exists. Full KaTeX rendering deferred post-launch |
| Diagram extraction (Phase 2) | Phase 1 (images) is live. Phase 2: extend to PDFs via pdf.js page rendering |
| Sharing | Generate shareable read-only link for a notes session. Not yet built |
| PDF export | Export notes as PDF (currently .docx and .md only) |

---

*Last updated: June 2026*
