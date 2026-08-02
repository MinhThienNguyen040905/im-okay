import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "../Button";

describe("Button", () => {
  it("exposes its accessible name and handles a press", async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button
        accessibilityLabel="Xác nhận tôi vẫn ổn"
        label="Tôi vẫn ổn"
        onPress={onPress}
      />,
    );

    fireEvent.press(view.getByRole("button", { name: "Xác nhận tôi vẫn ổn" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("blocks presses while loading", async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button
        accessibilityLabel="Đang xác nhận"
        label="Đang xác nhận"
        loading
        onPress={onPress}
      />,
    );

    fireEvent.press(view.getByRole("button", { name: "Đang xác nhận" }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
