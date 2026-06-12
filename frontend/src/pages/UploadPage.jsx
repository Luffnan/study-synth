import { apiFetch } from '../lib/api.js';
import { submitFiles } from '../lib/upload.js';
import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Image, X, Loader2, AlertCircle, ArrowLeft, ArrowUp, Youtube, Link } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
};
const ACCEPTED_EXTS = Object.values(ACCEPTED).flat().join(',');

export default function UploadPage({ onNotes, onBack, yearLevel }) {
  const [tab, setTab] = useState('files'); // 'files' | 'youtube'
  const [loading, setLoading] = useState(false);
  // Lifted so state survives the ProcessingPanel swap (FilesPanel would remount otherwise)
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
        <ProcessingPanel />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">

      {/* Back */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
      )}

      {/* Hero */}
      <div className="text-center mb-6">
        <img src="/brain.png" alt="Brain Buffet" className="w-10 h-10 mb-3 mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-800 text-ink-900 leading-tight mb-1.5">
          Create study notes
        </h1>
        <p className="text-ink-400 text-sm max-w-xs mx-auto">
          Upload documents or add a YouTube video
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 border-2 transition-all duration-200 ${
            tab === 'files'
              ? 'bg-ink-900 border-ink-900 text-white shadow-hard-sm'
              : 'bg-white border-ink-900 text-ink-600 hover:bg-ink-50'
          }`}
        >
          <ArrowUp className="w-4 h-4" /> Files
        </button>
        <button
          onClick={() => setTab('youtube')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 border-2 transition-all duration-200 ${
            tab === 'youtube'
              ? 'bg-ink-900 border-ink-900 text-white shadow-hard-sm'
              : 'bg-white border-ink-900 text-ink-600 hover:bg-ink-50'
          }`}
        >
          <Youtube className="w-4 h-4" /> YouTube
        </button>
      </div>

      {tab === 'files'
        ? <FilesPanel onNotes={onNotes} yearLevel={yearLevel} onLoading={setLoading}
            files={files} setFiles={setFiles} error={fileError} setError={setFileError} />
        : <YouTubePanel onNotes={onNotes} onLoading={setLoading} />
      }
    </div>
  );
}

// ── Files panel ───────────────────────────────────────────────────────────────

function FilesPanel({ onNotes, yearLevel, onLoading, files, setFiles, error, setError }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => Object.keys(ACCEPTED).includes(f.type));
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  }, [addFiles]);

  async function handleSubmit() {
    if (!files.length) return;
    onLoading(true); setError(null);
    try {
      const res = await submitFiles(files, '/api/summarise', yearLevel ? { yearLevel } : {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onNotes(data);
    } catch (err) {
      onLoading(false);
      setError(err.message);
    }
  }

  return (
    <>
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-ink-300 bg-white hover:border-ink-900 hover:bg-ink-50'
          }
        `}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_EXTS} className="hidden"
          onChange={e => addFiles(e.target.files)} />
        <div className={`w-10 h-10 rounded-xl border-2 border-ink-900 mx-auto mb-3 flex items-center justify-center transition-colors ${dragging ? 'bg-ink-900' : 'bg-accent-yellow'}`}>
          <ArrowUp className={`w-5 h-5 ${dragging ? 'text-white' : 'text-ink-900'}`} />
        </div>
        <p className="font-700 text-ink-900 text-sm mb-1">
          {dragging ? 'Drop to add' : 'Drag & drop or tap to browse'}
        </p>
        <p className="text-ink-400 text-xs">PDF · JPG · PNG · WEBP — up to 50 MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2 animate-slide-up">
          {files.map(f => (
            <li key={f.name} className="flex items-center gap-3 bg-white border-2 border-ink-900 rounded-xl px-4 py-3">
              {f.type === 'application/pdf'
                ? <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                : <Image className="w-4 h-4 text-brand-500 flex-shrink-0" />
              }
              <span className="text-sm text-ink-700 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-ink-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={e => { e.stopPropagation(); setFiles(p => p.filter(x => x.name !== f.name)); }}
                className="text-ink-300 hover:text-red-400 transition-colors p-0.5 rounded flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.some(f => f.size > 20 * 1024 * 1024) && (
        <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <p>Large files may take longer to process. If you have trouble, try splitting the document into smaller sections.</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><p className="font-medium">Something went wrong</p><p className="text-red-600">{error}</p></div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!files.length}
        className={`mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-700 text-sm border-2 transition-all duration-200
          ${files.length
            ? 'bg-ink-900 border-ink-900 text-white shadow-hard hover:bg-brand-600 hover:border-brand-600 active:scale-[0.98]'
            : 'bg-ink-100 border-ink-200 text-ink-400 cursor-not-allowed'
          }`}
      >
        <><BrainLogo className="w-4 h-4" /> Generate Study Notes</>
      </button>
    </>
  );
}

// ── Processing panel ──────────────────────────────────────────────────────────

const PROCESSING_STEPS = [
  'Reading your document…',
  'Identifying key topics and concepts…',
  'Extracting the important details…',
  'Organising content into topics…',
  'Writing your study notes…',
  'Defining key terms and vocabulary…',
  'Structuring subtopics and bullet points…',
  'Checking coverage across all sections…',
  'Putting the finishing touches on your notes…',
  'Almost there — just reviewing everything…',
];

function ProcessingPanel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % PROCESSING_STEPS.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      {/* Animated brain */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-ink-900 flex items-center justify-center shadow-xl">
          <BrainLogo className="w-10 h-10 text-white" />
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-2xl bg-ink-900 opacity-20 animate-ping" />
      </div>

      <h2 className="text-xl font-800 text-ink-900 mb-2">Generating your notes</h2>

      {/* Rotating status line */}
      <p
        className="text-ink-500 text-sm h-6 transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {PROCESSING_STEPS[index]}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-ink-100 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-ink-900 rounded-full animate-progress-indeterminate" />
      </div>

      <p className="text-ink-300 text-xs mt-4">This usually takes 15–45 seconds</p>
    </div>
  );
}

// ── YouTube panel ─────────────────────────────────────────────────────────────

function YouTubePanel({ onNotes, onLoading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    onLoading(true); setError(null);
    try {
      const res = await apiFetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onNotes(data); // { notes, id }
    } catch (err) {
      onLoading(false);
      setError(err.message);
    }
  }

  return (
    <>
      {/* Info card */}
      <div className="bg-white border-2 border-ink-900 rounded-2xl p-6 text-center mb-4 shadow-hard-sm">
        <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center mx-auto mb-3">
          <Youtube className="w-6 h-6 text-white" />
        </div>
        <p className="font-600 text-ink-800 mb-1">Create notes from a YouTube video</p>
        <p className="text-ink-400 text-sm leading-relaxed">
          We'll extract the transcript, summarise the content into structured notes, and keep the video embedded with timecoded notes for quick reference
        </p>
      </div>

      {/* URL input */}
      <div className={`flex items-center gap-2 bg-white border-2 rounded-2xl px-4 transition-colors ${url ? 'border-brand-400' : 'border-ink-200'}`}>
        <Link className="w-4 h-4 text-ink-400 flex-shrink-0" />
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 py-4 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
        />
        {url && (
          <button onClick={() => setUrl('')} className="text-ink-300 hover:text-ink-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-ink-400 mt-2 ml-1">
        Supports youtube.com/watch, youtu.be, and embed URLs · Video must have captions enabled
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><p className="font-medium">Could not process video</p><p className="text-red-600">{error}</p></div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!url.trim()}
        className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-600 text-base transition-all duration-200
          ${url.trim()
            ? 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg active:scale-[0.98]'
            : 'bg-ink-200 text-ink-400 cursor-not-allowed'
          }`}
      >
        <><Youtube className="w-4 h-4" /> Generate from Video</>
      </button>
    </>
  );
}
