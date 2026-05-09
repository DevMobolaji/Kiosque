import 'dotenv/config';
import App from './app';
import { config } from './config/env';
import AuthController from './modules/auth/auth.controller';

const app = new App([new AuthController()], Number(config.app.port));

const start = async () => {
  await app.initialize();
  app.listen()
}

start().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});