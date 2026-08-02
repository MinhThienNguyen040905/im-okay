import { render } from "@testing-library/react-native";

import { ComponentPreview } from "./fixtures/ComponentPreview";

describe("ComponentPreview", () => {
  it("renders the reusable component states for visual QA", async () => {
    const view = await render(<ComponentPreview />);

    expect(
      view.getByRole("header", { name: "Shared component preview" }),
    ).toBeTruthy();
    expect(view.getByRole("button", { name: "Nút primary" })).toBeTruthy();
    expect(view.getByLabelText("Email có lỗi")).toBeTruthy();
  });
});
