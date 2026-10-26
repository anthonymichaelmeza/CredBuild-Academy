import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Shell } from "@/components/shell";
import { actor, authConfigured } from "@/modules/identity/auth";
import { ConnectedAccountBoundary } from "@/components/connected-account-boundary";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import "./globals.css";
import "./v04.css";
import "./foundation.css";
import "./planner.css";
import "./studio.css";
import "./curriculum.css";
import "./practice.css";
import "./exam.css";
import "./dark-theme.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
export const metadata: Metadata = {
  title: {
    default: "CredBuilt Academy | Build your next chapter",
    template: "%s | CredBuilt Academy",
  },
  description:
    "Independent construction safety certification preparation. Build knowledge. Earn credentials.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const managed = authConfigured();
  const who = managed ? await actor() : null;
  const content = (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Shell
        managed={managed}
        browserOnly={browserDemoEnabled()}
        studioEnabled={
          managed ||
          (!browserDemoEnabled() &&
            process.env.ALLOW_LOCAL_STUDIO === "true" &&
            process.env.ALLOW_LOCAL_DEMO === "true" &&
            !process.env.VERCEL &&
            process.env.NODE_ENV !== "production")
        }
      >
        {children}
      </Shell>
    </>
  );
  return (
    <html lang="en">
      <body>
        {managed ? (
          <ClerkProvider>
            <ConnectedAccountBoundary subject={who?.id || null}>
              {content}
            </ConnectedAccountBoundary>
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
