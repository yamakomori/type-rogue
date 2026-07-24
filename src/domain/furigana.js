const KANJI_PATTERN = /^[\p{Script=Han}々〆ヵヶ]+$/u;
const TEXT_SEGMENT_PATTERN = /[\p{Script=Han}々〆ヵヶ]+|[^\p{Script=Han}々〆ヵヶ]+/gu;

function normalizeKana(text) {
  return [...text].map((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
      return String.fromCodePoint(codePoint - 0x60);
    }
    return character;
  }).join("");
}

export function splitFuriganaSegments(base, reading) {
  const segments = base.match(TEXT_SEGMENT_PATTERN) ?? [base];
  const normalizedReading = normalizeKana(reading);
  let readingIndex = 0;

  return segments.map((text, index) => {
    if (!KANJI_PATTERN.test(text)) {
      const normalizedText = normalizeKana(text);
      const textIndex = normalizedReading.indexOf(normalizedText, readingIndex);
      if (textIndex >= 0) readingIndex = textIndex + normalizedText.length;
      return { text };
    }

    const nextPlainText = segments[index + 1];
    if (!nextPlainText) {
      const segmentReading = reading.slice(readingIndex);
      readingIndex = reading.length;
      return { text, reading: segmentReading };
    }

    const boundary = normalizedReading.indexOf(normalizeKana(nextPlainText), readingIndex);
    if (boundary < 0) return { text };

    const segmentReading = reading.slice(readingIndex, boundary);
    readingIndex = boundary;
    return segmentReading ? { text, reading: segmentReading } : { text };
  });
}
