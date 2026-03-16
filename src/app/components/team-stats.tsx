import { type Employee, type Team } from '../context/AppContext';
import { Users, Trophy, TrendingUp, Award } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface TeamStatsProps {
  employees: Employee[];
  teams: Team[];
}

export function TeamStats({ employees, teams }: TeamStatsProps) {
  if (employees.length === 0 || teams.length === 0) {
    return (
      <div className="zan-section-card rounded-[2rem] py-12 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-slate-300" />
        <p className="text-lg text-slate-700">Пока недостаточно данных для аналитики</p>
        <p className="mt-2 text-sm text-slate-500">
          Добавьте команды и сотрудников, чтобы включить статистические панели.
        </p>
      </div>
    );
  }

  const teamComparisonData = teams.map((team) => {
    const teamEmployees = employees.filter((employee) => employee.teamId === team.id);
    const totalPoints = teamEmployees.reduce((sum, employee) => sum + employee.totalPoints, 0);
    const weeklyPoints = teamEmployees.reduce((sum, employee) => sum + employee.weeklyPoints, 0);

    return {
      name: team.name,
      totalPoints,
      weeklyPoints,
    };
  });

  const employeeDistributionData = teams.map((team) => ({
    name: team.name,
    value: employees.filter((employee) => employee.teamId === team.id).length,
    color: team.color,
  }));

  const topPerformersData = [...employees]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 6)
    .map((employee) => ({
      name: employee.name.split(' ')[0],
      points: employee.totalPoints,
    }));

  const totalPoints = employees.reduce((sum, employee) => sum + employee.totalPoints, 0);
  const avgPointsPerEmployee = employees.length > 0 ? Math.round(totalPoints / employees.length) : 0;
  const topTeam = teams
    .map((team) => ({
      team,
      total: employees
        .filter((employee) => employee.teamId === team.id)
        .reduce((sum, employee) => sum + employee.totalPoints, 0),
    }))
    .sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="zan-stat-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-slate-500">Всего баллов</p>
              <p className="score-number text-4xl font-black text-slate-950">{totalPoints}</p>
            </div>
            <Award className="h-12 w-12 text-amber-500" />
          </div>
        </div>

        <div className="zan-stat-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-slate-500">Средний балл</p>
              <p className="score-number text-4xl font-black text-emerald-700">{avgPointsPerEmployee}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-emerald-500" />
          </div>
        </div>

        <div className="zan-stat-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-slate-500">Лидирующая команда</p>
              <p className="text-xl font-bold text-slate-950">{topTeam.team.name}</p>
              <p className="text-sm text-slate-500">{topTeam.total} баллов</p>
            </div>
            <Users className="h-12 w-12 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="zan-section-card rounded-[2rem] p-6">
          <h3 className="mb-6 text-xl font-bold text-slate-900">Сравнение команд</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="totalPoints" name="Общие баллы" fill="#2563eb" radius={[10, 10, 0, 0]} />
              <Bar dataKey="weeklyPoints" name="Баллы недели" fill="#10b981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="zan-section-card rounded-[2rem] p-6">
          <h3 className="mb-6 text-xl font-bold text-slate-900">Распределение сотрудников</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={employeeDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {employeeDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="zan-section-card rounded-[2rem] p-6">
        <h3 className="mb-6 text-xl font-bold text-slate-900">Топ сотрудников</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topPerformersData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke="#64748b" />
            <YAxis dataKey="name" type="category" width={100} stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
              }}
            />
            <Bar dataKey="points" name="Баллы" fill="#8b5cf6" radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team) => {
          const teamEmployees = employees.filter((employee) => employee.teamId === team.id);
          const teamTotal = teamEmployees.reduce((sum, employee) => sum + employee.totalPoints, 0);
          const teamWeekly = teamEmployees.reduce((sum, employee) => sum + employee.weeklyPoints, 0);
          const teamAverage = teamEmployees.length > 0 ? Math.round(teamTotal / teamEmployees.length) : 0;

          return (
            <div key={team.id} className="zan-section-card rounded-[2rem] border-t-4 p-6" style={{ borderColor: team.color }}>
              <h4 className="mb-4 text-lg font-bold text-slate-900">{team.name}</h4>

              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="mb-1 text-xs text-slate-600">Всего</p>
                  <p className="score-number text-xl font-black" style={{ color: team.color }}>
                    {teamTotal}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="mb-1 text-xs text-slate-600">За неделю</p>
                  <p className="score-number text-xl font-black" style={{ color: team.color }}>
                    {teamWeekly}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="mb-1 text-xs text-slate-600">Средний</p>
                  <p className="score-number text-xl font-black" style={{ color: team.color }}>
                    {teamAverage}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="mb-2 text-sm font-medium text-slate-700">Сотрудники:</p>
                {teamEmployees.length > 0 ? (
                  teamEmployees
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((employee, idx) => (
                      <div key={employee.id} className="flex items-center justify-between rounded-2xl p-2 transition hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="text-sm text-slate-900">{employee.name}</span>
                        </div>
                        <span className="score-number text-sm font-black" style={{ color: team.color }}>
                          {employee.totalPoints}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="py-2 text-center text-sm text-slate-400">В команде пока нет сотрудников</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
