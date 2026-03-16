import { Label } from '../ui/label';
import type { DocumentTemplateMeta } from '../../modules/templates';

interface DocumentSelectorProps {
  templates: DocumentTemplateMeta[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export function DocumentSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: DocumentSelectorProps) {
  const builtinTemplates = templates.filter((template) => template.sourceKind === 'builtin');
  const userTemplates = templates.filter((template) => template.sourceKind === 'user');
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  return (
    <div className="space-y-2">
      <Label htmlFor="document-selector">Шаблон документа</Label>
      <select
        id="document-selector"
        value={selectedTemplateId}
        onChange={(event) => onSelectTemplate(event.target.value)}
        className="zan-select h-11 w-full px-4 text-sm"
      >
        {builtinTemplates.length > 0 && (
          <optgroup label="Базовые шаблоны">
            {builtinTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </optgroup>
        )}
        {userTemplates.length > 0 && (
          <optgroup label="Пользовательские DOCX">
            {userTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {selectedTemplate?.description ? (
        <p className="text-sm text-neutral-600">{selectedTemplate.description}</p>
      ) : null}
      {selectedTemplate?.sourceKind === 'user' && selectedTemplate.sourceFileName ? (
        <p className="text-xs text-neutral-500">Источник файла: {selectedTemplate.sourceFileName}</p>
      ) : null}
    </div>
  );
}
