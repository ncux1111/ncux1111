import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  PencilLine,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useApp } from '../../context/AppContext';
import {
  useDocumentTemplates,
  type DocumentTemplate,
  type DocumentTemplateMeta,
  type TemplateFieldValue,
  type TemplateUsageAction,
  buildDocumentTemplateConfig,
  buildMarkerDocumentTemplateConfig,
  buildPreviewRawValueMapFromFormValues,
  buildRawValueMapFromFormValues,
  buildFieldLabelMap,
  extractTemplateEditableFragments,
  extractTemplateMarkerFragments,
} from '../../modules/templates';
import { buildFilledTemplateBuffer } from '../../modules/templates/templateDocx';
import { DocumentSelector } from '../../components/documents/DocumentSelector';
import { DocumentForm } from '../../components/documents/DocumentForm';
import { DocumentPreview } from '../../components/documents/DocumentPreview';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { NotesBoard } from '../../components/notes-board';

type TemplateValueMap = Record<string, Record<string, TemplateFieldValue>>;

type HydratedTemplateState = {
  template: DocumentTemplate | null;
  source: ArrayBuffer | null;
  loading: boolean;
  error: string | null;
};

const ACTION_LABELS: Record<TemplateUsageAction, string> = {
  open: 'открытие',
  fill: 'заполнение',
  preview: 'предпросмотр',
  download: 'скачивание',
};

const ACTION_ICONS: Record<TemplateUsageAction, typeof Eye> = {
  open: Eye,
  fill: PencilLine,
  preview: Eye,
  download: FileDown,
};

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString('ru-RU'),
    time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AdminTemplates() {
  const { employees } = useApp();
  const {
    templateAccess,
    templateUsageLog,
    addUserTemplateFromFile,
    replaceUserTemplateFile,
    removeTemplate,
    renameTemplate,
    setTemplateEnabled,
    setEmployeeTemplateAccess,
    setEmployeeTemplateIds,
    grantTemplateToAllEmployees,
    getTemplatesForAdmin,
    readTemplateSource,
    clearTemplateUsageLog,
  } = useDocumentTemplates();

  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [replacingTemplateId, setReplacingTemplateId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => employees[0]?.id || '');
  const [titleDraftByTemplateId, setTitleDraftByTemplateId] = useState<Record<string, string>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

  const [logEmployeeFilter, setLogEmployeeFilter] = useState('');
  const [logTemplateFilter, setLogTemplateFilter] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<'all' | TemplateUsageAction>('all');
  const [logDateFilter, setLogDateFilter] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);
  const [hydratedById, setHydratedById] = useState<Record<string, HydratedTemplateState>>({});
  const [valuesByTemplateId, setValuesByTemplateId] = useState<TemplateValueMap>({});

  const adminTemplates = useMemo(() => getTemplatesForAdmin(), [getTemplatesForAdmin]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const selectedTemplateMeta = useMemo(
    () => adminTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [adminTemplates, selectedTemplateId]
  );

  const selectedTemplateState = selectedTemplateId ? hydratedById[selectedTemplateId] : undefined;
  const selectedTemplate = selectedTemplateState?.template || null;
  const selectedTemplateSource = selectedTemplateState?.source || undefined;
  const selectedTemplateLoading = selectedTemplateState?.loading || false;
  const selectedTemplateError = selectedTemplateState?.error || null;

  const selectedFormValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return {
      ...selectedTemplate.defaults,
      ...(valuesByTemplateId[selectedTemplate.id] || {}),
    };
  }, [selectedTemplate, valuesByTemplateId]);

  const replacementValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return buildRawValueMapFromFormValues(selectedTemplate, selectedFormValues);
  }, [selectedFormValues, selectedTemplate]);

  const previewValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return buildPreviewRawValueMapFromFormValues(selectedTemplate, selectedFormValues);
  }, [selectedFormValues, selectedTemplate]);

  const fragmentLabelsById = useMemo(
    () => (selectedTemplate ? buildFieldLabelMap(selectedTemplate) : {}),
    [selectedTemplate]
  );

  const enabledTemplatesCount = useMemo(
    () => adminTemplates.filter((template) => template.enabled).length,
    [adminTemplates]
  );
  const customTemplatesCount = useMemo(
    () => adminTemplates.filter((template) => template.sourceKind === 'user').length,
    [adminTemplates]
  );

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId('');
      return;
    }

    if (!employees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (adminTemplates.length === 0) {
      setSelectedTemplateId('');
      return;
    }

    setSelectedTemplateId((previous) => {
      if (previous && adminTemplates.some((template) => template.id === previous)) {
        return previous;
      }

      return adminTemplates[0].id;
    });
  }, [adminTemplates]);

  const hydrateTemplate = useCallback(
    async (meta: DocumentTemplateMeta) => {
      setHydratedById((previous) => ({
        ...previous,
        [meta.id]: {
          template: previous[meta.id]?.template || null,
          source: previous[meta.id]?.source || null,
          loading: true,
          error: null,
        },
      }));

      try {
        const source = await readTemplateSource(meta.id);
        const fragments =
          meta.editableMode === 'markers'
            ? await extractTemplateMarkerFragments(source)
            : await extractTemplateEditableFragments(source);

        if (meta.editableMode === 'markers' && fragments.length === 0) {
          throw new Error('В документе не найдены поля формата {{field_name}}.');
        }

        const template =
          meta.editableMode === 'markers'
            ? buildMarkerDocumentTemplateConfig(meta, fragments)
            : buildDocumentTemplateConfig(meta, fragments);

        setHydratedById((previous) => ({
          ...previous,
          [meta.id]: {
            template,
            source,
            loading: false,
            error: null,
          },
        }));

        setValuesByTemplateId((previous) => ({
          ...previous,
          [meta.id]: {
            ...template.defaults,
            ...(previous[meta.id] || {}),
          },
        }));
      } catch (error) {
        setHydratedById((previous) => ({
          ...previous,
          [meta.id]: {
            template: null,
            source: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Не удалось загрузить шаблон.',
          },
        }));
      }
    },
    [readTemplateSource]
  );

  useEffect(() => {
    if (!selectedTemplateMeta) return;

    const state = hydratedById[selectedTemplateMeta.id];
    if (!state || (!state.template && !state.loading && !state.error)) {
      void hydrateTemplate(selectedTemplateMeta);
    }
  }, [hydratedById, hydrateTemplate, selectedTemplateMeta]);

  const filteredUsageLog = useMemo(() => {
    return templateUsageLog.filter((entry) => {
      if (logEmployeeFilter && entry.employeeId !== logEmployeeFilter) return false;
      if (logTemplateFilter && entry.templateId !== logTemplateFilter) return false;
      if (logActionFilter !== 'all' && entry.action !== logActionFilter) return false;
      if (logDateFilter) {
        const day = new Date(entry.timestamp).toISOString().slice(0, 10);
        if (day !== logDateFilter) return false;
      }
      return true;
    });
  }, [logActionFilter, logDateFilter, logEmployeeFilter, logTemplateFilter, templateUsageLog]);
  const usageStats = useMemo(() => {
    const stats = new Map<string, number>();
    templateUsageLog.forEach((entry) => {
      stats.set(entry.templateId, (stats.get(entry.templateId) || 0) + 1);
    });

    return adminTemplates
      .map((template) => ({
        template,
        count: stats.get(template.id) || 0,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [adminTemplates, templateUsageLog]);

  const selectedEmployeeTemplateIds = selectedEmployee ? templateAccess[selectedEmployee.id] || [] : [];

  const handleUploadTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadingTemplate(true);
      await addUserTemplateFromFile(file);
      alert('Шаблон успешно загружен.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось загрузить шаблон в систему.');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleReplaceTemplate = async (templateId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setReplacingTemplateId(templateId);
      await replaceUserTemplateFile(templateId, file);
      const templateMeta = adminTemplates.find((item) => item.id === templateId);
      if (templateMeta) {
        await hydrateTemplate(templateMeta);
      }
      alert('Файл шаблона обновлён.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось заменить файл шаблона.');
    } finally {
      setReplacingTemplateId(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    const confirmed = window.confirm(`Удалить шаблон «${title}»?`);
    if (!confirmed) return;

    try {
      await removeTemplate(templateId);
      alert('Шаблон удалён.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось удалить шаблон.');
    }
  };

  const handleStartTitleEdit = (templateId: string, title: string) => {
    setEditingTitleId(templateId);
    setTitleDraftByTemplateId((previous) => ({
      ...previous,
      [templateId]: title,
    }));
  };

  const handleSaveTitle = (templateId: string) => {
    const draft = (titleDraftByTemplateId[templateId] || '').trim();
    if (!draft) return;
    renameTemplate(templateId, draft);
    setEditingTitleId(null);
  };

  const handleGrantAllForEmployee = (grant: boolean) => {
    if (!selectedEmployee) return;
    const availableIds = adminTemplates
      .filter((template) => template.enabled)
      .map((template) => template.id);
    setEmployeeTemplateIds(selectedEmployee.id, grant ? availableIds : []);
  };

  const handleWorkspaceFieldChange = useCallback(
    (key: string, value: string) => {
      if (!selectedTemplate) return;
      setValuesByTemplateId((previous) => ({
        ...previous,
        [selectedTemplate.id]: {
          ...(previous[selectedTemplate.id] || {}),
          [key]: value,
        },
      }));
    },
    [selectedTemplate]
  );

  const handleWorkspaceListFieldChange = useCallback(
    (key: string, items: string[]) => {
      if (!selectedTemplate) return;
      setValuesByTemplateId((previous) => ({
        ...previous,
        [selectedTemplate.id]: {
          ...(previous[selectedTemplate.id] || {}),
          [key]: [...items],
        },
      }));
    },
    [selectedTemplate]
  );

  const handleWorkspaceDownload = async () => {
    if (!selectedTemplate || !selectedTemplateSource) return;

    try {
      const filled = await buildFilledTemplateBuffer(
        selectedTemplateSource,
        replacementValues,
        selectedTemplate.editableMode
      );
      const blob = new Blob([Uint8Array.from(filled)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const outputName = sanitizeFileName(selectedTemplate.title || 'document');
      saveAs(blob, `${outputName}.docx`);
    } catch {
      alert('Не удалось подготовить документ. Проверьте шаблон и заполнение полей.');
    }
  };

  const handleWorkspaceReload = async () => {
    if (!selectedTemplateMeta) return;
    await hydrateTemplate(selectedTemplateMeta);
  };

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Admin"
        title="Управление шаблонами и журналом доступа"
        description="Здесь администратор подключает юридические DOCX-шаблоны, редактирует названия, управляет доступами сотрудников и отслеживает журнал использования документов."
        actions={
          <>
            <button
              onClick={() => setShowPreview((previous) => !previous)}
              className="zan-toolbar-button zan-toolbar-button-secondary"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}
            </button>
            <button
              onClick={handleWorkspaceReload}
              disabled={selectedTemplateLoading || !selectedTemplateMeta}
              className="zan-toolbar-button zan-toolbar-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить шаблон
            </button>
            <button
              onClick={handleWorkspaceDownload}
              disabled={!selectedTemplate || !selectedTemplateSource}
              className="zan-toolbar-button zan-toolbar-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Скачать DOCX
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="zan-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-700">Всего шаблонов</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{adminTemplates.length}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">Встроенные и пользовательские DOCX в одном контуре.</p>
        </div>
        <div className="zan-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-700">Активных шаблонов</p>
          <p className="mt-3 text-4xl font-black text-emerald-700">{enabledTemplatesCount}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">Доступны для сотрудников после выдачи разрешений.</p>
        </div>
        <div className="zan-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-700">Пользовательских</p>
          <p className="mt-3 text-4xl font-black text-indigo-700">{customTemplatesCount}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">Загруженные шаблоны команды и персональные формы.</p>
        </div>
      </div>

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Рабочее пространство шаблона</h2>
            <p className="mt-1 text-sm text-slate-600">
              Открывайте шаблон, редактируйте поля и проверяйте итоговый документ перед скачиванием.
            </p>
          </div>
        </div>

        <DocumentSelector
          templates={adminTemplates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={(templateId) => {
            setSelectedTemplateId(templateId);
            setActiveFragmentId(null);
          }}
        />

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="zan-muted-card rounded-[1.5rem] p-5 xl:col-span-1">
            <h3 className="text-lg font-bold text-slate-950">Поля документа</h3>
            <p className="mt-1 text-sm text-slate-600">Форма заполняется по структуре активного документа DOCX.</p>

            <div className="mt-4">
              {selectedTemplate ? (
                <DocumentForm
                  template={selectedTemplate}
                  values={selectedFormValues}
                  loading={selectedTemplateLoading}
                  error={selectedTemplateError}
                  activeFragmentId={activeFragmentId}
                  onFieldChange={handleWorkspaceFieldChange}
                  onListFieldChange={handleWorkspaceListFieldChange}
                  onFragmentHover={setActiveFragmentId}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                  Выберите шаблон, чтобы открыть форму заполнения.
                </div>
              )}
            </div>
          </div>

          <div className="zan-muted-card rounded-[1.5rem] p-5 xl:col-span-2">
            <h3 className="text-lg font-bold text-slate-950">Предпросмотр документа</h3>
            <p className="mt-1 text-sm text-slate-600">
              Проверяйте итоговый макет до его скачивания, чтобы сразу увидеть замену полей.
            </p>

            <div className="mt-4">
              {selectedTemplate ? (
                <DocumentPreview
                  template={selectedTemplate}
                  source={selectedTemplateSource}
                  values={previewValues}
                  showPreview={showPreview}
                  loading={selectedTemplateLoading}
                  error={selectedTemplateError}
                  activeFragmentId={activeFragmentId}
                  fragmentLabelsById={fragmentLabelsById}
                  onFragmentHover={setActiveFragmentId}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500">
                  Выберите шаблон, чтобы открыть предпросмотр документа.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>
      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.04 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100">
            <FilePlus2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Библиотека шаблонов</h2>
            <p className="mt-1 text-sm text-slate-600">
              Подключайте новые DOCX, обновляйте файлы и включайте или отключайте доступные формы для команды.
            </p>
          </div>
        </div>

        <div className="zan-muted-card rounded-[1.5rem] p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FilePlus2 className="h-4 w-4" />
            Загрузить новый DOCX
          </label>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUploadTemplate}
            disabled={uploadingTemplate}
            className="zan-input w-full px-4 py-3 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">
            Поддерживаются только файлы DOCX. Максимальный размер файла: 20 МБ.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {adminTemplates.map((template) => {
            const isEditing = editingTitleId === template.id;
            const isReplacing = replacingTemplateId === template.id;
            const draftTitle = titleDraftByTemplateId[template.id] ?? template.title;

            return (
              <div key={template.id} className="zan-muted-card rounded-[1.5rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[260px] flex-1">
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={draftTitle}
                          onChange={(event) =>
                            setTitleDraftByTemplateId((previous) => ({
                              ...previous,
                              [template.id]: event.target.value,
                            }))
                          }
                          className="zan-input min-w-[260px] flex-1 px-4 py-3 text-sm"
                        />
                        <button
                          onClick={() => handleSaveTitle(template.id)}
                          className="zan-toolbar-button zan-toolbar-button-primary"
                        >
                          <Save className="h-4 w-4" />
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingTitleId(null)}
                          className="zan-toolbar-button zan-toolbar-button-secondary"
                        >
                          <X className="h-4 w-4" />
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-slate-950">{template.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                            {template.category || 'Без категории'}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${
                              template.sourceKind === 'builtin'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-violet-100 text-violet-700'
                            }`}
                          >
                            {template.sourceKind === 'builtin' ? 'Встроенный' : 'Пользовательский'}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${
                              template.enabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {template.enabled ? 'Активен' : 'Скрыт'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          {template.description || 'Описание не задано. Можно переименовать шаблон или заменить файл.'}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTemplateEnabled(template.id, !template.enabled)}
                      className={`zan-toolbar-button ${
                        template.enabled ? 'zan-toolbar-button-secondary' : 'zan-toolbar-button-primary'
                      }`}
                    >
                      {template.enabled ? 'Скрыть' : 'Включить'}
                    </button>
                    <button
                      onClick={() => handleStartTitleEdit(template.id, template.title)}
                      className="zan-toolbar-button zan-toolbar-button-secondary"
                    >
                      <PencilLine className="h-4 w-4" />
                      Переименовать
                    </button>
                    <button
                      onClick={() => grantTemplateToAllEmployees(template.id, true)}
                      className="zan-toolbar-button zan-toolbar-button-secondary"
                    >
                      <Users className="h-4 w-4" />
                      Выдать всем
                    </button>
                  </div>
                </div>

                {template.sourceKind === 'user' ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(event) => handleReplaceTemplate(template.id, event)}
                      disabled={isReplacing}
                      className="zan-input w-full px-4 py-3 text-sm"
                    />
                    <button
                      onClick={() => handleDeleteTemplate(template.id, template.title)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Доступы сотрудников</h2>
            <p className="mt-1 text-sm text-slate-600">
              Управляйте доступом к шаблонам сотрудников, чтобы каждый видел только нужные документы.
            </p>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            В системе пока нет сотрудников. Сначала добавьте карточки в разделе управления.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="zan-select min-w-[260px] px-4 py-3 text-sm"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleGrantAllForEmployee(true)}
                className="zan-toolbar-button zan-toolbar-button-primary"
              >
                Выдать все шаблоны
              </button>
              <button
                onClick={() => handleGrantAllForEmployee(false)}
                className="zan-toolbar-button zan-toolbar-button-secondary"
              >
                Снять всё
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {adminTemplates.map((template) => {
                const hasAccess = selectedEmployeeTemplateIds.includes(template.id);

                return (
                  <label
                    key={template.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                      hasAccess
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{template.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {template.enabled ? 'Доступен в системе' : 'Скрыт админом'} •{' '}
                        {template.sourceKind === 'builtin' ? 'встроенный шаблон' : 'загруженный шаблон'}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={hasAccess}
                      onChange={(event) => {
                        if (!selectedEmployee) return;
                        setEmployeeTemplateAccess(selectedEmployee.id, template.id, event.target.checked);
                      }}
                      className="h-5 w-5 rounded border-slate-300"
                    />
                  </label>
                );
              })}
            </div>

            {selectedEmployee ? (
              <p className="mt-4 text-sm text-slate-600">
                Для сотрудника <span className="font-semibold text-slate-950">{selectedEmployee.name}</span> сейчас
                доступно шаблонов: <span className="font-semibold text-indigo-700">{selectedEmployeeTemplateIds.length}</span>.
              </p>
            ) : null}
          </>
        )}
      </motion.section>
      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">Журнал использования шаблонов</h2>
              <p className="mt-1 text-sm text-slate-600">
                Смотрите, кто открывал шаблоны, заполнял поля, запускал предпросмотр и скачивал DOCX.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Очистить журнал использования шаблонов?')) {
                clearTemplateUsageLog();
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Очистить журнал
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={logEmployeeFilter}
            onChange={(event) => setLogEmployeeFilter(event.target.value)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="">Все сотрудники</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <select
            value={logTemplateFilter}
            onChange={(event) => setLogTemplateFilter(event.target.value)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="">Все шаблоны</option>
            {adminTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>

          <select
            value={logActionFilter}
            onChange={(event) => setLogActionFilter(event.target.value as 'all' | TemplateUsageAction)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="all">Все действия</option>
            <option value="open">Открытие</option>
            <option value="fill">Заполнение</option>
            <option value="preview">Предпросмотр</option>
            <option value="download">Скачивание</option>
          </select>

          <input
            type="date"
            value={logDateFilter}
            onChange={(event) => setLogDateFilter(event.target.value)}
            className="zan-input px-4 py-3 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {usageStats.map((item) => (
            <div key={item.template.id} className="zan-muted-card rounded-[1.25rem] p-4">
              <p className="truncate text-sm font-semibold text-slate-950">{item.template.title}</p>
              <p className="mt-2 text-2xl font-black text-amber-600">{item.count}</p>
              <p className="text-xs text-slate-500">действий в журнале</p>
            </div>
          ))}
        </div>

        {filteredUsageLog.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            По текущим фильтрам записи не найдены.
          </div>
        ) : (
          <div className="custom-scrollbar mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {filteredUsageLog.map((entry) => {
              const Icon = ACTION_ICONS[entry.action];
              const date = formatDateTime(entry.timestamp);

              return (
                <div key={entry.id} className="zan-muted-card rounded-[1.25rem] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                        <Icon className="h-4 w-4 text-slate-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {entry.employeeName} — {ACTION_LABELS[entry.action]}
                        </p>
                        <p className="truncate text-xs text-slate-500">Шаблон: {entry.templateName}</p>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-500">
                      {date.date} — {date.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>
      <NotesBoard
        scope="document"
        relatedTemplateId={selectedTemplateId || undefined}
        title="Заметки по шаблонам и проверке"
        description="Админские комментарии, пометки и быстрые схемы по текущему шаблону и проверкам документов."
      />
    </div>
  );
}
