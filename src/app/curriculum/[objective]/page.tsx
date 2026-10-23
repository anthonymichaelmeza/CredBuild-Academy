import { notFound } from "next/navigation";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { ObjectiveStudy } from "@/components/objective-study";
export default async function ObjectivePage({
  params,
}: {
  params: Promise<{ objective: string }>;
}) {
  const { objective: id } = await params;
  const objective = chstObjectives.find((entry) => entry.id === id);
  if (!objective) notFound();
  return <ObjectiveStudy objective={objective} />;
}
