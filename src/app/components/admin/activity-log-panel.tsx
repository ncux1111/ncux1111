import { Activity, LogIn, LogOut, Medal, Send, Download } from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';

const TYPE_META = {
  login: { label: 'Вход', icon: LogIn, tone: 'bg-emerald-100 text-emerald-700' },
  logout: { label: 'Выход', icon: LogOut, tone: 'bg-slate-100 text-slate-700' },
  templateDownload: { label: 'Скачал шаблон', icon: Download, tone: 'bg-blue-100 text-blue-700' },
  documentSubmission: { label: 'Отправил документ', icon: Send, tone: 'bg-fuchsia-100 text-fuchsia-700' },
  pointsChanged: { label: 'Изменение баллов', icon: Medal, tone: 'bg-amber-100 text-amber-700' },
} as const;

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityLogPanel() {
  const { activityLog } = useOperations();

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">Журнал действий</h2>
          <p className="mt-1 text-sm text-slate-600">
            Входы, выходы, скачивания шаблонов, отправка документов и начисления баллов.
          </p>
        </div>
      </div>

      {activityLog.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Журнал пока пуст.
        </div>
      ) : (
        <div className="space-y-3">
          {activityLog.slice(0, 120).map((entry) => {
            const meta = TYPE_META[entry.type];
            const Icon = meta.icon;
            return (
              <article key={entry.id} className="zan-muted-card rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{entry.userName}</p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{meta.label}</span>
                        {entry.role ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                            {entry.role === 'admin' ? 'Администратор' : 'Сотрудник'}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{entry.details}</p>
                      <p className="mt-1 text-xs text-slate-500">client id: {entry.clientId}</p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-500">{formatDateTime(entry.timestamp)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
