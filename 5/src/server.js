import { createApp } from './app.js';

const PORT = process.env.PORT || 3005;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[ExpressApp] Сервер запущен на http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Tickets API: http://localhost:${PORT}/api/v1/tickets`);
});

const gracefulShutdown = () => {
  console.log('\nПолучен сигнал завершения. Закрытие HTTP сервера...');
  server.close(() => {
    console.log('HTTP сервер остановлен.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
