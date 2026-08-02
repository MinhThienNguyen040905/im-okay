import type { AuthSession } from "../auth/types";
import type { OnboardingDraft } from "./types";

export type EntryRoute =
  | "/welcome"
  | "/sign-in"
  | "/profile"
  | "/notifications"
  | "/safety-plan"
  | "/(main)";

export const getEntryRoute = (
  session: AuthSession | null,
  draft: OnboardingDraft,
): EntryRoute => {
  if (!draft.introSeen) return "/welcome";
  if (!session) return "/sign-in";
  if (!draft.displayName || !draft.timezone) return "/profile";
  if (draft.pushDecision === "unasked") return "/notifications";
  if (!draft.completed || !draft.intervalHours) return "/safety-plan";
  return "/(main)";
};
