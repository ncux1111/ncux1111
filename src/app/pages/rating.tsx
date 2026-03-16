import { useApp } from '../context/AppContext';
import { EmployeeRating } from '../components/employee-rating';

export function PublicRatingPage() {
  const { employees, teams, prizePool, visibilitySettings } = useApp();

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Рейтинг</p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Публичная таблица результатов команды ZAN QDM
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Здесь доступен актуальный рейтинг сотрудников и команд. TV-режим и внутренние инструменты остаются защищёнными для администраторов.
        </p>
      </div>

      <EmployeeRating
        employees={employees}
        teams={teams}
        prizePool={visibilitySettings.showPrizePool ? prizePool : 0}
      />
    </section>
  );
}
