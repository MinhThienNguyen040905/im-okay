import { act, fireEvent, render } from "@testing-library/react-native";
import { Vibration } from "react-native";

import { SosHoldButton } from "../SosHoldButton";

describe("SOS hold guard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
    jest.spyOn(Vibration, "vibrate").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("does not send after a tap or early release", async () => {
    const onComplete = jest.fn();
    const view = await render(<SosHoldButton onComplete={onComplete} />);
    const button = view.getByTestId("sos-hold-button");

    await fireEvent(button, "pressIn");
    await act(async () => jest.advanceTimersByTime(1_000));
    await fireEvent(button, "pressOut");
    await act(async () => jest.advanceTimersByTime(3_000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("submits exactly once after three continuous seconds", async () => {
    const onComplete = jest.fn();
    const view = await render(<SosHoldButton onComplete={onComplete} />);
    const button = view.getByTestId("sos-hold-button");

    await fireEvent(button, "pressIn");
    await act(async () => jest.advanceTimersByTime(2_950));
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(50));
    expect(onComplete).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(500));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
