import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { config } from '@/config/env';

export type TokenType = 'access' | 'refresh';


export interface TokenPayload extends JwtPayload {
  sub: string;          // user id (standard JWT subject claim)
  type: TokenType;      // 'access' or 'refresh'
  sessionId?: string;   // refresh tokens carry this for rotation tracking
  role?: string;        // optional — included on access tokens for fast role checks
}

/**
 * Inputs for issuing a token.
 */
export interface SignTokenInput {
  userId: string;
  type: TokenType;
  sessionId?: string;
  role?: string;
}


export function signToken(input: SignTokenInput): string {
  const payload: TokenPayload = {
    sub: input.userId,
    type: input.type,
  };

  if (input.sessionId) payload.sessionId = input.sessionId;
  if (input.role) payload.role = input.role;

  const expiresIn =
    input.type === 'access'
      ? config.jwt.accessExpiresIn
      : config.jwt.refreshExpiresIn;

  const options: SignOptions = {
    algorithm: config.jwt.algorithm,
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  };

  return jwt.sign(payload, config.jwt.privateKey, options);
}

/**
 * Verify a JWT using the public key.
 * Throws on: expired, malformed, wrong signature, wrong issuer, wrong audience, wrong type.
 *
 * The error handler middleware catches these and returns proper 401 responses,
 * so callers can let exceptions propagate.
 */

export function verifyToken(token: string, expectedType: TokenType): TokenPayload {
  const options: VerifyOptions = {
    algorithms: [config.jwt.algorithm],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  };

  const decoded = jwt.verify(token, config.jwt.publicKey, options) as TokenPayload;

  if (decoded.type !== expectedType) {
    throw new jwt.JsonWebTokenError(
      `Wrong token type: expected ${expectedType}, got ${decoded.type}`
    );
  }

  return decoded;
}

/**
 * Decode without verification — only for debugging or extracting non-trusted info.
 * Never use this for security decisions.
 */
export function decodeToken(token: string): TokenPayload | null {
  const decoded = jwt.decode(token) as TokenPayload | null;
  return decoded;
}

/**
 * Issue an access + refresh pair in one call.
 * Used at login and at refresh-rotation time.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function issueTokenPair(input: {
  userId: string;
  sessionId: string;
  role: string;
}): TokenPair {
  return {
    accessToken: signToken({
      userId: input.userId,
      type: 'access',
      role: input.role,
    }),
    refreshToken: signToken({
      userId: input.userId,
      type: 'refresh',
      sessionId: input.sessionId,
    }),
  };
}
