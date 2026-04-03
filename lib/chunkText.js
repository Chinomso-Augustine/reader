export function chunkText(text, maxChars = 900) {
  if (!text) return [];
  const cleaned = text
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.length <= maxChars) {
      chunks.push(paragraph);
      return;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let current = "";

    sentences.forEach((sentence) => {
      if ((current + " " + sentence).trim().length > maxChars) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current = (current + " " + sentence).trim();
      }
    });

    if (current) chunks.push(current.trim());
  });

  return chunks.filter(Boolean);
}
