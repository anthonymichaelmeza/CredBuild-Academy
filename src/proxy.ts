import { clerkMiddleware } from "@clerk/nextjs/server";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (browserDemoEnabled()) return NextResponse.next();
  if (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  )
    return clerk(request, event);
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"] };
