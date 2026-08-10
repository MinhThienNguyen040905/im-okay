const appConfig = require("../../app.json") as {
  expo: {
    scheme: string;
    userInterfaceStyle: string;
    ios: { bundleIdentifier: string };
    android: { package: string };
    plugins: unknown[];
  };
};
const easConfig = require("../../eas.json") as {
  build: Record<
    string,
    {
      distribution: string;
      environment: string;
      env: Record<string, string>;
      autoIncrement?: boolean;
    }
  >;
};

describe("MA7 mobile release configuration", () => {
  it("keeps the selected light-only design and one auth callback scheme", () => {
    expect(appConfig.expo.userInterfaceStyle).toBe("light");
    expect(appConfig.expo.scheme).toBe("imokay");
    expect(appConfig.expo.ios.bundleIdentifier).toBe("com.imokay.app");
    expect(appConfig.expo.android.package).toBe("com.imokay.app");
  });

  it("uses fixture only for local and remote data for staging/production", () => {
    expect(easConfig.build.local?.env).toEqual(
      expect.objectContaining({
        EXPO_PUBLIC_APP_ENV: "local",
        EXPO_PUBLIC_DATA_MODE: "fixture",
      }),
    );
    expect(easConfig.build.staging?.env.EXPO_PUBLIC_DATA_MODE).toBe("remote");
    expect(easConfig.build.production?.env.EXPO_PUBLIC_DATA_MODE).toBe(
      "remote",
    );
    expect(easConfig.build.production?.distribution).toBe("store");
    expect(easConfig.build.production?.autoIncrement).toBe(true);
  });

  it("does not commit signing or Sentry upload secrets into build profiles", () => {
    const serialized = JSON.stringify(easConfig);
    expect(serialized).not.toMatch(
      /SENTRY_AUTH_TOKEN|APP_PASSWORD|\.p12|\.jks/,
    );
  });

  it("loads Android google-services from a non-public file variable", () => {
    const previousValue = process.env.GOOGLE_SERVICES_JSON;
    process.env.GOOGLE_SERVICES_JSON = "C:/eas/secrets/google-services.json";

    jest.resetModules();
    const configureApp = jest.requireActual("../../app.config.js") as (input: {
      config: typeof appConfig.expo;
    }) => typeof appConfig.expo & {
      android: typeof appConfig.expo.android & { googleServicesFile?: string };
    };
    const configured = configureApp({ config: appConfig.expo });

    expect(configured.android.googleServicesFile).toBe(
      "C:/eas/secrets/google-services.json",
    );
    expect(JSON.stringify(appConfig)).not.toContain("google-services.json");

    if (previousValue === undefined) {
      delete process.env.GOOGLE_SERVICES_JSON;
    } else {
      process.env.GOOGLE_SERVICES_JSON = previousValue;
    }
  });
});
