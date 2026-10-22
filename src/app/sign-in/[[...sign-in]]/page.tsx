import { SignIn } from "@clerk/nextjs";
import { authConfigured } from "@/modules/identity/auth";
import { AccountUnavailable } from "@/components/account-access";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  if (!authConfigured()) return <AccountUnavailable />;
  return (
    <div className="page-wrap auth-page">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
      />
    </div>
  );
}
