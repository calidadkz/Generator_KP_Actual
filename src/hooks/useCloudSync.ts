import { useEffect, useState } from 'react';
import { useSalesStore } from '../store/useSalesStore';
import {
  syncFromCloud,
  uploadToCloud,
  updateInCloud,
  deleteFromCloud,
  fetchBatchInsights,
  fetchScriptNodes,
  fetchMicroPresentations,
  fetchMachineTypes,
  fetchArticles,
  fetchStyleDNA,
  fetchCleaningConfig,
  fetchFewShotExamples,
} from '../lib/dialogueCloud';
import { DialogueRecord } from '../types';
import { resolveDialogueTexts } from '../lib/dialogueStorage';

/**
 * Hook to manage cloud synchronization for Sales module
 * Syncs dialogues and batch insights between Firestore and local Zustand store
 */
export function useCloudSync() {
  const {
    dialogues, setDialogues, updateDialogue, deleteDialogue, setBatchInsights,
    _loadScriptNodes, _loadMicroPresentations, _loadMachineTypes,
    _loadArticles, _loadFewShotExamples, _loadCleaningConfig,
    setStyleDNA,
  } = useSalesStore();
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
   * Load all Sales module data from Firestore
   */
  const syncAllDataFromCloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Load all data in parallel
      const [
        cloudDialogues,
        insights,
        scriptNodes,
        microPresentations,
        machineTypes,
        articles,
        styleDNA,
        cleaningConfig,
        fewShotExamples,
      ] = await Promise.all([
        syncFromCloud(),
        fetchBatchInsights(),
        fetchScriptNodes(),
        fetchMicroPresentations(),
        fetchMachineTypes(),
        fetchArticles(),
        fetchStyleDNA(),
        fetchCleaningConfig(),
        fetchFewShotExamples(),
      ]);

      // Merge dialogues: cloud version takes precedence
      if (cloudDialogues.length > 0) {
        const merged = dialogues.map((local) => {
          const cloud = cloudDialogues.find((c) => c.id === local.id);
          return cloud ? { ...local, ...cloud } : local;
        });
        const newFromCloud = cloudDialogues.filter((c) => !dialogues.some((l) => l.id === c.id));
        setDialogues([...merged, ...newFromCloud]);
      }

      // Load other data if it exists in cloud
      if (scriptNodes.length > 0) {
        _loadScriptNodes(scriptNodes);
        console.log(`Synced ${scriptNodes.length} script nodes from Firestore`);
      }

      if (microPresentations.length > 0) {
        _loadMicroPresentations(microPresentations);
        console.log(`Synced ${microPresentations.length} micro presentations from Firestore`);
      }

      if (machineTypes.length > 0) {
        _loadMachineTypes(machineTypes);
        console.log(`Synced ${machineTypes.length} machine types from Firestore`);
      }

      if (insights.length > 0) {
        setBatchInsights(insights);
        console.log(`Synced ${insights.length} batch insights from Firestore`);
      }

      if (articles.length > 0) {
        _loadArticles(articles);
        console.log(`Synced ${articles.length} articles from Firestore`);
      }

      if (styleDNA) {
        setStyleDNA(styleDNA);
        console.log('Synced style DNA from Firestore');
      }

      if (cleaningConfig) {
        _loadCleaningConfig(cleaningConfig);
        console.log('Synced cleaning config from Firestore');
      }

      if (fewShotExamples.length > 0) {
        _loadFewShotExamples(fewShotExamples);
        console.log(`Synced ${fewShotExamples.length} few shot examples from Firestore`);
      }

      console.log('[Cloud Sync] ✓ All data synced from Firestore');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(`Failed to sync data: ${msg}`);
      console.error('[Cloud Sync] ✗ Error syncing data:', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Sync on mount (app startup) and add beforeunload handler for final sync
   */
  useEffect(() => {
    syncAllDataFromCloud();

    // Force final sync before page unload
    const handleBeforeUnload = async () => {
      try {
        await import('../lib/cloudSyncManager').then((m) =>
          m.cloudSyncManager.forceSync(),
        );
      } catch (err) {
        console.error('Failed to sync on unload:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
