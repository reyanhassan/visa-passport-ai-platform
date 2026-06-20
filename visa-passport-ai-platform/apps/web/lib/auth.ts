import { prisma, type UserRole } from "@visa-platform/database";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE_NAME = "visaflow_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
  avatarUrl?: string;
}

function sessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must contain at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV === "production" &&
    (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

async function userIdFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });
    return payload.type === "session" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = await userIdFromToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, agencyId: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId,
  };
}

export async function requireCurrentUser(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}
