import { StatusCodes } from "http-status-codes";
import HttpException from "./custom.apiError"; 

export class NotFoundError extends HttpException {
    
    constructor(message: string = 'Resource not found') {
        super(message, StatusCodes.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
    
}