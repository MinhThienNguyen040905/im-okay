import { getEntryRoute } from "../routing";
import { emptyDraft, type OnboardingDraft } from "../types";

const session = {
  accessToken: "test-access",
  user: { id: "user-1", email: "test@example.com" },
};

const draft = (patch: Partial<OnboardingDraft>): OnboardingDraft => ({
  ...emptyDraft,
  ...patch,
});

describe("MA2 entry routing", () => {
  it.each([
    [null, draft({}), "/welcome"],
    [null, draft({ introSeen: true }), "/sign-in"],
    [session, draft({ introSeen: true }), "/profile"],
    [
      session,
      draft({
        introSeen: true,
        displayName: "Minh",
        timezone: "Asia/Ho_Chi_Minh",
      }),
      "/notifications",
    ],
    [
      session,
      draft({
        introSeen: true,
        displayName: "Minh",
        timezone: "Asia/Ho_Chi_Minh",
        pushDecision: "skipped",
      }),
      "/safety-plan",
    ],
    [
      session,
      draft({
        introSeen: true,
        displayName: "Minh",
        timezone: "Asia/Ho_Chi_Minh",
        pushDecision: "denied",
        intervalHours: 36,
        completed: true,
      }),
      "/(main)",
    ],
  ])(
    "returns the next required screen",
    (authSession, onboarding, expected) => {
      expect(getEntryRoute(authSession, onboarding)).toBe(expected);
    },
  );
});
