import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import { remainingUntilServerTime } from "@/lib/time/serverClock";

export const useAlertContextRefresh = (refresh: () => void) => {
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => state === "active" && refresh(),
    );
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(refresh);
    return () => {
      appStateSubscription.remove();
      notificationSubscription.remove();
    };
  }, [refresh]);
};

export const useAlertCountdown = (
  timestamp: string | null,
  clockOffsetMs: number,
) => {
  const [clientNowMs, setClientNowMs] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setClientNowMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  return remainingUntilServerTime(timestamp, clockOffsetMs, clientNowMs);
};
