import { SessionBuilder } from "@/components/session-builder";
import { actor, demoEnabled } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
export const dynamic = "force-dynamic";
export default async function Practice({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const initialDomain =
    typeof query.domain === "string" &&
    ["1", "2", "3", "4"].includes(query.domain)
      ? query.domain
      : "all";
  const initialTopic =
    typeof query.topic === "string" ? query.topic.slice(0, 100) : "all";
  const count = Number(query.count);
  const initialCount = [1, 3, 5, 10, 25, 50, 100, 200].includes(count)
    ? count
    : 25;
  const focus = { initialDomain, initialTopic, initialCount };
  if (browserDemoEnabled())
    return <SessionBuilder available browserOnly {...focus} />;
  return (
    <SessionBuilder
      available={demoEnabled() || Boolean(await actor())}
      {...focus}
    />
  );
}
