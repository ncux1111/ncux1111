import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FileText, LayoutDashboard, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWebsiteContent } from '../../context/WebsiteContentContext';
import { Avatar } from '../../components/avatar';

export function EmployeeLayout() {
  const navigate = useNavigate();
  const { currentUser, authReady, logout, employees } = useApp();
  const { websiteContent } = useWebsiteContent();

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!currentUser || currentUser.role !== 'employee' || currentUser.mustChangePassword) {
      navigate('/login', { replace: true });
    }
  }, [authReady, currentUser, navigate]);

  if (!authReady || !currentUser || currentUser.role !== 'employee' || currentUser.mustChangePassword) {
    return null;
  }

  const employee = employees.find((item) => item.id === currentUser.id);

  return (
    <div className="zan-internal-page min-h-screen">
      <header className="zan-internal-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Avatar
              avatar={employee?.avatar}
              name={employee?.name}
              className="h-14 w-14 rounded-[1.3rem] border border-slate-200 bg-white"
              textClassName="text-xl"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                {websiteContent.company.shortName}
              </p>
              <h1 className="text-2xl font-black text-slate-950">Личный кабинет</h1>
              <p className="text-sm text-slate-600">{currentUser.name}</p>
            </div>
          </div>

          <button
            data-testid="employee-logout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="zan-toolbar-button zan-toolbar-button-secondary"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="zan-internal-nav flex flex-wrap gap-2 rounded-[2rem] p-3">
          <NavLink
            to="/employee/dashboard"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            Кабинет
          </NavLink>
          <NavLink
            to="/employee/templates"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <FileText className="h-4 w-4" />
            Шаблоны документов
          </NavLink>
        </nav>

        <main className="zan-internal-shell pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
