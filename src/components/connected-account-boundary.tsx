"use client";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Prevent stale account UI during identity changes. API/DAL ownership checks
 * remain authoritative; this boundary is not an authorization mechanism. */
export function ConnectedAccountBoundary({
  subject,
  children,
}: {
  subject: string | null;
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const matches = isLoaded && (userId || null) === subject;
  useEffect(() => {
    if (isLoaded && !matches) router.refresh();
  }, [isLoaded, matches, router, userId, subject]);
  if (!matches)
    return (
      <div className="page-wrap" role="status">
        Refreshing your account workspace…
      </div>
    );
  return <div key={subject || "signed-out"}>{children}</div>;
}
