import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "./errorHandler";

export interface UserJwtPayload {
  userId: string;
}
export interface AdminJwtPayload {
  adminUserId: string;
  role: "EDITOR" | "SUPER_ADMIN";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserJwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}

export function signUserToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "365d" });
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.adminJwtSecret, { expiresIn: "12h" });
}

/** Attaches req.user if a valid token is present; does not reject the request otherwise (most app endpoints work anonymously). */
export function optionalUserAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret) as UserJwtPayload;
    } catch {
      // ignore invalid/expired token — treat as anonymous
    }
  }
  next();
}

export function requireUserAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) throw new HttpError(401, "Authentication required");
  try {
    req.user = jwt.verify(token, env.jwtSecret) as UserJwtPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  next();
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) throw new HttpError(401, "Admin authentication required");
  try {
    req.admin = jwt.verify(token, env.adminJwtSecret) as AdminJwtPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired admin token");
  }
  next();
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.admin?.role !== "SUPER_ADMIN") throw new HttpError(403, "Super admin access required");
  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}
