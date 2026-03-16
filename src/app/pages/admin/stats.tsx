import { useApp } from '../../context/AppContext';
import { TeamStats } from '../../components/team-stats';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { VisitorAnalyticsPanel } from '../../components/admin/visitor-analytics-panel';
import { ActivityLogPanel } from '../../components/admin/activity-log-panel';

export function AdminStats() {
  const { employees, teams } = useApp();

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Analytics"
        title="Статистика команды, сайта и действий пользователей"
        description="Графики и сводки помогают быстро оценить динамику сотрудников, активность посетителей сайта, входящие заявки и ключевые действия внутри системы."
      />

      <VisitorAnalyticsPanel />
      <TeamStats employees={employees} teams={teams} />
      <ActivityLogPanel />
    </div>
  );
}
