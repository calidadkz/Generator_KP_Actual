export type AppTab = 'contract' | 'cp' | 'settings' | 'dashboard' | 'cp-builder' | 'contract-builder' | 'templates-library';

export type ViewMode = 'dashboard' | 'cp-editor' | 'contract-editor' | 'cp-builder' | 'contract-builder' | 'settings';

export interface CPBlock {
  id: string;
  name: string;
  description: string;
  content: string;
  fields: CPBlockField[];
}

export interface CPBlockField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image' | 'richText' | 'list';
  defaultValue: any;
  placeholder?: string;
}

export interface CPBlockInstance {
  id: string;
  blockId: string;
  data: Record<string, any>;
}

export interface CPTemplate {
  id: string;
  name: string;
  blocks: CPBlockInstance[];
}

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
  type: 'text' | 'textarea' | 'number' | 'richText';
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

export interface CPState {
  clientName: string;
  date: string;
  model: string;
  workingArea: string;
  power: string;
  prices: {
    m2: number;
    ruida: number;
  };
  deliveryTime: string;
  videos: { title: string; url: string }[];
  managerName: string;
  managerPhone: string;
}

export interface StampPosition {
  x: number;
  y: number;
  scale: number;
}

export interface AppState {
  activeTab: AppTab;
  supplier: CompanyDetails;
  contract: ContractState;
  cp: CPState;
  showStamp: boolean;
  stampPositions: Record<string, StampPosition>; // pageId -> position
  templates: Template[];
  cpTemplates: CPTemplate[];
  activeTemplateId: string;
  activeCPTemplateId: string;
  isAdvancedMode: boolean;
}
