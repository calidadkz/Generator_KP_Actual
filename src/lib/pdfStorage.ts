/**
 * pdfStorage.ts
 *
 * Stores PDF files as ArrayBuffer in IndexedDB (no base64 overhead).
 * localStorage / Zustand store only the short "idb://pdf-..." reference key.
 *
 * Usage:
 *   const ref = await savePdf(arrayBuffer);   // returns "idb://pdf-abc123"
 *   const buf  = await resolvePdf(ref);        // returns ArrayBuffer | null
 *   await deletePdf(ref);
 */

import { get, set, del } from 'idb-keyval';

const PDF_PREFIX = 'idb://pdf-';

/** Returns true if the value is an IndexedDB PDF reference key */
export const isPdfRef = (value: string): boolean =>
  typeof value === 'string' && value.startsWith(PDF_PREFIX);

/**
 * Saves an ArrayBuffer to IndexedDB.
 * Returns a short reference key like "idb://pdf-1713000000000-abc123".
 */
export const savePdf = async (buf: ArrayBuffer): Promise<string> => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ref = `${PDF_PREFIX}${id}`;
  await set(ref, buf);
  return ref;
};

/**
 * Resolves an idb://pdf-... reference to its ArrayBuffer.
 * Returns null if not found or ref is not a PDF ref.
 */
export const resolvePdf = async (ref: string): Promise<ArrayBuffer | null> => {
  if (!isPdfRef(ref)) return null;
  const stored = await get<ArrayBuffer>(ref);
  return stored ?? null;
};

/**
 * Deletes a PDF from IndexedDB by its reference key.
 * Safe to call with a non-pdf-ref string (no-op).
 */
export const deletePdf = async (ref: string): Promise<void> => {
  if (isPdfRef(ref)) {
    await del(ref);
  }
};
