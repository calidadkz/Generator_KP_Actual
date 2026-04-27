import { useEffect, useState } from 'react';
import { useSalesStore } from '../store/useSalesStore';
import {
  syncFromCloud,
  uploadToCloud,
  updateInCloud,
  deleteFromCloud,
  fetchBatchInsights,
} from '../lib/dialogueCloud';
import { DialogueRecord } from '../types';
import { resolveDialogueTexts } from '../lib/dialogueStorage';

/**
 * Hook to manage cloud synchronization for Sales module
 * Syncs dialogues and batch insights between Firestore and local Zustand store
 */
export function useCloudSync() {
  const { dialogues, setDialogues, updateDialogue, deleteDialogue, setBatchInsights } =
    useSalesStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * Fetch all dialogues from Firestore and hydrate store at app startup
   */
  const syncDialoguesFromCloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const cloudDialogues = await syncFromCloud();
      if (cloudDialogues.length > 0) {
        // Merge with local dialogues: cloud version takes precedence for matching IDs
        const merged = dialogues.map((local) => {
          const cloud = cloudDialogues.find((c) => c.id === local.id);
          return cloud ? { ...local, ...cloud } : local;
        });
        // Add any cloud dialogues not in local store
        const newFromCloud = cloudDialogues.filter((c) => !dialogues.some((l) => l.id === c.id));
        setDialogues([...merged, ...newFromCloud]);
        console.log(`Synced ${cloudDialogues.length} dialogues from Firestore`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to sync dialogues: ${msg}`);
      console.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Upload a new dialogue to Firestore (called after file upload + initial processing)
   */
  const pushDialogueToCloud = async (dialogue: DialogueRecord) => {
    try {
      // Fetch texts from IndexedDB if available
      let texts: { rawText: string; cleanedText: string } | null = null;
      if (dialogue.textRef) {
        texts = await resolveDialogueTexts(dialogue.textRef);
      }

      if (texts) {
        await uploadToCloud(dialogue, texts);
      } else {
        // Upload metadata without texts if texts not found locally
        const recordWithoutTexts = { ...dialogue };
        // @ts-ignore — uploadToCloud handles undefined texts
        await uploadToCloud(recordWithoutTexts, { rawText: '', cleanedText: '' });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to upload dialogue: ${msg}`);
      console.error(msg);
    }
  };

  /**
   * Update dialogue in Firestore (called when user edits, marks clean, tags machine type, etc.)
   */
  const syncDialogueUpdate = async (id: string, patch: Partial<DialogueRecord>) => {
    try {
      await updateInCloud(id, patch);
      updateDialogue(id, patch);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to update dialogue: ${msg}`);
      console.error(msg);
      throw error;
    }
  };

  /**
   * Delete dialogue from Firestore
   */
  const deleteDialogueFromCloud = async (id: string) => {
    try {
      await deleteFromCloud(id);
      deleteDialogue(id);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to delete dialogue: ${msg}`);
      console.error(msg);
      throw error;
    }
  };

  /**
   * Fetch batch insights from Firestore
   */
  const loadBatchInsights = async () => {
    try {
      const insights = await fetchBatchInsights();
      setBatchInsights(insights);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to fetch insights: ${msg}`);
      console.error(msg);
    }
  };

  /**
   * Sync on mount (app startup)
   */
  useEffect(() => {
    syncDialoguesFromCloud();
    loadBatchInsights();
  }, []);

  return {
    isSyncing,
    syncError,
    syncDialoguesFromCloud,
    pushDialogueToCloud,
    syncDialogueUpdate,
    deleteDialogueFromCloud,
    loadBatchInsights,
  };
}
