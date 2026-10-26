import type { Question } from "@/modules/practice/types";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { chstPracticeExamPolicy } from "@/modules/exams/policy";

/** Public, inspectable synthetic samples for the explicit browser demonstration.
 * These are engine fixtures, not CHST instruction or source-verified questions.
 * Server production selection never imports this bank. Domain/objective tags
 * exercise the navigator and allocation only; they do not establish teaching coverage.
 */
let position = 0;
export const browserFullExamQuestions: Question[] =
  chstPracticeExamPolicy.domains.flatMap((domain, domainIndex) => {
    const objectives = chstObjectives.filter(
      (item) => item.domain === domain.code,
    );
    return Array.from({ length: domain.required }, (_, index): Question => {
      const number = domainIndex * 1000 + index + 1;
      const sum = number + 7;
      const key = position++ % 4;
      return {
        id: `browser-exam-d${domain.code}-${String(index + 1).padStart(3, "0")}`,
        version: 1,
        certification: "chst",
        blueprint: {
          version: chstPracticeExamPolicy.blueprintVersion,
          objective: objectives[index % objectives.length].id,
        },
        domain: domain.code,
        topic: `Demonstration engine fixtures · Domain ${domain.code}`,
        difficulty: (["introductory", "intermediate", "advanced"] as const)[
          index % 3
        ],
        stem: `DEMONSTRATION ENGINE FIXTURE ${domain.code}-${index + 1}. This is not a validated CHST question. For this arithmetic sample, what is ${number} + 7?`,
        choices: Array.from({ length: 4 }, (_, choice) => ({
          id: String.fromCharCode(97 + choice),
          text: String(sum + choice - key),
          rationale:
            choice === key
              ? `In this synthetic arithmetic sample, ${number} + 7 = ${sum}.`
              : "This sample option does not equal the stated sum. It is not a construction safety claim.",
        })),
        correctChoice: String.fromCharCode(97 + key),
        explanation: `Synthetic demonstration only: ${number} plus 7 equals ${sum}. This explanation tests the exam reader; no CHST technical content has been verified.`,
        reference: {
          title: "Synthetic demonstration fixture; no technical source claim",
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
