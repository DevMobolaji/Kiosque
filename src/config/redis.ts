import Redis from 'ioredis';
import { logger } from '@/config/logger';
import { config } from './env';

class RedisServer {

   private client: Redis | null;
   public isConnected: boolean = false;

   constructor() {
     this.client = null;
     this.isConnected = false;
   }


   //REDIS INSTANCE 
    private get redis(): Redis {
        if (!this.client) {
            throw new Error("Redis client not initialized. Call connect() first.");
        }
        return this.client;
    }

    /**
     * Setup Redis event listeners
     * SYSTEM DESIGN: Observability - know what's happening in your system
     */
    private setupEventListeners() {
        // Connection established
        this.redis.on('connect', () => {
            logger.info('🔗 Redis: Connection established');
        });

        // Connection ready (after auth, select db, etc.)
        this.redis.on('ready', () => {
            logger.info('✅ Redis: Ready to accept commands');
            this.isConnected = true;
        });

        // Error occurred
        this.redis.on('error', (err) => {
            logger.error({ err }, 'redis error');
            this.isConnected = false;
        });

        // Connection closed
        this.redis.on('close', () => {
            logger.info('🔌 Redis: Connection closed');
            this.isConnected = false;
        });

        // Reconnecting
        this.redis.on('reconnecting', () => {
            logger.info('🔄 Redis: Attempting to reconnect...');
        });

        // Connection ended
        this.redis.on('end', () => {
            logger.info('⚠️  Redis: Connection ended');
            this.isConnected = false;
        });
      }


       async connect() {
        try {
            // Create Redis client with configuration
            this.client = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                db: config.redis.db,

                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    console.log(`⏳ Redis: Retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },

                reconnectOnError: (err) => {
                    const targetErrors = ['READONLY', 'ECONNREFUSED'];
                    return targetErrors.some(targetError => err.message.includes(targetError));
                },
                maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
                enableReadyCheck: config.redis.enableReadyCheck,
                enableOfflineQueue: config.redis.enableOfflineQueue,
                connectTimeout: 10000,
                keepAlive: 30000,
            });

            // Setup event listeners
            this.setupEventListeners();

            await new Promise((resolve, reject) => {
                this.redis.on('ready', resolve);
                this.redis.on('error', reject);

                // Timeout after 10 seconds
                setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
            });
            this.isConnected = true;

            // Test connection
            await this.testConnection();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({ errorMessage }, 'Failed to connect to Redis');
            throw error;
        }
        
    }

    async testConnection() {
        try {
            const result = await this.redis.ping();
            if (result === 'PONG') {
                logger.info('✅ Redis: Ping successful');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({ errorMessage }, '❌ Redis: Ping failed:');
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
            logger.info('👋 Redis: Disconnected gracefully');
        }
    }
}

export const redisServer = new RedisServer();
