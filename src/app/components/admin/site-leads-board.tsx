import { useMemo } from 'react';
import { MessageCircleMore, PhoneCall, Send, Sparkles } from 'lucide-react';
import { useOperations, type LeadSource, type LeadStatus } from '../../context/OperationsContext';

const SOURCE_LABELS: Record<LeadSource, string> = {
  'consultation-button': 'Кнопка консультации',
  'contact-form': 'Форма заявки',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  'qr-whatsapp': 'QR WhatsApp',
  'qr-telegram': 'QR Telegram',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В обработке',
  contacted: 'Связались',
  closed: 'Закрыта',
};

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SiteLeadsBoard() {
  const { siteLeads, updateLeadStatus } = useOperations();

  const summary = useMemo(() => {
    return {
      total: siteLeads.length,
      open: siteLeads.filter((lead) => lead.status === 'new' || lead.status === 'in_progress').length,
      whatsapp: siteLeads.filter((lead) => lead.source === 'whatsapp' || lead.source === 'qr-whatsapp').length,
      telegram: siteLeads.filter((lead) => lead.source === 'telegram' || lead.source === 'qr-telegram').length,
    };
  }, [siteLeads]);

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <MessageCircleMore className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">CRM заявок с сайта</h2>
          <p className="mt-1 text-sm text-slate-600">
            Здесь собираются обращения с формы заявки, кнопки консультации, WhatsApp, Telegram и QR-кодов.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <div className="zan-stat-card rounded-[1.6rem] p-4">
          <p className="text-sm text-slate-500">Всего заявок</p>
          <p className="score-number mt-2 text-4xl font-black text-slate-950">{summary.total}</p>
        </div>
        <div className="zan-stat-card rounded-[1.6rem] p-4">
          <p className="text-sm text-slate-500">Открытые</p>
          <p className="score-number mt-2 text-4xl font-black text-indigo-700">{summary.open}</p>
        </div>
        <div className="zan-stat-card rounded-[1.6rem] p-4">
          <p className="text-sm text-slate-500">WhatsApp</p>
          <p className="score-number mt-2 text-4xl font-black text-emerald-700">{summary.whatsapp}</p>
        </div>
        <div className="zan-stat-card rounded-[1.6rem] p-4">
          <p className="text-sm text-slate-500">Telegram</p>
          <p className="score-number mt-2 text-4xl font-black text-sky-700">{summary.telegram}</p>
        </div>
      </div>

      {siteLeads.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Пока нет заявок с сайта.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-3 pr-4 font-semibold">Имя</th>
                <th className="py-3 pr-4 font-semibold">Телефон</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Источник</th>
                <th className="py-3 pr-4 font-semibold">Дата</th>
                <th className="py-3 pr-4 font-semibold">Статус</th>
                <th className="py-3 font-semibold">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {siteLeads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-950">{lead.name || 'Без имени'}</p>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{lead.phone || '—'}</td>
                  <td className="py-4 pr-4 text-slate-700">{lead.email || '—'}</td>
                  <td className="py-4 pr-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {lead.source.includes('telegram') ? <Send className="h-3 w-3" /> : null}
                      {lead.source.includes('whatsapp') ? <PhoneCall className="h-3 w-3" /> : null}
                      {!lead.source.includes('telegram') && !lead.source.includes('whatsapp') ? <Sparkles className="h-3 w-3" /> : null}
                      {SOURCE_LABELS[lead.source]}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{formatDateTime(lead.createdAt)}</td>
                  <td className="py-4 pr-4">
                    <select
                      value={lead.status}
                      onChange={(event) => updateLeadStatus(lead.id, event.target.value as LeadStatus)}
                      className="zan-select min-w-[160px] px-4 py-2 text-sm"
                    >
                      <option value="new">{STATUS_LABELS.new}</option>
                      <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                      <option value="contacted">{STATUS_LABELS.contacted}</option>
                      <option value="closed">{STATUS_LABELS.closed}</option>
                    </select>
                  </td>
                  <td className="py-4 text-slate-700">{lead.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
