module.exports = {
  apps: [
    {
      name: 'zan-qdm-backend',
      cwd: '/var/www/zanqdm/current/backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '/var/www/zanqdm/shared/backend/.env.production',
      },
    },
  ],
};
