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

// Один слот квалификации — вопрос который нужно выяснить у клиента
export interface QualificationSlot {
  key: string;    // уникальный идентификатор, напр. 'material'
  label: string;  // текст вопроса/метки, напр. 'Материал'
}

export interface MachineType {
  id: string;
  name: string;
  description?: string;
  qualifiers?: QualificationSlot[];  // специфичные для этого типа станка
  siteUrl?: string;
}

// Задача в рамках звонка: что нужно сделать + какой станок решает
export interface QualificationTask {
  id: string;
  label: string;              // напр. «Резка фанеры»
  machineTypeId: string | null;
  slots: Record<string, string>;       // слоты специфичные для этого типа станка
  pendingSlots: string[];
  completedStepIds: string[];          // выполненные этапы скрипта по этой задаче
}

// Сессия квалификации — данные одного звонка, сохраняемые в Firestore
export interface QualificationSession {
  id: string;
  managerName: string;
  clientPhone?: string;
  status: 'active' | 'paused' | 'done';
  tasks: QualificationTask[];          // задачи создаются ВО ВРЕМЯ звонка
  activeTaskId: string | null;
  universalSlots: Record<string, string>;   // общие: имя клиента, бюджет, срок
  universalPendingSlots: string[];
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptNode {
  id: string;
  order: number;
  title: string;
  content: string;
  category?: string;
  tips?: string[];
  machineTypeIds?: string[];
  microPresentationIds?: string[];
  scriptType?: 'qualification' | 'closing' | 'calling';
}

export interface MicroPresentation {
  id: string;
  title: string;
  content: string;        // legacy — отображается если нет methodology
  category: string;
  machineTypeIds?: string[];
  tags?: string[];
  // Три уровня атома знаний (модуль 06)
  technical?: string;     // «Что» — технический факт (серый фон)
  methodology?: string;   // «Как» — метод эксперта (голубой фон), приоритет над content
  compromise?: string;    // «Если бюджет» — стратегия компромисса (янтарный фон)
  // Управление публикацией
  isPublished?: boolean;  // false = AI-черновик, не отображается менеджеру
  createdBy?: 'human' | 'agent';
  sourceDialogueIds?: string[];
  // Адаптивная фильтрация по заполненным слотам
  // { material: ['акрил', 'пвх'] } — показать если слот material совпадает
  slotConditions?: Record<string, string[]>;
}

export interface ClientPortrait {
  id: string;
  name: string;
  description: string;
  aiSummary?: string;
  indicators: string[];       // маркеры в речи клиента
  detectKeywords: string[];   // ключевые слова для авто-определения
  typicalObjections: string[];
  recommendedApproach: string;
  pitfalls: string[];
  recommendedMpIds: string[];
  machineTypePreferences?: string[];
  tags: string[];
  isPublished: boolean;
  sourceDialogueIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type FeedbackNoteType = 'script_gap' | 'knowledge_gap' | 'dev_task' | 'unclear';

export interface FeedbackNote {
  id: string;
  authorId: string;
  authorName?: string;
  text: string;
  isPrivate: boolean;
  isUrgent: boolean;
  autoContext: {
    source: 'cockpit' | 'trainer' | 'manual';
    scriptType?: string;
    stageName?: string;
    machineTypeId?: string;
    scriptNodeId?: string;
  };
  status: 'new' | 'agent_reviewed' | 'supervisor_review' | 'resolved' | 'rejected';
  agentClassifications?: FeedbackNoteType[];
  agentClassificationReason?: string;
  agentProposal?: {
    draftMpId?: string;
    devPrompt?: string;
    clarifyingQuestions?: string[];
  };
  supervisorComment?: string;
  groupId?: string;
  resolvedAt?: string;
  createdAt: string;
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
  machineTypeIds?: string[];  // manual tagging by operator
  isClean?: boolean;          // manually marked as final clean version
  extractedData?: ExtractedDialogueData;

  dialogueType?: 'real' | 'training' | 'educational';  // real customer call, manager training, or educational material
  dialogueTypeConfidence?: 'high' | 'medium' | 'low';   // confidence of automatic classification

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
  // Article-oriented batch analysis (optional)
  articleTopicSuggestions?: string[];
  topPainPoints?: string[];
}

export interface ExtractedDialogueData {
  clientType: string;
  machineTypeHint?: string;
  conversationSteps: Array<{ title: string; content: string; tips?: string[] }>;
  formulations: string[];
  techniques: string[];
  suggestedMicroPresentations: Array<Omit<MicroPresentation, 'id'>>;
  // Article-oriented extraction (optional, populated when article analysis requested)
  articleTopics?: string[];
  painPoints?: string[];
  styleMarkers?: string[];
}

export interface CleaningConfig {
  geminiPrompt: string;
  openaiPrompt: string;
  geminiModel?: string;
  openaiModel?: string;
}

export interface StyleDNA {
  id: string;
  generatedAt: string;
  dialogueCount: number;
  frequentPhrases: string[];
  avgSentenceLength: 'short' | 'medium' | 'long';
  tone: string;
  thoughtStructure: string;
  additionalNotes?: string;
  usedModel?: string;
}

export interface FewShotExample {
  id: string;
  title: string;
  content: string;
  addedAt: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  wordpressPostId?: number;
  wordpressUrl?: string;
  generationMeta?: {
    topic: string;
    usedStyleDNA: boolean;
    fewShotCount: number;
    draftModel?: string;
    rewriteModel?: string;
  };
}

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
}

// ─── КП Блоки (модульная система) ──────────────────────────────────────────

export interface KpBlockImage {
  url: string;
  caption?: string;
  order: number;
}

export interface KpBlockChip {
  icon: string;   // emoji или название иконки (SVG)
  label: string;
}

export interface KpBlockBenefit {
  icon: string;
  title: string;
  text: string;
}

export type KpBlockType = 'text' | 'gallery' | 'chips' | 'benefits';
export type KpBlockCategory = 'introduction' | 'materials' | 'examples' | 'skills' | 'support' | 'social_proof' | 'cta';

export interface KpBlock {
  id: string;
  type: KpBlockType;
  title: string;
  subtitle?: string;
  description?: string;
  category: KpBlockCategory;

  // Контент (зависит от типа блока)
  images?: KpBlockImage[];      // для gallery
  chips?: KpBlockChip[];        // для chips
  benefits?: KpBlockBenefit[]; // для benefits
  content?: string;             // для text

  // Фильтрация по портретам и станкам
  portraits: string[];          // clientPortrait.id (например: ["beginners", "jewelers"])
  equipments: string[];         // ["co2", "fiber", "marker"]
  machineTypes?: string[];      // конкретные модели (опционально)

  // Управление
  visible: boolean;
  order: number;

  // Метаданные
  createdAt: string;
  updatedAt: string;
  createdBy: string;           // userId руководителя
}

export interface KpGeneratorState {
  blocks: KpBlock[];
  selectedPortrait?: string;
  selectedEquipment: string;   // "co2" | "fiber" | "marker"
  clientName: string;
  kpDate: string;
}
