import { recordEditorialDecision } from "@/modules/studio/editorial";
import { readStudio } from "@/modules/studio/service";
import type { Actor } from "@/modules/identity/access";
import type { StudioItem } from "@/modules/studio/model";
/** Isolated fictional test records only; never applies to supplied CHST drafts. */
export async function approveEditorialFixture(
  reviewer: Actor,
  item: StudioItem,
) {
  await recordEditorialDecision(reviewer, {
    id: item.id,
    revision: item.revision,
    rowVersion: item.rowVersion,
    editorialEvent: null,
    decision: "approved",
    findings:
      "Synthetic software-test editorial examination only; no instructional source or real question was verified.",
    checks: {
      clarity: true,
      originality: true,
      distractors: true,
      answerClues: true,
      rights: true,
    },
    humanAttestation: true,
  });
  return readStudio(reviewer, item.id);
}
