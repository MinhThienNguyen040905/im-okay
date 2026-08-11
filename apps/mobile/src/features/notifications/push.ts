import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { PushDecision } from "../onboarding/types";

export type PushSetupResult = {
  decision: PushDecision;
  expoPushToken?: string;
  reason?: "physical-device-required" | "project-id-required";
};

const hasPermission = (settings: Notifications.NotificationPermissionsStatus) =>
  settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

const prepareAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("safety-reminders", {
    name: "Nhắc điểm danh an toàn",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
};

const getProjectId = () =>
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
    ?.projectId;

export const getPushPermission = async (): Promise<PushDecision> => {
  const settings = await Notifications.getPermissionsAsync();
  if (hasPermission(settings)) return "granted";
  return settings.canAskAgain ? "unasked" : "denied";
};

export const requestPushSetup = async (): Promise<PushSetupResult> => {
  await prepareAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  const settings = hasPermission(current)
    ? current
    : await Notifications.requestPermissionsAsync();

  if (!hasPermission(settings)) return { decision: "denied" };
  if (!Device.isDevice) {
    return { decision: "unavailable", reason: "physical-device-required" };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { decision: "granted", reason: "project-id-required" };
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return { decision: "granted", expoPushToken: token.data };
};

export const subscribeToPushTokenChanges = (
  listener: (token: string) => void,
) =>
  Notifications.addPushTokenListener((devicePushToken) => {
    const projectId = getProjectId();
    if (!projectId) return;

    void Notifications.getExpoPushTokenAsync({
      projectId,
      devicePushToken,
    })
      .then(({ data }) => listener(data))
      .catch(() => undefined);
  });
