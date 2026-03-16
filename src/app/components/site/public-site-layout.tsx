import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, LogIn, Menu, Phone, Shield, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { useWebsiteContent } from '../../context/WebsiteContentContext';

const publicNavItems = [
  { to: '/', label: 'Главная' },
  { to: '/services', label: 'Услуги' },
  { to: '/about', label: 'О компании' },
  { to: '/team', label: 'Команда' },
  { to: '/contacts', label: 'Контакты' },
];

export function PublicSiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { currentUser } = useApp();
  const { trackVisitorEvent } = useOperations();
  const { websiteContent } = useWebsiteContent();

  const dashboardLink = useMemo(() => {
    if (!currentUser) return null;
    return currentUser.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
  }, [currentUser]);

  useEffect(() => {
    trackVisitorEvent('page_view', location.pathname);
  }, [location.pathname, trackVisitorEvent]);

  return (
    <div className="zan-public-page zan-brand-grid">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 72 }).map((_, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              width: `${(index % 4) + 1}px`,
              height: `${(index % 4) + 1}px`,
              top: `${(index * 17) % 100}%`,
              left: `${(index * 13) % 100}%`,
              opacity: 0.24,
              animation: `zan-twinkle ${2.8 + (index % 5)}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-300/12">
              <Building2 className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-base font-black tracking-[0.22em] text-white">{websiteContent.company.shortName}</p>
              <p className="text-xs text-slate-300">{websiteContent.company.tagline}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `zan-public-nav-link rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white/12 text-white shadow-[0_0_22px_rgba(212,175,55,0.18)]'
                      : 'text-slate-300 hover:bg-white/6 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={`tel:${websiteContent.contacts.phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              <Phone className="h-4 w-4 text-amber-300" />
              {websiteContent.contacts.phone}
            </a>

            {dashboardLink ? (
              <Link
                to={dashboardLink}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-5 py-2.5 text-sm font-bold text-slate-950"
              >
                {currentUser?.role === 'admin' ? <Shield className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                {currentUser?.role === 'admin' ? 'В админ-панель' : 'В кабинет'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-5 py-2.5 text-sm font-bold text-slate-950"
              >
                <LogIn className="h-4 w-4" />
                Войти
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((previous) => !previous)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-slate-950/94 px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {publicNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `zan-public-nav-link rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isActive ? 'bg-white/12 text-white' : 'text-slate-300'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-2 grid gap-2">
                {dashboardLink ? (
                  <Link
                    to={dashboardLink}
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-5 py-3 text-sm font-bold text-slate-950"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {currentUser?.role === 'admin' ? 'Открыть админ-панель' : 'Открыть кабинет'}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-5 py-3 text-sm font-bold text-slate-950"
                  >
                    <LogIn className="h-4 w-4" />
                    Войти
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/88">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-base font-black tracking-[0.24em] text-white">{websiteContent.company.name}</p>
            <p className="text-sm text-slate-300">{websiteContent.company.tagline}</p>
            <p className="text-sm leading-6 text-slate-400">{websiteContent.company.aboutText}</p>
          </div>

          <div className="grid gap-2 text-sm text-slate-300">
            <p>{websiteContent.contacts.phone}</p>
            <p>{websiteContent.contacts.email}</p>
            <p>{websiteContent.contacts.address}</p>
            <Link to="/login" className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200">
              <ArrowRight className="h-4 w-4" />
              Вход в систему
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

