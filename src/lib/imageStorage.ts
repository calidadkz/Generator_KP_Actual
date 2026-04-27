/**
 * imageStorage.ts
 *
 * Thin wrapper over idb-keyval for storing large base64 blobs.
 * localStorage keys hold only a reference like "idb://img-<uuid>".
 * The actual binary data lives in IndexedDB (no 5 MB limit).
 *
 * Usage:
 *   const ref = await saveImage(base64DataUrl);   // returns "idb://img-abc123"
 *   const src  = await resolveImage(ref);          // returns original base64 / passthrough URL
 *   await deleteImage(ref);
 */

import { get, set, del } from 'idb-keyval';

const IDB_PREFIX = 'idb://';

/** Returns true if the value is an IndexedDB reference key */
export const isIdbRef = (value: string): boolean =>
  typeof value === 'string' && value.startsWith(IDB_PREFIX);

/**
 * Saves a base64 data URL (or any large string) to IndexedDB.
 * Returns a short reference key to store in localStorage/state.
 */
export const saveImage = async (dataUrl: string): Promise<string> => {
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ref = `${IDB_PREFIX}${id}`;
  await set(ref, dataUrl);
  return ref;
};

/**
 * Resolves a value to its actual src:
 * - If it's an idb:// reference → fetch from IndexedDB
 * - If it's already a data URL or HTTP URL → return as-is
 * - If empty → return empty string
 */
export const resolveImage = async (value: string): Promise<string> => {
  if (!value) return '';
  if (!isIdbRef(value)) return value;
  const stored = await get<string>(value);
  return stored ?? '';
};

/**
 * Deletes a blob from IndexedDB by its reference key.
 * Safe to call with a plain URL (no-op).
 */
export const deleteImage = async (ref: string): Promise<void> => {
  if (isIdbRef(ref)) {
    await del(ref);
  }
};

/**
 * Resolves all image fields in a CPBlockInstance data object.
 * Returns a new data object where idb:// refs are replaced with actual src.
 * Used before rendering/exporting to PDF.
 */
export const resolveBlockData = async (
  data: Record<string, string>
): Promise<Record<string, string>> => {
  const entries = await Promise.all(
    Object.entries(data).map(async ([key, value]) => [key, await resolveImage(value)])
  );
  return Object.fromEntries(entries);
};
