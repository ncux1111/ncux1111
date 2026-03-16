import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Award,
  BarChart3,
  FileCheck2,
  FileText,
  Globe2,
  LogOut,
  MessageCircleMore,
  Settings,
  Tv,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWebsiteContent } from '../../context/WebsiteContentContext';
import { openTvBrowserWindow } from '../../utils/tvWindow';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, authReady, logout, visibilitySettings } = useApp();
  const { websiteContent } = useWebsiteContent();

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!currentUser || currentUser.role !== 'admin' || currentUser.mustChangePassword) {
      navigate('/login', { replace: true });
      return;
    }

    if (!visibilitySettings.showSalarySection && location.pathname === '/admin/finance') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [authReady, currentUser, location.pathname, navigate, visibilitySettings.showSalarySection]);

  if (!authReady || !currentUser || currentUser.role !== 'admin' || currentUser.mustChangePassword) {
    return null;
  }

  const handleOpenTv = async () => {
    openTvBrowserWindow();
  };

  const navItems = [
    { path: '/admin/dashboard', icon: Award, label: 'Обзор' },
    { path: '/admin/management', icon: Users, label: 'Управление' },
    { path: '/admin/reviews', icon: FileCheck2, label: 'Проверка документов' },
    { path: '/admin/crm', icon: MessageCircleMore, label: 'Заявки' },
    { path: '/admin/templates', icon: FileText, label: 'Шаблоны' },
    { path: '/admin/website', icon: Globe2, label: 'Сайт' },
    ...(visibilitySettings.showSalarySection
      ? [{ path: '/admin/finance', icon: Wallet, label: 'Финансы' }]
      : []),
    { path: '/admin/stats', icon: BarChart3, label: 'Статистика' },
    { path: '/admin/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="zan-internal-page min-h-screen">
      <header className="zan-internal-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-amber-300/30 bg-gradient-to-br from-amber-100 to-amber-50">
              <Award className="h-7 w-7 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                {websiteContent.company.shortName}
              </p>
              <h1 className="text-2xl font-black text-slate-950">Админ-панель</h1>
              <p className="text-sm text-slate-600">
                Управление рейтингом, сайтом и внутренними модулями. Текущий пользователь: {currentUser.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              data-testid="admin-open-tv"
              onClick={handleOpenTv}
              className="zan-toolbar-button zan-toolbar-button-primary"
              title="Открыть TV-режим"
            >
              <Tv className="h-4 w-4" />
              TV-режим
            </button>
            <button
              data-testid="admin-logout"
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="zan-internal-nav flex flex-wrap gap-2 rounded-[2rem] p-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="zan-internal-shell pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
