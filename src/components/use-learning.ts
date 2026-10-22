"use client";
import { useSyncExternalStore } from "react";
import {
  learningSnapshot,
  parseLearning,
  subscribeLearning,
} from "@/demo/learning-store";
import { useHydrated } from "./use-hydrated";
export function useLearning() {
  const raw = useSyncExternalStore(
    subscribeLearning,
    learningSnapshot,
    () => null,
  );
  const hydrated = useHydrated();
  try {
    return { hydrated, state: parseLearning(raw), error: null };
  } catch (e) {
    return {
      hydrated,
      state: null,
      error: e instanceof Error ? e.message : "Learning storage failed.",
    };
  }
}
