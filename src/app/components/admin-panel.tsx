import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Check, DollarSign, Edit2, PlusCircle, Trash2, UserPlus, X } from 'lucide-react';
import {
  getRank,
  type Employee,
  type PointsActor,
  type PointsHistory,
  type Team,
} from '../context/AppContext';
import { soundEffects } from '../utils/soundEffects';
import {
  AVATAR_ACCEPT,
  Avatar,
  estimateAvatarStorageBytes,
  fileToDataUrl,
  validateAvatarFile,
} from './avatar';

interface AdminPanelProps {
  employees: Employee[];
  teams: Team[];
  onAddPoints: (employeeId: string, points: number, admin: PointsActor, reason?: string) => void;
  onUpdateEmployee: (
    employeeId: string,
    newName: string,
    newAvatar?: string,
    newSalary?: number,
    newLogin?: string,
    newPassword?: string
  ) => Promise<void> | void;
  onAddEmployee: (
    name: string,
    position: string,
    teamId: string,
    avatar?: string,
    salary?: number,
    login?: string,
    password?: string
  ) => Promise<void> | void;
  onDeleteEmployee: (employeeId: string) => void;
  admin: PointsActor;
  prizePool: number;
  onUpdatePrizePool: (amount: number) => void;
  pointsHistory: PointsHistory[];
  onClearHistory?: () => void;
}

const MAX_POINTS_PER_ACTION = 10000;

function normalizeLogin(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function AdminPanel({
  employees,
  teams,
  onAddPoints,
  onUpdateEmployee,
  onAddEmployee,
  onDeleteEmployee,
  admin,
  prizePool,
  onUpdatePrizePool,
  pointsHistory,
  onClearHistory,
}: AdminPanelProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [points, setPoints] = useState('');
  const [operationType, setOperationType] = useState<'award' | 'penalty'>('award');
  const [reason, setReason] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editSalary, setEditSalary] = useState('');

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePosition, setNewEmployeePosition] = useState('');
  const [newEmployeeTeam, setNewEmployeeTeam] = useState('');
  const [newEmployeeLogin, setNewEmployeeLogin] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [newEmployeeAvatar, setNewEmployeeAvatar] = useState('');
  const [newEmployeeSalary, setNewEmployeeSalary] = useState('');

  const [editingPrize, setEditingPrize] = useState(false);
  const [prizeInput, setPrizeInput] = useState(prizePool.toString());
  const [historyQuery, setHistoryQuery] = useState('');

  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => b.totalPoints - a.totalPoints), [employees]);

  const sortedHistory = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLowerCase();
    const sorted = [...pointsHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter((item) => {
      const haystack = [
        item.adminName,
        item.adminLogin || '',
        item.employeeName,
        item.operationType,
        item.reason || '',
        String(item.points),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [pointsHistory, historyQuery]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee || !points) return;

    const pointsValue = Number(points);
    if (!Number.isInteger(pointsValue) || pointsValue < 1 || pointsValue > MAX_POINTS_PER_ACTION) {
      alert(`Введите целое число баллов от 1 до ${MAX_POINTS_PER_ACTION}.`);
      return;
    }

    const normalizedReason = reason.trim();
    if (operationType === 'penalty' && !normalizedReason) {
      alert('Для штрафа укажите причину.');
      return;
    }

    const pointsDelta = operationType === 'penalty' ? -pointsValue : pointsValue;
    onAddPoints(selectedEmployee, pointsDelta, admin, normalizedReason || undefined);

    if (pointsDelta > 0) {
      soundEffects.playPointsSound(pointsDelta);
    }

    setSelectedEmployee('');
    setPoints('');
    setReason('');
    setOperationType('award');
  };

  const startEditEmployee = (employee: Employee) => {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditLogin(employee.login);
    setEditPassword('');
    setEditAvatar(employee.avatar || '');
    setEditSalary(employee.salary?.toString() || '');
  };

  const saveEditEmployee = async () => {
    if (!editingId || !editName.trim()) return;

    const normalizedLogin = normalizeLogin(editLogin);
    if (!normalizedLogin) {
      alert('Логин сотрудника обязателен.');
      return;
    }

    const loginTaken = employees.some(
      (employee) => employee.id !== editingId && employee.login.toLowerCase() === normalizedLogin
    );
    if (loginTaken) {
      alert('Такой логин уже используется другим сотрудником.');
      return;
    }

    const parsedSalary = Number.parseInt(editSalary, 10);
    const salary = Number.isInteger(parsedSalary) && parsedSalary >= 0 ? parsedSalary : undefined;

    await onUpdateEmployee(
      editingId,
      editName.trim(),
      editAvatar.trim() || undefined,
      salary,
      normalizedLogin,
      editPassword.trim() || undefined
    );

    setEditingId(null);
  };

  const addEmployee = async (event: FormEvent) => {
    event.preventDefault();

    if (!newEmployeeName.trim() || !newEmployeePosition.trim() || !newEmployeeTeam) {
      return;
    }

    const normalizedLogin = normalizeLogin(newEmployeeLogin);
    if (!normalizedLogin) {
      alert('Логин сотрудника обязателен.');
      return;
    }

    const loginTaken = employees.some((employee) => employee.login.toLowerCase() === normalizedLogin);
    if (loginTaken) {
      alert('Такой логин уже используется. Выберите другой логин.');
      return;
    }

    const parsedSalary = Number.parseInt(newEmployeeSalary, 10);
    const salary = Number.isInteger(parsedSalary) && parsedSalary >= 0 ? parsedSalary : undefined;

    await onAddEmployee(
      newEmployeeName.trim(),
      newEmployeePosition.trim(),
      newEmployeeTeam,
      newEmployeeAvatar.trim() || undefined,
      salary,
      normalizedLogin,
      newEmployeePassword || '1234'
    );

    setNewEmployeeName('');
    setNewEmployeePosition('');
    setNewEmployeeTeam('');
    setNewEmployeeLogin('');
    setNewEmployeePassword('');
    setNewEmployeeAvatar('');
    setNewEmployeeSalary('');
    setShowAddEmployee(false);
  };

  const uploadAvatar = async (
    event: ChangeEvent<HTMLInputElement>,
    onReady: (value: string) => void,
    replacingAvatar?: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentStorage = estimateAvatarStorageBytes(employees.map((employee) => employee.avatar));
    const replacingStorage = estimateAvatarStorageBytes([replacingAvatar]);
    const validationError = validateAvatarFile(file, {
      currentStorageBytes: currentStorage,
      replacingStorageBytes: replacingStorage,
    });
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onReady(dataUrl);
    } catch {
      alert('Не удалось загрузить аватар. Попробуйте другой файл.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="zan-section-card rounded-[2rem] p-6"
        >
          <h3 className="mb-4 text-xl font-bold text-slate-900">Управление баллами</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <select
              value={selectedEmployee}
              onChange={(event) => setSelectedEmployee(event.target.value)}
              className="zan-select w-full px-4 py-3"
              required
            >
              <option value="">Выберите сотрудника...</option>
              {teams.map((team) => (
                <optgroup key={team.id} label={team.name}>
                  {employees
                    .filter((employee) => employee.teamId === team.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} — {employee.position}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperationType('award')}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  operationType === 'award'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                Начислить
              </button>
              <button
                type="button"
                onClick={() => setOperationType('penalty')}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  operationType === 'penalty'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                Снять (штраф)
              </button>
            </div>

            <input
              type="number"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              min="1"
              step="1"
              className="zan-input w-full px-4 py-3"
              placeholder="Количество баллов"
              required
            />

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="zan-textarea w-full resize-none px-4 py-3"
              rows={3}
              placeholder={
                operationType === 'penalty'
                  ? 'Причина штрафа (обязательно)'
                  : 'Причина начисления (необязательно)'
              }
              required={operationType === 'penalty'}
            />

            <button
              type="submit"
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-medium text-white ${
                operationType === 'penalty' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              {operationType === 'penalty' ? 'Снять баллы' : 'Начислить баллы'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">Призовой фонд</h4>
              {!editingPrize ? (
                <button onClick={() => setEditingPrize(true)} className="text-blue-600 hover:text-blue-700">
                  <Edit2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {editingPrize ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={prizeInput}
                  onChange={(event) => setPrizeInput(event.target.value)}
                  className="zan-input flex-1 px-3 py-2"
                />
                <button
                  onClick={() => {
                    const amount = Number.parseInt(prizeInput, 10);
                    if (Number.isInteger(amount) && amount >= 0) onUpdatePrizePool(amount);
                    setEditingPrize(false);
                  }}
                  className="rounded-2xl bg-green-600 p-2 text-white hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingPrize(false)}
                  className="rounded-2xl bg-red-600 p-2 text-white hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="score-number text-2xl font-black text-green-900">
                  {prizePool.toLocaleString('ru-RU')} ₸
                </span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="zan-section-card rounded-[2rem] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Сотрудники</h3>
            <button
              onClick={() => setShowAddEmployee((prev) => !prev)}
              className="rounded-2xl bg-green-600 p-2 text-white hover:bg-green-700"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </div>

          {showAddEmployee ? (
            <form
              onSubmit={addEmployee}
              className="mb-4 space-y-3 rounded-2xl border-2 border-green-200 bg-green-50 p-4"
            >
              <input
                value={newEmployeeName}
                onChange={(event) => setNewEmployeeName(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="Имя сотрудника"
                required
              />
              <input
                value={newEmployeePosition}
                onChange={(event) => setNewEmployeePosition(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="Должность"
                required
              />
              <select
                value={newEmployeeTeam}
                onChange={(event) => setNewEmployeeTeam(event.target.value)}
                className="zan-select w-full px-3 py-2"
                required
              >
                <option value="">Выберите команду...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <input
                value={newEmployeeLogin}
                onChange={(event) => setNewEmployeeLogin(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="Логин"
                required
              />
              <input
                type="password"
                value={newEmployeePassword}
                onChange={(event) => setNewEmployeePassword(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="Пароль"
                required
              />
              <input
                value={newEmployeeAvatar}
                onChange={(event) => setNewEmployeeAvatar(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="URL аватарки или data URL"
              />
              <input
                value={newEmployeeSalary}
                onChange={(event) => setNewEmployeeSalary(event.target.value)}
                className="zan-input w-full px-3 py-2"
                placeholder="Зарплата (необязательно)"
              />
              <input
                type="file"
                accept={AVATAR_ACCEPT}
                className="zan-input w-full px-3 py-2 text-sm"
                onChange={(event) => uploadAvatar(event, (value) => setNewEmployeeAvatar(value))}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                >
                  Добавить сотрудника
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="flex-1 rounded-2xl bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}

          <div className="custom-scrollbar max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {sortedEmployees.map((employee) => {
              const rank = getRank(employee.totalPoints);
              return (
                <div key={employee.id} className="rounded-2xl border border-slate-200 p-3">
                  {editingId === employee.id ? (
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="zan-input w-full px-3 py-2"
                        placeholder="Имя сотрудника"
                      />
                      <input
                        value={editLogin}
                        onChange={(event) => setEditLogin(event.target.value)}
                        className="zan-input w-full px-3 py-2"
                        placeholder="Логин"
                      />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                        className="zan-input w-full px-3 py-2"
                        placeholder="Новый пароль (если нужно изменить)"
                      />
                      <input
                        value={editAvatar}
                        onChange={(event) => setEditAvatar(event.target.value)}
                        className="zan-input w-full px-3 py-2"
                        placeholder="URL аватарки"
                      />
                      <input
                        value={editSalary}
                        onChange={(event) => setEditSalary(event.target.value)}
                        className="zan-input w-full px-3 py-2"
                        placeholder="Зарплата"
                      />
                      <input
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="zan-input w-full px-3 py-2 text-sm"
                        onChange={(event) => uploadAvatar(event, (value) => setEditAvatar(value), employee.avatar)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditEmployee}
                          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                        >
                          <Check className="h-4 w-4" />
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-700"
                        >
                          <X className="h-4 w-4" />
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar avatar={employee.avatar} name={employee.name} className="h-12 w-12" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{employee.name}</p>
                          <p className="truncate text-xs text-slate-500">{employee.position}</p>
                          <div
                            className="mt-1 inline-flex rounded px-2 py-0.5 text-xs text-white"
                            style={{ backgroundColor: rank.color }}
                          >
                            {rank.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditEmployee(employee)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Удалить сотрудника «${employee.name}»?`)) {
                              onDeleteEmployee(employee.id);
                            }
                          }}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">История начислений и штрафов</h3>
            <p className="text-sm text-slate-600">
              Журнал показывает, кто изменил баллы, какой знак операции применён и по какой причине.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Записей: {sortedHistory.length}
            </span>
            {onClearHistory ? (
              <button
                onClick={() => {
                  if (window.confirm('Очистить историю начислений?')) onClearHistory();
                }}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Очистить историю
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            className="zan-input w-full px-4 py-2"
            placeholder="Поиск по администратору, сотруднику, причине или знаку операции"
          />
        </div>

        {sortedHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            История пока пуста.
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {sortedHistory.slice(0, 200).map((entry) => {
              const dateTime = new Date(entry.timestamp);
              const isPenalty = entry.operationType === 'penalty' || entry.points < 0;
              const pointsAbs = Math.abs(entry.points);

              return (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {entry.adminName}
                      {entry.adminLogin ? (
                        <span className="ml-1 font-mono text-xs text-slate-500">({entry.adminLogin})</span>
                      ) : null}{' '}
                      → {entry.employeeName}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {dateTime.toLocaleDateString('ru-RU')} •{' '}
                      {dateTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        isPenalty ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isPenalty ? 'Штраф' : 'Начисление'}
                    </span>
                    <span className={`font-black ${isPenalty ? 'text-red-700' : 'text-emerald-700'}`}>
                      {isPenalty ? '-' : '+'}
                      {pointsAbs}
                    </span>
                    <span className="text-slate-600">баллов</span>
                  </div>

                  {entry.reason ? <p className="mt-1 text-xs text-slate-600">Причина: {entry.reason}</p> : null}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
