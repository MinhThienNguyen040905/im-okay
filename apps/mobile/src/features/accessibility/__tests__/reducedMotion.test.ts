import { modalAnimationForPreference } from "../AccessibilityProvider";

describe("reduced-motion behavior", () => {
  it("removes modal motion when the system preference is enabled", () => {
    expect(modalAnimationForPreference(true)).toBe("none");
    expect(modalAnimationForPreference(false)).toBe("slide");
  });
});
