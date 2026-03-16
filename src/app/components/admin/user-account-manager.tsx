import { useMemo, useState } from 'react';
import { Edit2, KeyRound, Lock, LockOpen, RefreshCw, Save, Shield, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useOperations, type ManagedUserRole } from '../../context/OperationsContext';

type ManagedRow = {
  id: string;
  name: string;
  role: ManagedUserRole;
  login: string;
};

function formatLastLogin(value?: number) {
  if (!value) return 'Не входил';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserAccountManager() {
  const { employees, admins, currentUser } = useApp();
  const {
    userMeta,
    isUserBlocked,
    updateEmployeeAccount,
    updateAdminAccount,
    resetUserPassword,
    setUserBlocked,
  } = useOperations();

  const [editingUser, setEditingUser] = useState<ManagedRow | null>(null);
  const [loginDraft, setLoginDraft] = useState('');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [panelError, setPanelError] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo<ManagedRow[]>(() => {
    const adminRows = admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      role: 'admin' as const,
      login: admin.login,
    }));

    const employeeRows = employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: 'employee' as const,
      login: employee.login,
    }));

    return [...adminRows, ...employeeRows].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'admin' ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'ru-RU');
    });
  }, [admins, employees]);

  const openEditor = (row: ManagedRow, mode: 'login' | 'password' | 'both' = 'both') => {
    setEditingUser(row);
    setLoginDraft(mode === 'password' ? row.login : row.login);
    setPasswordDraft('');
    setPanelError('');
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      setPanelError('');
      if (editingUser.role === 'employee') {
        await updateEmployeeAccount(editingUser.id, {
          login: loginDraft,
          password: passwordDraft || undefined,
        });
      } else {
        await updateAdminAccount(editingUser.id, {
          login: loginDraft,
          password: passwordDraft || undefined,
        });
      }

      setEditingUser(null);
      setPasswordDraft('');
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Не удалось обновить учетную запись.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (row: ManagedRow) => {
    const nextPassword = await resetUserPassword(row.role, row.id);
    window.alert(`Временный пароль для ${row.name}: ${nextPassword}`);
  };

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">Управление логинами и паролями</h2>
          <p className="mt-1 text-sm text-slate-600">
            Администратор может менять логины, обновлять пароли, сбрасывать доступ и блокировать учетные записи.
          </p>
        </div>
      </div>

      {editingUser ? (
        <div className="zan-muted-card mb-5 rounded-[1.6rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Редактирование пользователя</p>
              <p className="text-lg font-black text-slate-950">{editingUser.name}</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {editingUser.role === 'admin' ? 'Администратор' : 'Сотрудник'}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Логин</span>
              <input
                value={loginDraft}
                onChange={(event) => setLoginDraft(event.target.value.toLowerCase())}
                className="zan-input px-4 py-3 text-sm"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Новый пароль</span>
              <input
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                className="zan-input px-4 py-3 text-sm"
                placeholder="Оставьте пустым, если пароль менять не нужно"
              />
            </label>
          </div>

          {panelError ? <p className="mt-3 text-sm text-rose-600">{panelError}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={saving} className="zan-toolbar-button zan-toolbar-button-primary">
              <Save className="h-4 w-4" />
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setPanelError('');
                setPasswordDraft('');
              }}
              className="zan-toolbar-button zan-toolbar-button-secondary"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-3 pr-4 font-semibold">Имя</th>
              <th className="py-3 pr-4 font-semibold">Роль</th>
              <th className="py-3 pr-4 font-semibold">Логин</th>
              <th className="py-3 pr-4 font-semibold">Последний вход</th>
              <th className="py-3 pr-4 font-semibold">Статус</th>
              <th className="py-3 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const meta = userMeta[`${row.role}:${row.id}`];
              const blocked = isUserBlocked(row.role, row.id);
              const isSelf = currentUser?.id === row.id && currentUser.role === row.role;

              return (
                <tr key={`${row.role}:${row.id}`} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        {row.role === 'admin' ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">{row.name}</p>
                        {isSelf ? <p className="text-xs text-slate-500">Текущая учетная запись</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{row.role === 'admin' ? 'Администратор' : 'Сотрудник'}</td>
                  <td className="py-4 pr-4 font-mono text-slate-800">{row.login}</td>
                  <td className="py-4 pr-4 text-slate-600">{formatLastLogin(meta?.lastLoginAt)}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${blocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {blocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditor(row, 'both')}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Edit2 className="h-3 w-3" />
                          Изменить
                        </span>
                      </button>
                      <button
                        onClick={() => openEditor(row, 'password')}
                        className="rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          <KeyRound className="h-3 w-3" />
                          Сменить пароль
                        </span>
                      </button>
                      <button
                        onClick={() => void handleResetPassword(row)}
                        className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Сбросить пароль
                        </span>
                      </button>
                      <button
                        onClick={() => setUserBlocked(row.role, row.id, !blocked)}
                        disabled={isSelf}
                        className={`rounded-2xl px-3 py-2 text-xs font-semibold ${blocked ? 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50' : 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {blocked ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {blocked ? 'Разблокировать' : 'Заблокировать'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
