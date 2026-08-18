import { render } from "@testing-library/react-native";

import { GoogleIcon } from "../GoogleIcon";

describe("GoogleIcon", () => {
  it("renders the Google brand glyph for the sign-in action", async () => {
    const view = await render(<GoogleIcon />);

    const icon = view.toJSON();
    expect(Array.isArray(icon)).toBe(false);
    expect(icon && !Array.isArray(icon) ? icon.props.testID : null).toBe(
      "google-brand-icon",
    );
    expect(
      icon && !Array.isArray(icon) ? icon.props.source : null,
    ).toBeTruthy();
  });
});
