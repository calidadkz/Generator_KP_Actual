import { get, set, del } from 'idb-keyval';

const DIALOGUE_PREFIX = 'idb://dialogue-';

export interface DialogueTexts {
  rawText: string;
  cleanedText: string;
}

export const isDialogueRef = (value: string): boolean =>
  typeof value === 'string' && value.startsWith(DIALOGUE_PREFIX);

export const saveDialogueTexts = async (texts: DialogueTexts): Promise<string> => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ref = `${DIALOGUE_PREFIX}${id}`;
  await set(ref, texts);
  return ref;
};

export const updateDialogueTexts = async (ref: string, texts: DialogueTexts): Promise<void> => {
  if (!isDialogueRef(ref)) return;
  await set(ref, texts);
};

export const resolveDialogueTexts = async (ref: string): Promise<DialogueTexts | null> => {
  if (!isDialogueRef(ref)) return null;
  const stored = await get<DialogueTexts>(ref);
  return stored ?? null;
};

export const deleteDialogueTexts = async (ref: string): Promise<void> => {
  if (isDialogueRef(ref)) {
    await del(ref);
  }
};
