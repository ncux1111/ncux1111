# CLEANUP REPORT

## Итог
Проект приведён к web-only структуре для production-деплоя сайта `zanqdm.kz`.
Electron-код, старые клиентские сборки и временные артефакты вынесены из корня в `quarantine/`.

## Что оставлено в рабочем корне
- `backend/` — backend runtime, Prisma, migrations, seed
- `src/` — frontend runtime
- `public/` — статические файлы и встроенные DOCX-шаблоны
- `deploy/` — nginx, pm2, systemd
- `scripts/` — пустой runtime-safe каталог; electron-скрипты вынесены
- `tests/` и `playwright.config.ts` — оставлены как smoke-проверки
- `.env.example`, `.env.production.example`
- `package.json`, `package-lock.json`
- `vite.config.ts`, `postcss.config.mjs`, `index.html`
- `README.md`, `DEPLOY.md`, `ARCHITECTURE_NOTES.md`

## Что перенесено в quarantine
### `quarantine/electron_legacy`
- `electron/`
- `client-media/`
- `scripts/run-electron.cjs`
- `scripts/run-electron-dev.cjs`
- `scripts/prepare-client-build.cjs`

### `quarantine/old_builds`
- `dist/`
- `release/`
- `final-build/`
- `FINAL_FOR_CLIENT/`

### `quarantine/ui_legacy`
- `ModernLegalWebsiteUI_extracted/`
- `Modern Legal Website UI.zip`

### `quarantine/test_artifacts`
- `test-results/`

### `quarantine/review_needed`
- `guidelines/`
- `.codex-creditors-final.json`
- `project_backup.tar.gz`
- старые deploy-документы: `README_DEPLOY.md`, `DEPLOY_CLEAN.md`

## Что удалено
- `backend/prisma/seed.js` — stale generated duplicate рядом с `seed.ts`
- временные локальные файлы логов и отладочные txt были убраны на предыдущем этапе

## Что изменено в коде и конфигурации
### Root package
- удалён Electron app config из `package.json`
- удалены Electron scripts:
  - `build:electron`
  - `electron`
  - `electron:dev`
  - `electron:build`
  - `client:prepare`
  - `build:final`
  - `client:build`
  - `dist`
- удалены Electron devDependencies:
  - `electron`
  - `electron-builder`
  - `wait-on`
- имя пакета приведено к понятному: `zan-qdm-web`

### Frontend config
- `vite.config.ts` переведён в чистый web mode с `base: '/'`
- router больше не использует `HashRouter` и Electron detection
- admin TV launcher больше не зависит от Electron bridge
- frontend state в API-режиме не стартует из `localStorage` как из источника истины

### Backend
- backend build очищает `backend/dist` перед сборкой
- env loading сохранён в production-safe виде через `ENV_FILE` и `.env.production`

## Что найдено как ключевые production-проблемы
1. В API-режиме frontend стартовал из локального браузерного state, а не из backend bootstrap.
2. Встроенные DOCX-шаблоны открывались по route-relative URL и могли ломаться на вложенных маршрутах.
3. В корне лежали старые сборки, Electron-артефакты и extracted UI-заготовки.
4. Root `package.json` содержал смешанный web/electron pipeline.

## Что оставлено специально
- `public/templates/` не переносился в отдельный root `templates/`, потому что это реальный Vite runtime source для встроенных DOCX.
- `tests/` не удалялись: они не мешают production и полезны для smoke-проверки.
- `quarantine/` сохранён как безопасная зона review вместо мгновенного удаления спорных файлов.

## Оставшиеся риски
- Часть доменных данных по-прежнему хранится snapshot-таблицами в PostgreSQL. Для малого бизнеса это приемлемо, но при росте потребуется более глубокая нормализация.
- Для окончательной серверной валидации нужен живой PostgreSQL и прогон `migrate + seed` на VPS.

## Рекомендуемая структура
```text
project-root/
  backend/
  deploy/
  public/
  quarantine/
  scripts/
  src/
  tests/
  .env.example
  .env.production.example
  .gitignore
  ARCHITECTURE_NOTES.md
  CLEANUP_REPORT.md
  DEPLOY.md
  index.html
  package.json
  package-lock.json
  playwright.config.ts
  postcss.config.mjs
  README.md
  vite.config.ts
```