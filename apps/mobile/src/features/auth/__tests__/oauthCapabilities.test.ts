import { isGoogleProviderEnabled } from "../oauthCapabilities";

const supabaseUrl = "https://example.supabase.co";
const publishableKey = "publishable-key";

describe("isGoogleProviderEnabled", () => {
  it("returns false when Auth explicitly disables Google", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      json: async () => ({ external: { google: false } }),
      ok: true,
    });

    await expect(
      isGoogleProviderEnabled(supabaseUrl, publishableKey, fetcher),
    ).resolves.toBe(false);
    expect(fetcher).toHaveBeenCalledWith(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });
  });

  it("does not block OAuth when the optional capability check fails", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValue(new Error("Network unavailable"));

    await expect(
      isGoogleProviderEnabled(supabaseUrl, publishableKey, fetcher),
    ).resolves.toBe(true);
  });
});
