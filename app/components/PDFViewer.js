"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

const PDFJS_VERSION = "4.4.168";

export default function PDFViewer({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(520);
  const containerRef = useRef(null);

  const fileUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
  }, []);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 520;
      setPageWidth(Math.min(width - 32, 560));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setPageNumber(1);
  };

  const canGoBack = pageNumber > 1;
  const canGoForward = numPages ? pageNumber < numPages : false;

  if (!fileUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        Upload a PDF to preview it here.
      </div>
    );
  }

  return (
    <section className="rounded-3xl bg-white/80 p-4 shadow-lg dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
        <span>
          Page {pageNumber} {numPages ? `of ${numPages}` : ""}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => canGoBack && setPageNumber((prev) => prev - 1)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            disabled={!canGoBack}
            aria-label="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => canGoForward && setPageNumber((prev) => prev + 1)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            disabled={!canGoForward}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-4 flex justify-center overflow-auto rounded-2xl bg-white p-4 dark:bg-slate-950"
      >
        <Document file={fileUrl} onLoadSuccess={onLoadSuccess}>
          <Page pageNumber={pageNumber} width={pageWidth} />
        </Document>
      </div>
    </section>
  );
}
