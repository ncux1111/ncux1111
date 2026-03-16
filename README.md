# ZAN QDM

Web-проект для юридической компании ZAN QDM.

Состав:
- frontend: React + Vite
- backend: Node.js + Express + Prisma
- database: PostgreSQL
- deploy: nginx + pm2

## Основные команды
```bash
npm install
npm run backend:build
npm run build
```

Для локальной разработки frontend + backend:
```bash
npm run web:full:dev
```

Подробный production-деплой: `DEPLOY.md`
Архитектура после чистки: `ARCHITECTURE_NOTES.md`
Отчёт по чистке: `CLEANUP_REPORT.md`