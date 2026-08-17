import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  detectDeviceLocale,
  I18nProvider,
  translate,
  useI18n,
} from "../I18nProvider";

const wrapper = ({ children }: PropsWithChildren) => (
  <I18nProvider>{children}</I18nProvider>
);

describe("I18nProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("keeps Vietnamese as the safe fallback", () => {
    expect(translate("common.retry", "Thử lại", {}, "vi")).toBe("Thử lại");
    expect(detectDeviceLocale()).toMatch(/^(en|vi)$/);
  });

  it("translates parameters and persists an explicit locale", async () => {
    const { result } = await renderHook(useI18n, { wrapper });
    await act(async () => result.current.setLocale("en"));

    expect(result.current.t("plan.hours", "{hours} giờ", { hours: 36 })).toBe(
      "36 hours",
    );
    await waitFor(() =>
      expect(AsyncStorage.getItem("@im-okay/display-locale")).resolves.toBe(
        "en",
      ),
    );
  });
});
