import { apiFetch } from '../lib/api.js';
import { submitFiles } from '../lib/upload.js';
import { useState, useRef, useCallback } from 'react';
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

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">

      {/* Back */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
      )}

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink-900 mb-5 shadow-lg">
          <BrainLogo className="w-[21px] h-[21px] text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-800 text-ink-900 leading-tight mb-3">
          Create study notes
        </h1>
        <p className="text-ink-500 text-base sm:text-lg max-w-sm mx-auto">
          Upload documents or add a YouTube video — we'll turn it into structured notes
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-ink-100 rounded-2xl p-1 mb-6">
        <button
          onClick={() => setTab('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-all duration-200 ${
            tab === 'files' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          <ArrowUp className="w-4 h-4" /> Files
        </button>
        <button
          onClick={() => setTab('youtube')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-600 transition-all duration-200 ${
            tab === 'youtube' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          <Youtube className="w-4 h-4" /> YouTube
        </button>
      </div>

      {tab === 'files'
        ? <FilesPanel onNotes={onNotes} yearLevel={yearLevel} />
        : <YouTubePanel onNotes={onNotes} />
      }
    </div>
  );
}

// ── Files panel ───────────────────────────────────────────────────────────────

function FilesPanel({ onNotes, yearLevel }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    setLoading(true); setError(null);
    try {
      const res = await submitFiles(files, '/api/summarise', yearLevel ? { yearLevel } : {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/40'
          }
        `}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_EXTS} className="hidden"
          onChange={e => addFiles(e.target.files)} />
        <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors ${dragging ? 'bg-brand-500' : 'bg-ink-100'}`}>
          <ArrowUp className={`w-5 h-5 ${dragging ? 'text-white' : 'text-ink-500'}`} />
        </div>
        <p className="font-600 text-ink-700 mb-1">
          {dragging ? 'Drop to add' : 'Drag & drop or tap to browse'}
        </p>
        <p className="text-ink-400 text-sm">PDF · JPG · PNG · WEBP — up to 50 MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2 animate-slide-up">
          {files.map(f => (
            <li key={f.name} className="flex items-center gap-3 bg-white border border-ink-200 rounded-xl px-4 py-3 shadow-sm">
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

      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><p className="font-medium">Something went wrong</p><p className="text-red-600">{error}</p></div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!files.length || loading}
        className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-600 text-base transition-all duration-200
          ${files.length && !loading
            ? 'bg-ink-900 hover:bg-brand-600 shadow-md hover:shadow-lg active:scale-[0.98]'
            : 'bg-ink-200 text-ink-400 cursor-not-allowed'
          }`}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing your notes…</>
          : <><BrainLogo className="w-4 h-4" /> Generate Study Notes</>
        }
      </button>

      {loading && <p className="text-center text-ink-400 text-sm mt-3">This may take 15–30 seconds</p>}
    </>
  );
}

// ── YouTube panel ─────────────────────────────────────────────────────────────

function YouTubePanel({ onNotes }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!url.trim() || loading) return;
    setLoading(true); setError(null);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Info card */}
      <div className="bg-white border border-ink-200 rounded-2xl p-6 text-center mb-4 shadow-sm">
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
          disabled={loading}
          className="flex-1 py-4 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
        />
        {url && !loading && (
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

      {loading && (
        <div className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Fetching transcript and generating notes… this may take 30–45 seconds
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!url.trim() || loading}
        className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-600 text-base transition-all duration-200
          ${url.trim() && !loading
            ? 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg active:scale-[0.98]'
            : 'bg-ink-200 text-ink-400 cursor-not-allowed'
          }`}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing video…</>
          : <><Youtube className="w-4 h-4" /> Generate from Video</>
        }
      </button>
    </>
  );
}
