import type { ErrorEvent } from "@sentry/react-native";

import { sanitizeSentryEvent } from "../sentry";

describe("Sentry event privacy boundary", () => {
  it("drops request/user and scrubs PII or tokens from every retained surface", () => {
    const event: ErrorEvent = {
      type: undefined,
      message: "Failure for minh@example.test with Bearer top-secret",
      transaction: "/auth/callback?token=secret",
      user: { id: "user-1", email: "minh@example.test" },
      request: {
        url: "imokay://auth/callback?code=secret",
        headers: { authorization: "Bearer secret" },
      },
      extra: {
        displayName: "Minh Anh",
        nested: { contactEmail: "friend@example.test" },
      },
      tags: { recipient: "friend@example.test", safeState: "warning" },
      contexts: { device: { name: "Minh's phone", model: "test-model" } },
      breadcrumbs: [
        {
          message: "Opened minh@example.test?token=secret",
          data: { authorization: "Bearer secret" },
        },
      ],
    };

    const sanitized = sanitizeSentryEvent(event);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.user).toBeUndefined();
    expect(sanitized.request).toBeUndefined();
    expect(serialized).not.toContain("minh@example.test");
    expect(serialized).not.toContain("friend@example.test");
    expect(serialized).not.toContain("top-secret");
    expect(serialized).not.toContain("Minh Anh");
    expect(serialized).not.toContain("Minh's phone");
    expect(serialized).toContain("warning");
  });
});
