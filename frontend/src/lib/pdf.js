import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

let pdfjsPromise = null;

// pdf.js is loaded on demand so it never runs when the app boots. The legacy
// build includes polyfills for older browsers, and the worker is bundled with
// the app instead of coming from a CDN.
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.min.mjs').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    });
    pdfjsPromise.catch(() => { pdfjsPromise = null; });
  }
  return pdfjsPromise;
}
