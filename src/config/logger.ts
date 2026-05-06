import pino from 'pino';
import { config } from './env';

export const logger = pino({
  level: config.logging.level,
  transport:
    config.app.env === 'development'
      ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
      : undefined,
  base: {
    env: config.app.env,
  },
});
