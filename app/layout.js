import "./globals.css";

export const metadata = {
  title: "PDF Reader TTS",
  description: "Upload a PDF and listen to it with real-time controls."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
