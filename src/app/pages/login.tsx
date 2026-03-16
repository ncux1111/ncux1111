import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, Lock, LogIn, Shield, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOperations } from '../context/OperationsContext';
import { useWebsiteContent } from '../context/WebsiteContentContext';
import { authenticateLocalUser, changeOwnPassword, getRoleHomePath } from '../services/auth-service';
import { isApiPersistenceEnabled } from '../services/api-client';

type LoginRole = 'admin' | 'employee' | null;

export function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser, employees, admins, currentUser } = useApp();
  const { isUserBlocked } = useOperations();
  const { websiteContent } = useWebsiteContent();

  const [selectedRole, setSelectedRole] = useState<LoginRole>('employee');
  const [adminLogin, setAdminLogin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [employeeLogin, setEmployeeLogin] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [forcedCurrentPassword, setForcedCurrentPassword] = useState('');
  const [forcedNewPassword, setForcedNewPassword] = useState('');
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('');
  const [forcedSaving, setForcedSaving] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) return;
    navigate(currentUser.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard', {
      replace: true,
    });
  }, [currentUser, navigate]);

  const activeFormValid = useMemo(() => {
    if (selectedRole === 'admin') {
      return adminLogin.trim().length > 0 && adminPassword.trim().length > 0;
    }

    if (selectedRole === 'employee') {
      return employeeLogin.trim().length > 0 && employeePassword.trim().length > 0;
    }

    return false;
  }, [adminLogin, adminPassword, employeeLogin, employeePassword, selectedRole]);

  const handleLogin = async () => {
    setLoginError('');

    if (selectedRole === 'admin') {
      const nextUser = await authenticateLocalUser({ admins, employees }, 'admin', adminLogin, adminPassword);

      if (!nextUser) {
        setLoginError('Неверный логин или пароль администратора.');
        return;
      }

      if (!isApiPersistenceEnabled() && isUserBlocked('admin', nextUser.id)) {
        setLoginError('Учетная запись администратора заблокирована.');
        return;
      }

      setCurrentUser(nextUser);
      if (!nextUser.mustChangePassword) {
        navigate(getRoleHomePath('admin'));
        if (isApiPersistenceEnabled()) {
          window.setTimeout(() => window.location.reload(), 0);
        }
      } else {
        setForcedCurrentPassword(adminPassword);
      }
      return;
    }

    if (selectedRole === 'employee') {
      const nextUser = await authenticateLocalUser(
        { admins, employees },
        'employee',
        employeeLogin,
        employeePassword
      );

      if (!nextUser) {
        setLoginError('Неверный логин или пароль сотрудника.');
        return;
      }

      if (!isApiPersistenceEnabled() && isUserBlocked('employee', nextUser.id)) {
        setLoginError('Учетная запись сотрудника заблокирована.');
        return;
      }

      setCurrentUser(nextUser);
      if (!nextUser.mustChangePassword) {
        navigate(getRoleHomePath('employee'));
        if (isApiPersistenceEnabled()) {
          window.setTimeout(() => window.location.reload(), 0);
        }
      } else {
        setForcedCurrentPassword(employeePassword);
      }
    }
  };

  const handleForcedPasswordChange = async () => {
    if (!currentUser) return;
    if (forcedNewPassword.trim().length < 4) {
      setLoginError('Новый пароль должен содержать минимум 4 символа.');
      return;
    }
    if (forcedNewPassword !== forcedConfirmPassword) {
      setLoginError('Подтверждение пароля не совпадает.');
      return;
    }

    try {
      setForcedSaving(true);
      setLoginError('');
      const nextUser = await changeOwnPassword(forcedCurrentPassword, forcedNewPassword);
      setCurrentUser(nextUser);
      navigate(getRoleHomePath(nextUser.role));
      window.setTimeout(() => window.location.reload(), 0);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Не удалось сменить пароль.');
    } finally {
      setForcedSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          className="zan-panel rounded-[2.2rem] p-7 text-white"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm text-amber-200">
            <LogIn className="h-4 w-4" />
            Вход в систему
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight">
            Вход для команды <span className="zan-gold-text">{websiteContent.company.shortName}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Доступ предназначен для сотрудников и администрации компании. Используйте выданные корпоративные учетные данные.
          </p>

          <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Если возникла проблема со входом
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
              <p>Проверьте раскладку клавиатуры и логин, выданный внутри компании.</p>
              <p>Если доступ не срабатывает, обратитесь к администратору или в офис ZAN QDM.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Контакты для связи</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>{websiteContent.contacts.phone}</p>
              <p>{websiteContent.contacts.email}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          className="zan-login-form-panel rounded-[2.2rem] p-7"
        >
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              Авторизация {websiteContent.company.shortName}
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Вход в систему</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">Для сотрудников и администрации компании.</p>
          </div>

          {currentUser?.mustChangePassword ? (
            <div className="space-y-4">
              <div className="rounded-[1.6rem] border border-amber-300/30 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
                Для этой учетной записи требуется обязательная смена пароля при первом входе.
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Текущий пароль</span>
                <input
                  type="password"
                  value={forcedCurrentPassword}
                  onChange={(event) => setForcedCurrentPassword(event.target.value)}
                  className="zan-login-input px-4 py-3"
                  placeholder="Введите текущий пароль"
                  autoComplete="current-password"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Новый пароль</span>
                <input
                  type="password"
                  value={forcedNewPassword}
                  onChange={(event) => setForcedNewPassword(event.target.value)}
                  className="zan-login-input px-4 py-3"
                  placeholder="Введите новый пароль"
                  autoComplete="new-password"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Подтверждение пароля</span>
                <input
                  type="password"
                  value={forcedConfirmPassword}
                  onChange={(event) => setForcedConfirmPassword(event.target.value)}
                  className="zan-login-input px-4 py-3"
                  placeholder="Повторите новый пароль"
                  autoComplete="new-password"
                />
              </label>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="login-role-employee"
              onClick={() => {
                setSelectedRole('employee');
                setLoginError('');
              }}
              data-active={selectedRole === 'employee'}
              className="zan-login-role-tab zan-login-role-tab--employee rounded-[1.5rem] px-4 py-4 text-left"
            >
              <User className="mb-3 h-6 w-6 text-emerald-300" />
              <p className="font-bold text-white">Сотрудник</p>
              <p className="mt-1 text-xs text-slate-300">Корпоративный вход</p>
            </button>

            <button
              data-testid="login-role-admin"
              onClick={() => {
                setSelectedRole('admin');
                setLoginError('');
              }}
              data-active={selectedRole === 'admin'}
              className="zan-login-role-tab zan-login-role-tab--admin rounded-[1.5rem] px-4 py-4 text-left"
            >
              <Shield className="mb-3 h-6 w-6 text-fuchsia-300" />
              <p className="font-bold text-white">Администрация</p>
              <p className="mt-1 text-xs text-slate-300">Служебный вход</p>
            </button>
              </div>

              <div className="mt-6 space-y-4">
                {selectedRole === 'admin' ? (
                  <>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-200">Логин</span>
                      <input
                        data-testid="login-admin-username"
                        value={adminLogin}
                        onChange={(event) => setAdminLogin(event.target.value.toLowerCase())}
                        className="zan-login-input px-4 py-3"
                        placeholder="Введите логин"
                        autoComplete="username"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-200">Пароль</span>
                      <input
                        data-testid="login-admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(event) => setAdminPassword(event.target.value)}
                        className="zan-login-input px-4 py-3"
                        placeholder="Введите пароль"
                        autoComplete="current-password"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-200">Логин</span>
                      <input
                        data-testid="login-employee-username"
                        value={employeeLogin}
                        onChange={(event) => setEmployeeLogin(event.target.value.toLowerCase())}
                        className="zan-login-input px-4 py-3"
                        placeholder="Введите логин"
                        autoComplete="username"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-200">Пароль</span>
                      <input
                        data-testid="login-employee-password"
                        type="password"
                        value={employeePassword}
                        onChange={(event) => setEmployeePassword(event.target.value)}
                        className="zan-login-input px-4 py-3"
                        placeholder="Введите пароль"
                        autoComplete="current-password"
                      />
                    </label>
                  </>
                )}
              </div>

              {selectedRole === 'employee' && employees.length === 0 ? (
                <div className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-amber-300/28 bg-amber-300/12 px-4 py-3 text-sm text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>Доступ для сотрудников пока не настроен. Обратитесь к администратору компании.</span>
                </div>
              ) : null}

              {loginError && (
                <div className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-rose-300/30 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                data-testid="login-submit"
                onClick={handleLogin}
                disabled={!activeFormValid}
                className={`zan-login-submit mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] px-5 py-4 text-sm font-bold text-white transition ${
                  !activeFormValid
                    ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                    : selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700'
                }`}
              >
                <Lock className="h-4 w-4" />
                Войти
              </button>
            </>
          )}

          {currentUser?.mustChangePassword ? (
            <button
              onClick={handleForcedPasswordChange}
              disabled={forcedSaving || forcedCurrentPassword.trim().length === 0}
              className="zan-login-submit mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              <Lock className="h-4 w-4" />
              {forcedSaving ? 'Сохраняем пароль...' : 'Сменить пароль и продолжить'}
            </button>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
