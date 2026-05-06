import 'dotenv/config';
import App from './app';
import { config } from './config/env';

const app = new App([], Number(config.app.port));

const start = async () => {
  await app.initialize();
  app.listen()
}

start().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});