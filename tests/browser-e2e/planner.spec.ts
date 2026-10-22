import { test } from "@playwright/test";
import { plannerFlow } from "../shared/planner-flow";
test(
  "onboarding persists browser goals and isolates the planner checklist",
  plannerFlow,
);
