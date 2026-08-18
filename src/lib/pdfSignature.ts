const PDF_HEADER = '%PDF-';
const PDF_TRAILER = '%%EOF';
const HEADER_SCAN_BYTES = 1024;
const TRAILER_SCAN_BYTES = 1024;

/**
 * Cheap defense-in-depth against a spoofed `Content-Type` (the browser-supplied
 * `file.type` is client-controlled and trivially wrong). Checks for the PDF
 * magic bytes near the start, and `%%EOF` near the end, without doing a full
 * parse — per the PDF spec, both markers are only required to appear within
 * ~1024 bytes of the respective end, not at byte 0. This is not a substitute
 * for the real parse that `pdf-parse` does downstream in the ingestion worker
 * (a crafted file can pass this and still fail there) — it just closes the
 * trivial "rename a .exe to .pdf" spoof before anything is written to storage.
 */
export async function isPdf(file: File): Promise<boolean> {
  const [head, tail] = await Promise.all([
    file.slice(0, HEADER_SCAN_BYTES).arrayBuffer(),
    file.slice(Math.max(0, file.size - TRAILER_SCAN_BYTES)).arrayBuffer(),
  ]);

  const headText = Buffer.from(head).toString('latin1');
  const tailText = Buffer.from(tail).toString('latin1');

  return headText.includes(PDF_HEADER) && tailText.includes(PDF_TRAILER);
}
