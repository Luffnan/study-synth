# StudySynth — Technical Specification

## Overview

StudySynth is a web application that allows students to upload curriculum content (PDFs or photos of notes) and receive accurate, structured study notes summarised to approximately 20% of the source material. Notes are organised hierarchically by topic and subtopic, making them easy to revise from.

---

## Product Goals

- Reduce study prep time by automating note summarisation
- Preserve accuracy — only information present in the source material is included
- Present information in a logical, scannable hierarchy
- Persist notes so students can return to them at any time
- Support real-world input formats: typed PDFs, scanned documents, and handwritten note photos

---

## Current Scope (v1)

### File Ingestion
- Accepted formats: PDF (text-based and scanned), JPEG, PNG, WEBP, HEIC
- Up to 20 files per upload session, 50 MB per file
- PDFs are sent directly to Claude as base64-encoded documents (handles both text and scanned)
- Images are sent as base64-encoded vision inputs
- No preprocessing or OCR pipeline — Claude handles all reading

### Summarisation
- Model: `claude-opus-4-7`
- Target compression: ~20% of source material
- Output structure:
  - **Title** — inferred from content
  - **Topics** — top-level subject areas
  - **Subtopics** — nested under each topic
  - **Key points** — bullet points under each subtopic
  - **Key Terms** — glossary of important definitions
- Prompt instructs Claude to preserve definitions, formulas, dates, and named concepts verbatim
- Response returned as structured JSON

### Notes Display
- Collapsible topic/subtopic tree
- Key Terms glossary section
- Download as Markdown (`.md`)

### Dashboard
- Lists all past sessions with title, topic count, term count, source filenames, and timestamp
- Click any card to reopen full notes
- Delete individual sessions

### Persistence
- Notes stored in Supabase (Postgres) as JSONB
- Table: `notes` — id, created_at, file_names, title, topic_count, key_term_count, notes (full JSON)
- No user accounts yet — all notes are global to the deployment

---

## Technical Architecture

### Frontend
| Concern | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Hosting | Vercel (static) |

**Pages:**
- `DashboardPage` — notes history grid
- `UploadPage` — drag-and-drop file upload
- `NotesPage` — collapsible notes viewer + download

### Backend (Serverless)
| Concern | Technology |
|---|---|
| Runtime | Vercel Serverless Functions (Node.js) |
| File parsing | Formidable (multipart) |
| AI | Anthropic Claude API |
| Database | Supabase (Postgres via `@supabase/supabase-js`) |

**API Routes:**
| Method | Route | Description |
|---|---|---|
| POST | `/api/summarise` | Upload files, call Claude, save and return notes |
| GET | `/api/notes` | Fetch all note session summaries |
| GET | `/api/notes/[id]` | Fetch full notes for a session |
| DELETE | `/api/notes/[id]` | Delete a session |

### Repository Structure
```
study-synth/
├── api/                    # Vercel serverless functions
│   ├── summarise.js
│   └── notes/
│       ├── index.js
│       └── [id].js
├── frontend/               # React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   └── NotesPage.jsx
│   │   └── index.css
│   └── vite.config.js
├── lib/                    # Shared backend utilities
│   ├── supabase.js
│   └── store.js
├── vercel.json
├── package.json            # Root deps (API functions)
└── SPECIFICATION.md
```

### Infrastructure
| Service | Purpose | Plan |
|---|---|---|
| Vercel | Frontend hosting + serverless API | Hobby (Brain-Buffet team) |
| Supabase | Postgres database | Free tier (Asia-Pacific) |
| Anthropic | Claude API for summarisation | Pay-per-use |
| GitHub | Source control | `Luffnan/study-synth` |

---

## Known Limitations (v1)

| Issue | Impact | Resolution |
|---|---|---|
| Vercel Hobby 10s function timeout | Large PDFs may fail | Upgrade to Pro ($20/mo) or implement streaming |
| No user authentication | All notes visible to anyone with the URL | Add Supabase Auth (planned v2) |
| No Row Level Security | All DB rows accessible via anon key | Enable RLS when auth is added |
| No rate limiting | API could be abused | Add middleware when going multi-user |

---

## Planned Features (v2+)

### User Accounts
- Supabase Auth (email/password or Google OAuth)
- Each student sees only their own notes
- Row Level Security policies on the `notes` table
- User profile with usage stats

### Flashcard Mode
- Auto-generate Q&A flashcard sets from key terms and key points
- Interactive flip-card revision UI
- Track which cards have been reviewed

### Mobile Experience
- Optimised upload flow for phone cameras (capture note photos directly)
- Responsive notes viewer for on-the-go revision

### Note Management
- Rename sessions
- Tag/categorise by subject
- Search across all notes
- Merge multiple sessions

### Sharing
- Generate shareable read-only link for a notes session
- Export to PDF

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Vercel + local `.env` | Anthropic API key |
| `SUPABASE_URL` | Vercel + local `.env` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Vercel + local `.env` | Supabase anon/public key |

---

## Local Development

```bash
# Install dependencies
npm install && cd frontend && npm install

# Add environment variables
cp .env.example .env
# edit .env with your keys

# Run frontend (port 5173, proxies /api to port 3000)
cd frontend && npm run dev

# Run API locally via Vercel CLI (port 3000)
npx vercel dev
```

---

*Last updated: June 2026*
