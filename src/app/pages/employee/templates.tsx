import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  RefreshCw,
  Send,
  Upload,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import {
  useDocumentTemplates,
  type DocumentTemplate,
  type DocumentTemplateMeta,
  type TemplateFieldValue,
  buildDocumentTemplateConfig,
  buildFieldLabelMap,
  buildMarkerDocumentTemplateConfig,
  buildPreviewRawValueMapFromFormValues,
  buildRawValueMapFromFormValues,
  extractTemplateEditableFragments,
  extractTemplateMarkerFragments,
} from '../../modules/templates';
import { buildFilledTemplateBuffer } from '../../modules/templates/templateDocx';
import { DocumentSelector } from '../../components/documents/DocumentSelector';
import { DocumentForm } from '../../components/documents/DocumentForm';
import { DocumentPreview } from '../../components/documents/DocumentPreview';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { NotesBoard } from '../../components/notes-board';
import {
  documentReviewStatusLabel,
  documentReviewStatusTone,
  formatDocumentReviewDate,
} from '../../utils/documentReviewPresentation';

type TemplateValueMap = Record<string, Record<string, TemplateFieldValue>>;

type HydratedTemplateState = {
  template: DocumentTemplate | null;
  source: ArrayBuffer | null;
  loading: boolean;
  error: string | null;
};

type ReviewSubmitMode = 'preview' | 'file';
type ReviewFeedbackTone = 'success' | 'error';

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
}

export function EmployeeTemplates() {
  const { currentUser } = useApp();
  const { submitDocumentReview, documentReviews } = useOperations();
  const { getTemplatesForEmployee, readTemplateSource, logTemplateUsage } = useDocumentTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [hydratedById, setHydratedById] = useState<Record<string, HydratedTemplateState>>({});
  const [valuesByTemplateId, setValuesByTemplateId] = useState<TemplateValueMap>({});
  const [showPreview, setShowPreview] = useState(true);
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);

  const [reviewSubmitMode, setReviewSubmitMode] = useState<ReviewSubmitMode>('preview');
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewFeedbackTone, setReviewFeedbackTone] = useState<ReviewFeedbackTone>('success');

  const actionGuardRef = useRef<Record<string, number>>({});
  const lastOpenedTemplateRef = useRef<string | null>(null);
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null);

  const availableTemplates = useMemo(() => {
    if (!currentUser || currentUser.role !== 'employee') return [];
    return getTemplatesForEmployee(currentUser.id);
  }, [currentUser, getTemplatesForEmployee]);

  useEffect(() => {
    if (availableTemplates.length === 0) {
      setSelectedTemplateId('');
      return;
    }

    setSelectedTemplateId((previous) => {
      if (previous && availableTemplates.some((template) => template.id === previous)) {
        return previous;
      }

      return availableTemplates[0].id;
    });
  }, [availableTemplates]);

  const trackAction = useCallback(
    (action: 'open' | 'fill' | 'preview' | 'download', template: DocumentTemplateMeta) => {
      if (!currentUser || currentUser.role !== 'employee') return;

      const gateKey = `${action}:${template.id}`;
      const now = Date.now();
      const minimalInterval = action === 'fill' ? 5000 : 1200;

      const lastTime = actionGuardRef.current[gateKey] || 0;
      if (now - lastTime < minimalInterval) return;

      actionGuardRef.current[gateKey] = now;

      logTemplateUsage({
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        templateId: template.id,
        templateName: template.title,
        action,
      });
    },
    [currentUser, logTemplateUsage]
  );

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
    if (!selectedTemplateId) return;

    const meta = availableTemplates.find((item) => item.id === selectedTemplateId);
    if (!meta) return;

    const state = hydratedById[selectedTemplateId];
    if (!state || (!state.template && !state.loading && !state.error)) {
      void hydrateTemplate(meta);
    }

    if (lastOpenedTemplateRef.current !== selectedTemplateId) {
      trackAction('open', meta);
      lastOpenedTemplateRef.current = selectedTemplateId;
    }
  }, [availableTemplates, hydratedById, hydrateTemplate, selectedTemplateId, trackAction]);

  const selectedMeta = availableTemplates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedState = selectedTemplateId ? hydratedById[selectedTemplateId] : undefined;
  const selectedTemplate = selectedState?.template || null;
  const selectedSource = selectedState?.source || undefined;
  const selectedLoading = selectedState?.loading || false;
  const selectedError = selectedState?.error || null;

  const selectedFormValues = useMemo(() => {
    if (!selectedTemplate) return {};

    return {
      ...selectedTemplate.defaults,
      ...(valuesByTemplateId[selectedTemplate.id] || {}),
    };
  }, [selectedTemplate, valuesByTemplateId]);

  const selectedReplacementValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return buildRawValueMapFromFormValues(selectedTemplate, selectedFormValues);
  }, [selectedFormValues, selectedTemplate]);

  const selectedPreviewReplacementValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return buildPreviewRawValueMapFromFormValues(selectedTemplate, selectedFormValues);
  }, [selectedFormValues, selectedTemplate]);
  const deferredPreviewReplacementValues = useDeferredValue(selectedPreviewReplacementValues);

  const fragmentLabelsById = useMemo(
    () => (selectedTemplate ? buildFieldLabelMap(selectedTemplate) : {}),
    [selectedTemplate]
  );

  const generatedReviewFileName = useMemo(() => {
    if (!selectedMeta) return '';
    return `${sanitizeFileName(selectedMeta.title || 'document')}.docx`;
  }, [selectedMeta]);

  const myDocumentReviews = useMemo(() => {
    return documentReviews
      .filter((review) => review.employeeId === currentUser?.id)
      .sort((left, right) => right.submittedAt - left.submittedAt)
      .slice(0, 6);
  }, [currentUser?.id, documentReviews]);

  const canSubmitReview = useMemo(() => {
    if (!selectedMeta || reviewSubmitting) return false;

    if (reviewSubmitMode === 'preview') {
      return Boolean(selectedTemplate && selectedSource);
    }

    return Boolean(reviewFile);
  }, [reviewFile, reviewSubmitMode, reviewSubmitting, selectedMeta, selectedSource, selectedTemplate]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveFragmentId(null);
    setReviewFeedback('');
  }, []);

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      if (!selectedTemplate || !selectedMeta) return;

      setValuesByTemplateId((previous) => ({
        ...previous,
        [selectedTemplate.id]: {
          ...(previous[selectedTemplate.id] || {}),
          [key]: value,
        },
      }));
      trackAction('fill', selectedMeta);
    },
    [selectedMeta, selectedTemplate, trackAction]
  );

  const handleListFieldChange = useCallback(
    (key: string, items: string[]) => {
      if (!selectedTemplate || !selectedMeta) return;

      setValuesByTemplateId((previous) => ({
        ...previous,
        [selectedTemplate.id]: {
          ...(previous[selectedTemplate.id] || {}),
          [key]: [...items],
        },
      }));
      trackAction('fill', selectedMeta);
    },
    [selectedMeta, selectedTemplate, trackAction]
  );

  const handleTogglePreview = () => {
    const next = !showPreview;
    setShowPreview(next);

    if (next && selectedMeta) {
      trackAction('preview', selectedMeta);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedTemplate || !selectedSource || !selectedMeta) return;

    try {
      const filled = await buildFilledTemplateBuffer(
        selectedSource,
        selectedReplacementValues,
        selectedTemplate.editableMode
      );
      const blob = new Blob([Uint8Array.from(filled)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      saveAs(blob, generatedReviewFileName);
      trackAction('download', selectedMeta);
    } catch {
      alert('Не удалось собрать документ. Проверьте заполнение полей и попробуйте ещё раз.');
    }
  };

  const handleReloadTemplate = async () => {
    if (!selectedMeta) return;
    await hydrateTemplate(selectedMeta);
  };

  const handleReviewModeChange = (mode: ReviewSubmitMode) => {
    setReviewSubmitMode(mode);
    setReviewFeedback('');
  };

  const handleReviewFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReviewFile(event.target.files?.[0] || null);
    setReviewFeedback('');
  };

  const handleSubmitForReview = async () => {
    if (!selectedMeta) {
      setReviewFeedbackTone('error');
      setReviewFeedback('Сначала выберите шаблон, который нужно отправить на проверку.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewFeedback('');

      if (reviewSubmitMode === 'preview') {
        if (!selectedTemplate || !selectedSource) {
          throw new Error('Текущий шаблон ещё не готов к отправке. Дождитесь загрузки предпросмотра.');
        }

        const filled = await buildFilledTemplateBuffer(
          selectedSource,
          selectedReplacementValues,
          selectedTemplate.editableMode
        );
        const blob = new Blob([Uint8Array.from(filled)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        await submitDocumentReview({
          templateId: selectedMeta.id,
          templateName: selectedMeta.title,
          comment: reviewComment,
          file: blob,
          fileName: generatedReviewFileName,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          submitMode: 'preview',
          snapshotValues: selectedFormValues,
          previewSource: {
            source: 'current-preview',
            editableMode: selectedTemplate.editableMode,
            generatedAt: Date.now(),
          },
        });
      } else {
        if (!reviewFile) {
          throw new Error('Выберите файл, который нужно отправить администратору на проверку.');
        }

        await submitDocumentReview({
          templateId: selectedMeta.id,
          templateName: selectedMeta.title,
          comment: reviewComment,
          file: reviewFile,
          fileName: reviewFile.name,
          mimeType: reviewFile.type,
          submitMode: 'file',
        });

        setReviewFile(null);
        if (reviewFileInputRef.current) {
          reviewFileInputRef.current.value = '';
        }
      }

      setReviewComment('');
      setReviewFeedbackTone('success');
      setReviewFeedback('Документ отправлен администратору на проверку.');
    } catch (error) {
      setReviewFeedbackTone('error');
      setReviewFeedback(
        error instanceof Error ? error.message : 'Не удалось отправить документ на проверку.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!currentUser || currentUser.role !== 'employee') {
    return null;
  }

  if (availableTemplates.length === 0) {
    return (
      <div className="space-y-6">
        <InternalPageHero
          eyebrow="Документы"
          title="Шаблоны ZAN QDM"
          description="Когда администратор выдаст вам доступ к шаблонам, они появятся здесь вместе с предпросмотром и скачиванием DOCX."
        />

        <div className="zan-section-card rounded-[2rem] border border-dashed p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Шаблоны пока недоступны</h2>
          <p className="mt-2 text-sm text-slate-600">
            Обратитесь к администратору, чтобы получить доступ к нужным документам и шаблонам.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="Документы"
        title="Шаблоны документов ZAN QDM"
        description="Выбирайте разрешённые шаблоны, заполняйте поля, проверяйте предпросмотр и скачивайте готовый DOCX без выхода из личного кабинета."
      />

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Рабочее пространство шаблонов</h2>
            </div>
            <p className="text-sm text-slate-600">
              Данные автосохраняются в форме текущей сессии. Предпросмотр и скачивание используют те же значения.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              onClick={handleTogglePreview}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}
            </button>
            <button
              onClick={handleReloadTemplate}
              disabled={selectedLoading || !selectedMeta}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить шаблон
            </button>
            <button
              onClick={handleDownloadTemplate}
              disabled={!selectedTemplate || !selectedSource}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Скачать DOCX
            </button>
          </div>
        </div>

        <div className="mt-4">
          <DocumentSelector
            templates={availableTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="zan-section-card rounded-[2rem] p-6 xl:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">Поля документа</h3>
          </div>
          {selectedTemplate ? (
            <DocumentForm
              template={selectedTemplate}
              values={selectedFormValues}
              loading={selectedLoading}
              error={selectedError}
              activeFragmentId={activeFragmentId}
              onFieldChange={handleFieldChange}
              onListFieldChange={handleListFieldChange}
              onFragmentHover={setActiveFragmentId}
            />
          ) : (
            <p className="text-sm text-slate-500">Выберите шаблон, чтобы открыть форму заполнения.</p>
          )}
        </div>

        <div className="zan-section-card rounded-[2rem] p-6 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <h3 className="text-xl font-bold text-slate-900">Предпросмотр документа</h3>
          </div>
          {selectedTemplate ? (
            <DocumentPreview
              template={selectedTemplate}
              source={selectedSource}
              values={deferredPreviewReplacementValues}
              showPreview={showPreview}
              loading={selectedLoading}
              error={selectedError}
              activeFragmentId={activeFragmentId}
              fragmentLabelsById={fragmentLabelsById}
              onFragmentHover={setActiveFragmentId}
            />
          ) : (
            <p className="text-sm text-slate-500">Выберите шаблон, чтобы увидеть предпросмотр.</p>
          )}
        </div>
      </div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-emerald-600" />
          <h3 className="text-xl font-bold text-slate-900">Отправить админу на проверку</h3>
        </div>
        <p className="text-sm text-slate-600">
          Выберите, как отправить документ на проверку: текущую заполненную версию из предпросмотра или уже готовый файл.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => handleReviewModeChange('preview')}
            className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
              reviewSubmitMode === 'preview'
                ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-emerald-600" />
              Текущая версия из предпросмотра
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Админу будет отправлен документ, собранный из текущих заполненных полей.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleReviewModeChange('file')}
            className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
              reviewSubmitMode === 'file'
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Upload className="h-4 w-4 text-blue-600" />
              Готовый файл
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Загрузите документ, если вы уже скачали его, доработали и хотите отправить именно этот файл.
            </p>
          </button>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {reviewSubmitMode === 'preview'
                  ? 'Будет отправлена текущая версия документа из предпросмотра.'
                  : 'Будет отправлен загруженный файл.'}
              </p>
              <p className="text-sm text-slate-600">
                Активный шаблон:{' '}
                <span className="font-medium text-slate-900">{selectedMeta?.title || 'Не выбран'}</span>
              </p>
              {reviewSubmitMode === 'preview' ? (
                <p className="text-sm text-slate-600">
                  Файл сформируется автоматически в DOCX:{' '}
                  <span className="font-medium text-slate-900">{generatedReviewFileName}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Поддерживаются готовые документы DOC, DOCX и PDF.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="zan-muted-card rounded-[1.5rem] p-4">
            {reviewSubmitMode === 'preview' ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Текущая версия из предпросмотра</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Будет сформирован итоговый DOCX на основе текущих значений формы и отправлен администратору как вложение для проверки.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Файл будет собран автоматически. Скачивать документ вручную перед отправкой не нужно.
                </div>
              </div>
            ) : (
              <label className="block space-y-3">
                <div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Upload className="h-4 w-4 text-blue-600" />
                    Готовый файл
                  </span>
                  <p className="mt-1 text-sm text-slate-600">
                    Загрузите документ, если вы уже скачали его, доработали и хотите отправить именно этот файл.
                  </p>
                </div>
                <input
                  ref={reviewFileInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf"
                  className="zan-input w-full px-4 py-3 text-sm"
                  onChange={handleReviewFileChange}
                />
                <p className="text-sm text-slate-600">
                  {reviewFile ? (
                    <span className="font-medium text-slate-900">{reviewFile.name}</span>
                  ) : (
                    'Файл пока не выбран.'
                  )}
                </p>
              </label>
            )}
          </div>

          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <span className="mb-2 block text-sm font-semibold text-slate-900">Комментарий для администратора</span>
            <textarea
              value={reviewComment}
              onChange={(event) => {
                setReviewComment(event.target.value);
                if (reviewFeedback) {
                  setReviewFeedback('');
                }
              }}
              className="zan-textarea min-h-[160px] w-full px-4 py-3 text-sm"
              placeholder="Что нужно проверить, на что обратить внимание, какой шаблон использовался"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            После отправки поля документа останутся заполненными, а администратор увидит новую заявку на проверку.
          </p>

          <button
            onClick={handleSubmitForReview}
            disabled={!canSubmitReview}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
            {reviewSubmitting ? 'Отправляем...' : 'Отправить на проверку'}
          </button>
        </div>

        {reviewSubmitMode === 'file' && !reviewFile ? (
          <p className="mt-3 text-sm text-slate-500">
            Чтобы отправить готовый файл, сначала выберите документ для загрузки.
          </p>
        ) : null}

        {reviewFeedback ? (
          <div
            className={`mt-4 flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-sm ${
              reviewFeedbackTone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="mt-0.5">
              {reviewFeedbackTone === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <p>{reviewFeedback}</p>
          </div>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-900">Мои отправки на проверку</h3>
        </div>

        {myDocumentReviews.length === 0 ? (
          <p className="text-sm text-slate-500">
            Вы ещё не отправляли документы администратору на проверку.
          </p>
        ) : (
          <div className="space-y-3">
            {myDocumentReviews.map((review) => (
              <div key={review.id} className="zan-muted-card rounded-[1.4rem] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{review.templateName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Отправлено: {formatDocumentReviewDate(review.submittedAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${documentReviewStatusTone(review.status)}`}
                  >
                    {documentReviewStatusLabel(review.status)}
                  </span>
                </div>

                {review.adminComment ? (
                  <p className="mt-3 text-sm text-slate-700">
                    Комментарий администратора: {review.adminComment}
                  </p>
                ) : null}

                {review.rewardApplied ? (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Баллы начислены: {review.awardedPoints || 0}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <NotesBoard
        scope="document"
        ownerId={currentUser.id}
        relatedTemplateId={selectedMeta?.id}
        title="Заметки по документам"
        description="Личные комментарии и быстрые зарисовки по выбранному шаблону."
      />
    </div>
  );
}