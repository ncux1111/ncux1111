import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { fileToDataUrl } from '../avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import type { DocumentTemplate, TemplateFieldConfig, TemplateFieldValue } from '../../modules/templates';
import {
  collectTemplateFields,
  findCreditorByFieldValue,
  getCreditorAutofillPayload,
  getCreditorFieldRole,
  getCreditorGroupedOptions,
  OTHER_CREDITOR_OPTION,
  pickCreditorAutofillTargets,
} from '../../modules/templates';

interface DocumentFormProps {
  template: DocumentTemplate;
  values: Record<string, TemplateFieldValue>;
  loading: boolean;
  error: string | null;
  activeFragmentId: string | null;
  onFieldChange: (key: string, value: string) => void;
  onListFieldChange: (key: string, items: string[]) => void;
  onFragmentHover: (fragmentId: string | null) => void;
}

const SIGNATURE_ACCEPT = '.png,.jpg,.jpeg,.webp';
const SIGNATURE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIGNATURE_SIZE_BYTES = Math.floor(4 * 1024 * 1024);

const toTextValue = (value: TemplateFieldValue | undefined) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return value;
};

const toListValue = (value: TemplateFieldValue | undefined) => {
  if (!value) return [''];
  if (Array.isArray(value)) return value.length > 0 ? value : [''];
  const items = value
    .split(/(?:\n|;)+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [''];
};

const applyCreditorAutofill = (
  template: DocumentTemplate,
  sourceField: TemplateFieldConfig,
  selectedCreditorValue: string,
  onFieldChange: (key: string, value: string) => void
) => {
  const allFields = collectTemplateFields(template.sections.map((section) => section.fields));
  const { emailTargets, phoneTargets, addressTargets, binTargets } = pickCreditorAutofillTargets(
    allFields,
    sourceField.key
  );

  if (!selectedCreditorValue || selectedCreditorValue === OTHER_CREDITOR_OPTION) {
    emailTargets.forEach((target) => onFieldChange(target.key, ''));
    phoneTargets.forEach((target) => onFieldChange(target.key, ''));
    addressTargets.forEach((target) => onFieldChange(target.key, ''));
    binTargets.forEach((target) => onFieldChange(target.key, ''));
    return;
  }

  const selectedCreditor = findCreditorByFieldValue(selectedCreditorValue);
  if (!selectedCreditor) return;

  const payload = getCreditorAutofillPayload(selectedCreditor);
  emailTargets.forEach((target) => onFieldChange(target.key, payload.email));
  phoneTargets.forEach((target) => onFieldChange(target.key, payload.phone));
  addressTargets.forEach((target) => onFieldChange(target.key, payload.address));
  binTargets.forEach((target) => onFieldChange(target.key, payload.bin));
};

const renderSignatureField = async (
  field: TemplateFieldConfig,
  file: File,
  onFieldChange: (key: string, value: string) => void
) => {
  const fileName = file.name.toLowerCase();
  const mimeAllowed = SIGNATURE_MIME_TYPES.has(file.type);
  const extAllowed = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => fileName.endsWith(ext));

  if (!mimeAllowed && !extAllowed) {
    alert('Для подписи поддерживаются PNG, JPG, JPEG и WEBP.');
    return;
  }

  if (file.size > MAX_SIGNATURE_SIZE_BYTES) {
    alert('Файл подписи слишком большой. Максимум 4 МБ.');
    return;
  }

  const dataUrl = await fileToDataUrl(file);
  onFieldChange(field.key, dataUrl);
};

const renderSimpleField = (
  field: TemplateFieldConfig,
  value: string,
  template: DocumentTemplate,
  onFieldChange: (key: string, value: string) => void,
  creditorSearchValue: string,
  onCreditorSearchChange: (fieldKey: string, search: string) => void
) => {
  const inputProps = {
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onFieldChange(field.key, event.target.value),
    placeholder: field.placeholder ?? 'Введите значение',
  };

  if (field.type === 'textarea') {
    return <Textarea {...inputProps} rows={4} className="zan-textarea min-h-[110px]" />;
  }

  if (field.type === 'select') {
    const creditorFieldRole = getCreditorFieldRole(field);

    if (creditorFieldRole === 'creditorName') {
      const groupedOptions = getCreditorGroupedOptions(creditorSearchValue);
      const selectedOptionExists = groupedOptions.some((group) =>
        group.options.some((option) => option.value === value)
      );

      return (
        <div className="space-y-2">
          <Input
            type="text"
            value={creditorSearchValue}
            onChange={(event) => onCreditorSearchChange(field.key, event.target.value)}
            placeholder="Поиск кредитора по названию, БИН или e-mail"
            className="zan-input h-10 px-4 text-sm"
          />
          <select
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              onFieldChange(field.key, nextValue);
              onCreditorSearchChange(field.key, '');
              applyCreditorAutofill(template, field, nextValue, onFieldChange);
            }}
            className="zan-select h-11 w-full px-4 text-sm"
          >
            <option value="">Выберите кредитора</option>
            {value && value !== OTHER_CREDITOR_OPTION && !selectedOptionExists ? (
              <option value={value}>{value}</option>
            ) : null}
            {groupedOptions.map((group) => (
              <optgroup key={group.category} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER_CREDITOR_OPTION}>{OTHER_CREDITOR_OPTION}</option>
          </select>
          {groupedOptions.length === 0 ? (
            <p className="text-xs text-neutral-500">По этому запросу кредиторы не найдены.</p>
          ) : null}
        </div>
      );
    }

    return (
      <select
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onFieldChange(field.key, nextValue);
        }}
        className="zan-select h-11 w-full px-4 text-sm"
      >
        <option value="">Выберите значение</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'signature') {
    return (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800">
            Загрузить подпись
            <input
              type="file"
              accept={SIGNATURE_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void renderSignatureField(field, file, onFieldChange);
              }}
            />
          </label>

          {value ? (
            <button
              type="button"
              onClick={() => onFieldChange(field.key, '')}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
            >
              Удалить
            </button>
          ) : null}
        </div>

        <p className="text-xs text-neutral-500">
          Поддерживаются PNG, JPG, JPEG и WEBP. Прозрачный PNG подходит лучше всего.
        </p>

        <div className="overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-white p-4">
          {value ? (
            <img src={value} alt="Подпись" className="h-24 w-full object-contain" />
          ) : (
            <p className="text-sm text-neutral-500">Подпись пока не загружена.</p>
          )}
        </div>
      </div>
    );
  }

  const inputType =
    field.type === 'email'
      ? 'email'
      : field.type === 'number'
        ? 'number'
        : field.type === 'date'
          ? 'date'
          : field.type === 'phone'
            ? 'tel'
            : 'text';

  return <Input {...inputProps} type={inputType} className="zan-input h-11 px-4 text-sm" />;
};

const renderListField = (
  field: TemplateFieldConfig,
  value: TemplateFieldValue | undefined,
  onListFieldChange: (key: string, items: string[]) => void
) => {
  const items = toListValue(value);

  const updateItem = (index: number, nextValue: string) => {
    const nextItems = [...items];
    nextItems[index] = nextValue;
    onListFieldChange(field.key, nextItems);
  };

  const addItem = () => {
    onListFieldChange(field.key, [...items, '']);
  };

  const removeItem = (index: number) => {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    onListFieldChange(field.key, nextItems.length > 0 ? nextItems : ['']);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${field.key}-item-${index}`} className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs text-neutral-500">Позиция {index + 1}</Label>
            <Input
              type="text"
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={field.placeholder ?? 'Введите пункт списка'}
              className="zan-input h-11 px-4 text-sm"
            />
          </div>
          <Button type="button" variant="outline" className="text-red-600" onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" />
        Добавить пункт
      </Button>
    </div>
  );
};

export function DocumentForm({
  template,
  values,
  loading,
  error,
  activeFragmentId,
  onFieldChange,
  onListFieldChange,
  onFragmentHover,
}: DocumentFormProps) {
  const fields = template.sections.flatMap((section) => section.fields);
  const fieldsCount = fields.length;
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [creditorSearchByFieldKey, setCreditorSearchByFieldKey] = useState<Record<string, string>>({});

  const filledCount = fields.filter((field) => {
    const value = values[field.key];
    if (!value) return false;
    if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
    return value.trim().length > 0;
  }).length;

  useEffect(() => {
    if (!activeFragmentId) return;
    const element = fieldRefs.current[activeFragmentId];
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeFragmentId]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-semibold text-neutral-900">{template.title}</p>
        <p className="mt-1 text-sm text-neutral-600">
          {template.description ?? 'Заполните поля, чтобы подготовить документ к предпросмотру и скачиванию.'}
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Заполнено полей: {filledCount} из {fieldsCount}
        </p>
      </div>

      {loading ? <p className="text-sm text-neutral-500">Загружаем шаблон...</p> : null}
      {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && template.sections.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          В этом шаблоне пока нет редактируемых полей.
        </div>
      ) : null}

      {!loading && !error && template.sections.length > 0 ? (
        <div className="max-h-[calc(100vh-22rem)] space-y-6 overflow-y-auto pr-1">
          {template.sections.map((section) => (
            <div key={section.id} className="border-b border-neutral-200 pb-4 last:border-b-0">
              <h3 className="mb-3 text-sm font-semibold text-neutral-700">{section.title}</h3>
              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div
                    key={field.key}
                    ref={(element) => {
                      fieldRefs.current[field.key] = element;
                    }}
                    data-fragment-id={field.key}
                    className={cn(
                      'rounded-2xl border border-transparent p-3 transition-colors',
                      activeFragmentId === field.key && 'border-amber-300 bg-amber-50'
                    )}
                    onMouseEnter={() => onFragmentHover(field.key)}
                    onMouseLeave={() => onFragmentHover(null)}
                  >
                    <Label className="text-sm text-neutral-800">{field.label}</Label>
                    {field.hint ? <p className="mt-1 text-xs text-neutral-500">{field.hint}</p> : null}
                    <div className="mt-1">
                      {field.type === 'list'
                        ? renderListField(field, values[field.key], onListFieldChange)
                        : renderSimpleField(
                            field,
                            toTextValue(values[field.key]),
                            template,
                            onFieldChange,
                            creditorSearchByFieldKey[field.key] || '',
                            (fieldKey, search) =>
                              setCreditorSearchByFieldKey((previous) => ({
                                ...previous,
                                [fieldKey]: search,
                              }))
                          )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
