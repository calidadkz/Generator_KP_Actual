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
import { DialogueRecord, BatchInsights, ScriptNode, MicroPresentation, MachineType, Article, StyleDNA, CleaningConfig, FewShotExample } from '../types';

const DIALOGUES_COLLECTION = 'processed_scripts';
const BATCH_INSIGHTS_COLLECTION = 'batch_insights';
const SCRIPT_NODES_COLLECTION = 'script_nodes';
const MICRO_PRESENTATIONS_COLLECTION = 'micro_presentations';
const MACHINE_TYPES_COLLECTION = 'machine_types';
const ARTICLES_COLLECTION = 'articles';
const STYLE_DNA_COLLECTION = 'style_dna';
const CLEANING_CONFIG_COLLECTION = 'cleaning_config';
const FEW_SHOT_EXAMPLES_COLLECTION = 'few_shot_examples';

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

// ─── Script Nodes ───────────────────────────────────────────────────────────

export async function fetchScriptNodes(): Promise<ScriptNode[]> {
  try {
    const q = query(collection(db, SCRIPT_NODES_COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const nodes: ScriptNode[] = [];

    snapshot.forEach((docSnap) => {
      nodes.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as ScriptNode);
    });

    return nodes;
  } catch (error) {
    console.error('Failed to fetch script nodes:', error);
    return [];
  }
}

export async function saveScriptNodes(nodes: ScriptNode[]): Promise<void> {
  try {
    for (const node of nodes) {
      const docRef = doc(db, SCRIPT_NODES_COLLECTION, node.id);
      await setDoc(docRef, node);
    }
    console.log(`Saved ${nodes.length} script nodes to Firestore`);
  } catch (error) {
    console.error('Failed to save script nodes:', error);
    throw error;
  }
}

// ─── Micro Presentations ───────────────────────────────────────────────────

export async function fetchMicroPresentations(): Promise<MicroPresentation[]> {
  try {
    const snapshot = await getDocs(collection(db, MICRO_PRESENTATIONS_COLLECTION));
    const presentations: MicroPresentation[] = [];

    snapshot.forEach((docSnap) => {
      presentations.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as MicroPresentation);
    });

    return presentations;
  } catch (error) {
    console.error('Failed to fetch micro presentations:', error);
    return [];
  }
}

export async function saveMicroPresentations(presentations: MicroPresentation[]): Promise<void> {
  try {
    for (const mp of presentations) {
      const docRef = doc(db, MICRO_PRESENTATIONS_COLLECTION, mp.id);
      await setDoc(docRef, mp);
    }
    console.log(`Saved ${presentations.length} micro presentations to Firestore`);
  } catch (error) {
    console.error('Failed to save micro presentations:', error);
    throw error;
  }
}

// ─── Machine Types ──────────────────────────────────────────────────────────

export async function fetchMachineTypes(): Promise<MachineType[]> {
  try {
    const snapshot = await getDocs(collection(db, MACHINE_TYPES_COLLECTION));
    const types: MachineType[] = [];

    snapshot.forEach((docSnap) => {
      types.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as MachineType);
    });

    return types;
  } catch (error) {
    console.error('Failed to fetch machine types:', error);
    return [];
  }
}

export async function saveMachineTypes(types: MachineType[]): Promise<void> {
  try {
    for (const type of types) {
      const docRef = doc(db, MACHINE_TYPES_COLLECTION, type.id);
      await setDoc(docRef, type);
    }
    console.log(`Saved ${types.length} machine types to Firestore`);
  } catch (error) {
    console.error('Failed to save machine types:', error);
    throw error;
  }
}

// ─── Articles ───────────────────────────────────────────────────────────────

export async function fetchArticles(): Promise<Article[]> {
  try {
    const q = query(collection(db, ARTICLES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const articles: Article[] = [];

    snapshot.forEach((docSnap) => {
      articles.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Article);
    });

    return articles;
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return [];
  }
}

export async function saveArticles(articles: Article[]): Promise<void> {
  try {
    for (const article of articles) {
      const docRef = doc(db, ARTICLES_COLLECTION, article.id);
      await setDoc(docRef, article);
    }
    console.log(`Saved ${articles.length} articles to Firestore`);
  } catch (error) {
    console.error('Failed to save articles:', error);
    throw error;
  }
}

// ─── Style DNA ──────────────────────────────────────────────────────────────

export async function fetchStyleDNA(): Promise<StyleDNA | null> {
  try {
    const snapshot = await getDocs(collection(db, STYLE_DNA_COLLECTION));
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as StyleDNA;
  } catch (error) {
    console.error('Failed to fetch style DNA:', error);
    return null;
  }
}

export async function saveStyleDNA(dna: StyleDNA | null): Promise<void> {
  try {
    if (dna) {
      const docRef = doc(db, STYLE_DNA_COLLECTION, dna.id);
      await setDoc(docRef, dna);
      console.log('Saved style DNA to Firestore');
    }
  } catch (error) {
    console.error('Failed to save style DNA:', error);
    throw error;
  }
}

// ─── Cleaning Config ────────────────────────────────────────────────────────

export async function fetchCleaningConfig(): Promise<CleaningConfig | null> {
  try {
    const snapshot = await getDocs(collection(db, CLEANING_CONFIG_COLLECTION));
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return doc.data() as CleaningConfig;
  } catch (error) {
    console.error('Failed to fetch cleaning config:', error);
    return null;
  }
}

export async function saveCleaningConfig(config: CleaningConfig): Promise<void> {
  try {
    const docRef = doc(db, CLEANING_CONFIG_COLLECTION, 'default');
    await setDoc(docRef, config);
    console.log('Saved cleaning config to Firestore');
  } catch (error) {
    console.error('Failed to save cleaning config:', error);
    throw error;
  }
}

// ─── Few Shot Examples ──────────────────────────────────────────────────────

export async function fetchFewShotExamples(): Promise<FewShotExample[]> {
  try {
    const snapshot = await getDocs(collection(db, FEW_SHOT_EXAMPLES_COLLECTION));
    const examples: FewShotExample[] = [];

    snapshot.forEach((docSnap) => {
      examples.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as FewShotExample);
    });

    return examples;
  } catch (error) {
    console.error('Failed to fetch few shot examples:', error);
    return [];
  }
}

export async function saveFewShotExamples(examples: FewShotExample[]): Promise<void> {
  try {
    for (const example of examples) {
      const docRef = doc(db, FEW_SHOT_EXAMPLES_COLLECTION, example.id);
      await setDoc(docRef, example);
    }
    console.log(`Saved ${examples.length} few shot examples to Firestore`);
  } catch (error) {
    console.error('Failed to save few shot examples:', error);
    throw error;
  }
}
