export type TemplateSourceKind = 'builtin' | 'user';
export type TemplateEditableMode = 'gray' | 'markers';

export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'signature'
  | 'list';

export type TemplateFieldValue = string | string[];

export interface TemplateFieldConfig {
  key: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  hint?: string;
  options?: string[];
  rawKeys: string[];
}

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateFieldConfig[];
}

export interface DocumentTemplateMeta {
  id: string;
  title: string;
  category?: string;
  description?: string;
  fileName: string;
  sourceKind: TemplateSourceKind;
  editableMode: TemplateEditableMode;
  sourceFileName?: string;
  storageId?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentTemplate extends DocumentTemplateMeta {
  sections: TemplateSection[];
  defaults: Record<string, TemplateFieldValue>;
  preview: string;
}

export type TemplateUsageAction = 'open' | 'fill' | 'preview' | 'download';

export interface TemplateUsageLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  templateId: string;
  templateName: string;
  action: TemplateUsageAction;
  timestamp: number;
}

export type TemplateAccessMap = Record<string, string[]>;

export interface AddTemplateResult {
  template: DocumentTemplateMeta;
}
