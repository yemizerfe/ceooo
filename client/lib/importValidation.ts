// client/lib/importValidation.ts
// =============================================================================
// Client-side guard for CSV / Excel imports
// =============================================================================
// The import endpoint accepts CSV and Excel only. Checking here means a user
// who picks a PDF or a PNG gets an immediate, specific error instead of a
// generic server failure after the upload has already happened.

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024; // keep in sync with the API's multer limit
export const IMPORT_ACCEPT = ".csv,.xlsx,.xls";

const OLE2_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .xls (BIFF)
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // .xlsx (OOXML zip)

export type ImportFileKind = "csv" | "excel";

export type ImportFileCheck =
  | { ok: true; kind: ImportFileKind }
  | { ok: false; reason: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Validate a file before uploading it as a CSV/Excel import.
 *
 * Checks the extension *and* the actual bytes, so a renamed PDF or an image
 * dropped on the picker is rejected with a useful message.
 */
export async function validateImportFile(file: File): Promise<ImportFileCheck> {
  if (!file || file.size === 0) {
    return { ok: false, reason: "That file is empty." };
  }

  if (file.size > IMPORT_MAX_BYTES) {
    return {
      ok: false,
      reason: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(IMPORT_MAX_BYTES)}.`,
    };
  }

  const ext = extensionOf(file.name);
  if (![".csv", ".xlsx", ".xls", ".txt"].includes(ext)) {
    return {
      ok: false,
      reason: `“${file.name}” is not a CSV or Excel file. Supported formats: .csv, .xlsx, .xls.`,
    };
  }

  // Read a small header slice — enough for magic bytes and delimiter sniffing.
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());

  if (ext === ".xlsx" && !startsWith(head, ZIP_MAGIC)) {
    return {
      ok: false,
      reason: `“${file.name}” has a .xlsx extension but is not a real Excel workbook.`,
    };
  }

  if (ext === ".xls" && !startsWith(head, OLE2_MAGIC)) {
    return {
      ok: false,
      reason: `“${file.name}” has a .xls extension but is not a real Excel file.`,
    };
  }

  if (ext === ".csv" || ext === ".txt") {
    // A CSV is text: a NUL byte in the header means it is binary, whatever the
    // extension claims.
    if (head.includes(0x00)) {
      return {
        ok: false,
        reason: `“${file.name}” looks like a binary file, not CSV text.`,
      };
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(head);
    const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";

    if (!firstLine.trim()) {
      return { ok: false, reason: `“${file.name}” has no header row.` };
    }

    const delimiters = [",", ";", "\t", "|"];
    const hasDelimiter = delimiters.some((d) => firstLine.includes(d));
    if (!hasDelimiter) {
      return {
        ok: false,
        reason: `“${file.name}” does not look like CSV — no column delimiter found in the first row.`,
      };
    }
  }

  return { ok: true, kind: ext === ".csv" || ext === ".txt" ? "csv" : "excel" };
}
