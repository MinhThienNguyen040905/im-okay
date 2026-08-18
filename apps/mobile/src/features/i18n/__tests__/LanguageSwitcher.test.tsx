import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { I18nProvider } from "../I18nProvider";
import { LanguageSwitcher } from "../LanguageSwitcher";

describe("LanguageSwitcher", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem("@im-okay/display-locale", "vi");
  });

  it("uses a compact accessible target and switches to English", async () => {
    const view = await render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    );

    const switcher = await waitFor(() => view.getByTestId("language-switcher"));
    expect(switcher).toHaveStyle({ minHeight: 48 });
    expect(view.getByText("EN")).toBeTruthy();

    fireEvent.press(switcher);

    await waitFor(() => expect(view.getByText("VI")).toBeTruthy());
    await waitFor(() =>
      expect(AsyncStorage.getItem("@im-okay/display-locale")).resolves.toBe(
        "en",
      ),
    );
  });
});
