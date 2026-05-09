import { randomUUID } from 'crypto';
import { NextFunction, Response, Request } from 'express';
import { RequestContext } from 'interfaces/request.interface';

export const buildRequestContext = (req: Request): RequestContext => {
  return {
    requestId: (req.headers['x-request-id'] as string) ?? randomUUID(),
    ipAddress: req.ip as any,
    userAgent: req.get('user-agent') || 'UNKNOWN_AGENT',
    deviceId: req.cookies.deviceId,
    deviceType: getDeviceType(req.get('user-agent')),
    timestamp: new Date(),
  }
}


export const attachContextMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.requestId) {
    throw new Error('requestId missing. attachRequestId middleware must run first.');
  }

  req.context = buildRequestContext(req);
  next();
}


function getDeviceType(userAgent?: string): 'mobile' | 'web' | 'tablet' | undefined {
  if (!userAgent) {
    return undefined;
  }

  const ua = userAgent.toLowerCase();

  // Check for tablet
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet';
  }

  // Check for mobile
  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipod')
  ) {
    return 'mobile';
  }

  // Default to web
  return 'web';
}


export function getContextMiddleware(req: Request): RequestContext {
  // Return existing context or extract new one
  if (!req.context) {
    throw new Error('Request context not initialized. Did you forget attachRequestContext middleware?');
  }
  return req.context;
}