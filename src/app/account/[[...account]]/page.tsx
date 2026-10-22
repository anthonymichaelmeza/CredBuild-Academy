import { UserProfile } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { actor, authConfigured } from "@/modules/identity/auth";
import { AccountUnavailable } from "@/components/account-access";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  if (!authConfigured()) return <AccountUnavailable />;
  if (!(await actor())) redirect("/sign-in");
  return (
    <div className="page-wrap auth-page">
      <UserProfile routing="path" path="/account" />
    </div>
  );
}
