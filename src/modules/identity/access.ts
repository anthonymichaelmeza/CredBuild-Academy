/** Shared boundary values with no provider, React, cookie, or browser imports.
 * Trusted maintenance CLIs can use these without initializing managed auth. */
export type Actor = { id: string; mode: "demo" | "managed" };
export class AccessError extends Error {
  constructor(
    message = "Sign in to continue.",
    public status = 401,
  ) {
    super(message);
  }
}
