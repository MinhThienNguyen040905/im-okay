import { render } from "@testing-library/react-native";

import { SettingsErrorCard } from "../SettingsErrorCard";

describe("SettingsErrorCard", () => {
  it("renders safe push-registration feedback in an assertive live region", async () => {
    const message =
      "Đã có quyền thông báo nhưng máy chủ chưa xác nhận thiết bị.";
    const view = await render(<SettingsErrorCard message={message} />);

    expect(view.getByText(message)).toHaveProp(
      "accessibilityLiveRegion",
      "assertive",
    );
  });

  it("renders nothing without an error", async () => {
    expect(
      (await render(<SettingsErrorCard message={null} />)).toJSON(),
    ).toBeNull();
  });
});
