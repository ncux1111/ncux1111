# ARCHITECTURE NOTES

## Общая схема
Проект состоит из двух частей:
- frontend на React + Vite
- backend на Node.js + Express + Prisma

Это web-only проект для одного домена.
Frontend работает как публичный сайт и как внутренняя система компании.
Backend является единым источником данных для всех устройств.

## Где что находится
- frontend runtime: `src/`
- backend runtime: `backend/src/`
- prisma schema: `backend/prisma/schema.prisma`
- prisma seed: `backend/prisma/seed.ts`
- deploy configs: `deploy/`
- public static files: `public/`
- built-in DOCX templates: `public/templates/`
- uploaded files на сервере: `UPLOAD_ROOT`
- legacy и старые сборки: `quarantine/`

## Frontend
### Основные зоны
- публичный сайт: `src/app/components/site`, `src/app/pages/*`
- admin shell: `src/app/pages/admin/`
- employee shell: `src/app/pages/employee/`
- TV: `src/app/pages/tv.tsx`, `src/app/components/tv-display.tsx`
- документы и шаблоны: `src/app/components/documents`, `src/app/modules/templates`

### Состояние
Ключевые контексты:
- `AppContext` — directory, points, teams, TV settings, auth shell state
- `WebsiteContentContext` — контент публичного сайта
- `OperationsContext` — CRM, reviews, notes, activity, visitor events
- `DocumentTemplatesContext` — библиотека шаблонов, доступы, usage log

В production API-режиме эти контексты гидратируются из backend bootstrap.
`localStorage` больше не должен быть источником истины для web production.

## Backend
### Entry point
- `backend/src/server.ts`

### Основные группы API
- auth: `/api/auth/*`
- bootstrap: `/api/bootstrap`
- state sync: `/api/state/*`
- public website: `/api/public/*`
- uploads: `/api/uploads/*`
- migration import: `/api/migration/import-local`

### Слои
- `config/` — env и prisma runtime
- `lib/` — токены, ошибки, storage helpers
- `middleware/` — auth и error handling
- `routes/` — REST endpoints
- `services/` — auth/state logic

## Templates
- Built-in шаблоны лежат в `public/templates/`
- Пользовательские шаблоны и review files идут через upload/storage слой
- Employee может отправить документ на review из preview или файлом
- Admin обрабатывает review queue и может начислить баллы

## Uploads
`UPLOAD_ROOT` должен быть вынесен за пределы release-папки.
Рекомендуемый путь:
- `/var/www/zanqdm/shared/uploads`

Там хранятся:
- uploaded template files
- review files
- QR images
- прочие server-side media assets

## Роли
- admin — управление пользователями, сайтом, шаблонами, CRM, reviews, TV
- employee — кабинет, доступные шаблоны, отправка документов на проверку
- public client — только публичный сайт и форма заявки

## Что не участвует в web runtime
Всё Electron-related и старые build-артефакты вынесены в `quarantine/` и не должны участвовать в production deploy сайта.