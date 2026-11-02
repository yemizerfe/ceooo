// server/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.ts';
import { isTokenRevoked, revokeUserTokens } from '../lib/tokenRevocation.ts';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  // Express 5 types params/query loosely; our routes always carry scalars.
  params: Record<string, string>;
  query: Record<string, string>;
}

function unauthorized(res: Response, message: string): void {
  res.status(401).json({ success: false, message });
}

// Don't make this async - handle errors with try/catch
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthRequest;
  try {
    const authHeader = authReq.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      iat?: number;
    };

    // Reject tokens issued before an administrator reset the user's access.
    void isTokenRevoked(decoded.id, decoded.iat)
      .then((revoked) => {
        if (revoked) {
          unauthorized(res, 'Session expired. Please sign in again.');
          return;
        }
        authReq.user = { id: decoded.id, email: decoded.email };
        next();
      })
      .catch(() => unauthorized(res, 'Invalid or expired token'));
  } catch (error) {
    unauthorized(res, 'Invalid or expired token');
    return;
  }
};

// Optional: If you need database check, create a separate async middleware
export const authenticateWithDb = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      iat?: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, accessResetAt: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended'
      });
    }

    if (user.accessResetAt && decoded.iat && decoded.iat * 1000 < user.accessResetAt.getTime()) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.'
      });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/** Invalidates every previously issued token for a user (used by the admin panel). */
export const revokeAccessTokens = revokeUserTokens;
