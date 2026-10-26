import type { Question, Session } from "@/modules/practice/types";

/** Keep choice identities unchanged: the saved permutation controls presentation
 * only. Grading always compares the original, immutable answer IDs. */
export function createExamChoiceOrders(
  questions: readonly Question[],
  random: () => number = Math.random,
): Record<string, string[]> {
  return Object.fromEntries(
    questions.map((question) => {
      const ids = question.choices.map((choice) => choice.id);
      if (ids.length !== 4 || new Set(ids).size !== 4)
        throw new Error("Examination choices require four unique identities.");
      for (let index = ids.length - 1; index > 0; index--) {
        const value = random();
        if (!Number.isFinite(value) || value < 0 || value >= 1)
          throw new Error("Invalid examination choice randomization source.");
        const other = Math.floor(value * (index + 1));
        [ids[index], ids[other]] = [ids[other], ids[index]];
      }
      return [question.id, ids];
    }),
  );
}

export function sessionQuestionChoices(
  session: Pick<Session, "questionChoiceOrders">,
  question: Question,
): Question["choices"] {
  // Snapshots created before answer ordering was introduced retain their
  // original presentation, including when resumed after this migration.
  if (!session.questionChoiceOrders) return question.choices;
  const order = session.questionChoiceOrders[question.id];
  if (
    !Array.isArray(order) ||
    order.length !== question.choices.length ||
    new Set(order).size !== question.choices.length ||
    order.some((id) => !question.choices.some((choice) => choice.id === id))
  )
    throw new Error("Saved examination answer option order is invalid.");
  return order.map((id) =>
    question.choices.find((choice) => choice.id === id)!,
  );
}
