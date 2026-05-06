import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import HttpException, { ErrorOutput } from '@/common/errors/custom.apiError';
import { logger } from '@/config/logger';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/client';

type CustomErrorStructure = {
    statusCode: number;
    message: string;
    errors: ErrorOutput[];
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    let customError: CustomErrorStructure = {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'An unexpected internal server error occurred.',
        errors: [
            {
                message: 'An unexpected internal server error occurred.',
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                code: 'INTERNAL_SERVER_ERROR',
                extension: {},
            },
        ],
    };

    // -------------------------------------------------------------------
    // 1. Custom HttpException thrown from controllers/services
    // -------------------------------------------------------------------
    if (error instanceof HttpException) {
        logger.error(`[API_ERROR] ${error.statusCode} - ${error.message}`);
        customError.statusCode = error.statusCode;
        customError.errors = error.serializeErrors();
        customError.message = error.message;
    }

    // -------------------------------------------------------------------
    // 2. Zod validation errors
    // -------------------------------------------------------------------
    else if (error instanceof ZodError) {
        const fieldErrors: ErrorOutput[] = error.errors.map((e) => ({
            message: e.message,
            status: StatusCodes.BAD_REQUEST,
            code: 'VALIDATION_FAILED',
            extension: { field: e.path.join('.'), received: (e as any).received },
        }));

        customError.statusCode = StatusCodes.BAD_REQUEST;
        customError.message = 'One or more fields failed validation.';
        customError.errors = fieldErrors;

        logger.warn(`[API_ERROR] 400 - validation failed on ${fieldErrors.length} field(s)`);
    }

    // -------------------------------------------------------------------
    // 3. Prisma known request errors
    // -------------------------------------------------------------------
    else if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': {
                const field = (error.meta?.target as string[])?.join(', ') ?? 'field';
                customError.statusCode = StatusCodes.CONFLICT;
                customError.message = `A record with this ${field} already exists.`;
                customError.errors = [
                    {
                        message: customError.message,
                        status: customError.statusCode,
                        code: 'UNIQUE_CONSTRAINT_VIOLATION',
                        extension: { field },
                    },
                ];
                break;
            }

            case 'P2025': {
                customError.statusCode = StatusCodes.NOT_FOUND;
                customError.message = 'The requested record was not found.';
                customError.errors = [
                    {
                        message: customError.message,
                        status: customError.statusCode,
                        code: 'RESOURCE_NOT_FOUND',
                        extension: { cause: error.meta?.cause },
                    },
                ];
                break;
            }

            case 'P2003': {
                customError.statusCode = StatusCodes.BAD_REQUEST;
                customError.message = 'Foreign key constraint failed.';
                customError.errors = [
                    {
                        message: customError.message,
                        status: customError.statusCode,
                        code: 'FOREIGN_KEY_CONSTRAINT',
                        extension: { field: error.meta?.field_name },
                    },
                ];
                break;
            }

            default: {
                logger.error({ code: error.code, meta: error.meta }, '[PRISMA_ERROR] unhandled');
                customError.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
                customError.message = 'A database error occurred.';
                customError.errors = [
                    {
                        message: customError.message,
                        status: customError.statusCode,
                        code: `PRISMA_${error.code}`,
                        extension: {},
                    },
                ];
            }
        }

        logger.warn(`[DB_ERROR] ${customError.statusCode} - ${error.code}: ${error.message}`);
    }

    // -------------------------------------------------------------------
    // 4. Prisma validation error (bad query shape)
    // -------------------------------------------------------------------
    else if (error instanceof PrismaClientValidationError) {
        customError.statusCode = StatusCodes.BAD_REQUEST;
        customError.message = 'Invalid data provided to the database.';
        customError.errors = [
            {
                message: customError.message,
                status: customError.statusCode,
                code: 'PRISMA_VALIDATION',
                extension: {},
            },
        ];
        logger.warn('[DB_ERROR] Prisma validation failed');
    }

    // -------------------------------------------------------------------
    // 5. JWT errors
    // -------------------------------------------------------------------
    else if (error instanceof TokenExpiredError) {
        customError.statusCode = StatusCodes.UNAUTHORIZED;
        customError.message = 'Token has expired.';
        customError.errors = [
            {
                message: customError.message,
                status: customError.statusCode,
                code: 'TOKEN_EXPIRED',
                extension: { expiredAt: error.expiredAt },
            },
        ];
    } else if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
        customError.statusCode = StatusCodes.UNAUTHORIZED;
        customError.message = 'Invalid token.';
        customError.errors = [
            {
                message: customError.message,
                status: customError.statusCode,
                code: 'INVALID_TOKEN',
                extension: {},
            },
        ];
    }

    // -------------------------------------------------------------------
    // 6. Final fallback — log unknown errors loudly
    // -------------------------------------------------------------------
    if (customError.statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        logger.error({ err: error, stack: error?.stack }, `[CRITICAL_ERROR] 500 - ${error?.message}`);
        customError.message = 'An unexpected internal server error occurred.';
    }

    res.status(customError.statusCode).json({
        success: false,
        message: customError.message,
        errors: customError.errors,
        timestamp: new Date().toISOString(),
    });
};

export default errorHandler;
