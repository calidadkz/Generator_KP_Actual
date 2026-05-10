/**
 * Cloud synchronization manager with debouncing
 * Handles batching and throttling of cloud sync operations
 */

import {
  saveScriptNodes,
  saveMicroPresentations,
  saveMachineTypes,
  saveArticles,
  saveStyleDNA,
  saveCleaningConfig,
  saveFewShotExamples,
  saveBatchInsights,
} from './dialogueCloud';
import {
  ScriptNode,
  MicroPresentation,
  MachineType,
  Article,
  StyleDNA,
  CleaningConfig,
  FewShotExample,
  BatchInsights,
} from '../types';

type SyncTask =
  | { type: 'scriptNodes'; data: ScriptNode[] }
  | { type: 'microPresentations'; data: MicroPresentation[] }
  | { type: 'machineTypes'; data: MachineType[] }
  | { type: 'articles'; data: Article[] }
  | { type: 'styleDNA'; data: StyleDNA | null }
  | { type: 'cleaningConfig'; data: CleaningConfig }
  | { type: 'fewShotExamples'; data: FewShotExample[] }
  | { type: 'batchInsights'; data: BatchInsights };

class CloudSyncManager {
  private queue: SyncTask[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly DEBOUNCE_MS = 2000; // Wait 2 seconds before syncing

  /**
   * Queue a sync task and debounce execution
   */
  queueSync(task: SyncTask) {
    // Remove any existing task of the same type (replace instead of stack)
    this.queue = this.queue.filter((t) => t.type !== task.type);
    this.queue.push(task);

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.processPendingSync();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Process all pending sync tasks
   */
  private async processPendingSync() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const tasks = [...this.queue];
    this.queue = [];

    try {
      for (const task of tasks) {
        await this.executeSync(task);
      }
      console.log(`[Cloud Sync] ✓ Synced ${tasks.length} task(s) to Firestore`);
    } catch (error) {
      console.error('[Cloud Sync] ✗ Error processing sync tasks:', error);
      // Re-queue failed tasks for retry
      this.queue.push(...tasks);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single sync task
   */
  private async executeSync(task: SyncTask): Promise<void> {
    try {
      switch (task.type) {
        case 'scriptNodes':
          await saveScriptNodes(task.data);
          break;
        case 'microPresentations':
          await saveMicroPresentations(task.data);
          break;
        case 'machineTypes':
          await saveMachineTypes(task.data);
          break;
        case 'articles':
          await saveArticles(task.data);
          break;
        case 'styleDNA':
          await saveStyleDNA(task.data);
          break;
        case 'cleaningConfig':
          await saveCleaningConfig(task.data);
          break;
        case 'fewShotExamples':
          await saveFewShotExamples(task.data);
          break;
        case 'batchInsights':
          await saveBatchInsights(task.data);
          break;
        default:
          console.warn('[Cloud Sync] Unknown task type:', task);
      }
    } catch (error) {
      console.error(`[Cloud Sync] Failed to sync ${task.type}:`, error);
      throw error;
    }
  }

  /**
   * Force immediate sync without debounce (e.g., on window close)
   */
  async forceSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    await this.processPendingSync();
  }

  /**
   * Get number of pending sync tasks
   */
  getPendingCount(): number {
    return this.queue.length;
  }
}

export const cloudSyncManager = new CloudSyncManager();
