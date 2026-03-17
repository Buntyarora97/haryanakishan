import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "haryana-ki-shan-secret-2024";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "haryana-ki-shan-admin-secret-2024";

function base64url(input: Buffer | string): string {
  const str = typeof input === "string" ? Buffer.from(input) : input;
  return str.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function signToken(payload: Record<string, unknown>, secret: string = JWT_SECRET): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const sig = base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string, secret: string = JWT_SECRET): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expectedSig = base64url(
      crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
    );
    if (sig !== expectedSig) return null;
    return JSON.parse(Buffer.from(body, "base64").toString());
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + JWT_SECRET).digest("hex");
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  (req as Request & { userId: number }).userId = payload.userId as number;
  next();
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token, ADMIN_JWT_SECRET);
  if (!payload || !payload.isAdmin) {
    return res.status(401).json({ success: false, message: "Invalid admin token" });
  }
  (req as Request & { adminId: number }).adminId = payload.adminId as number;
  next();
}

export { ADMIN_JWT_SECRET };
