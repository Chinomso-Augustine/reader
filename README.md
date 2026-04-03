# PDF Reader TTS

Upload a PDF, preview the pages, and listen to the extracted text with browser-based text-to-speech.

## Features
- PDF upload with 10MB limit
- Server-side text extraction via `pdf-parse`
- Client-side PDF preview using `react-pdf`
- Sticky audio player with play, pause, resume, stop, skip
- Voice, rate, and volume controls
- Real-time chunk highlighting while reading
- Responsive layout + optional dark mode

## Local Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes
- Text-to-speech uses the Web Speech API. Voice availability depends on the browser and OS.
- PDF files are processed in memory for extraction and are not persisted to disk by default.
