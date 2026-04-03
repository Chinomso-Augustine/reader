"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FileUpload from "./components/FileUpload";
import PDFViewer from "./components/PDFViewer";
import AudioPlayer from "./components/AudioPlayer";
import { chunkText } from "../lib/chunkText";

const MAX_BYTES = 10 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [chunks, setChunks] = useState([]);
  const [numPages, setNumPages] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voiceURI, setVoiceURI] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const extractStartRef = useRef(null);
  const [isPartial, setIsPartial] = useState(false);
  const [partialPages, setPartialPages] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem("pdfreader-dark");
    if (saved === "true") setDarkMode(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("pdfreader-dark", darkMode ? "true" : "false");
  }, [darkMode]);

  useEffect(() => {
    setChunks(chunkText(extractedText));
  }, [extractedText]);

  useEffect(() => {
    if (!isLoading || extractProgress <= 0 || extractProgress >= 100) {
      setEtaSeconds(null);
      return;
    }
    const start = extractStartRef.current;
    if (!start) return;
    const elapsedMs = Date.now() - start;
    const remainingMs = (elapsedMs * (100 - extractProgress)) / extractProgress;
    setEtaSeconds(Math.max(1, Math.round(remainingMs / 1000)));
  }, [extractProgress, isLoading]);

  const resetPlayback = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
  };

  const extractTextClient = async (nextFile, maxPages = 2) => {
    const pdfjs = await import("pdfjs-dist/build/pdf");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js";
    const data = await nextFile.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const pageTexts = [];
    extractStartRef.current = Date.now();
    setExtractProgress(0);
    const pagesToRead = Math.min(maxPages ?? doc.numPages, doc.numPages);
    for (let pageNum = 1; pageNum <= pagesToRead; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      pageTexts.push(strings.join(" "));
      setExtractProgress(Math.round((pageNum / pagesToRead) * 100));
    }
    return { text: pageTexts.join("\n\n"), numPages: doc.numPages, pagesToRead };
  };

  const handleFileSelected = async (nextFile) => {
    setError("");

    if (nextFile.size > MAX_BYTES) {
      setError("File exceeds 10MB size limit.");
      return;
    }

    if (!nextFile.type.includes("pdf")) {
      setError("Invalid file type. Please upload a PDF.");
      return;
    }

    setIsLoading(true);
    setExtractProgress(0);
    setEtaSeconds(null);
    extractStartRef.current = Date.now();
    setIsPartial(false);
    setPartialPages(0);
    setFile(nextFile);
    setFileName(nextFile.name);
    resetPlayback();

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to extract text.");
      }

      setExtractedText(data.text || "");
      setNumPages(data.numpages || null);
      setExtractProgress(100);
    } catch (err) {
      try {
        setError("Server is taking too long; loading the first 2 pages...");
        const fallback = await extractTextClient(nextFile, 2);
        setExtractedText(fallback.text || "");
        setNumPages(fallback.numPages || null);
        setIsPartial(fallback.pagesToRead < (fallback.numPages || 0));
        setPartialPages(fallback.pagesToRead || 0);
        setError("");
      } catch (fallbackErr) {
        setExtractedText("");
        setNumPages(null);
        setError(fallbackErr.message || "Failed to extract text.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const readingProgress = useMemo(() => {
    if (!chunks.length) return "0%";
    return `${Math.round(((currentIndex + 1) / chunks.length) * 100)}%`;
  }, [chunks.length, currentIndex]);

  const handleLoadFull = async () => {
    if (!file) return;
    setIsLoading(true);
    setExtractProgress(0);
    setEtaSeconds(null);
    extractStartRef.current = Date.now();
    try {
      const full = await extractTextClient(file, Number.MAX_SAFE_INTEGER);
      setExtractedText(full.text || "");
      setNumPages(full.numPages || null);
      setIsPartial(false);
      setPartialPages(0);
      setExtractProgress(100);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load full document.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-sky-100 px-6 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-500/20" />
        <div className="pointer-events-none absolute -right-16 top-32 h-40 w-40 rounded-full bg-blue-200/60 blur-3xl dark:bg-blue-500/20" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">PDF Reader</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Listen to your PDFs</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Upload a PDF, preview pages, and play it back with flexible voice controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </header>

        <main className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              error={error}
              fileName={fileName}
              maxSizeMb={10}
            />

            <div className="rounded-3xl bg-white/80 p-6 shadow-lg dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
                  <h2 className="text-2xl font-semibold">Extracted text</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  Progress {readingProgress}
                </span>
              </div>

              <div
                className="mt-4 max-h-80 space-y-3 overflow-auto pr-2 text-sm text-slate-700 scrollbar-thin dark:text-slate-200"
                aria-live="polite"
                tabIndex={0}
                aria-busy={isLoading}
              >
                {isLoading && (
                  <div className="space-y-2">
                    <p>
                      Extracting text… {extractProgress}%
                      {etaSeconds ? ` • ~${etaSeconds}s remaining` : ""}
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="progress-gradient h-full transition-all"
                        style={{ width: `${extractProgress}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                )}
                {!isLoading && !extractedText && (
                  <p className="text-slate-500">Upload a PDF to see the extracted text.</p>
                )}
                {!isLoading && isPartial && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    Loaded the first {partialPages} pages for faster start.
                    <button
                      type="button"
                      onClick={handleLoadFull}
                      className="ml-3 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800 transition hover:border-amber-400 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-100"
                    >
                      Load full document
                    </button>
                  </div>
                )}
                {chunks.map((chunk, index) => (
                  <p
                    key={`${index}-${chunk.slice(0, 12)}`}
                    className={`rounded-xl px-3 py-2 transition ${
                      index === currentIndex && isPlaying
                        ? "bg-sky-100 text-slate-900 dark:bg-sky-500/20 dark:text-white"
                        : "bg-transparent"
                    }`}
                  >
                    {chunk}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <PDFViewer file={file} />

            <div className="rounded-3xl bg-white/80 p-6 shadow-lg dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Details</p>
              <h2 className="text-2xl font-semibold">Reading status</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Pages</dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                    {numPages || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Chunks</dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                    {chunks.length || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Playback</dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isPlaying ? (isPaused ? "Paused" : "Playing") : "Stopped"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Rate</dt>
                  <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                    {rate.toFixed(1)}x
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </main>

        <div className="mx-auto mt-10 w-full max-w-6xl">
          <AudioPlayer
            chunks={chunks}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            rate={rate}
            setRate={setRate}
            volume={volume}
            setVolume={setVolume}
            voiceURI={voiceURI}
            setVoiceURI={setVoiceURI}
            onError={setError}
          />
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white/70 px-6 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
        Built with Next.js, Tailwind CSS, react-pdf, and the Web Speech API.
      </footer>
    </div>
  );
}
