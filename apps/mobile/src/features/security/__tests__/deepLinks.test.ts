import {
  isAllowedIncomingLink,
  redirectIncomingLink,
  REJECTED_LINK_PATH,
} from "../deepLinks";

describe("native incoming-link boundary", () => {
  it.each([
    "imokay://",
    "/",
    "imokay://auth/callback?code=pkce-code",
    "imokay:///auth/callback#access_token=access&refresh_token=refresh&type=magiclink",
    "imokay://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+expired&sb=provider-state",
    "exp://127.0.0.1:8081/--/auth/callback?code=pkce-code",
  ])("allows only root and known Supabase auth callback shapes: %s", (url) => {
    expect(isAllowedIncomingLink(url)).toBe(true);
    expect(redirectIncomingLink(url)).toBe(url);
  });

  it.each([
    "imokay://contacts/invitation?token=public-contact-token",
    "imokay://alerts/respond?token=public-alert-token",
    "imokay://auth/callback?contactToken=wrong-scope",
    "imokay://history",
    "https://example.test/auth/callback?code=not-associated",
    "not a valid url %",
  ])(
    "rejects routes and token scopes the mobile app does not own: %s",
    (url) => {
      expect(isAllowedIncomingLink(url)).toBe(false);
      expect(redirectIncomingLink(url)).toBe(REJECTED_LINK_PATH);
    },
  );
});
