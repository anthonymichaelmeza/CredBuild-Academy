"use client";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
export function AuthControls({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <SignOutButton>
      <button className="button secondary">Sign out</button>
    </SignOutButton>
  ) : (
    <SignInButton mode="modal">
      <button className="button primary">Sign in securely</button>
    </SignInButton>
  );
}
