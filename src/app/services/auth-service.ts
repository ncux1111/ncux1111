import type { Admin, CurrentUser, Employee } from '../context/AppContext';
import { verifyPassword } from '../utils/credentials';
import { isApiPersistenceEnabled } from './api-client';
import {
  changePasswordWithApi,
  loginWithApi,
  logoutWithApi,
  restoreSessionFromApi,
  type ApiCurrentUser,
} from './server-api';

export type AuthRole = 'admin' | 'employee';

interface AuthDirectory {
  admins: Admin[];
  employees: Employee[];
}

function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

function createCurrentUser(user: Admin | Employee, role: AuthRole): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    role,
    login: user.login,
  };
}

function createApiCurrentUser(user: ApiCurrentUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    login: user.login,
    mustChangePassword: user.mustChangePassword,
  };
}

function findUserByLogin(
  directory: AuthDirectory,
  role: AuthRole,
  login: string
) {
  const normalizedLogin = normalizeLogin(login);

  if (role === 'admin') {
    return directory.admins.find((admin) => admin.login.toLowerCase() === normalizedLogin) || null;
  }

  return (
    directory.employees.find((employee) => employee.login.toLowerCase() === normalizedLogin) || null
  );
}

export async function authenticateLocalUser(
  directory: AuthDirectory,
  role: AuthRole,
  login: string,
  password: string
): Promise<CurrentUser | null> {
  if (isApiPersistenceEnabled()) {
    const response = await loginWithApi({
      login,
      password,
      role,
    });
    return createApiCurrentUser(response.user);
  }

  const user = findUserByLogin(directory, role, login);
  if (!user) {
    return null;
  }

  const isValidPassword = await verifyPassword(user, password.trim());
  if (!isValidPassword) {
    return null;
  }

  return createCurrentUser(user, role);
}

export function getRoleHomePath(role: AuthRole) {
  return role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
}

export async function restoreAuthSession() {
  if (!isApiPersistenceEnabled()) {
    return null;
  }

  try {
    const response = await restoreSessionFromApi();
    return createApiCurrentUser(response.user);
  } catch {
    return null;
  }
}

export async function logoutSession(clientId?: string) {
  if (!isApiPersistenceEnabled()) {
    return;
  }

  try {
    await logoutWithApi({ clientId });
  } catch {
    // local fallback should still clear state
  }
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const response = await changePasswordWithApi({ currentPassword, newPassword });
  return createApiCurrentUser(response.user);
}
