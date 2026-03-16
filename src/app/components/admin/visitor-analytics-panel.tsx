import { useMemo, useState } from 'react';
import { BarChart3, MessageSquarePlus, QrCode, Send, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useOperations, type VisitorPeriod } from '../../context/OperationsContext';

function startOfPeriod(period: VisitorPeriod) {
  const now = new Date();
  const next = new Date(now);
  if (period === 'day') {
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  }
  if (period === 'week') {
    next.setDate(now.getDate() - 6);
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  }
  next.setDate(now.getDate() - 29);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
}

function buildBuckets(period: VisitorPeriod, timestamps: number[]) {
  const labels: string[] = [];
  const counts = new Map<string, number>();
  const now = new Date();
  const days = period === 'day' ? 24 : period === 'week' ? 7 : 30;

  if (period === 'day') {
    for (let hour = 0; hour < 24; hour += 1) {
      const label = `${hour.toString().padStart(2, '0')}:00`;
      labels.push(label);
      counts.set(label, 0);
    }

    timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      const label = `${date.getHours().toString().padStart(2, '0')}:00`;
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return labels.map((label) => ({ label, value: counts.get(label) || 0 }));
  }

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const label = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    labels.push(label);
    counts.set(label, 0);
  }

  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    const label = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    if (counts.has(label)) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  });

  return labels.map((label) => ({ label, value: counts.get(label) || 0 }));
}

export function VisitorAnalyticsPanel() {
  const { visitorEvents, siteLeads } = useOperations();
  const [period, setPeriod] = useState<VisitorPeriod>('week');

  const metrics = useMemo(() => {
    const from = startOfPeriod(period);
    const events = visitorEvents.filter((event) => event.timestamp >= from);
    const pageViews = events.filter((event) => event.type === 'page_view');
    const uniqueVisitors = new Set(pageViews.map((event) => event.clientId));
    const firstVisits = new Set<string>();

    pageViews.forEach((event) => {
      const hasEarlier = visitorEvents.some((item) => item.clientId === event.clientId && item.timestamp < from && item.type === 'page_view');
      if (!hasEarlier) {
        firstVisits.add(event.clientId);
      }
    });

    const leadCount = siteLeads.filter((lead) => lead.createdAt >= from).length;
    const whatsappCount = events.filter((event) => event.type === 'whatsapp').length;
    const telegramCount = events.filter((event) => event.type === 'telegram').length;
    const qrCount = events.filter((event) => event.type === 'qr_whatsapp' || event.type === 'qr_telegram').length;

    return {
      pageViews: pageViews.length,
      newVisitors: firstVisits.size,
      leadCount,
      whatsappCount,
      telegramCount,
      qrCount,
      chart: buildBuckets(period, pageViews.map((event) => event.timestamp)),
      uniqueVisitors: uniqueVisitors.size,
    };
  }, [period, siteLeads, visitorEvents]);

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Аналитика посетителей</h2>
            <p className="mt-1 text-sm text-slate-600">
              Заходы на сайт, новые посетители, заявки и обращения в мессенджеры.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['day', 'week', 'month'] as VisitorPeriod[]).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${period === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {item === 'day' ? 'День' : item === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={Users} label="Заходы" value={metrics.pageViews} tone="text-slate-950" />
        <MetricCard icon={Users} label="Новые" value={metrics.newVisitors} tone="text-indigo-700" />
        <MetricCard icon={MessageSquarePlus} label="Заявки" value={metrics.leadCount} tone="text-emerald-700" />
        <MetricCard icon={Send} label="WhatsApp" value={metrics.whatsappCount} tone="text-emerald-700" />
        <MetricCard icon={Send} label="Telegram" value={metrics.telegramCount} tone="text-sky-700" />
        <MetricCard icon={QrCode} label="Через QR" value={metrics.qrCount} tone="text-amber-700" />
      </div>

      <div className="mt-6 h-[320px] rounded-[1.8rem] border border-slate-200 bg-white p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" name="Посещения" fill="#2563eb" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="zan-stat-card rounded-[1.5rem] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`score-number mt-2 text-4xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
