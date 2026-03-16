import { apiRequest } from './api-client';

export interface ApiCurrentUser {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  login?: string;
  mustChangePassword?: boolean;
}

export interface BootstrapPayload {
  currentUser: ApiCurrentUser;
  directory: {
    employees: unknown[];
    admins: unknown[];
    teams: unknown[];
  };
  app: {
    prizePool: number;
    soundEnabled: boolean;
    services: unknown[];
    pointsHistory: unknown[];
    visibilitySettings: unknown;
    tvAudioSettings: unknown;
    tvMemeSettings: unknown;
  };
  websiteContent: unknown;
  templates: {
    templates: unknown[];
    templateAccess: unknown;
    templateUsageLog: unknown[];
  };
  operations: {
    userMeta: unknown;
    siteLeads: unknown[];
    visitorEvents: unknown[];
    activityLog: unknown[];
    documentReviews: unknown[];
    notes: unknown[];
  };
}

export function loginWithApi(payload: {
  login: string;
  password: string;
  role: 'admin' | 'employee';
  clientId?: string;
}) {
  return apiRequest<{ user: ApiCurrentUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function restoreSessionFromApi() {
  return apiRequest<{ user: ApiCurrentUser }>('/api/auth/me', {
    method: 'GET',
  });
}

export function logoutWithApi(payload: { clientId?: string }) {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePasswordWithApi(payload: { currentPassword: string; newPassword: string }) {
  return apiRequest<{ user: ApiCurrentUser }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchBootstrapState() {
  return apiRequest<BootstrapPayload>('/api/bootstrap', { method: 'GET' });
}

export function saveDirectoryStateApi(payload: unknown) {
  return apiRequest('/api/state/directory', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveAppStateApi(payload: unknown) {
  return apiRequest('/api/state/app', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveTemplateStateApi(payload: unknown) {
  return apiRequest('/api/state/templates', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveOperationsStateApi(payload: unknown) {
  return apiRequest('/api/state/operations', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveWebsiteStateApi(payload: unknown) {
  return apiRequest('/api/state/website', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchPublicWebsiteContentApi() {
  return apiRequest('/api/public/website-content', { method: 'GET' });
}

export function createPublicLeadApi(payload: unknown) {
  return apiRequest('/api/public/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createVisitorEventApi(payload: unknown) {
  return apiRequest('/api/public/visitor-events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function importLocalStateApi(payload: unknown) {
  return apiRequest('/api/migration/import-local', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
