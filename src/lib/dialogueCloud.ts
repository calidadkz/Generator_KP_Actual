import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { DialogueRecord, BatchInsights } from '../types';

const DIALOGUES_COLLECTION = 'processed_scripts';
const BATCH_INSIGHTS_COLLECTION = 'batch_insights';

/**
 * Fetch all dialogues from Firestore at app startup
 */
export async function syncFromCloud(): Promise<DialogueRecord[]> {
  try {
    const q = query(collection(db, DIALOGUES_COLLECTION), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    const dialogues: DialogueRecord[] = [];

    snapshot.forEach((docSnap) => {
      dialogues.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as DialogueRecord);
    });

    return dialogues;
  } catch (error) {
    console.error('Failed to sync dialogues from cloud:', error);
    return [];
  }
}

/**
 * Upload a new dialogue record to Firestore (called after file upload + cleaning)
 */
export async function uploadToCloud(
  record: DialogueRecord,
  dialogueTexts: { rawText: string; cleanedText: string }
): Promise<void> {
  try {
    const docRef = doc(db, DIALOGUES_COLLECTION, record.id);

    // Remove undefined values and text fields (Firestore doesn't allow undefined)
    const cleanRecord = Object.fromEntries(
      Object.entries(record)
        .filter(([, v]) => v !== undefined)
        .filter(([k]) => !['rawText', 'cleanedText', 'rawTextLegacy'].includes(k))
    ) as DialogueRecord;

    // Store metadata in Firestore (text stored separately in IndexedDB)
    await setDoc(docRef, cleanRecord);

    console.log(`Uploaded dialogue ${record.id} to Firestore`);
  } catch (error) {
    console.error(`Failed to upload dialogue ${record.id}:`, error);
    throw error;
  }
}

/**
 * Update an existing dialogue record (called when user edits, marks clean, tags machine type, etc.)
 */
export async function updateInCloud(id: string, patch: Partial<DialogueRecord>): Promise<void> {
  try {
    const docRef = doc(db, DIALOGUES_COLLECTION, id);
    await updateDoc(docRef, patch);
    console.log(`Updated dialogue ${id} in Firestore`);
  } catch (error) {
    console.error(`Failed to update dialogue ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a dialogue record from Firestore
 */
export async function deleteFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, DIALOGUES_COLLECTION, id);
    await deleteDoc(docRef);
    console.log(`Deleted dialogue ${id} from Firestore`);
  } catch (error) {
    console.error(`Failed to delete dialogue ${id}:`, error);
    throw error;
  }
}

/**
 * Save batch insights to Firestore (called after analyzing 5+ dialogues)
 */
export async function saveBatchInsights(insights: BatchInsights): Promise<void> {
  try {
    const docRef = doc(db, BATCH_INSIGHTS_COLLECTION, insights.id);
    await setDoc(docRef, insights);
    console.log(`Saved batch insights ${insights.id} to Firestore`);
  } catch (error) {
    console.error(`Failed to save batch insights:`, error);
    throw error;
  }
}

/**
 * Fetch all batch insights from Firestore
 */
export async function fetchBatchInsights(): Promise<BatchInsights[]> {
  try {
    const q = query(collection(db, BATCH_INSIGHTS_COLLECTION), orderBy('generatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const insights: BatchInsights[] = [];

    snapshot.forEach((docSnap) => {
      insights.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as BatchInsights);
    });

    return insights;
  } catch (error) {
    console.error('Failed to fetch batch insights:', error);
    return [];
  }
}
