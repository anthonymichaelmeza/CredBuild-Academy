import { AccessError, requireActor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { privateJson, apiError } from "@/modules/http/requests";
import {
  history,
  historyQuestionPool,
  bookmarkList,
} from "@/modules/practice/service";
import { performanceData } from "@/modules/performance/dto";
import { readLearning } from "@/modules/learning/service";
import { readProfile } from "@/modules/planner/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (browserDemoEnabled())
      throw new AccessError(
        "Use Export browser demo data in Settings. The server has no browser-local progress.",
        403,
      );
    const who = await requireActor();
    const [saved, questions, bookmarks, learning, planner] = await Promise.all([
      history(who.id),
      historyQuestionPool(),
      bookmarkList(who.id),
      readLearning(who.id),
      readProfile(who.id),
    ]);
    return privateJson(
      {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        identityMode: who.mode,
        limits: {
          practiceSessions:
            "Most recent 200 sessions; active exam correctness is withheld until submission.",
        },
        practice: performanceData(
          saved,
          questions.filter((q) =>
            saved.some(
              (s) =>
                s.questionIds.includes(q.id) &&
                (s.questionVersions?.[q.id] ?? 1) === q.version,
            ),
          ),
        ),
        bookmarks,
        learning,
        planner,
      },
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="credbuilt-learning-export.json"',
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
