import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  MessageSquareWarning,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useOperations, type DocumentReviewRecord, type DocumentReviewStatus } from '../../context/OperationsContext';
import {
  useDocumentTemplates,
  buildDocumentTemplateConfig,
  buildFieldLabelMap,
  buildMarkerDocumentTemplateConfig,
  extractTemplateEditableFragments,
  extractTemplateMarkerFragments,
} from '../../modules/templates';
import {
  documentReviewStatusLabel,
  documentReviewStatusTone,
  documentReviewSubmitModeLabel,
  formatDocumentReviewDate,
  sortDocumentReviews,
} from '../../utils/documentReviewPresentation';

type SnapshotLabelState = {
  labels: Record<string, string>;
  loading: boolean;
  error: boolean;
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="zan-stat-card rounded-[1.6rem] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-600">{label}</p>
      <p className={`mt-3 text-4xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

function SnapshotValue({ value }: { value: string | string[] }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {item}
          </span>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-slate-700">{value || '—'}</span>;
}

function normalizeSnapshotEntryValue(value: string | string[]) {
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => item.trim()).filter(Boolean);
    return normalizedItems.length > 0 ? normalizedItems : null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function humanizeSnapshotKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function DocumentReviewBoard() {
  const { documentReviews, updateDocumentReview, getDocumentReviewObjectUrl } = useOperations();
  const { templates, readTemplateSource } = useDocumentTemplates();

  const [employeeFilter, setEmployeeFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentReviewStatus>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [applyReward, setApplyReward] = useState(true);
  const [awardedPoints, setAwardedPoints] = useState('10');
  const [awardedReason, setAwardedReason] = useState('Баллы за качественное заполнение документа');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);
  const [snapshotLabelsByTemplateId, setSnapshotLabelsByTemplateId] = useState<Record<string, SnapshotLabelState>>({});

  const sortedReviews = useMemo(() => sortDocumentReviews(documentReviews), [documentReviews]);
  const templateMetaById = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.id, template])),
    [templates]
  );

  const employeeOptions = useMemo(
    () =>
      Array.from(
        new Map(sortedReviews.map((review) => [review.employeeId, review.employeeName])).entries()
      ),
    [sortedReviews]
  );

  const templateOptions = useMemo(
    () =>
      Array.from(
        new Map(sortedReviews.map((review) => [review.templateId, review.templateName])).entries()
      ),
    [sortedReviews]
  );

  const filteredReviews = useMemo(() => {
    return sortedReviews.filter((review) => {
      if (employeeFilter && review.employeeId !== employeeFilter) return false;
      if (templateFilter && review.templateId !== templateFilter) return false;
      if (statusFilter !== 'all' && review.status !== statusFilter) return false;
      if (dateFilter) {
        const day = new Date(review.submittedAt).toISOString().slice(0, 10);
        if (day !== dateFilter) return false;
      }
      return true;
    });
  }, [dateFilter, employeeFilter, sortedReviews, statusFilter, templateFilter]);

  useEffect(() => {
    if (filteredReviews.length === 0) {
      setActiveReviewId(null);
      return;
    }

    if (!filteredReviews.some((review) => review.id === activeReviewId)) {
      setActiveReviewId(filteredReviews[0].id);
    }
  }, [activeReviewId, filteredReviews]);

  const activeReview = filteredReviews.find((review) => review.id === activeReviewId) || null;

  useEffect(() => {
    if (!activeReview) return;

    setAdminComment(activeReview.adminComment || '');
    setAwardedPoints(String(activeReview.awardedPoints || 10));
    setAwardedReason(activeReview.awardedReason || 'Баллы за качественное заполнение документа');
    setApplyReward(!activeReview.rewardApplied);
    setSnapshotExpanded(!Boolean(activeReview.fileName));
  }, [activeReview]);

  const hydrateSnapshotLabels = useCallback(
    async (templateId: string) => {
      const meta = templateMetaById[templateId];
      if (!meta) return;

      setSnapshotLabelsByTemplateId((previous) => ({
        ...previous,
        [templateId]: {
          labels: previous[templateId]?.labels || {},
          loading: true,
          error: false,
        },
      }));

      try {
        const source = await readTemplateSource(templateId);
        const fragments =
          meta.editableMode === 'markers'
            ? await extractTemplateMarkerFragments(source)
            : await extractTemplateEditableFragments(source);
        const template =
          meta.editableMode === 'markers'
            ? buildMarkerDocumentTemplateConfig(meta, fragments)
            : buildDocumentTemplateConfig(meta, fragments);

        setSnapshotLabelsByTemplateId((previous) => ({
          ...previous,
          [templateId]: {
            labels: buildFieldLabelMap(template),
            loading: false,
            error: false,
          },
        }));
      } catch {
        setSnapshotLabelsByTemplateId((previous) => ({
          ...previous,
          [templateId]: {
            labels: previous[templateId]?.labels || {},
            loading: false,
            error: true,
          },
        }));
      }
    },
    [readTemplateSource, templateMetaById]
  );

  useEffect(() => {
    if (!activeReview?.snapshotValues) return;

    const state = snapshotLabelsByTemplateId[activeReview.templateId];
    if (!state || (!state.loading && Object.keys(state.labels).length === 0 && !state.error)) {
      void hydrateSnapshotLabels(activeReview.templateId);
    }
  }, [activeReview, hydrateSnapshotLabels, snapshotLabelsByTemplateId]);

  const summary = useMemo(() => {
    return {
      total: sortedReviews.length,
      newCount: sortedReviews.filter((review) => review.status === 'new').length,
      inReviewCount: sortedReviews.filter((review) => review.status === 'in_review').length,
      approvedCount: sortedReviews.filter((review) => review.status === 'approved').length,
      rejectedCount: sortedReviews.filter(
        (review) => review.status === 'rejected' || review.status === 'changes_requested'
      ).length,
    };
  }, [sortedReviews]);

  const nextNewReview = filteredReviews.find((review) => review.status === 'new') || null;
  const activeSnapshotLabelState = activeReview ? snapshotLabelsByTemplateId[activeReview.templateId] : undefined;
  const activeSnapshotEntries = useMemo(() => {
    if (!activeReview?.snapshotValues) return [];

    const labels = activeSnapshotLabelState?.labels || {};

    return Object.entries(activeReview.snapshotValues)
      .map(([key, value]) => {
        const normalizedValue = normalizeSnapshotEntryValue(value);
        if (!normalizedValue) return null;

        return {
          key,
          label: labels[key] || humanizeSnapshotKey(key),
          value: normalizedValue,
        };
      })
      .filter((entry): entry is { key: string; label: string; value: string | string[] } => Boolean(entry));
  }, [activeReview, activeSnapshotLabelState]);

  const handleDownload = async (review: DocumentReviewRecord) => {
    const url = await getDocumentReviewObjectUrl(review.storageId);
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = review.fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDecision = async (status: DocumentReviewStatus) => {
    if (!activeReview) return;

    try {
      setSubmittingDecision(true);
      await updateDocumentReview({
        reviewId: activeReview.id,
        status,
        adminComment,
        awardedPoints: applyReward && !activeReview.rewardApplied ? Number(awardedPoints) : 0,
        awardedReason: applyReward && !activeReview.rewardApplied ? awardedReason : undefined,
      });
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Всего отправок" value={summary.total} tone="text-slate-950" />
        <SummaryCard label="Новые" value={summary.newCount} tone="text-sky-700" />
        <SummaryCard label="На проверке" value={summary.inReviewCount} tone="text-amber-700" />
        <SummaryCard label="Одобрено" value={summary.approvedCount} tone="text-emerald-700" />
        <SummaryCard label="Отклонено / доработка" value={summary.rejectedCount} tone="text-rose-700" />
      </div>

      <div className="zan-section-card rounded-[2rem] p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Filter className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Фильтры и очередь проверок</h2>
              <p className="mt-1 text-sm text-slate-600">
                Новые заявки показываются первыми. Можно быстро открыть следующий новый документ и перейти к решению.
              </p>
            </div>
          </div>

          {nextNewReview ? (
            <button
              onClick={() => setActiveReviewId(nextNewReview.id)}
              className="zan-toolbar-button zan-toolbar-button-primary"
            >
              <Sparkles className="h-4 w-4" />
              Открыть следующий новый документ
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="">Все сотрудники</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="">Все шаблоны</option>
            {templateOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | DocumentReviewStatus)}
            className="zan-select px-4 py-3 text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новые</option>
            <option value="in_review">На проверке</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
            <option value="changes_requested">На доработке</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="zan-input px-4 py-3 text-sm"
          />
        </div>

        {filteredReviews.length === 0 ? (
          <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
            Пока нет отправленных документов на проверку.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={() => setActiveReviewId(review.id)}
                  className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    activeReviewId === review.id
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-950">{review.employeeName}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${documentReviewStatusTone(review.status)}`}
                    >
                      {documentReviewStatusLabel(review.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{review.templateName}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{formatDocumentReviewDate(review.submittedAt)}</span>
                    <span>{documentReviewSubmitModeLabel(review.submitMode)}</span>
                    {review.rewardApplied ? (
                      <span className="font-semibold text-emerald-700">
                        Баллы начислены: {review.awardedPoints || 0}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {activeReview ? (
              <article className="zan-muted-card rounded-[1.8rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-950">{activeReview.employeeName}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${documentReviewStatusTone(activeReview.status)}`}
                      >
                        {documentReviewStatusLabel(activeReview.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Шаблон: <span className="font-medium text-slate-900">{activeReview.templateName}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Отправлено: <span className="font-medium text-slate-900">{formatDocumentReviewDate(activeReview.submittedAt)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Способ отправки:{' '}
                      <span className="font-medium text-slate-900">
                        {documentReviewSubmitModeLabel(activeReview.submitMode)}
                      </span>
                    </p>
                    {activeReview.employeeLogin ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Логин сотрудника: <span className="font-medium text-slate-900">{activeReview.employeeLogin}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleDownload(activeReview)}
                      className="zan-toolbar-button zan-toolbar-button-secondary"
                    >
                      <Download className="h-4 w-4" />
                      Скачать файл
                    </button>
                    <button
                      onClick={() => void handleDecision('in_review')}
                      disabled={submittingDecision || activeReview.status === 'in_review'}
                      className="zan-toolbar-button zan-toolbar-button-secondary disabled:opacity-50"
                    >
                      <Clock3 className="h-4 w-4" />
                      На проверке
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Комментарий сотрудника</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {activeReview.comment || 'Комментарий не добавлен.'}
                    </p>
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Файл: <span className="font-medium text-slate-900">{activeReview.fileName}</span>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-900">Комментарий администратора</span>
                      <textarea
                        value={adminComment}
                        onChange={(event) => setAdminComment(event.target.value)}
                        className="zan-textarea min-h-[140px] px-4 py-3 text-sm"
                        placeholder="Что исправить, что проверено, почему документ принят или отклонён"
                      />
                    </label>
                  </div>
                </div>

                {activeReview.snapshotValues && activeSnapshotEntries.length > 0 ? (
                  <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-600" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Данные из заполненной формы</p>
                          <p className="text-xs text-slate-500">
                            Поля показываются по читаемым названиям, без технических ключей шаблона.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSnapshotExpanded((previous) => !previous)}
                        className="zan-toolbar-button zan-toolbar-button-secondary"
                      >
                        <Eye className="h-4 w-4" />
                        {snapshotExpanded ? 'Скрыть заполненные поля' : 'Показать заполненные поля'}
                      </button>
                    </div>

                    {!snapshotExpanded ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Snapshot свернут по умолчанию, потому что к проверке уже приложен файл. Разверните блок, если нужно проверить заполненные поля.
                      </div>
                    ) : activeSnapshotLabelState?.loading ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Загружаем подписи полей шаблона...
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {activeSnapshotEntries.map((entry) => (
                          <div
                            key={entry.key}
                            className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]"
                          >
                            <p className="text-sm font-semibold text-slate-800">{entry.label}</p>
                            <div className="min-w-0">
                              <SnapshotValue value={entry.value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Начисление баллов</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Использует существующую систему начисления и не даёт применить награду дважды для одной и той же проверки.
                      </p>
                    </div>
                    {activeReview.rewardApplied ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Баллы уже начислены: {activeReview.awardedPoints || 0}
                      </span>
                    ) : null}
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={applyReward}
                      onChange={(event) => setApplyReward(event.target.checked)}
                      disabled={activeReview.rewardApplied}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Начислить баллы за эту проверку
                    </span>
                  </label>

                  <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Количество баллов</span>
                      <input
                        type="number"
                        min="0"
                        value={awardedPoints}
                        onChange={(event) => setAwardedPoints(event.target.value)}
                        disabled={!applyReward || activeReview.rewardApplied}
                        className="zan-input px-4 py-3 text-sm disabled:opacity-60"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Причина начисления</span>
                      <input
                        type="text"
                        value={awardedReason}
                        onChange={(event) => setAwardedReason(event.target.value)}
                        disabled={!applyReward || activeReview.rewardApplied}
                        className="zan-input px-4 py-3 text-sm disabled:opacity-60"
                        placeholder="Баллы за качественное заполнение документа"
                      />
                    </label>
                  </div>
                </div>

                {activeReview.reviewedByAdminName || activeReview.reviewedAt ? (
                  <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {activeReview.reviewedByAdminName ? (
                      <p>
                        Последнее решение принял:{' '}
                        <span className="font-medium text-slate-900">{activeReview.reviewedByAdminName}</span>
                      </p>
                    ) : null}
                    {activeReview.reviewedAt ? (
                      <p className="mt-1">
                        Время решения:{' '}
                        <span className="font-medium text-slate-900">
                          {formatDocumentReviewDate(activeReview.reviewedAt)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleDecision('approved')}
                    disabled={submittingDecision}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Одобрить
                    </span>
                  </button>
                  <button
                    onClick={() => void handleDecision('changes_requested')}
                    disabled={submittingDecision}
                    className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4" />
                      Вернуть на доработку
                    </span>
                  </button>
                  <button
                    onClick={() => void handleDecision('rejected')}
                    disabled={submittingDecision}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Отклонить
                    </span>
                  </button>
                </div>
              </article>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
