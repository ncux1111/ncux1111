import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import { getRank, type Employee, type Team } from '../context/AppContext';
import { Avatar } from './avatar';

interface EmployeeRatingProps {
  employees: Employee[];
  teams: Team[];
  prizePool: number;
}

export function EmployeeRating({ employees, teams, prizePool }: EmployeeRatingProps) {
  const sortedByTotal = [...employees].sort((a, b) => b.totalPoints - a.totalPoints);

  const teamScores = teams
    .map((team) => ({
      team,
      total: employees
        .filter((employee) => employee.teamId === team.id)
        .reduce((sum, employee) => sum + employee.totalPoints, 0),
    }))
    .sort((a, b) => b.total - a.total);

  if (employees.length === 0) {
    return (
      <div className="zan-section-card rounded-[2rem] px-6 py-12 text-center">
        <p className="text-lg font-semibold text-slate-800">Рейтинг пока пуст</p>
        <p className="mt-2 text-sm text-slate-600">
          Добавьте сотрудников или начислите первые баллы, чтобы увидеть таблицу лидеров.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {teamScores.map((teamScore, index) => (
          <motion.div
            key={teamScore.team.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.07 }}
            className="zan-section-card rounded-[2rem] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">{teamScore.team.name}</h3>
                <p className="mt-1 text-sm font-medium text-slate-700">Суммарный результат команды</p>
              </div>
              <div className="text-right">
                <p className="score-number text-4xl font-black leading-none" style={{ color: teamScore.team.color }}>
                  {teamScore.total}
                </p>
                {index === 0 && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    <Crown className="h-3 w-3" />
                    Лидер недели
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="zan-panel rounded-[2.1rem] p-6">
        <h2 className="mb-4 text-2xl font-black text-white">Рейтинг сотрудников</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          {sortedByTotal.map((employee, index) => {
            const rank = getRank(employee.totalPoints);
            const team = teams.find((item) => item.id === employee.teamId);

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between gap-3 rounded-[1.6rem] border border-white/10 bg-white/8 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-[1rem] font-bold text-white"
                    style={{ backgroundColor: rank.color }}
                  >
                    {index + 1}
                  </div>
                  <Avatar
                    avatar={employee.avatar}
                    name={employee.name}
                    className="h-12 w-12 flex-none rounded-[1rem] border border-white/18 bg-slate-800"
                    textClassName="text-base"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{employee.name}</p>
                    <p className="truncate text-xs font-medium text-slate-200">{team?.name}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="score-number text-3xl font-black leading-none text-white">
                    {employee.totalPoints}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-xl px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: rank.color }}
                  >
                    {rank.name}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {prizePool > 0 && (
        <div className="rounded-[2rem] border border-emerald-400/45 bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-500 px-6 py-5 shadow-[0_24px_50px_rgba(16,185,129,0.28)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-50/92">Призовой фонд</p>
          <p className="score-number mt-2 text-4xl font-black text-white drop-shadow-[0_6px_18px_rgba(15,23,42,0.35)]">
            {prizePool.toLocaleString('ru-RU')} ₸
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-50/90">
            Текущая сумма награждения для команды-лидера.
          </p>
        </div>
      )}
    </div>
  );
}
