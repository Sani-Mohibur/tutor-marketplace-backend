import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { UserRole } from "../constants/user.constants.js";

// Extend Express Request interface to safely hold our active session context data
interface AuthRequest extends Request {
  user?: typeof auth.$Infer.Session.user;
  session?: typeof auth.$Infer.Session.session;
}

export const requireAuth = (allowedRoles?: UserRole[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // 1. Parse the inbound headers using Better Auth session verifier
      const sessionContext = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!sessionContext) {
        res.status(401).json({
          success: false,
          message: "Unauthorized. Please authenticate first.",
        });
        return;
      }

      // Check if the user has been banned
      if ((sessionContext.user as any).banned === true) {
        // 1. Convert Express headers to a standard Headers instance
        const headers = new Headers();
        if (req.headers.cookie) headers.append("cookie", req.headers.cookie);
        if (req.headers.authorization)
          headers.append("authorization", req.headers.authorization);

        // 2. Revoke session server-side
        await auth.api
          .revokeSession({
            headers,
            body: { token: sessionContext.session.token },
          })
          .catch(() => null);

        res.status(403).json({
          success: false,
          message: "Your account has been suspended.",
        });
        return;
      }

      // 2. Role Verification Guard (if specific roles are restricted)
      if (
        allowedRoles &&
        !allowedRoles.includes(sessionContext.user.role as any)
      ) {
        res.status(403).json({
          success: false,
          message: "Forbidden. Access privilege verification failed.",
        });
        return;
      }

      // 3. Inject authenticated identity metadata into request context
      req.user = sessionContext.user;
      req.session = sessionContext.session;

      next();
    } catch (error) {
      console.error("❌ Auth Session Interceptor Crash:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal access controller error." });
    }
  };
};
