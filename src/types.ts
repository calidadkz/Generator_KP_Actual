export type AppTab =
  | 'contract'
  | 'settings'
  | 'dashboard'
  | 'contract-builder'
  | 'templates-library'
  | 'template-mapper'
  | 'kp-generator'
  | 'sales-cockpit'
  | 'sales-admin';

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Specification {
  main: LineItem[];
  components: LineItem[];
  consumables: LineItem[];
}

export interface CompanyDetails {
  name: string;
  bin: string;
  iik: string;
  bank: string;
  bik: string;
  address: string;
  director: string;
  basis: string;
  signer: string;
  phone: string;
  email: string;
  stampUrl: string;
}

// Added for compatibility with existing constants/components
export interface Company extends CompanyDetails {
  id: string;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'richText' | 'youtube';
  defaultValue: string;
  section?: string;
  isAdvanced?: boolean;
}

export interface Template {
  id: string;
  name: string;
  type: 'contract' | 'CP' | 'Contract';
  content: string;
  fields: TemplateField[];
}

export interface ContractState {
  number: string;
  date: string;
  deliveryDays: number;
  buyer: CompanyDetails;
  spec: Specification;
}

export interface StampPosition {
  x: number;
  y: number;
  scale: number;
}

// ─── pdf-lib КП architecture ────────────────────────────────────────────────

export interface AssemblyData {
  client_name: string;
  model: string;
  working_area: string;
  laser_power: string;
  price_m2: number;
  price_ruida: number;
  delivery_days: number;
  manager_name: string;
  manager_phone: string;
  date: string;
}

export interface FieldPin {
  key: string;           // free-text variable name
  page: number;          // 0-indexed page number
  x: number;             // left edge, pdf-lib pts (bottom-left origin)
  y: number;             // BOTTOM edge of bounding box, pdf-lib pts
  width: number;         // bounding box width in pts
  height: number;        // bounding box height in pts
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;         // hex "#rrggbb"
  fontFamily?: string;   // 'inter' | 'roboto' | 'open-sans' | 'pt-serif'
  align?: 'left' | 'center' | 'right';
  paddingX?: number;     // horizontal inner padding in pts (default 0)
  paddingY?: number;     // vertical inner padding in pts (default 0)
}

/**
 * Per-variable formatting overrides set by the manager at fill time (GeneratorPage).
 * These merge with FieldPin defaults; pin values act as fallback.
 */
export interface FieldFormatOverride {
  align?:      'left' | 'center' | 'right';
  paddingX?:   number;    // pt
  paddingY?:   number;    // pt
  fontFamily?: string;    // 'inter' | 'roboto' | 'open-sans' | 'pt-serif'
  color?:      string;    // hex "#rrggbb"
}

export interface PdfTemplate {
  id: string;
  name: string;
  basePdfRef: string;    // "idb://pdf-..." key in IndexedDB
  pageCount: number;
  fields: FieldPin[];
  createdAt: number;
}

// ─── Sales Intelligence Platform ────────────────────────────────────────────

export interface MachineType {
  id: string;
  name: string;
  description?: string;
  qualifiers?: string[];
}

export interface ScriptNode {
  id: string;
  order: number;
  title: string;
  content: string;
  tips?: string[];
  machineTypeIds?: string[];
  microPresentationIds?: string[];
}

export interface MicroPresentation {
  id: string;
  title: string;
  content: string;
  category: string;
  machineTypeIds?: string[];
  tags?: string[];
}

export interface ModelLogEntry {
  model: string;
  status: 'ok' | 'blocked' | 'error';
  message?: string;
}

export interface DialogueRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  textRef?: string;          // "idb://dialogue-{id}" — saved after upload
  rawTextLegacy?: string;    // only for migrating old records that had rawText in Zustand

  cleanStatus: 'pending' | 'cleaning' | 'ready' | 'error';
  analysisStatus: 'pending' | 'analyzing' | 'done' | 'error';

  clientType?: string;
  machineTypeHint?: string;
  extractedData?: ExtractedDialogueData;

  errorMessage?: string;
  cleanErrorMessage?: string;
  usedModel?: string;
  modelLog?: ModelLogEntry[];
}

export interface BatchInsights {
  id: string;
  generatedAt: string;
  dialogueCount: number;
  clientPortraits: string[];
  topFormulations: string[];
  commonTechniques: string[];
  scriptSuggestions: string[];
  machineTypeBreakdown: Record<string, number>;
  usedModel?: string;
}

export interface ExtractedDialogueData {
  clientType: string;
  machineTypeHint?: string;
  conversationSteps: Array<{ title: string; content: string; tips?: string[] }>;
  formulations: string[];
  techniques: string[];
  suggestedMicroPresentations: Array<Omit<MicroPresentation, 'id'>>;
}
