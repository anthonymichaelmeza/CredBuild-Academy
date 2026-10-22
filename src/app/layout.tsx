import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Shell } from "@/components/shell";
import { authConfigured } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import "./globals.css";
import "./v04.css";
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const managed = authConfigured();
  const content = (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Shell managed={managed} browserOnly={browserDemoEnabled()}>
        {children}
      </Shell>
    </>
  );
  return (
    <html lang="en">
      <body>
        {managed ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
