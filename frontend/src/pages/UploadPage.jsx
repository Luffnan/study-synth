import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  async function handleSubmit() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
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
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Back link */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium mb-8">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          Back to dashboard
        </button>
      )}

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <Sparkles className="w-4 h-4" />
          Powered by Claude AI
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          Turn your notes into<br/>
          <span className="text-brand-600">focused study guides</span>
        </h1>
        <p className="text-slate-500 text-lg">
          Upload PDFs or photos of your notes. Get back concise, structured summaries at 20% of the original length.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${dragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTS}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragging ? 'text-brand-500' : 'text-slate-400'}`} />
        <p className="text-slate-700 font-medium text-lg">
          {dragging ? 'Drop files here' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-slate-400 text-sm mt-1">PDF, JPG, PNG, WEBP — up to 50 MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map(f => (
            <li key={f.name} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              {f.type === 'application/pdf'
                ? <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                : <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
              }
              <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!files.length || loading}
        className={`
          mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-lg transition-all
          ${files.length && !loading
            ? 'bg-brand-600 hover:bg-brand-700 shadow-md hover:shadow-lg active:scale-[0.98]'
            : 'bg-slate-300 cursor-not-allowed'
          }
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analysing your notes…
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Study Notes
          </>
        )}
      </button>

      {loading && (
        <p className="text-center text-slate-400 text-sm mt-3">
          This may take 15–30 seconds for larger files
        </p>
      )}
    </div>
  );
}
