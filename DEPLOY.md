# DEPLOY

## Production target
- Ubuntu VPS
- PostgreSQL 15+
- Node.js 22+
- nginx
- pm2
- домен `zanqdm.kz`

## Структура на сервере
```text
/var/www/zanqdm/
  current/                  # код проекта
  shared/
    uploads/                # постоянные загруженные файлы
    backend/.env.production # production env backend
```

## 1. Системные пакеты
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Папки проекта
```bash
sudo mkdir -p /var/www/zanqdm/current
sudo mkdir -p /var/www/zanqdm/shared/uploads
sudo mkdir -p /var/www/zanqdm/shared/backend
sudo chown -R $USER:$USER /var/www/zanqdm
```

## 3. Код проекта
```bash
cd /var/www/zanqdm/current
git clone <REPOSITORY_URL> .
npm install
cd backend && npm install && cd ..
```

## 4. PostgreSQL
```bash
sudo -u postgres psql
```

```sql
CREATE USER zanqdm WITH PASSWORD 'STRONG_DB_PASSWORD';
CREATE DATABASE zanqdm OWNER zanqdm;
GRANT ALL PRIVILEGES ON DATABASE zanqdm TO zanqdm;
\q
```

## 5. Backend env
Файл: `/var/www/zanqdm/shared/backend/.env.production`

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://zanqdm:STRONG_DB_PASSWORD@127.0.0.1:5432/zanqdm
CORS_ORIGIN=https://zanqdm.kz,https://www.zanqdm.kz
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
UPLOAD_ROOT=/var/www/zanqdm/shared/uploads
TRUST_PROXY=1
COOKIE_DOMAIN=
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
```

## 6. Frontend env
Файл: `/var/www/zanqdm/current/.env.production`

```env
VITE_API_URL=/
```

## 7. Миграции и seed
```bash
cd /var/www/zanqdm/current
export DATABASE_URL="postgresql://zanqdm:STRONG_DB_PASSWORD@127.0.0.1:5432/zanqdm"
npm run backend:prisma:migrate:deploy
npm run backend:seed
```

Seed создаёт администратора:
- login: `oleg`
- password: `1234`
- после первого входа требуется смена пароля

## 8. Сборка
```bash
cd /var/www/zanqdm/current
npm run backend:build
npm run build
```

## 9. PM2
```bash
cd /var/www/zanqdm/current
ENV_FILE=/var/www/zanqdm/shared/backend/.env.production pm2 start backend/dist/server.js --name zan-qdm-backend
pm2 save
pm2 startup
```

## 10. Nginx
Использовать `deploy/nginx/zanqdm.conf`.

Ключевая схема:
- frontend: `dist/`
- backend: `127.0.0.1:4000`
- reverse proxy: `/api`
- SPA fallback: `/index.html`

Подключение:
```bash
sudo cp deploy/nginx/zanqdm.conf /etc/nginx/sites-available/zanqdm.conf
sudo ln -s /etc/nginx/sites-available/zanqdm.conf /etc/nginx/sites-enabled/zanqdm.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 11. SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d zanqdm.kz -d www.zanqdm.kz
```

## 12. Проверка после деплоя
1. Открыть `https://zanqdm.kz`
2. Проверить `/login`
3. Войти как `oleg / 1234`
4. Убедиться, что срабатывает forced password change
5. Проверить `/admin/dashboard`
6. Проверить CRM, шаблоны, reviews и TV settings
7. Проверить сохранение uploads в `UPLOAD_ROOT`

## 13. Обновление без потери данных
```bash
cd /var/www/zanqdm/current
git pull
npm install
cd backend && npm install && cd ..
export DATABASE_URL="postgresql://zanqdm:STRONG_DB_PASSWORD@127.0.0.1:5432/zanqdm"
npm run backend:prisma:migrate:deploy
npm run backend:seed
npm run backend:build
npm run build
pm2 restart zan-qdm-backend
sudo systemctl reload nginx
```

## 14. Backup
### PostgreSQL
```bash
pg_dump -Fc -U zanqdm -d zanqdm > zanqdm-$(date +%F).dump
```

### Uploads
```bash
tar -czf zanqdm-uploads-$(date +%F).tar.gz /var/www/zanqdm/shared/uploads
```