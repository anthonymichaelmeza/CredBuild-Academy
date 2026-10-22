import { test } from "@playwright/test";
import { plannerFlow } from "../shared/planner-flow";
test(
  "onboarding persists server goals and isolates the planner checklist",
  plannerFlow,
);
