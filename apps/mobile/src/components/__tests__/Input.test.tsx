import { render } from "@testing-library/react-native";

import { Input } from "../Input";

describe("Input", () => {
  it("keeps a persistent label and announces validation copy", async () => {
    const view = await render(
      <Input error="Email không hợp lệ" label="Email" value="khong-hop-le" />,
    );

    expect(view.getByLabelText("Email")).toBeTruthy();
    expect(view.getByText("Email không hợp lệ")).toBeTruthy();
  });
});
