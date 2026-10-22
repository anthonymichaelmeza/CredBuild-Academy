import "server-only";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
export const authConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
export const demoEnabled = () =>
  process.env.ALLOW_LOCAL_DEMO === "true" && !authConfigured();
export type Actor = { id: string; mode: "demo" | "managed" };
export class AccessError extends Error {
  constructor(
    message = "Sign in to continue.",
    public status = 401,
  ) {
    super(message);
  }
}
export async function actor(createDemo = false): Promise<Actor | null> {
  if (authConfigured()) {
    const { userId } = await auth();
    return userId ? { id: userId, mode: "managed" } : null;
  }
  if (!demoEnabled()) return null;
  const jar = await cookies();
  let id = jar.get("credbuilt_demo")?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    if (!createDemo) return null;
    id = randomUUID();
    jar.set("credbuilt_demo", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return { id: `demo:${id}`, mode: "demo" };
}
export async function requireActor(createDemo = false) {
  const result = await actor(createDemo);
  if (!result) throw new AccessError();
  return result;
}
export function requireAdmin() {
  throw new AccessError(
    "Content administration is not enabled in this milestone.",
    403,
  );
}
