import type { DocumentTemplate, DocumentTemplateMeta, TemplateFieldType, TemplateFieldValue } from './types';
import type { ExtractedEditableFragment } from './templateDocx';
import { detectCreditorFieldRole, getCreditorOptionLabels } from './creditorsDirectory';

const PREVIEW_OPEN = '[[LF:';
const PREVIEW_OPEN_END = ']]';
const PREVIEW_CLOSE = '[[/LF]]';
const PREVIEW_TOKEN_REGEX = /\[\[LF:([^\]]+)]]([\s\S]*?)\[\[\/LF]]/g;
const PREVIEW_TOKEN_SINGLE_REGEX = /^\[\[LF:([^\]]+)]]([\s\S]*)\[\[\/LF]]$/;
const PREVIEW_META_SEPARATOR = '|';

const normalize = (value: string) => value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const sanitizeFieldKeyPart = (value: string) =>
  normalize(value)
    .toLowerCase()
    .replace(/[{}[\]()/]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

const toMarkerKey = (value: string) => sanitizeFieldKeyPart(value);

const stripPrefix = (value: string) =>
  normalize(value)
    .replace(/^[:;,.!?\u2013\u2014\- ]+/u, '')
    .replace(/[:;,.!?\u2013\u2014\- ]+$/u, '');

const markerWordOverrides: Record<string, string> = {
  iin: 'ИИН',
  bin: 'БИН',
  id: 'ID',
  fio: 'ФИО',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const humanizeMarkerLabel = (markerKey: string) => {
  const words = markerKey
    .split('_')
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => markerWordOverrides[word.toLowerCase()] || word);

  if (words.length === 0) return 'Поле';
  return words.map((word, index) => (index === 0 ? capitalize(word) : word)).join(' ');
};

const inferFieldType = (key: string): TemplateFieldType => {
  const normalized = key.toLowerCase();
  if (/(signature|sign|подпис|подпись)/.test(normalized)) return 'signature';
  if (/(email|mail|почт)/.test(normalized)) return 'email';
  if (/(phone|tel|mobile|whatsapp|тел)/.test(normalized)) return 'phone';
  if (/(date|дата)/.test(normalized)) return 'date';
  if (/(amount|sum|price|стоим|сумм)/.test(normalized)) return 'number';
  if (/(attachments?|appendix|items?|list|прилож)/.test(normalized)) return 'list';
  if (/(address|адрес|comment|описание|detail|notes?)/.test(normalized)) return 'textarea';
  return 'text';
};

const listValue = (value: TemplateFieldValue | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const fieldValueToText = (value: TemplateFieldValue | undefined): string => {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return value;
};

const encodeTokenPart = (value: string) => encodeURIComponent(value);
const decodeTokenPart = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const encodePreviewMeta = (fragmentId: string, rawKey: string) =>
  `${encodeTokenPart(fragmentId)}${PREVIEW_META_SEPARATOR}${encodeTokenPart(rawKey)}`;

const decodePreviewMeta = (meta: string) => {
  const [fragmentIdPart, rawKeyPart = ''] = meta.split(PREVIEW_META_SEPARATOR);
  const fragmentId = decodeTokenPart(fragmentIdPart || '');
  const rawKey = rawKeyPart ? decodeTokenPart(rawKeyPart) : '';
  return { fragmentId, rawKey };
};

export const encodePreviewFragmentValue = (fragmentId: string, rawKey: string, text: string) =>
  `${PREVIEW_OPEN}${encodePreviewMeta(fragmentId, rawKey)}${PREVIEW_OPEN_END}${text}${PREVIEW_CLOSE}`;

export const isPreviewTokenText = (text: string) => text.includes(PREVIEW_OPEN);

export const decodePreviewTokenValue = (value: string) => {
  const match = PREVIEW_TOKEN_SINGLE_REGEX.exec(value);
  if (!match) return null;
  const [, meta, text] = match;
  const { fragmentId, rawKey } = decodePreviewMeta(meta);
  return { fragmentId, rawKey, text };
};

export const splitPreviewTokenText = (text: string) => {
  const parts: Array<{ type: 'text' | 'fragment'; value: string; fragmentId?: string; rawKey?: string }> = [];
  let cursor = 0;
  PREVIEW_TOKEN_REGEX.lastIndex = 0;

  for (let match = PREVIEW_TOKEN_REGEX.exec(text); match; match = PREVIEW_TOKEN_REGEX.exec(text)) {
    const [fullMatch, meta, content] = match;
    const start = match.index;
    if (start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, start) });
    }

    const { fragmentId, rawKey } = decodePreviewMeta(meta);
    parts.push({ type: 'fragment', value: content, fragmentId, rawKey });
    cursor = start + fullMatch.length;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) });
  }

  return parts;
};

function buildTemplateConfig(meta: DocumentTemplateMeta, fragments: ExtractedEditableFragment[], markerMode: boolean) {
  const byKey = new Map<
    string,
    {
      rawKey: string;
      fieldKey: string;
      label: string;
      type: TemplateFieldType;
      order: number;
      occurrences: number;
    }
  >();

  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    const rawKey = normalize(fragment.rawKey);
    if (!rawKey) continue;

    const dedupeKey = markerMode ? toMarkerKey(rawKey) || `Field ${index + 1}` : rawKey;
    if (byKey.has(dedupeKey)) {
      const current = byKey.get(dedupeKey);
      if (current) current.occurrences += 1;
      continue;
    }

    const fieldKey =
      markerMode
        ? toMarkerKey(rawKey) || `Field ${index + 1}`
        : sanitizeFieldKeyPart(rawKey) || `Field ${index + 1}`;
    const label = markerMode
      ? humanizeMarkerLabel(fieldKey)
      : stripPrefix(rawKey).slice(0, 60) || `Поле ${index + 1}`;

    byKey.set(dedupeKey, {
      rawKey,
      fieldKey,
      label,
      type: inferFieldType(markerMode ? fieldKey : rawKey),
      order: index,
      occurrences: 1,
    });
  }

  const usedFieldKeys = new Set<string>();
  const fields = Array.from(byKey.values())
    .sort((a, b) => a.order - b.order)
    .map((item, index) => {
      let key = item.fieldKey;
      let suffix = 1;
      while (!key || usedFieldKeys.has(key)) {
        key = `${item.fieldKey || 'field'}_${suffix}`;
        suffix += 1;
      }
      usedFieldKeys.add(key);

      const placeholder = markerMode ? '' : stripPrefix(item.rawKey);
      const creditorFieldRole = detectCreditorFieldRole([item.rawKey, item.label, key]);
      const fieldType = creditorFieldRole === 'creditorName' ? 'select' : item.type;
      return {
        key,
        label: item.label || `Поле ${index + 1}`,
        type: fieldType,
        placeholder,
        hint: markerMode ? `Маркер: {{${item.rawKey}}}` : undefined,
        options: creditorFieldRole === 'creditorName' ? getCreditorOptionLabels() : undefined,
        rawKeys: [item.rawKey],
      };
    });

  const defaults: Record<string, TemplateFieldValue> = {};
  for (const field of fields) {
    defaults[field.key] = field.type === 'list' ? [''] : '';
  }

  return {
    ...meta,
    sections: [
      {
        id: markerMode ? 'section-markers' : 'section-gray',
        title: markerMode ? 'Поля шаблона' : 'Редактируемые поля',
        fields,
      },
    ],
    defaults,
    preview: '',
  } satisfies DocumentTemplate;
}

export const buildDocumentTemplateConfig = (
  meta: DocumentTemplateMeta,
  fragments: ExtractedEditableFragment[]
) => buildTemplateConfig(meta, fragments, false);

export const buildMarkerDocumentTemplateConfig = (
  meta: DocumentTemplateMeta,
  fragments: ExtractedEditableFragment[]
) => buildTemplateConfig(meta, fragments, true);

export const buildRawValueMapFromFormValues = (
  template: DocumentTemplate,
  values: Record<string, TemplateFieldValue>
) => {
  const rawValues: Record<string, string> = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === 'list') {
        const items = listValue(values[field.key]);
        if (field.rawKeys.length === 1) {
          rawValues[field.rawKeys[0]] = items.join('\n');
          continue;
        }
        field.rawKeys.forEach((rawKey, index) => {
          rawValues[rawKey] = items[index] ?? '';
        });
        continue;
      }

      if (field.type === 'signature') {
        const textValue = fieldValueToText(values[field.key]);
        field.rawKeys.forEach((rawKey) => {
          rawValues[rawKey] = textValue;
        });
        continue;
      }

      const textValue = fieldValueToText(values[field.key]);
      field.rawKeys.forEach((rawKey) => {
        rawValues[rawKey] = textValue;
      });
    }
  }

  return rawValues;
};

export const buildPreviewRawValueMapFromFormValues = (
  template: DocumentTemplate,
  values: Record<string, TemplateFieldValue>
) => {
  const rawValues: Record<string, string> = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === 'list') {
        const items = listValue(values[field.key]);
        if (field.rawKeys.length === 1) {
          const joined = items.filter(Boolean).join('\n');
          const visible = joined || field.placeholder || field.label;
          rawValues[field.rawKeys[0]] = encodePreviewFragmentValue(field.key, field.rawKeys[0], visible);
          continue;
        }
        field.rawKeys.forEach((rawKey, index) => {
          const visible = items[index] || field.placeholder || field.label;
          rawValues[rawKey] = encodePreviewFragmentValue(field.key, rawKey, visible);
        });
        continue;
      }

      if (field.type === 'signature') {
        const textValue = normalize(fieldValueToText(values[field.key]));
        field.rawKeys.forEach((rawKey) => {
          rawValues[rawKey] = textValue || encodePreviewFragmentValue(field.key, rawKey, field.label);
        });
        continue;
      }

      const textValue = normalize(fieldValueToText(values[field.key]));
      field.rawKeys.forEach((rawKey) => {
        const visible = textValue || field.placeholder || field.label;
        rawValues[rawKey] = encodePreviewFragmentValue(field.key, rawKey, visible);
      });
    }
  }

  return rawValues;
};

export const buildFieldLabelMap = (template: DocumentTemplate) =>
  Object.fromEntries(
    template.sections.flatMap((section) => section.fields).map((field) => [field.key, field.label])
  );
