import type { DocumentReviewRecord, DocumentReviewStatus, DocumentReviewSubmitMode } from '../context/OperationsContext';

export function formatDocumentReviewDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function documentReviewStatusLabel(status: DocumentReviewStatus) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'in_review':
      return 'На проверке';
    case 'approved':
      return 'Одобрено';
    case 'rejected':
      return 'Отклонено';
    case 'changes_requested':
      return 'Возвращено на доработку';
    default:
      return 'Новая';
  }
}

export function documentReviewStatusTone(status: DocumentReviewStatus) {
  switch (status) {
    case 'new':
      return 'bg-sky-100 text-sky-700';
    case 'in_review':
      return 'bg-amber-100 text-amber-700';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    case 'changes_requested':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function documentReviewSubmitModeLabel(mode: DocumentReviewSubmitMode) {
  return mode === 'preview' ? 'Из текущего предпросмотра' : 'Загруженный файл';
}

function documentReviewSortRank(status: DocumentReviewStatus) {
  switch (status) {
    case 'new':
      return 0;
    case 'in_review':
      return 1;
    case 'changes_requested':
      return 2;
    case 'rejected':
      return 3;
    case 'approved':
      return 4;
    default:
      return 9;
  }
}

export function sortDocumentReviews(items: DocumentReviewRecord[]) {
  return [...items].sort((left, right) => {
    const rankDelta = documentReviewSortRank(left.status) - documentReviewSortRank(right.status);
    if (rankDelta !== 0) return rankDelta;
    return right.submittedAt - left.submittedAt;
  });
}
