"use client";

import { useEffect, useRef, useState } from "react";

export default function AudioPlayer({
  chunks,
  currentIndex,
  setCurrentIndex,
  isPlaying,
  setIsPlaying,
  isPaused,
  setIsPaused,
  rate,
  setRate,
  volume,
  setVolume,
  voiceURI,
  setVoiceURI,
  onError
}) {
  const utteranceRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [isSupported, setIsSupported] = useState(true);

  const total = chunks.length;
  const progress = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
      onError?.("Your browser does not support the Web Speech API.");
      return;
    }
    const load = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (!voiceURI && available.length > 0) {
        setVoiceURI(available[0].voiceURI);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [setVoiceURI, voiceURI]);

  const speakChunk = (index) => {
    if (!chunks[index]) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.volume = volume;

    utterance.onend = () => {
      const nextIndex = index + 1;
      if (nextIndex < chunks.length) {
        setCurrentIndex(nextIndex);
        speakChunk(nextIndex);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onError?.("Speech synthesis failed. Try a different voice or reload.");
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const startPlayback = (startIndex = 0) => {
    if (!chunks.length) return;
    if (!isSupported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    setIsPaused(false);
    speakChunk(startIndex);
  };

  const handlePlay = () => {
    if (!isSupported) return;
    if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    if (!isPlaying) {
      startPlayback(currentIndex);
    }
  };

  const handlePause = () => {
    if (!isSupported) return;
    if (!isPlaying || isPaused) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleSkip = (direction) => {
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      Math.max(chunks.length - 1, 0)
    );
    if (!chunks.length) return;
    startPlayback(nextIndex);
  };

  useEffect(() => {
    if (!isPlaying || isPaused || !chunks.length) return;
    // Restart playback with updated settings.
    startPlayback(currentIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, volume, voiceURI]);

  return (
    <section className="sticky bottom-4 z-20 rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur dark:bg-slate-900/90">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Now Reading</p>
            <h3 className="text-lg font-semibold">
              {chunks.length ? `Chunk ${currentIndex + 1} of ${chunks.length}` : "Upload a PDF to start"}
            </h3>
            {!isSupported && (
              <p className="mt-1 text-xs text-rose-500">
                Web Speech API not supported in this browser.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSkip(-1)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              disabled={!chunks.length || !isSupported}
              aria-label="Skip backward"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePlay}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900"
              disabled={!chunks.length || !isSupported}
              aria-label="Play or resume"
            >
              {isPlaying && !isPaused ? "Playing" : isPaused ? "Resume" : "Play"}
            </button>
            <button
              type="button"
              onClick={handlePause}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              disabled={!isPlaying || isPaused || !isSupported}
              aria-label="Pause"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              disabled={!isPlaying || !isSupported}
              aria-label="Stop"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => handleSkip(1)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              disabled={!chunks.length || !isSupported}
              aria-label="Skip forward"
            >
              Next
            </button>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="progress-gradient h-full transition-all"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Rate
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.1"
              value={rate}
              onChange={(event) => setRate(parseFloat(event.target.value))}
              className="w-full"
              disabled={!isSupported}
            />
            <span className="text-sm font-medium normal-case text-slate-600 dark:text-slate-300">
              {rate.toFixed(1)}x
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(event) => setVolume(parseFloat(event.target.value))}
              className="w-full"
              disabled={!isSupported}
            />
            <span className="text-sm font-medium normal-case text-slate-600 dark:text-slate-300">
              {Math.round(volume * 100)}%
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Voice
            <select
              value={voiceURI}
              onChange={(event) => setVoiceURI(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              disabled={!isSupported}
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
