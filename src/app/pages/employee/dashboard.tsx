import { type ChangeEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Award, Crown, TrendingUp, Upload, Wallet, Star, BriefcaseBusiness } from 'lucide-react';
import { useApp, getRank } from '../../context/AppContext';
import { NotesBoard } from '../../components/notes-board';
import {
  AVATAR_ACCEPT,
  Avatar,
  estimateAvatarStorageBytes,
  fileToDataUrl,
  validateAvatarFile,
} from '../../components/avatar';
import { InternalPageHero } from '../../components/site/internal-page-hero';

export function EmployeeDashboard() {
  const { currentUser, employees, teams, visibilitySettings, prizePool, services, handleUpdateEmployee } = useApp();

  const employee = employees.find((item) => item.id === currentUser?.id);
  if (!employee) return null;

  const team = teams.find((item) => item.id === employee.teamId) || null;
  const rank = getRank(employee.totalPoints);
  const sortedEmployees = [...employees].sort((a, b) => b.totalPoints - a.totalPoints);
  const position = sortedEmployees.findIndex((item) => item.id === employee.id) + 1;
  const mvpOfWeek = [...employees].sort((a, b) => b.weeklyPoints - a.weeklyPoints)[0];
  const isMvp = mvpOfWeek?.id === employee.id;

  const teamMembers = employees.filter((item) => item.teamId === employee.teamId);
  const teamTotal = teamMembers.reduce((sum, item) => sum + item.totalPoints, 0);
  const teamAverage = teamMembers.length > 0 ? Math.round(teamTotal / teamMembers.length) : 0;

  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  const avatarStorageBytes = useMemo(
    () => estimateAvatarStorageBytes(employees.map((item) => item.avatar)),
    [employees]
  );

  const replacingAvatarBytes =
    employee.avatar && employee.avatar.startsWith('data:image/') ? employee.avatar.length : 0;

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateAvatarFile(file, {
      currentStorageBytes: avatarStorageBytes,
      replacingStorageBytes: replacingAvatarBytes,
    });

    if (validationError) {
      setAvatarError(validationError);
      setAvatarSuccess('');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingAvatar(dataUrl);
      setAvatarError('');
      setAvatarSuccess('Новая аватарка загружена. Сохраните изменения, чтобы она появилась в кабинете, рейтинге и TV-режиме.');
    } catch {
      setAvatarError('Не удалось прочитать файл. Используйте PNG, JPG, WEBP или GIF.');
      setAvatarSuccess('');
    }
  };

  const handleSaveAvatar = async () => {
    if (!pendingAvatar) return;

    try {
      setAvatarSaving(true);
      await handleUpdateEmployee(employee.id, employee.name, pendingAvatar, employee.salary, employee.login);
      setPendingAvatar(null);
      setAvatarError('');
      setAvatarSuccess('Аватарка сохранена.');
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="Профиль сотрудника"
        title="Личный кабинет ZAN QDM"
        description="Здесь доступны ваш рейтинг, командная динамика, рабочие услуги и шаблоны документов. Аватарка синхронизируется с рейтингом, админкой и TV-режимом."
      />

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar
              avatar={pendingAvatar || employee.avatar}
              name={employee.name}
              className="h-24 w-24 rounded-[1.6rem] border border-white/25 bg-white/10"
              textClassName="text-4xl"
            />
            <div>
              <h2 className="text-3xl font-black">{employee.name}</h2>
              <p className="text-lg text-blue-100">{employee.position}</p>
              <p className="mt-1 text-sm text-blue-100">Команда: {team?.name || 'Не указана'}</p>
              <p className="mt-1 text-xs text-blue-100/90">Логин: {employee.login}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20">
                  <Upload className="h-4 w-4" />
                  Изменить аватар
                  <input type="file" accept={AVATAR_ACCEPT} onChange={handleAvatarUpload} className="hidden" />
                </label>
                {pendingAvatar ? (
                  <button
                    onClick={handleSaveAvatar}
                    disabled={avatarSaving}
                    className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {avatarSaving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                ) : null}
                {pendingAvatar ? (
                  <button
                    onClick={() => {
                      setPendingAvatar(null);
                      setAvatarError('');
                      setAvatarSuccess('');
                    }}
                    className="rounded-2xl border border-white/30 px-4 py-3 text-sm font-medium text-white hover:bg-white/20"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>

              {avatarError ? <p className="mt-3 text-xs text-rose-200">{avatarError}</p> : null}
              {avatarSuccess ? <p className="mt-3 text-xs text-emerald-100">{avatarSuccess}</p> : null}
            </div>
          </div>

          {isMvp ? (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="rounded-full bg-amber-400 p-4 shadow-lg"
            >
              <Crown className="h-8 w-8 text-white" />
            </motion.div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MetricCard label="Общие баллы" value={employee.totalPoints} />
          <MetricCard label="За неделю" value={employee.weeklyPoints} />
          <MetricCard label="Позиция" value={`#${position}`} />
          <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
            <p className="mb-1 text-sm text-blue-100">Ранг</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: rank.color }} />
              <p className="text-lg font-bold">{rank.name}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="zan-section-card rounded-[2rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-950">Статистика команды</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricLite label="Команда" value={team?.name || '—'} />
            <MetricLite label="Сумма баллов" value={teamTotal} />
            <MetricLite label="Средний результат" value={teamAverage} />
          </div>
          {visibilitySettings.showPrizePool ? (
            <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Призовой фонд</p>
                  <p className="score-number text-3xl font-black text-emerald-700">
                    {prizePool.toLocaleString('ru-RU')} ₸
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="zan-section-card rounded-[2rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-950">Рейтинг коллег</h3>
          </div>
          <div className="space-y-3">
            {(visibilitySettings.showOtherEmployeesPoints ? sortedEmployees : [employee]).slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <Avatar avatar={item.avatar} name={item.name} className="h-12 w-12 rounded-xl border border-slate-200 bg-white" textClassName="text-base" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{item.name}</p>
                    <p className="text-xs text-slate-500">{teams.find((entry) => entry.id === item.teamId)?.name || 'Команда не указана'}</p>
                  </div>
                </div>
                <p className="score-number text-3xl font-black text-slate-950">{item.totalPoints}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {visibilitySettings.showServices && services.length > 0 ? (
        <section className="zan-section-card rounded-[2rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-950">Рабочие услуги</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-bold text-slate-950">{service.name}</p>
                <p className="mt-2 text-sm text-slate-500">{service.category}</p>
                <p className="score-number mt-3 text-3xl font-black text-sky-700">
                  {service.price.toLocaleString('ru-RU')} ₸
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <NotesBoard
        scope="employee"
        ownerId={employee.id}
        title="Личные заметки"
        description="Быстрые комментарии и зарисовки по задачам, шаблонам и рабочим делам."
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
      <p className="mb-1 text-sm text-blue-100">{label}</p>
      <p className="score-number text-4xl font-black">{value}</p>
    </div>
  );
}

function MetricLite({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}
