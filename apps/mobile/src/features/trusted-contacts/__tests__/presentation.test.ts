import {
  addTrustedContactSchema,
  createAddTrustedContactSchema,
} from "../form";
import {
  formatResendCooldown,
  invitationStatusCopy,
  moveContactIds,
} from "../presentation";
import type { TrustedContact } from "../types";

const contact = (id: string, priority: number): TrustedContact => ({
  id,
  displayName: id,
  email: `${id}@example.test`,
  priority,
  invitation: {
    status: "pending",
    sentAt: null,
    expiresAt: null,
    resendAvailableAt: null,
  },
});

describe("trusted-contact presentation helpers", () => {
  it("moves one contact without changing the original objects", () => {
    const contacts = [
      contact("one", 1),
      contact("two", 2),
      contact("three", 3),
    ];
    expect(moveContactIds(contacts, "two", "up")).toEqual([
      "two",
      "one",
      "three",
    ]);
    expect(moveContactIds(contacts, "one", "up")).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("formats server-owned resend cooldown for the CTA", () => {
    expect(formatResendCooldown(45_000)).toBe("45 giây");
    expect(formatResendCooldown(61_000)).toBe("2 phút");
    expect(formatResendCooldown(0)).toBeNull();
    expect(formatResendCooldown(45_000, "en")).toBe("45 seconds");
    expect(invitationStatusCopy("accepted", "en").label).toBe("Confirmed");
  });

  it("requires a valid email and explicit consent", () => {
    expect(
      addTrustedContactSchema.safeParse({
        displayName: "Lan",
        email: "not-an-email",
        consentConfirmed: true,
      }).success,
    ).toBe(false);
    expect(
      addTrustedContactSchema.safeParse({
        displayName: "Lan",
        email: "lan@example.test",
        consentConfirmed: false,
      }).success,
    ).toBe(false);
  });

  it("localizes validation errors created after the language changes", () => {
    const result = createAddTrustedContactSchema("en").safeParse({
      displayName: "",
      email: "not-an-email",
      consentConfirmed: false,
    });
    expect(result.error?.issues.map(({ message }) => message)).toContain(
      "Enter the contact's name.",
    );
  });
});
