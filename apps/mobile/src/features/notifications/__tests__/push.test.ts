import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { requestPushSetup, subscribeToPushTokenChanges } from "../push";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    easConfig: { projectId: "project-1" },
    expoConfig: null,
  },
}));

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  addPushTokenListener: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

const notifications = jest.mocked(Notifications);

describe("push token registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Device, "isDevice", { value: true });
    Object.defineProperty(Constants, "easConfig", {
      configurable: true,
      value: { projectId: "project-1" },
    });
    notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);
  });

  it("returns an Expo token during explicit setup", async () => {
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      type: "expo",
      data: "ExpoPushToken[explicit]",
    });

    await expect(requestPushSetup()).resolves.toEqual({
      decision: "granted",
      expoPushToken: "ExpoPushToken[explicit]",
    });
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-1",
    });
  });

  it("converts a rotated native token before registering it", async () => {
    let nativeListener:
      ((token: Notifications.DevicePushToken) => void) | undefined;
    const remove = jest.fn();
    notifications.addPushTokenListener.mockImplementation((listener) => {
      nativeListener = listener;
      return { remove };
    });
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      type: "expo",
      data: "ExpoPushToken[rotated]",
    });
    const register = jest.fn();

    subscribeToPushTokenChanges(register);
    const nativeToken: Notifications.DevicePushToken = {
      type: "android",
      data: "native-fcm-token",
    };
    nativeListener?.(nativeToken);
    await Promise.resolve();
    await Promise.resolve();

    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-1",
      devicePushToken: nativeToken,
    });
    expect(register).toHaveBeenCalledWith("ExpoPushToken[rotated]");
    expect(register).not.toHaveBeenCalledWith("native-fcm-token");
  });
});
