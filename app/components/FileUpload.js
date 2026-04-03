"use client";

import { useRef } from "react";

export default function FileUpload({
  onFileSelected,
  isLoading,
  error,
  fileName,
  maxSizeMb = 10
}) {
  const inputRef = useRef(null);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur dark:bg-slate-900/70">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Step 1
          </p>
          <h2 className="text-2xl font-semibold">Upload your PDF</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Max {maxSizeMb}MB. We parse the text on the server and keep your file in memory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleChange}
            aria-label="Upload PDF"
          />
          <button
            type="button"
            onClick={handlePick}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accentDark focus:outline-none focus:ring-4 focus:ring-sky-200"
            disabled={isLoading}
          >
            {isLoading ? "Processing…" : "Choose PDF"}
          </button>
          {fileName && (
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {fileName}
            </span>
          )}
        </div>

        {error && (
          <div
            className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
