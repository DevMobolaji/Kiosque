import HttpException, { ErrorOutput } from "./custom.apiError";
import { StatusCodes } from "http-status-codes"


class Unauthorized extends HttpException {


    constructor(message: string) {
        super(message, StatusCodes.FORBIDDEN, "Forbidden Access")
    }

    serializeErrors(): ErrorOutput[] {
            return [{
                message: this.message,
                status: this.statusCode,
                extension: { 
                    details: 'Authentication credentials (e.g., JWT) were missing or invalid.'
                }
            }];
        }

}

export default Unauthorized;