type AuthSettings = {
  external?: {
    google?: boolean;
  };
};

export const isGoogleProviderEnabled = async (
  supabaseUrl: string,
  publishableKey: string,
  fetcher: typeof fetch = fetch,
) => {
  try {
    const response = await fetcher(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    });
    if (!response.ok) return true;

    const settings = (await response.json()) as AuthSettings;
    return settings.external?.google !== false;
  } catch {
    // Do not block a configured provider if the optional capability check
    // cannot reach Auth. The OAuth request still has its normal error path.
    return true;
  }
};
