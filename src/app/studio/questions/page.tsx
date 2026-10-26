import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { studioSnapshot } from "@/modules/studio/service";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import { ContentStudio } from "@/components/content-studio";
export const dynamic = "force-dynamic";
function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT QUESTION BANK</div>
      <h1>Question Bank access is protected.</h1>
      <section className="card studio-panel">
        <p>{message}</p>
        <p>
          Draft authoring, source examination, independent technical review and
          publication use trusted server permissions. Demonstration exams never
          grant editorial access.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
        <p>
          <Link className="text-link" href="/exam">
            Open the exam simulator
          </Link>
        </p>
      </section>
    </div>
  );
}
export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  if (browserDemoEnabled())
    return (
      <Unavailable message="The browser demonstration has no connected editorial database or administrator account. Its sample examinations remain separate from production questions." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a connected administrator account to manage the Question Bank." />
    );
  const access = await requireStudioAccess(who)
    .then((value) => {
      requireStudioRole(value, ["administrator"]);
      return value;
    })
    .catch((error: unknown) => {
      if (error instanceof AccessError) return error;
      throw error;
    });
  if (access instanceof AccessError)
    return <Unavailable message={access.message} />;
  const parameters = (await searchParams) || {};
  const text = (key: string) =>
    typeof parameters[key] === "string"
      ? String(parameters[key]).slice(0, 200)
      : undefined;
  const filters = {
    kind: "question",
    page: Number(text("page")) || 1,
    search: text("search"),
    status: text("status"),
    domain: text("domain"),
    objective: text("objective"),
  };
  return (
    <ContentStudio
      key={who.id}
      initial={await studioSnapshot(who, filters)}
      initialFilters={filters}
      questionBank
    />
  );
}
