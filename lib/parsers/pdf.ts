/**
 * PDF text extraction using pdf-parse.
 * Runs server-side only.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Dynamic import to avoid bundling issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}
