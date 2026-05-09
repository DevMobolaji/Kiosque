import { Request, Response } from 'express';
import { Router } from 'express';

import { registerSchema } from './auth.dto';
import { validate } from '@/common/middleware/validate.middleware';
import Controller from '@/interfaces/controller.interface';
import { authService } from './auth.services';
import asyncWrapper from '@/common/middleware/async.wrapper';
import { getContextMiddleware } from '@/common/middleware/context.middlware';



class AuthController implements Controller {
  public path = 'auth';
  public route = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.route.post('/register', validate(registerSchema, 'body'), this.register,);
  }

  private register = asyncWrapper(async (req: Request, res: Response): Promise<void> => {

    const context = getContextMiddleware(req);

    const result = await authService.register({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      context
    });

    res.status(201).json(result);
  });
}

export default AuthController;
