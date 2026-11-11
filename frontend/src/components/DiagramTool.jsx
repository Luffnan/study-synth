import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertCircle, Crop, Image } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { apiFetch } from '../lib/api.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── Main component ────────────────────────────────────────────────────────────

export default function DiagramTool({ noteId, sourceFiles, onSave, onClose }) {
  const [phase, setPhase] = useState('scanning'); // scanning | cropping | placing | confirming | saving | done
  const [pdfFile, setPdfFile] = useState(null);       // selected source file
  const [diagramPages, setDiagramPages] = useState([]); // indices of pages with diagrams
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [scanError, setScanError] = useState(null);

  const [currentPageIdx, setCurrentPageIdx] = useState(0); // index into diagramPages
  const [crops, setCrops] = useState([]); // { base64, pageNum } per kept crop
  const [placements, setPlacements] = useState([]); // { base64, topic, caption } after placing
  const [savingError, setSavingError] = useState(null);

  // Pick a PDF source file (use first PDF found)
  useEffect(() => {
    const pdf = sourceFiles?.find(f => f.mime_type === 'application/pdf' || f.file_name?.endsWith('.pdf'));
    if (pdf) setPdfFile(pdf);
  }, [sourceFiles]);

  // ── Phase: scanning ──────────────────────────────────────────────────────────

  async function startScan() {
    if (!pdfFile) return;
    setScanError(null);
    setScanProgress({ done: 0, total: 0 });

    let pdfDoc;
    try {
      const proxyUrl = `/api/notes/${noteId}/source-files?action=proxy&path=${encodeURIComponent(pdfFile.storage_path)}`;
      const res = await apiFetch(proxyUrl);
      if (!res.ok) throw new Error('Could not load PDF');
      const buffer = await res.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
    } catch (err) {
      setScanError(err.message);
      return;
    }

    const total = pdfDoc.numPages;
    setScanProgress({ done: 0, total });
    const withDiagrams = [];

    // Batch 5 pages at a time to avoid memory spikes
    for (let i = 0; i < total; i += 5) {
      const batch = [];
      for (let j = i; j < Math.min(i + 5, total); j++) {
        batch.push(j + 1); // 1-indexed
      }

      await Promise.all(batch.map(async (pageNum) => {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

          const scanRes = await apiFetch(`/api/notes/${noteId}/diagram?action=scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageImage: base64 }),
          });
          const { hasDiagram } = await scanRes.json();
          if (hasDiagram) withDiagrams.push(pageNum);
        } catch { /* skip page on error */ }
      }));

      setScanProgress(prev => ({ ...prev, done: Math.min(prev.done + batch.length, total) }));
    }

    withDiagrams.sort((a, b) => a - b);
    if (withDiagrams.length === 0) {
      setScanError('No diagram pages were found in this PDF.');
      return;
    }

    setDiagramPages(withDiagrams);
    setCurrentPageIdx(0);
    setPhase('cropping');
  }

  // ── Phase: cropping ──────────────────────────────────────────────────────────

  function handleCropDone(base64, pageNum) {
    setCrops(prev => [...prev, { base64, pageNum }]);
  }

  function handleSkipPage() {
    if (currentPageIdx < diagramPages.length - 1) {
      setCurrentPageIdx(prev => prev + 1);
    } else {
      if (crops.length === 0) {
        setScanError('No diagrams were selected.');
        setPhase('scanning');
        return;
      }
      setPhase('placing');
    }
  }

  function handleKeepCrop(base64) {
    handleCropDone(base64, diagramPages[currentPageIdx]);
    if (currentPageIdx < diagramPages.length - 1) {
      setCurrentPageIdx(prev => prev + 1);
    } else {
      setPhase('placing');
    }
  }

  // ── Phase: placing ──────────────────────────────────────────────────────────

  async function runPlacements() {
    const results = await Promise.all(crops.map(async (crop) => {
      try {
        const res = await apiFetch(`/api/notes/${noteId}/diagram?action=place`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cropImage: crop.base64 }),
        });
        const data = await res.json();
        return { base64: crop.base64, topic: data.topic, caption: data.caption };
      } catch {
        return { base64: crop.base64, topic: '', caption: '' };
      }
    }));
    setPlacements(results);
    setPhase('confirming');
  }

  // ── Phase: confirming ────────────────────────────────────────────────────────

  async function handleSave(confirmedPlacements) {
    setPhase('saving');
    setSavingError(null);
    try {
      const res = await apiFetch(`/api/notes/${noteId}/diagram?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placements: confirmedPlacements }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPhase('done');
      setTimeout(() => {
        onSave(data.notes);
        onClose();
      }, 1200);
    } catch (err) {
      setSavingError(err.message);
      setPhase('confirming');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && phase !== 'saving') onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Crop className="w-4 h-4 text-ink-500" />
            <span className="font-700 text-ink-900 text-base">Add diagrams</span>
            {phase !== 'scanning' && phase !== 'done' && (
              <span className="text-xs text-ink-400 font-500">
                {phase === 'cropping' && `Page ${diagramPages[currentPageIdx]} of ${diagramPages.length} diagram pages`}
                {phase === 'placing' && 'Identifying topics…'}
                {phase === 'confirming' && `${placements.length} diagram${placements.length !== 1 ? 's' : ''} to save`}
                {phase === 'saving' && 'Saving…'}
              </span>
            )}
          </div>
          {phase !== 'saving' && (
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg leading-none">✕</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {phase === 'scanning' && (
            <ScanPhase
              pdfFile={pdfFile}
              sourceFiles={sourceFiles}
              onSelectFile={setPdfFile}
              onStart={startScan}
              progress={scanProgress}
              error={scanError}
            />
          )}
          {phase === 'cropping' && (
            <CropPhase
              noteId={noteId}
              storagePath={pdfFile.storage_path}
              pageNum={diagramPages[currentPageIdx]}
              pageIndex={currentPageIdx}
              totalPages={diagramPages.length}
              onKeep={handleKeepCrop}
              onSkip={handleSkipPage}
              cropsKept={crops.length}
            />
          )}
          {phase === 'placing' && (
            <PlacingPhase crops={crops} onReady={runPlacements} />
          )}
          {phase === 'confirming' && (
            <ConfirmPhase
              placements={placements}
              onSave={handleSave}
              error={savingError}
            />
          )}
          {(phase === 'saving' || phase === 'done') && (
            <SavingPhase done={phase === 'done'} count={placements.length} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Scan phase ────────────────────────────────────────────────────────────────

function ScanPhase({ pdfFile, sourceFiles, onSelectFile, onStart, progress, error }) {
  const pdfFiles = (sourceFiles || []).filter(f => f.mime_type === 'application/pdf' || f.file_name?.endsWith('.pdf'));
  const isScanning = progress.total > 0 && progress.done < progress.total;

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-ink-600">
        Select a PDF source file. Pages with diagrams will be identified and you can crop out the ones you want to include in your notes.
      </p>

      {pdfFiles.length > 1 && (
        <div>
          <p className="text-xs font-600 text-ink-400 uppercase tracking-wider mb-2">Select PDF</p>
          <div className="space-y-1.5">
            {pdfFiles.map(f => (
              <button key={f.id} onClick={() => onSelectFile(f)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  pdfFile?.id === f.id ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-300'
                }`}>
                <Image className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm font-500 text-ink-700 flex-1 truncate">{f.file_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pdfFiles.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          No PDF source files found. Upload a PDF first from the source files panel.
        </div>
      )}

      {isScanning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>Scanning pages for diagrams…</span>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
            <div className="bg-brand-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!pdfFile || isScanning}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-600 text-sm transition-all ${
          pdfFile && !isScanning ? 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
        }`}
      >
        {isScanning ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
        ) : (
          <><Crop className="w-4 h-4" /> Scan for diagrams</>
        )}
      </button>
    </div>
  );
}

// ── Crop phase ────────────────────────────────────────────────────────────────

function CropPhase({ noteId, storagePath, pageNum, pageIndex, totalPages, onKeep, onSkip, cropsKept }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selection, setSelection] = useState(null); // { x, y, w, h } in canvas coords
  const dragStart = useRef(null);
  const pdfPageRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    setRendered(false);
    setLoading(true);
    setError(null);
    setSelection(null);
    renderPage();
  }, [pageNum]); // eslint-disable-line react-hooks/exhaustive-deps

  async function renderPage() {
    try {
      const proxyUrl = `/api/notes/${noteId}/source-files?action=proxy&path=${encodeURIComponent(storagePath)}`;
      const res = await apiFetch(proxyUrl);
      if (!res.ok) throw new Error('Could not load PDF');
      const buffer = await res.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdfDoc.getPage(pageNum);

      const container = canvasRef.current?.parentElement;
      const maxWidth = container?.clientWidth || 600;
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min(maxWidth / baseVp.width, 1.5);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      pdfPageRef.current = page;
      viewportRef.current = viewport;
      setRendered(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getCanvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onMouseDown(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    dragStart.current = { x, y };
    setSelection(null);
  }

  function onMouseMove(e) {
    if (!dragStart.current) return;
    const { x, y } = getCanvasCoords(e);
    const sx = dragStart.current.x, sy = dragStart.current.y;
    setSelection({
      x: Math.min(sx, x),
      y: Math.min(sy, y),
      w: Math.abs(x - sx),
      h: Math.abs(y - sy),
    });
  }

  function onMouseUp() {
    dragStart.current = null;
  }

  function handleKeep() {
    if (!selection || selection.w < 10 || selection.h < 10) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = selection.w * scaleX;
    cropCanvas.height = selection.h * scaleY;
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(
      canvas,
      selection.x * scaleX, selection.y * scaleY,
      selection.w * scaleX, selection.h * scaleY,
      0, 0,
      cropCanvas.width, cropCanvas.height
    );
    const base64 = cropCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    onKeep(base64);
    setSelection(null);
  }

  const hasSelection = selection && selection.w > 10 && selection.h > 10;
  const overlayStyle = selection ? {
    left: selection.x,
    top: selection.y,
    width: selection.w,
    height: selection.h,
  } : {};

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">
          Draw a box around the diagram you want to keep. Skip if this page doesn't have one you need.
        </p>
        {cropsKept > 0 && (
          <span className="text-xs bg-green-100 text-green-700 font-600 px-2.5 py-1 rounded-full flex-shrink-0">
            {cropsKept} kept
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {rendered && (
        <div className="relative select-none" style={{ lineHeight: 0 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <canvas ref={canvasRef} className="w-full rounded-xl border border-ink-200 cursor-crosshair" />
          {selection && (
            <div
              ref={overlayRef}
              className="absolute border-2 border-brand-500 bg-brand-500/10 pointer-events-none"
              style={overlayStyle}
            />
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border-2 border-ink-200 text-ink-600 hover:border-ink-400 font-600 text-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronRight className="w-4 h-4" />
          {currentPageIdx === totalPages - 1 ? (cropsKept > 0 ? 'Skip, finish' : 'Skip') : 'Skip page'}
        </button>
        <button
          onClick={handleKeep}
          disabled={!hasSelection}
          className={`flex-1 py-2.5 rounded-xl font-600 text-sm transition-all flex items-center justify-center gap-1.5 ${
            hasSelection ? 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
          }`}
        >
          <Crop className="w-4 h-4" />
          Keep this diagram
        </button>
      </div>
    </div>
  );
}

// ── Placing phase ─────────────────────────────────────────────────────────────

function PlacingPhase({ crops, onReady }) {
  useEffect(() => {
    onReady();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center shadow-md">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
      <div>
        <p className="font-700 text-ink-900 text-sm">Identifying topics for {crops.length} diagram{crops.length !== 1 ? 's' : ''}…</p>
        <p className="text-xs text-ink-400 mt-1">Looking at each diagram and matching it to a topic in your notes</p>
      </div>
    </div>
  );
}

// ── Confirm phase ─────────────────────────────────────────────────────────────

function ConfirmPhase({ placements, onSave, error }) {
  const [items, setItems] = useState(placements);

  useEffect(() => {
    setItems(placements);
  }, [placements]);

  const allTopics = [...new Set(items.map(p => p.topic).filter(Boolean))];

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-ink-600">
        Review the topic assignments below. You can change where each diagram is placed or remove any you don't want.
      </p>

      {items.length === 0 && (
        <div className="text-center py-8 text-sm text-ink-400">
          All diagrams removed. Close this panel.
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} className="bg-ink-50 rounded-2xl border border-ink-200 overflow-hidden">
          <div className="relative">
            <img
              src={`data:image/png;base64,${item.base64}`}
              alt="Diagram crop"
              className="w-full object-contain max-h-48 bg-white"
            />
            <button
              onClick={() => removeItem(i)}
              className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-600 text-ink-500 uppercase tracking-wider block mb-1.5">Topic</label>
              <input
                type="text"
                value={item.topic}
                onChange={e => updateItem(i, 'topic', e.target.value)}
                className="w-full border border-ink-200 rounded-xl px-3 py-2 text-sm text-ink-800 bg-white focus:outline-none focus:border-brand-400"
                list={`topics-${i}`}
              />
              <datalist id={`topics-${i}`}>
                {allTopics.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-600 text-ink-500 uppercase tracking-wider block mb-1.5">Caption</label>
              <input
                type="text"
                value={item.caption}
                onChange={e => updateItem(i, 'caption', e.target.value)}
                className="w-full border border-ink-200 rounded-xl px-3 py-2 text-sm text-ink-800 bg-white focus:outline-none focus:border-brand-400"
                placeholder="Short description of this diagram"
              />
            </div>
          </div>
        </div>
      ))}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={() => onSave(items)}
        disabled={items.length === 0}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-600 text-sm transition-all ${
          items.length > 0 ? 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
        }`}
      >
        Save {items.length} diagram{items.length !== 1 ? 's' : ''} to notes
      </button>
    </div>
  );
}

// ── Saving phase ──────────────────────────────────────────────────────────────

function SavingPhase({ done, count }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center shadow-md">
        {done
          ? <CheckCircle className="w-6 h-6 text-green-400" />
          : <Loader2 className="w-6 h-6 text-white animate-spin" />
        }
      </div>
      <div>
        <p className="font-700 text-ink-900 text-sm">
          {done ? `${count} diagram${count !== 1 ? 's' : ''} saved!` : 'Saving diagrams…'}
        </p>
        <p className="text-xs text-ink-400 mt-1">
          {done ? 'Done, closing…' : 'Uploading and adding to your notes'}
        </p>
      </div>
    </div>
  );
}
