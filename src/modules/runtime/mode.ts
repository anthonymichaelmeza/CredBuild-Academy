/** Public, non-secret build-time switch. Rebuild after changing it in Vercel. */
export function browserDemoEnabled() {
  return process.env.NEXT_PUBLIC_BROWSER_DEMO === "true";
}
