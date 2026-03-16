import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { AdminLayout } from './pages/admin/layout';
import { EmployeeLayout } from './pages/employee/layout';
import { AppProvider, useApp } from './context/AppContext';
import { WebsiteContentProvider } from './context/WebsiteContentContext';
import { OperationsProvider } from './context/OperationsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DocumentTemplatesProvider } from './modules/templates';
import { UiEncodingGuard } from './components/ui-encoding-guard';
import { PublicSiteLayout } from './components/site/public-site-layout';
import { HomePage } from './pages/home';
import { ServicesPage } from './pages/services';
import { AboutPage } from './pages/about';
import { TeamPage } from './pages/team';
import { ContactsPage } from './pages/contacts';
import { RouteLoader } from './components/site/route-loader';

const AdminDashboard = lazy(() =>
  import('./pages/admin/dashboard').then((module) => ({ default: module.AdminDashboard }))
);
const AdminManagement = lazy(() =>
  import('./pages/admin/management').then((module) => ({ default: module.AdminManagement }))
);
const AdminCrm = lazy(() =>
  import('./pages/admin/crm').then((module) => ({ default: module.AdminCrm }))
);
const AdminReviews = lazy(() =>
  import('./pages/admin/reviews').then((module) => ({ default: module.AdminReviews }))
);
const AdminFinance = lazy(() =>
  import('./pages/admin/finance').then((module) => ({ default: module.AdminFinance }))
);
const AdminSettings = lazy(() =>
  import('./pages/admin/settings').then((module) => ({ default: module.AdminSettings }))
);
const AdminStats = lazy(() =>
  import('./pages/admin/stats').then((module) => ({ default: module.AdminStats }))
);
const AdminTemplates = lazy(() =>
  import('./pages/admin/templates').then((module) => ({ default: module.AdminTemplates }))
);
const AdminWebsite = lazy(() =>
  import('./pages/admin/website').then((module) => ({ default: module.AdminWebsite }))
);
const EmployeeDashboard = lazy(() =>
  import('./pages/employee/dashboard').then((module) => ({ default: module.EmployeeDashboard }))
);
const EmployeeTemplates = lazy(() =>
  import('./pages/employee/templates').then((module) => ({ default: module.EmployeeTemplates }))
);
const PublicRatingPage = lazy(() =>
  import('./pages/rating').then((module) => ({ default: module.PublicRatingPage }))
);
const TemplatesGatewayPage = lazy(() =>
  import('./pages/templates-gateway').then((module) => ({ default: module.TemplatesGatewayPage }))
);
const TVPage = lazy(() =>
  import('./pages/tv').then((module) => ({ default: module.TVPage }))
);

function renderLazy(element: ReactNode) {
  return (
    <Suspense fallback={<RouteLoader />}>
      {element}
    </Suspense>
  );
}

function RootProviders() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <WebsiteContentProvider>
          <DocumentTemplatesProvider>
            <OperationsProvider>
              <UiEncodingGuard />
              <Outlet />
            </OperationsProvider>
          </DocumentTemplatesProvider>
        </WebsiteContentProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

function ProtectedTvRoute() {
  const { currentUser, authReady } = useApp();

  if (!authReady) {
    return <RouteLoader />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return renderLazy(<TVPage />);
}

function createRouter() {
  return createBrowserRouter([
    {
      element: <RootProviders />,
      children: [
        {
          element: <PublicSiteLayout />,
          children: [
            { path: '/', element: <HomePage /> },
            { path: '/services', element: <ServicesPage /> },
            { path: '/about', element: <AboutPage /> },
            { path: '/team', element: <TeamPage /> },
            { path: '/contacts', element: <ContactsPage /> },
            { path: '/login', element: <LoginPage /> },
            { path: '/rating', element: renderLazy(<PublicRatingPage />) },
          ],
        },
        { path: '/templates', element: renderLazy(<TemplatesGatewayPage />) },
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: renderLazy(<AdminDashboard />) },
            { path: 'management', element: renderLazy(<AdminManagement />) },
            { path: 'reviews', element: renderLazy(<AdminReviews />) },
            { path: 'crm', element: renderLazy(<AdminCrm />) },
            { path: 'templates', element: renderLazy(<AdminTemplates />) },
            { path: 'website', element: renderLazy(<AdminWebsite />) },
            { path: 'finance', element: renderLazy(<AdminFinance />) },
            { path: 'settings', element: renderLazy(<AdminSettings />) },
            { path: 'stats', element: renderLazy(<AdminStats />) },
          ],
        },
        {
          path: '/employee',
          element: <EmployeeLayout />,
          children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: renderLazy(<EmployeeDashboard />) },
            { path: 'templates', element: renderLazy(<EmployeeTemplates />) },
          ],
        },
        { path: '/tv', element: <ProtectedTvRoute /> },
      ],
    },
  ]);
}

export const router = createRouter();
