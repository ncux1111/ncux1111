import { MessageCircleMore } from 'lucide-react';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { SiteLeadsBoard } from '../../components/admin/site-leads-board';

export function AdminCrm() {
  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / CRM"
        title="Заявки и обращения с сайта"
        description="Здесь собраны все заявки с формы, кнопки консультации, WhatsApp, Telegram и QR-кодов. Статусы и данные сохраняются в текущем local storage слое без изменений."
        actions={
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/90">
            <MessageCircleMore className="h-4 w-4" />
            CRM лидов
          </div>
        }
      />

      <SiteLeadsBoard />
    </div>
  );
}
