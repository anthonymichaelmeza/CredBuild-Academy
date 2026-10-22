import { SignUp } from "@clerk/nextjs";
import { authConfigured } from "@/modules/identity/auth";
import { AccountUnavailable } from "@/components/account-access";
export const dynamic = "force-dynamic";
export default function SignUpPage() {
  if (!authConfigured()) return <AccountUnavailable />;
  return (
    <div className="page-wrap auth-page">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}
