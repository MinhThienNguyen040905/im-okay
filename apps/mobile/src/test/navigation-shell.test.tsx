import { Slot } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";

const TestRootLayout = () => <Slot />;

describe("navigation shell", () => {
  it("opens the History tab from a deep link", async () => {
    await renderRouter(
      {
        appDir: "src/app",
        overrides: { _layout: TestRootLayout },
      },
      { initialUrl: "/history" },
    );

    expect(await screen.findByRole("header", { name: "Lịch sử" })).toBeTruthy();
    expect(screen.getByLabelText("Mở Trang chủ")).toBeTruthy();
    expect(screen.getByLabelText("Mở Cài đặt")).toBeTruthy();
  });
});
