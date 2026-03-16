import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEYS = {
  employees: 'law-firm-employees',
  currentUser: 'law-firm-current-user',
  templateAccess: 'law-firm-doc-template-access',
};

function createPasswordHash(password: string, salt: string) {
  return `zanqdm-sha256-v1:${createHash('sha256')
    .update(`zanqdm-sha256-v1:${salt}:${password}`)
    .digest('hex')}`;
}

function createEmployee() {
  const passwordSalt = 'test-employee-salt';

  return {
    id: 'employee-smoke-1',
    name: 'Алина',
    position: 'Юрист',
    teamId: 'team1',
    totalPoints: 18,
    weeklyPoints: 7,
    login: 'alina',
    passwordHash: createPasswordHash('alina-123', passwordSalt),
    passwordSalt,
  };
}

async function seedLocalStorage(
  page: Page,
  payload: Partial<Record<string, unknown>>
) {
  await page.addInitScript((entries) => {
    window.localStorage.clear();

    Object.entries(entries).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      window.localStorage.setItem(key, JSON.stringify(value));
    });
  }, payload);
}

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

test('публичные страницы открываются без падения', async ({ page }) => {
  const errors = trackPageErrors(page);
  const routes = ['/', '/services', '/about', '/team', '/contacts', '/login', '/rating'];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : `${route}$`}`));
    await expect(page.locator('body')).toContainText('ZAN QDM');
    await expect(page.getByText('Что-то пошло не так')).toHaveCount(0);
  }

  expect(errors).toEqual([]);
});

test('администратор входит, попадает в админку и выходит', async ({ page }) => {
  await page.goto('/login');

  await page.getByTestId('login-role-admin').click();
  await page.getByTestId('login-admin-username').fill('oleg');
  await page.getByTestId('login-admin-password').fill('1234');
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Админ-панель' })).toBeVisible();

  await page.getByTestId('admin-logout').click();
  await expect(page).toHaveURL(/\/login$/);
});

test('сотрудник входит, попадает в кабинет и выходит', async ({ page }) => {
  const employee = createEmployee();

  await seedLocalStorage(page, {
    [STORAGE_KEYS.employees]: [employee],
  });

  await page.goto('/login');

  await page.getByTestId('login-role-employee').click();
  await page.getByTestId('login-employee-username').fill(employee.login);
  await page.getByTestId('login-employee-password').fill('alina-123');
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/employee\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Личный кабинет', exact: true })).toBeVisible();

  await page.getByTestId('employee-logout').click();
  await expect(page).toHaveURL(/\/login$/);
});

test('templates gateway ведёт сотрудника в его шаблоны, а /tv для него закрыт', async ({ page }) => {
  const employee = createEmployee();

  await seedLocalStorage(page, {
    [STORAGE_KEYS.employees]: [employee],
    [STORAGE_KEYS.currentUser]: {
      id: employee.id,
      name: employee.name,
      role: 'employee',
      login: employee.login,
    },
    [STORAGE_KEYS.templateAccess]: {
      [employee.id]: ['doc-33570-bvu'],
    },
  });

  await page.goto('/templates');
  await expect(page).toHaveURL(/\/employee\/templates$/);
  await expect(page.locator('body')).toContainText('Шаблоны');

  await page.goto('/tv');
  await expect(page).not.toHaveURL(/\/tv$/);
  await expect(page).toHaveURL(/\/(login|employee\/dashboard)$/);
});

test('админ получает доступ к admin/templates и TV-режиму', async ({ page }) => {
  await seedLocalStorage(page, {
    [STORAGE_KEYS.currentUser]: {
      id: 'admin1',
      name: 'Олег',
      role: 'admin',
      login: 'oleg',
    },
  });

  await page.goto('/templates');
  await expect(page).toHaveURL(/\/admin\/templates$/);
  await expect(page.locator('body')).toContainText('Шаблон');

  await page.goto('/tv');
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('body')).toContainText(/ТАБЛИЦА ЛИДЕРОВ|Нет данных для TV-экрана/);
});

test('основные приватные маршруты открываются без error boundary', async ({ page }) => {
  const errors = trackPageErrors(page);
  const employee = createEmployee();

  await seedLocalStorage(page, {
    [STORAGE_KEYS.employees]: [employee],
    [STORAGE_KEYS.currentUser]: {
      id: 'admin1',
      name: 'Олег',
      role: 'admin',
      login: 'oleg',
    },
  });

  const adminRoutes = [
    '/admin/dashboard',
    '/admin/management',
    '/admin/templates',
    '/admin/settings',
    '/admin/stats',
    '/rating',
  ];

  for (const route of adminRoutes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Что-то пошло не так')).toHaveCount(0);
  }

  await seedLocalStorage(page, {
    [STORAGE_KEYS.employees]: [employee],
    [STORAGE_KEYS.currentUser]: {
      id: employee.id,
      name: employee.name,
      role: 'employee',
      login: employee.login,
    },
    [STORAGE_KEYS.templateAccess]: {
      [employee.id]: ['doc-33570-bvu'],
    },
  });

  for (const route of ['/employee/dashboard', '/employee/templates']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Что-то пошло не так')).toHaveCount(0);
  }

  expect(errors).toEqual([]);
});
