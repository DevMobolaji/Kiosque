import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import Controller from 'interfaces/controller.interface';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { connectDatabase, disconnectDatabase, prisma } from '@/config/database';
import { redisServer } from '@/config/redis';
import { queues, closeAllQueues } from '@/infrastructure/queues';
import ErrorMiddleware from '@/common/middleware/error.handler';
import { attachContextMiddleware } from './common/middleware/context.middlware';
import { requestLogger } from './common/middleware/request-logger';
import { requestIdMiddleware } from './common/middleware/request-id-middleware';

class App {
  public express: Application;
  public port: number;
  private server: ReturnType<Application['listen']> | null = null;
  private isShuttingDown: boolean = false;



  constructor(controllers: Controller[], port: number) {
    this.express = express();
    this.port = port;

    this.initializeSecurityMiddleware();
    this.initializeParsingMiddleware();
    this.initializeRequestLogging();
    this.initializeHealthChecks();
    this.initializeBullBoard();
    this.initializeRoutes(controllers);
    this.initializedMetricsEndpoint();
    this.initializeErrorMiddleware();
    this.initializeGracefulShutdown();
  }

  /**
   * ================================================
   * EXTERNAL CONNECTIONS — called from server.ts before listen()
   * ================================================
   */
  public async initialize(): Promise<void> {
    try {
      await this.connectToPrisma();
      await this.connectToRedis();
      await this.connectToBullMQ();
      logger.info('application initialized');
    } catch (e: unknown) {
      logger.error({ err: e }, 'failed to initialize application');
      throw e;
    }
  }

  private async connectToPrisma(): Promise<void> {
    await connectDatabase();
  }

  private async connectToRedis(): Promise<void> {
    await redisServer.connect();
  }

  private async connectToBullMQ(): Promise<void> {
    // Verify Redis is reachable — BullMQ uses the same Redis instance.
    // Individual queues register themselves via registerQueue() in worker files.
    if (!redisServer.isConnected) {
      throw new Error('cannot initialize BullMQ: Redis is not connected');
    }
    logger.info('bullmq ready');
  }

  /**
   * ================================================
   * SECURITY — helmet, cors, rate limit
   * ================================================
   */
  private initializeSecurityMiddleware(): void {
    this.express.disable('x-powered-by');
    this.express.set('trust proxy', 1);

    this.express.use(
      helmet({
        contentSecurityPolicy: config.app.env === 'production',
        crossOriginEmbedderPolicy: false,
      })
    );

    this.express.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      })
    );

    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    });
    this.express.use('/api', limiter);
  }

  /**
   * ================================================
   * PARSING — body, urlencoded, cookies, gzip
   * ================================================
   */
  private initializeParsingMiddleware(): void {
    this.express.use(express.json({ limit: '10mb', strict: true }));
    this.express.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.express.use(cookieParser());
    this.express.use(compression());
  }

  /**
   * ================================================
   * LOGGING — pino-http, request id, response time
   * ================================================
   */
  private initializeRequestLogging(): void {
    this.express.use(requestIdMiddleware);
    this.express.use(attachContextMiddleware);
    this.express.use(requestLogger);
  }

  /**
   * ================================================
   * ROUTES
   * ================================================
   */
  private initializeRoutes(controllers: Controller[]): void {
    this.express.get('/', (_req: Request, res: Response) => {
      res.json({
        success: true,
        message: `Welcome to ${config.app.name}`,
        version: config.app.apiVersion,
        environment: config.app.env,
        documentation: `/api/${config.app.apiVersion}/docs`,
        health: '/health',
        ready: '/ready',
        metrics: '/metrics',
        queues: '/admin/queues',
      });
    });

    controllers.forEach((controller) => {
      this.express.use(
        `/api/${config.app.apiVersion}/${controller.path}`,
        controller.route
      );
      logger.info(
        { path: `/api/${config.app.apiVersion}/${controller.path}` },
        'route mounted'
      );
    });
  }

  /**
   * ================================================
   * HEALTH CHECKS — /health (liveness) + /ready (readiness)
   * ================================================
   */
  private initializeHealthChecks(): void {
    // Liveness — is the process up?
    this.express.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Readiness — can the app handle requests? (DB + Redis must respond)
    this.express.get('/ready', async (_req: Request, res: Response) => {
      const checks = {
        database: 'unknown' as 'ok' | 'fail' | 'unknown',
        redis: 'unknown' as 'ok' | 'fail' | 'unknown',
      };

      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
      } catch {
        checks.database = 'fail';
      }

      checks.redis = redisServer.isConnected ? 'ok' : 'fail';

      const allOk = checks.database === 'ok' && checks.redis === 'ok';
      res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ready' : 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * ================================================
   * METRICS — placeholder for prometheus exporter
   * ================================================
   */
  private initializedMetricsEndpoint(): void {
    this.express.get('/metrics', (_req: Request, res: Response) => {
      res.status(200).type('text/plain').send('# metrics endpoint reserved\n');
    });
  }

  /**
   * ================================================
   * BULL BOARD — UI to inspect queues at /admin/queues
   * ================================================
   */
  private initializeBullBoard(): void {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: Object.values(queues).map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    this.express.use('/admin/queues', serverAdapter.getRouter());
  }

  /**
   * ================================================
   * ERROR HANDLER — must be registered LAST
   * ================================================
   */
  private initializeErrorMiddleware(): void {
    this.express.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });

    // Global error handler
    this.express.use(ErrorMiddleware);
  }

  /**
   * ================================================
   * GRACEFUL SHUTDOWN — SIGINT, SIGTERM, uncaught
   * ================================================
   */
  private initializeGracefulShutdown(): void {
    process.on('SIGINT', () => {
      logger.warn('SIGINT received');
      void this.shutdown();
    });

    process.on('SIGTERM', () => {
      logger.warn('SIGTERM received');
      void this.shutdown();
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'uncaught exception');
      void this.shutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'unhandled rejection');
      void this.shutdown(1);
    });
  }

  public listen(): void {
    if (this.server) {
      logger.warn('server is already running');
      return;
    }

    this.server = this.express.listen(this.port, () => {
      logger.info(`server listening on port ${this.port}`);
    });
  }

  /**
   * ================================================
   * SHUTDOWN — close server, queues, redis, db, in order
   * ================================================
   */
  private async shutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('shutdown already in progress');
      return;
    }
    this.isShuttingDown = true;

    logger.info('shutting down gracefully');

    // 1. Stop accepting new HTTP connections, drain in-flight ones (10s grace)
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close((err) => {
          if (err) {
            logger.error({ err }, 'error closing http server');
          } else {
            logger.info('http server closed');
          }
          resolve();
        });

        setTimeout(() => {
          logger.warn('forcing http server close after timeout');
          resolve();
        }, 10_000);
      });
    }

    // 2. Drain queues (stops pulling new jobs, finishes in-flight)
    try {
      await closeAllQueues();
    } catch (err) {
      logger.error({ err }, 'error closing queues');
    }

    // 3. Disconnect Redis
    try {
      await redisServer.disconnect();
    } catch (err) {
      logger.error({ err }, 'error disconnecting redis');
    }

    // 4. Disconnect Prisma (last — workers may have used it)
    try {
      await disconnectDatabase();
    } catch (err) {
      logger.error({ err }, 'error disconnecting database');
    }

    logger.info('shutdown complete');
    process.exit(exitCode);
  }
}

export default App;
