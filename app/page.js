"use client";

import { useEffect, useMemo, useState } from "react";
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

  const resetPlayback = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
  };

  const extractTextClient = async (nextFile) => {
    const pdfjs = await import("pdfjs-dist/build/pdf");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js";
    const data = await nextFile.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const pageTexts = [];
    setExtractProgress(0);
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      pageTexts.push(strings.join(" "));
      setExtractProgress(Math.round((pageNum / doc.numPages) * 100));
    }
    return { text: pageTexts.join("\n\n"), numPages: doc.numPages };
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
    setFile(nextFile);
    setFileName(nextFile.name);
    resetPlayback();

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to extract text.");
      }

      setExtractedText(data.text || "");
      setNumPages(data.numpages || null);
      setExtractProgress(100);
    } catch (err) {
      try {
        const fallback = await extractTextClient(nextFile);
        setExtractedText(fallback.text || "");
        setNumPages(fallback.numPages || null);
        setError("Server extraction failed; used browser fallback.");
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
                    <p>Extracting text… {extractProgress}%</p>
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
