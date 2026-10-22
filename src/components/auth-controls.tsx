"use client";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
export function AuthControls({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <div className="auth-actions">
      <Link className="button secondary" href="/account">
        Manage account
      </Link>
      <SignOutButton redirectUrl="/">
        <button className="button secondary">Sign out</button>
      </SignOutButton>
    </div>
  ) : (
    <div className="auth-actions">
      <Link className="button primary" href="/sign-in">
        Sign in securely
      </Link>
      <Link className="button secondary" href="/sign-up">
        Create an account
      </Link>
    </div>
  );
}
