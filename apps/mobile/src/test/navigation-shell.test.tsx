import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";

import MainTabsLayout from "@/app/(main)/_layout";
import HistoryScreen from "@/app/(main)/history";

jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    session: {
      accessToken: "fixture-token",
      user: { id: "navigation-test", email: "navigation@example.test" },
    },
  }),
}));
jest.mock("@/features/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({
    draft: { timezone: "Asia/Ho_Chi_Minh" },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const TestRootLayout = () => (
  <QueryClientProvider client={queryClient}>
    <Slot />
  </QueryClientProvider>
);

describe("navigation shell", () => {
  it("opens the History tab from a deep link", async () => {
    await renderRouter(
      {
        _layout: TestRootLayout,
        "(main)/_layout": MainTabsLayout,
        "(main)/index": () => null,
        "(main)/history": HistoryScreen,
        "(main)/settings": () => null,
      },
      { initialUrl: "/history" },
    );

    expect(await screen.findByRole("header", { name: "Lịch sử" })).toBeTruthy();
    expect(screen.getByLabelText("Mở Trang chủ")).toBeTruthy();
    expect(screen.getByLabelText("Mở Cài đặt")).toBeTruthy();
  });
});
