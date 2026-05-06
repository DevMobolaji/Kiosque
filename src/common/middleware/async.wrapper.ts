import { Response, Request, NextFunction, RequestHandler } from "express"
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const asyncWrapper = (fn: AsyncRequestHandler): RequestHandler => {
    return (req, res, next) => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncWrapper;

