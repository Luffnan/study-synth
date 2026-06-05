import { useState, useRef, useCallback } from 'react';
import { FileText, Image, X, Loader2, AlertCircle, ArrowLeft, ArrowUp } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
};
const ACCEPTED_EXTS = Object.values(ACCEPTED).flat().join(',');

export default function UploadPage({ onNotes, onBack }) {
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
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const res = await fetch('/api/summarise', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onNotes(data.notes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">

      {/* Back */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
      )}

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink-900 mb-5 shadow-lg">
          <BrainLogo className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-800 text-ink-900 leading-tight mb-3">
          Upload your notes
        </h1>
        <p className="text-ink-500 text-base sm:text-lg max-w-sm mx-auto">
          PDFs or photos → structured study notes at 20% of the original length
        </p>
      </div>

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

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><p className="font-medium">Something went wrong</p><p className="text-red-600">{error}</p></div>
        </div>
      )}

      {/* Submit */}
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

      {loading && (
        <p className="text-center text-ink-400 text-sm mt-3">This may take 15–30 seconds</p>
      )}
    </div>
  );
}
