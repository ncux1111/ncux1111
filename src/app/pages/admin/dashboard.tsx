import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, ShieldCheck, Sparkles, Tv, Users, FileCheck, MessageSquarePlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { useDocumentTemplates } from '../../modules/templates';
import { EmployeeRating } from '../../components/employee-rating';
import { NotesBoard } from '../../components/notes-board';
import { InternalPageHero } from '../../components/site/internal-page-hero';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { employees, teams, prizePool, visibilitySettings, currentUser } = useApp();
  const { siteLeads, documentReviews } = useOperations();
  const { getTemplatesForAdmin } = useDocumentTemplates();

  const stats = useMemo(() => {
    const pendingLeads = siteLeads.filter((lead) => lead.status === 'new' || lead.status === 'in_progress').length;
    const pendingReviews = documentReviews.filter(
      (review) => review.status === 'new' || review.status === 'in_review'
    ).length;
    const enabledTemplates = getTemplatesForAdmin().filter((template) => template.enabled).length;

    return {
      employees: employees.length,
      teams: teams.length,
      pendingLeads,
      pendingReviews,
      enabledTemplates,
    };
  }, [documentReviews, employees.length, getTemplatesForAdmin, siteLeads, teams.length]);

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Admin"
        title="Центральный обзор юридической команды"
        description="Здесь собраны ключевые показатели по сотрудникам, шаблонам, CRM-заявкам, проверке документов и запуску TV-режима."
        actions={
          <>
            <button
              onClick={() => navigate('/admin/management')}
              className="zan-toolbar-button zan-toolbar-button-secondary"
            >
              <Sparkles className="h-4 w-4" />
              Управление
            </button>
            <button
              onClick={() => navigate('/admin/templates')}
              className="zan-toolbar-button zan-toolbar-button-secondary"
            >
              <ShieldCheck className="h-4 w-4" />
              Шаблоны
            </button>
            <button
              onClick={() => navigate('/admin/website')}
              className="zan-toolbar-button zan-toolbar-button-primary"
            >
              <Globe2 className="h-4 w-4" />
              Сайт
            </button>
            <button
              onClick={() => navigate('/tv')}
              className="zan-toolbar-button rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-700 px-4 py-3 text-sm font-bold text-white"
            >
              <Tv className="h-4 w-4" />
              TV-режим
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Сотрудники" value={stats.employees} tone="text-slate-950" />
        <StatCard icon={ShieldCheck} label="Команды" value={stats.teams} tone="text-indigo-700" />
        <StatCard icon={MessageSquarePlus} label="Новые заявки" value={stats.pendingLeads} tone="text-emerald-700" />
        <StatCard icon={FileCheck} label="На проверке" value={stats.pendingReviews} tone="text-amber-700" />
        <StatCard icon={Sparkles} label="Шаблоны" value={stats.enabledTemplates} tone="text-fuchsia-700" />
      </div>

      <EmployeeRating
        employees={employees}
        teams={teams}
        prizePool={visibilitySettings.showPrizePool ? prizePool : 0}
      />

      <NotesBoard
        scope="admin"
        ownerId={currentUser?.id}
        title="Заметки администратора"
        description="Быстрые пометки, задачи и визуальные зарисовки по команде, CRM и шаблонам."
      />
    </div>
  );
}

function StatCard({
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
    <div className="zan-stat-card rounded-[1.7rem] p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`score-number mt-2 text-4xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
