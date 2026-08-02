import { fireEvent, render } from "@testing-library/react-native";

import { CheckInButton } from "../CheckInButton";

describe("CheckInButton", () => {
  it("locks interaction while a check-in is pending", async () => {
    const onPress = jest.fn();
    const view = await render(<CheckInButton loading onPress={onPress} />);
    fireEvent.press(view.getByTestId("check-in-button"));
    expect(onPress).not.toHaveBeenCalled();
    expect(
      view.getByRole("button", { name: "Đang ghi nhận xác nhận" }),
    ).toBeTruthy();
  });
});
