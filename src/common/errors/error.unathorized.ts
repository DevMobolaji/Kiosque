import HttpException, { ErrorOutput } from './custom.apiError';
import { StatusCodes } from 'http-status-codes';

class ForbiddenError extends HttpException {
    constructor(message: string = 'You do not have permission to perform this action.') {
        super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    serializeErrors(): ErrorOutput[] {
        return [
            {
                message: this.message,
                status: this.statusCode,
                code: this.errorCode,
                extension: {
                    details: 'Your account does not have the required permissions.',
                },
            },
        ];
    }
}

export default ForbiddenError;