import "server-only";
import type { Question } from "@/modules/practice/types";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { browserDemoEnabled } from "@/modules/runtime/mode";

/** This opt-in cannot be enabled by an exam request, hosted environment or managed DB. */
export function developmentExamFixturesEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.CREDBUILT_EXAM_FIXTURES === "true" &&
    process.env.ALLOW_LOCAL_DEMO === "true" &&
    !process.env.VERCEL &&
    !process.env.DATABASE_URL &&
    !browserDemoEnabled() &&
    process.env.LOCAL_DATABASE_PATH === ".local/exam-e2e"
  );
}

/** Arithmetic fixtures exercise the engine, never claim CHST instructional validity. */
export function developmentExamQuestions(): Question[] {
  if (!developmentExamFixturesEnabled())
    throw new Error("Development examination fixtures are disabled.");
  const counts = [83, 50, 55, 52];
  return counts.flatMap((count, domainIndex) => {
    const domain = String(domainIndex + 1);
    const objectives = chstObjectives.filter((item) => item.domain === domain);
    return Array.from({ length: count }, (_, index): Question => {
      const number = domainIndex * 1000 + index + 1;
      const result = number + 7;
      const key = index % 4;
      return {
        id: `dev-full-d${domain}-${String(index + 1).padStart(3, "0")}`,
        version: 1,
        certification: "chst",
        blueprint: {
          version: "2022.04.12",
          objective: objectives[index % objectives.length].id,
        },
        domain,
        topic: `Development-only fixture domain ${domain}`,
        difficulty: (["introductory", "intermediate", "advanced"] as const)[
          index % 3
        ],
        stem: `DEVELOPMENT-ONLY ENGINE FIXTURE ${domain}-${index + 1}. This is not a CHST question. In this arithmetic test, what is ${number} + 7?`,
        choices: Array.from({ length: 4 }, (_, choice) => ({
          id: String.fromCharCode(97 + choice),
          text: String(result + choice - key),
          rationale:
            choice === key
              ? `Synthetic arithmetic fixture: ${number} + 7 = ${result}. No CHST source claim.`
              : "This synthetic fixture choice does not equal the stated sum; no safety instruction is supplied.",
        })),
        correctChoice: String.fromCharCode(97 + key),
        explanation: `Development-only test data. ${number} plus 7 equals ${result}; this exercises grading rather than safety knowledge.`,
        reference: {
          title: "Synthetic development fixture; no CHST technical source",
          url: "",
          locator: "",
          verifiedAt: null,
          classification: "supplemental_resource",
          verificationStatus: "pending",
        },
        contentKind: "demonstration",
        origin: "ai_generated",
        reviewStatus: "draft",
      };
    });
  });
}
