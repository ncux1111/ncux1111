import { FileCheck2 } from 'lucide-react';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { DocumentReviewBoard } from '../../components/admin/document-review-board';

export function AdminReviews() {
  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Admin"
        title="Проверка документов сотрудников"
        description="Здесь администратор просматривает отправленные документы, оставляет комментарии, принимает решение и при необходимости начисляет баллы за качественную работу."
        actions={
          <div className="zan-toolbar-button zan-toolbar-button-secondary">
            <FileCheck2 className="h-4 w-4" />
            Очередь проверок
          </div>
        }
      />

      <DocumentReviewBoard />
    </div>
  );
}
